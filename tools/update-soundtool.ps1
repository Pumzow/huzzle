param(
    [string]$RepositoryUrl = 'https://github.com/Pumzow/sound-tool.git'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$packageName = '@soundtool/engine'
$archivePrefix = 'soundtool-engine'
$vendorDirectory = Join-Path $projectRoot 'vendor'
$temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
$temporaryDirectory = Join-Path $temporaryRoot ("soundtool-update-" + [guid]::NewGuid().ToString('N'))

function Invoke-Checked {
    param([scriptblock]$Command, [string]$FailureMessage)
    & $Command
    if ($LASTEXITCODE -ne 0) { throw $FailureMessage }
}

function Read-SoundToolDependency {
    $manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json
    return [string]$manifest.dependencies.$packageName
}

Write-Host 'Checking for the latest SoundTool release...' -ForegroundColor Cyan
$remoteTags = & git ls-remote --tags --refs $RepositoryUrl 'refs/tags/v*'
if ($LASTEXITCODE -ne 0) { throw "Could not read release tags from $RepositoryUrl" }

$releases = foreach ($line in $remoteTags) {
    if ($line -match 'refs/tags/v(?<version>\d+\.\d+\.\d+)$') {
        [pscustomobject]@{ Tag = "v$($Matches.version)"; Version = [version]$Matches.version }
    }
}
$latest = $releases | Sort-Object Version -Descending | Select-Object -First 1
if (-not $latest) { throw 'No published SoundTool tags were found. Create and push a SoundTool release tag first.' }

$archiveName = "$archivePrefix-$($latest.Version).tgz"
$targetDependency = "./vendor/$archiveName"
$targetArchive = Join-Path $vendorDirectory $archiveName
$previousDependency = Read-SoundToolDependency
if ($previousDependency -eq $targetDependency -and (Test-Path -LiteralPath $targetArchive -PathType Leaf)) {
    Write-Host "SoundTool is already current: $($latest.Tag)" -ForegroundColor Green
    exit 0
}

New-Item -ItemType Directory -Path $temporaryDirectory -Force | Out-Null
try {
    $sourceDirectory = Join-Path $temporaryDirectory 'source'
    New-Item -ItemType Directory -Path $sourceDirectory -Force | Out-Null
    Invoke-Checked { git -C $sourceDirectory init --quiet } 'Could not initialize the temporary SoundTool checkout.'
    Invoke-Checked { git -C $sourceDirectory remote add origin $RepositoryUrl } 'Could not configure the SoundTool repository.'
    Invoke-Checked { git -C $sourceDirectory fetch --quiet --depth 1 origin "refs/tags/$($latest.Tag):refs/tags/$($latest.Tag)" } "Could not download SoundTool $($latest.Tag)."
    Invoke-Checked { git -C $sourceDirectory checkout --quiet --detach "$($latest.Tag)^{commit}" } "Could not check out SoundTool $($latest.Tag)."

    $releaseManifest = Get-Content -LiteralPath (Join-Path $sourceDirectory 'package.json') -Raw | ConvertFrom-Json
    if ([string]$releaseManifest.name -ne $packageName -or [version]$releaseManifest.version -ne $latest.Version) {
        throw "Tag $($latest.Tag) does not contain the matching $packageName package version."
    }

    New-Item -ItemType Directory -Path $vendorDirectory -Force | Out-Null
    Push-Location $sourceDirectory
    try {
        Invoke-Checked { npm pack --ignore-scripts --pack-destination $temporaryDirectory } "Could not package SoundTool $($latest.Tag)."
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
        Invoke-Checked { bun add "$packageName@$targetDependency" --exact } 'Bun could not install the SoundTool release.'
        if ((Read-SoundToolDependency) -ne $targetDependency) { throw 'package.json was not updated to the expected SoundTool archive.' }

        Write-Host 'Running game tests...' -ForegroundColor Cyan
        Invoke-Checked { bun test } 'Game tests failed. The dependency update remains local for review.'
        Write-Host 'Running game type-check and production build...' -ForegroundColor Cyan
        Invoke-Checked { bun run build } 'Game validation build failed. The dependency update remains local for review.'

        Get-ChildItem -LiteralPath $vendorDirectory -Filter "$archivePrefix-*.tgz" -File |
            Where-Object FullName -ne $targetArchive |
            Remove-Item -Force

        Write-Host "`nUpdated SoundTool: $previousDependency -> $targetDependency" -ForegroundColor Green
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
