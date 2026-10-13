# Copies the version from the VERSION file into .env, then runs docker compose.
#
#   ./deploy.ps1            # docker compose up -d --build
#   ./deploy.ps1 config     # any other compose command, after the same stamp
#
# Compose tags the image from VERSION in .env, the only file it interpolates
# from, so the stamp lives there rather than in the shell: `ps`, `logs` and
# `down` then work in a plain terminal too. The backend's `./gradlew bootJar`
# does the same job; this is a script because the server has no Node to run an
# npm one.
$ErrorActionPreference = 'Stop'

$version = (Get-Content (Join-Path $PSScriptRoot 'VERSION') -Raw).Trim()
if ($version -notmatch '^\d+\.\d+\.\d+$') {
    throw "VERSION must be MAJOR.MINOR.PATCH, got '$version'"
}

# Every other line of .env is kept. Written without a BOM, which Windows
# PowerShell's own cmdlets add and compose would read as part of the first key.
$envFile = Join-Path $PSScriptRoot '.env'
$others = @()
if (Test-Path $envFile) {
    $others = @(Get-Content $envFile | Where-Object { $_ -notmatch '^VERSION=' })
}
[System.IO.File]::WriteAllLines(
    $envFile,
    [string[]]($others + "VERSION=$version"),
    (New-Object System.Text.UTF8Encoding $false)
)

$compose = @('up', '-d', '--build')
if ($args.Count -gt 0) { $compose = $args }
Push-Location $PSScriptRoot
try {
    docker compose @compose
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
