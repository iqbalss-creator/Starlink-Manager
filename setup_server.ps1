$ErrorActionPreference = 'Stop'

Write-Host "1. Checking/Installing Node.js..."
$nodeDir = "C:\tools\nodejs"
if (-not (Test-Path "$nodeDir\node.exe")) {
    New-Item -ItemType Directory -Force -Path "C:\tools" | Out-Null
    $zipPath = "C:\tools\node.zip"
    Write-Host "Downloading Node.js v20.18.0..."
    curl.exe -L -o $zipPath "https://nodejs.org/dist/v20.18.0/node-v20.18.0-win-x64.zip"
    Write-Host "Extracting Node.js..."
    Expand-Archive -Path $zipPath -DestinationPath "C:\tools" -Force
    Move-Item -Path "C:\tools\node-v20.18.0-win-x64" -Destination $nodeDir -Force
    Remove-Item -Path $zipPath -Force
}

$env:Path = "$nodeDir;$env:Path"
[System.Environment]::SetEnvironmentVariable("Path", "$nodeDir;" + [System.Environment]::GetEnvironmentVariable("Path", "Machine"), "Machine")

Write-Host "Node version: $(& $nodeDir\node.exe -v)"
Write-Host "NPM version: $(& $nodeDir\npm.cmd -v)"

Write-Host "2. Configuring Windows Firewall for Port 80, 443, and 3000..."
try {
    New-NetFirewallRule -DisplayName "Allow HTTP 80" -Direction Inbound -LocalPort 80 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Allow HTTPS 443" -Direction Inbound -LocalPort 443 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName "Allow Port 3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue
    Write-Host "Firewall rules configured."
} catch {
    Write-Host "Firewall config warning: $_"
}
