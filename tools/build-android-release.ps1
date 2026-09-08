$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot

function Read-Required($Prompt) {
    do { $value = Read-Host $Prompt } while ([string]::IsNullOrWhiteSpace($value))
    return $value.Trim()
}

function Read-SecretPlain($Prompt) {
    $secure = Read-Host $Prompt -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

function Read-KeystorePath {
    $defaultPath = Join-Path $projectRoot 'Huzzle.keystore'
    if (Test-Path -LiteralPath $defaultPath -PathType Leaf) {
        Write-Host "Using project keystore: $defaultPath" -ForegroundColor Green
        return [IO.Path]::GetFullPath($defaultPath)
    }

    do {
        $enteredPath = Read-Host "Keystore file path [$defaultPath]"
        if ([string]::IsNullOrWhiteSpace($enteredPath)) { $enteredPath = $defaultPath }
        $path = [IO.Path]::GetFullPath($enteredPath)
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            Write-Host "Keystore file not found: $path" -ForegroundColor Yellow
            $path = $null
        }
    } while (-not $path)
    return $path
}

function Find-Keytool {
    $found = Get-Command keytool.exe -ErrorAction SilentlyContinue
    if ($found) { return $found.Source }

    $candidates = @(
        "$env:ProgramFiles\Android\Android Studio\jbr\bin\keytool.exe",
        "$env:ProgramFiles\Android\Android Studio\jre\bin\keytool.exe",
        "$env:JAVA_HOME\bin\keytool.exe"
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
    }
    throw 'Could not find keytool. Install Android Studio or set JAVA_HOME, then run this script again.'
}

function New-UploadKeystore {
    $keytool = Find-Keytool
    $defaultPath = Join-Path $projectRoot 'Huzzle.keystore'
    $path = Read-Host "Keystore path [$defaultPath]"
    if ([string]::IsNullOrWhiteSpace($path)) { $path = $defaultPath }
    $path = [IO.Path]::GetFullPath($path)
    if (Test-Path -LiteralPath $path) { throw "A keystore already exists at $path. Choose another path." }
    New-Item -ItemType Directory -Path (Split-Path -Parent $path) -Force | Out-Null

    $alias = Read-Required 'Key alias'
    $storePassword = Read-SecretPlain 'Keystore password'
    $keyPassword = Read-SecretPlain 'Key password'
    $name = Read-Required 'Your name or company name'
    $unit = Read-Host 'Organizational unit (optional)'
    $org = Read-Required 'Organization'
    $city = Read-Required 'City'
    $state = Read-Required 'State or province'
    $country = Read-Required 'Two-letter country code (for example BG)'

    & $keytool -genkeypair -v -keystore $path -alias $alias -keyalg RSA -keysize 2048 -validity 10000 `
        -storepass $storePassword -keypass $keyPassword `
        -dname "CN=$name, OU=$unit, O=$org, L=$city, ST=$state, C=$country" | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'Keystore creation failed.' }
    Write-Host "Created keystore: $path" -ForegroundColor Green
    Write-Host 'Back up this file and its passwords. Do not commit it to Git.' -ForegroundColor Yellow
    return $path
}

Write-Host 'Huzzle Android release builder' -ForegroundColor Cyan
$keystoreChoice = Read-Host 'Create a new keystore now? (y/N)'
if ($keystoreChoice -match '^(y|yes)$') {
    $keystorePath = New-UploadKeystore
} else {
    $keystorePath = Read-KeystorePath
}

$buildStatePath = Join-Path $projectRoot '.android-release-state.json'
$defaultVersionCode = 1
$defaultVersionName = '1.0'
if (Test-Path -LiteralPath $buildStatePath -PathType Leaf) {
    try {
        $previousBuild = Get-Content -LiteralPath $buildStatePath -Raw | ConvertFrom-Json
        $previousCode = 0L
        if (-not [long]::TryParse([string]$previousBuild.versionCode, [ref]$previousCode) -or
            $previousCode -lt 1 -or $previousCode -gt 2100000000 -or
            [string]::IsNullOrWhiteSpace([string]$previousBuild.versionName)) {
            throw 'Invalid saved version information.'
        }
        $defaultVersionCode = $previousCode + 1
        $defaultVersionName = [string]$previousBuild.versionName
    } catch {
        throw "Cannot read saved build information at $buildStatePath. $($_.Exception.Message)"
    }
}

$versionCode = Read-Host "Version code (higher than your previous Play upload) [$defaultVersionCode]"
if ([string]::IsNullOrWhiteSpace($versionCode)) { $versionCode = [string]$defaultVersionCode }
$parsedVersionCode = 0L
if (-not [long]::TryParse($versionCode, [ref]$parsedVersionCode) -or
    $parsedVersionCode -lt 1 -or $parsedVersionCode -gt 2100000000) {
    throw 'Version code must be a whole number between 1 and 2100000000.'
}
$versionCode = [string]$parsedVersionCode
$versionName = Read-Host "Version name [$defaultVersionName]"
if ([string]::IsNullOrWhiteSpace($versionName)) { $versionName = $defaultVersionName }
$versionName = $versionName.Trim()
$keyAlias = Read-Required 'Key alias'
$storePassword = Read-SecretPlain 'Keystore password'
$keyPassword = Read-SecretPlain 'Key password'

$env:HUZZLE_VERSION_CODE = $versionCode
$env:HUZZLE_VERSION_NAME = $versionName
$env:HUZZLE_KEYSTORE_PATH = $keystorePath
$env:HUZZLE_KEY_ALIAS = $keyAlias
$env:HUZZLE_KEYSTORE_PASSWORD = $storePassword
$env:HUZZLE_KEY_PASSWORD = $keyPassword

Push-Location $projectRoot
try {
    Write-Host 'Building web assets and syncing Capacitor...' -ForegroundColor Cyan
    & bun run android:build
    if ($LASTEXITCODE -ne 0) { throw 'Web build or Capacitor sync failed.' }

    Write-Host 'Building signed release bundle...' -ForegroundColor Cyan
    & .\android\gradlew.bat -p android bundleRelease
    if ($LASTEXITCODE -ne 0) { throw 'Android release build failed.' }

    $bundle = Join-Path $projectRoot 'android\app\build\outputs\bundle\release\app-release.aab'
    if (-not (Test-Path -LiteralPath $bundle -PathType Leaf)) { throw 'Gradle finished but the release bundle was not found.' }
    [ordered]@{
        versionCode = $parsedVersionCode
        versionName = $versionName
    } | ConvertTo-Json | Set-Content -LiteralPath $buildStatePath -Encoding UTF8
    Write-Host "`nSuccess. Bundle: $bundle" -ForegroundColor Green
}
finally {
    Remove-Item Env:HUZZLE_VERSION_CODE, Env:HUZZLE_VERSION_NAME, Env:HUZZLE_KEYSTORE_PATH, Env:HUZZLE_KEY_ALIAS, Env:HUZZLE_KEYSTORE_PASSWORD, Env:HUZZLE_KEY_PASSWORD -ErrorAction SilentlyContinue
    Pop-Location
}
