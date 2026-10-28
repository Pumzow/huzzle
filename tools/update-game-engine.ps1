param(
    [string]$SourceDirectory = (Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) 'GameEngine')
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$packageName = '@pumzow/game-engine'
$archivePrefix = 'pumzow-game-engine'
$vendorDirectory = Join-Path $projectRoot 'vendor'
$temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$temporaryDirectory = Join-Path $temporaryRoot ("game-engine-update-" + [guid]::NewGuid().ToString('N'))
$resolvedSource = [IO.Path]::GetFullPath($SourceDirectory)

function Invoke-Checked {
    param([scriptblock]$Command, [string]$FailureMessage)
    & $Command
    if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}

if (-not (Test-Path -LiteralPath (Join-Path $resolvedSource 'package.json') -PathType Leaf)) {
    throw "GameEngine was not found at $resolvedSource"
}

$manifest = Get-Content -LiteralPath (Join-Path $resolvedSource 'package.json') -Raw | ConvertFrom-Json
if ([string]$manifest.name -ne $packageName) {
    throw "$resolvedSource is not the $packageName project."
}

$version = [version]$manifest.version
$archiveName = "$archivePrefix-$version.tgz"
$targetArchive = Join-Path $vendorDirectory $archiveName
$targetDependency = "./vendor/$archiveName"

New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null
try {
    Write-Host "Validating GameEngine $version..." -ForegroundColor Cyan
    Push-Location $resolvedSource
    try {
        Invoke-Checked { bun install --frozen-lockfile } 'Could not install GameEngine dependencies.'
        Invoke-Checked { bun test } 'GameEngine tests failed.'
        Invoke-Checked { bun run typecheck } 'GameEngine type-check failed.'
        Invoke-Checked { bun run build } 'GameEngine build failed.'
        Invoke-Checked { npm pack --ignore-scripts --pack-destination $temporaryDirectory } 'Could not package GameEngine.'
    }
    finally {
        Pop-Location
    }

    $packedArchive = Join-Path $temporaryDirectory $archiveName
    if (-not (Test-Path -LiteralPath $packedArchive -PathType Leaf)) {
        throw "Expected package archive was not created: $archiveName"
    }

    New-Item -ItemType Directory -Path $vendorDirectory -Force | Out-Null
    Copy-Item -LiteralPath $packedArchive -Destination $targetArchive -Force

    Push-Location $projectRoot
    try {
        Write-Host "Installing $packageName from $targetDependency..." -ForegroundColor Cyan
        Invoke-Checked { bun add "$packageName@$targetDependency" --exact } 'Bun could not install GameEngine.'
        Invoke-Checked { bun test } 'Huzzle tests failed. The dependency update remains local for review.'
        Invoke-Checked { bun run build } 'Huzzle build failed. The dependency update remains local for review.'

        Get-ChildItem -LiteralPath $vendorDirectory -Filter "$archivePrefix-*.tgz" -File |
            Where-Object FullName -ne $targetArchive |
            Remove-Item -Force

        Write-Host "`nUpdated Huzzle to GameEngine $version." -ForegroundColor Green
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
