$ErrorActionPreference = 'Continue'
$nodeDir = "C:\tools\nodejs"
$env:Path = "$nodeDir;C:\tools;" + [System.Environment]::GetEnvironmentVariable("Path", "Machine")

Set-Location -Path "C:\Project"

Write-Host "Stopping existing PM2 processes and Caddy..."
& "C:\tools\caddy.exe" stop 2>$null
& "$nodeDir\pm2.cmd" delete all 2>$null

Write-Host "Starting Next.js on port 3000 with PM2..."
& "$nodeDir\pm2.cmd" start "C:\Project\node_modules\next\dist\bin\next" --name "starlink-manager" -- start -p 3000

Write-Host "Starting Caddy with PM2..."
& "$nodeDir\pm2.cmd" start "C:\tools\caddy.exe" --name "caddy" -- run --config "C:\Project\Caddyfile"

& "$nodeDir\pm2.cmd" save

Start-Sleep -Seconds 6

Write-Host "`n--- PM2 Process List ---"
& "$nodeDir\pm2.cmd" list

Write-Host "`n--- Testing Port 80 ---"
$resp80 = curl.exe -s -i http://localhost/login
Write-Host ($resp80 -join "`n").Substring(0, [Math]::Min(300, ($resp80 -join "`n").Length))

Write-Host "`n--- Testing Port 443 HTTPS ---"
$resp443 = curl.exe -s -i -k https://localhost/login
Write-Host ($resp443 -join "`n").Substring(0, [Math]::Min(300, ($resp443 -join "`n").Length))

Write-Host "`n--- Testing Domain allstar.my.id ---"
$respDomain = curl.exe -s -i -L https://allstar.my.id/login
Write-Host ($respDomain -join "`n").Substring(0, [Math]::Min(300, ($respDomain -join "`n").Length))
