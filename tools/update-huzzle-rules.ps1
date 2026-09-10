param(
    [string]$RepositoryUrl = 'https://github.com/Pumzow/huzzle-rules.git'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$packageName = 'drygon-huzzle-rules'
$vendorDirectory = Join-Path $projectRoot 'vendor'
$temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$temporaryDirectory = Join-Path $temporaryRoot ("huzzle-rules-update-" + [guid]::NewGuid().ToString('N'))

function Invoke-Checked {
    param([scriptblock]$Command, [string]$FailureMessage)
    & $Command
    if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}

function Read-RulesDependency {
    $manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
    return [string]$manifest.dependencies.$packageName
}

Write-Host 'Checking for the latest Huzzle rules release...' -ForegroundColor Cyan
$remoteTags = & git ls-remote --tags --refs $RepositoryUrl 'refs/tags/v*'
if ($LASTEXITCODE -ne 0) { throw "Could not read release tags from $RepositoryUrl" }

$releases = foreach ($line in $remoteTags) {
    if ($line -match 'refs/tags/v(?<version>\d+\.\d+\.\d+)$') {
        [pscustomobject]@{ Tag = "v$($Matches.version)"; Version = [version]$Matches.version }
    }
}
$latest = $releases | Sort-Object Version -Descending | Select-Object -First 1
if (-not $latest) { throw 'No published Huzzle rules tags were found. Run the rules release script first.' }

$archiveName = "$packageName-$($latest.Version).tgz"
$targetDependency = "./vendor/$archiveName"
$targetArchive = Join-Path $vendorDirectory $archiveName
$previousDependency = Read-RulesDependency
if ($previousDependency -eq $targetDependency -and (Test-Path -LiteralPath $targetArchive -PathType Leaf)) {
    Write-Host "Huzzle rules are already current: $($latest.Tag)" -ForegroundColor Green
    exit 0
}

New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null
try {
    $sourceDirectory = Join-Path $temporaryDirectory 'source'
    New-Item -ItemType Directory -Path $sourceDirectory -Force | Out-Null
    Invoke-Checked { git -C $sourceDirectory init --quiet } 'Could not initialize the temporary rules checkout.'
    Invoke-Checked { git -C $sourceDirectory remote add origin $RepositoryUrl } 'Could not configure the rules repository.'
    Invoke-Checked { git -C $sourceDirectory fetch --quiet --depth 1 origin "refs/tags/$($latest.Tag):refs/tags/$($latest.Tag)" } "Could not download Huzzle rules $($latest.Tag)."
    Invoke-Checked { git -C $sourceDirectory checkout --quiet --detach "$($latest.Tag)^{commit}" } "Could not check out Huzzle rules $($latest.Tag)."

    $releaseManifest = Get-Content -LiteralPath (Join-Path $sourceDirectory 'package.json') -Raw | ConvertFrom-Json
    if ([string]$releaseManifest.name -ne $packageName -or [version]$releaseManifest.version -ne $latest.Version) {
        throw "Tag $($latest.Tag) does not contain the matching $packageName package version."
    }

    New-Item -ItemType Directory -Path $vendorDirectory -Force | Out-Null
    Push-Location $sourceDirectory
    try {
        Invoke-Checked { npm pack --ignore-scripts --pack-destination $temporaryDirectory } "Could not package Huzzle rules $($latest.Tag)."
    }
    finally {
        Pop-Location
    }
    $packedArchive = Join-Path $temporaryDirectory $archiveName
    if (-not (Test-Path -LiteralPath $packedArchive -PathType Leaf)) { throw "Expected package archive was not created: $archiveName" }
    Copy-Item -LiteralPath $packedArchive -Destination $targetArchive -Force

    Push-Location $projectRoot
    try {
        Write-Host "Updating $previousDependency to $targetDependency..." -ForegroundColor Cyan
        Invoke-Checked { bun add "$packageName@$targetDependency" --exact } 'Bun could not install the Huzzle rules release.'
        if ((Read-RulesDependency) -ne $targetDependency) { throw 'package.json was not updated to the expected rules archive.' }

        Write-Host 'Running game tests...' -ForegroundColor Cyan
        Invoke-Checked { bun test } 'Game tests failed. The dependency update remains local for review.'
        Write-Host 'Running game type-check and production build...' -ForegroundColor Cyan
        Invoke-Checked { bun run build } 'Game validation build failed. The dependency update remains local for review.'

        Get-ChildItem -LiteralPath $vendorDirectory -Filter "$packageName-*.tgz" -File |
            Where-Object FullName -ne $targetArchive |
            Remove-Item -Force

        Write-Host "`nUpdated Huzzle rules: $previousDependency -> $targetDependency" -ForegroundColor Green
        Write-Host 'Validation passed. Local dependency changes:' -ForegroundColor Green
        & git status --short -- package.json bun.lock vendor
    }
    finally {
        Pop-Location
    }
}
finally {
    $resolvedTemporary = [IO.Path]::GetFullPath($temporaryDirectory)
    if ((Test-Path -LiteralPath $resolvedTemporary) -and $resolvedTemporary.StartsWith($temporaryRoot, [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force
    }
}
