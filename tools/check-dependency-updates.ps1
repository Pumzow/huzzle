$ErrorActionPreference = 'Continue'
$projectRoot = Split-Path -Parent $PSScriptRoot
$manifest = Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json

function Get-InstalledVersion([string]$Dependency) {
    if ($Dependency -match '(?<version>\d+\.\d+\.\d+)\.tgz$') {
        return [version]$Matches.version
    }
    return $null
}

function Get-LatestTagVersion([string]$RepositoryUrl) {
    $tags = & git ls-remote --tags --refs $RepositoryUrl 'refs/tags/v*' 2>$null
    if ($LASTEXITCODE -ne 0) { return $null }
    $versions = foreach ($line in $tags) {
        if ($line -match 'refs/tags/v(?<version>\d+\.\d+\.\d+)$') {
            [version]$Matches.version
        }
    }
    return $versions | Sort-Object -Descending | Select-Object -First 1
}

function Write-DependencyStatus(
    [string]$Label,
    [string]$PackageName,
    [string]$RepositoryUrl,
    [string]$UpdateCommand
) {
    $dependency = [string]$manifest.dependencies.$PackageName
    $installed = Get-InstalledVersion $dependency
    $latest = Get-LatestTagVersion $RepositoryUrl
    if (-not $latest) {
        Write-Host "[versions] ${Label}: unable to check releases; starting with the installed package." -ForegroundColor Yellow
        return
    }
    if (-not $installed) {
        Write-Host "[versions] $Label $latest is available and is not installed. Run '$UpdateCommand'." -ForegroundColor Yellow
        return
    }
    if ($latest -gt $installed) {
        Write-Host "[versions] $Label update available: $installed -> $latest. Run '$UpdateCommand'." -ForegroundColor Yellow
        return
    }
    Write-Host "[versions] $Label is current: $installed" -ForegroundColor DarkGray
}

Write-DependencyStatus 'Huzzle Rules' 'drygon-huzzle-rules' 'https://github.com/Pumzow/huzzle-rules.git' 'bun run rules:update'
Write-DependencyStatus 'SoundTool' '@soundtool/engine' 'https://github.com/Pumzow/sound-tool.git' 'bun run soundtool:update'

exit 0
