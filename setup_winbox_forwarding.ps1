$ErrorActionPreference = 'Continue'

Write-Host "============================================="
Write-Host "   KONFIGURASI REMOTE WINBOX TANPA APLIKASI  "
Write-Host "============================================="

# 1. Pastikan IP Helper Service running
Set-Service -Name iphlpsvc -StartupType Automatic
Start-Service -Name iphlpsvc -ErrorAction SilentlyContinue

# 2. Hapus aturan lama
netsh interface portproxy delete v4tov4 listenport=8291 listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy delete v4tov4 listenport=8728 listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy delete v4tov4 listenport=8080 listenaddress=0.0.0.0 | Out-Null

# 3. Buat Port Forwarding langsung ke MikroTik VPN (10.8.0.2)
# Port 8291 -> Winbox MikroTik
netsh interface portproxy add v4tov4 listenport=8291 listenaddress=0.0.0.0 connectport=8291 connectaddress=10.8.0.2
# Port 8728 -> MikroTik API
netsh interface portproxy add v4tov4 listenport=8728 listenaddress=0.0.0.0 connectport=8728 connectaddress=10.8.0.2
# Port 8080 -> WebFig MikroTik
netsh interface portproxy add v4tov4 listenport=8080 listenaddress=0.0.0.0 connectport=80 connectaddress=10.8.0.2

# 4. Buka Firewall
New-NetFirewallRule -DisplayName "Allow Winbox Port 8291" -Direction Inbound -LocalPort 8291 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "Allow MikroTik API Port 8728" -Direction Inbound -LocalPort 8728 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
New-NetFirewallRule -DisplayName "Allow MikroTik WebFig Port 8080" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null

Write-Host "`nAturan Port Forwarding yang aktif:"
netsh interface portproxy show all

Write-Host "`nKonfigurasi Remote Winbox berhasil diaktifkan!"
