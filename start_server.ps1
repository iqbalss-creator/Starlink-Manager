$ErrorActionPreference = 'Stop'
$nodeDir = "C:\tools\nodejs"
$env:Path = "$nodeDir;" + [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
$env:PORT = "80"

Set-Location -Path "C:\Project"

# Install PM2 globally if not installed
Write-Host "Checking PM2..."
try {
    & "$nodeDir\npm.cmd" install -g pm2
} catch {
    Write-Host "PM2 install warning: $_"
}

# Start app using PM2 or direct process
$pm2Cmd = "$nodeDir\pm2.cmd"
if (Test-Path $pm2Cmd) {
    Write-Host "Starting application with PM2 on port 80..."
    & $pm2Cmd delete starlink-manager -s 2>$null
    & $pm2Cmd start "C:\Project\node_modules\next\dist\bin\next" --name "starlink-manager" -- start -p 80
    & $pm2Cmd save
    Write-Host "PM2 process list:"
    & $pm2Cmd list
} else {
    Write-Host "Starting application directly on port 80 in background..."
    Start-Process -FilePath "$nodeDir\node.exe" -ArgumentList "C:\Project\node_modules\next\dist\bin\next start -p 80" -WorkingDirectory "C:\Project" -WindowStyle Hidden
}
