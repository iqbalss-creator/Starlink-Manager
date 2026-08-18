$ErrorActionPreference = 'Stop'
$nodeDir = "C:\tools\nodejs"
$env:Path = "$nodeDir;" + [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

Set-Location -Path "C:\Project"

Write-Host "Installing dependencies with npm..."
& "$nodeDir\npm.cmd" install

Write-Host "Building Next.js project..."
& "$nodeDir\npm.cmd" run build

Write-Host "Build complete successfully."
