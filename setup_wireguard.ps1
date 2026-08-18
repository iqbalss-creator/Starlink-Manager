$ErrorActionPreference = 'Stop'
$wgBin = "C:\tools\wireguard\wg.exe"
$wireguardExe = "C:\tools\wireguard\wireguard.exe"
$wgDir = "C:\tools\wireguard\config"

New-Item -ItemType Directory -Force -Path $wgDir | Out-Null

Write-Host "1. Generating Keys..."
# Server Keys
$serverPrivKey = (& $wgBin genkey).Trim()
$serverPubKey = (echo $serverPrivKey | & $wgBin pubkey).Trim()

# MikroTik Keys
$mikrotikPrivKey = (& $wgBin genkey).Trim()
$mikrotikPubKey = (echo $mikrotikPrivKey | & $wgBin pubkey).Trim()

# Admin Client Keys (for phone/laptop)
$adminPrivKey = (& $wgBin genkey).Trim()
$adminPubKey = (echo $adminPrivKey | & $wgBin pubkey).Trim()

Write-Host "Server Public Key: $serverPubKey"
Write-Host "MikroTik Public Key: $mikrotikPubKey"
Write-Host "Admin Client Public Key: $adminPubKey"

# 2. Write Server Config (wg0.conf)
$serverConfPath = "$wgDir\wg0.conf"
$serverConfContent = @"
[Interface]
PrivateKey = $serverPrivKey
Address = 10.8.0.1/24
ListenPort = 51820

# Peer 1: MikroTik Router
[Peer]
PublicKey = $mikrotikPubKey
AllowedIPs = 10.8.0.2/32

# Peer 2: Admin Client (HP / Laptop Luar)
[Peer]
PublicKey = $adminPubKey
AllowedIPs = 10.8.0.3/32
"@

Set-Content -Path $serverConfPath -Value $serverConfContent -Encoding ASCII

# 3. Write Client Admin Config (client_admin.conf)
$adminConfPath = "C:\Project\client_admin.conf"
$adminConfContent = @"
[Interface]
PrivateKey = $adminPrivKey
Address = 10.8.0.3/24
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = $serverPubKey
Endpoint = 38.253.224.108:51820
AllowedIPs = 10.8.0.0/24
PersistentKeepalive = 25
"@

Set-Content -Path $adminConfPath -Value $adminConfContent -Encoding ASCII

# 4. Write MikroTik Setup Script (mikrotik_wireguard.rsc)
$mikrotikRscPath = "C:\Project\mikrotik_wireguard.rsc"
$mikrotikRscContent = @"
# ==========================================
# SCRIPT KONFIGURASI WIREGUARD MIKROTIK
# Salin dan paste perintah berikut di Terminal MikroTik (RouterOS v7)
# ==========================================

# 1. Hapus konfigurasi lama jika ada
/interface wireguard remove [find name="wg-server"]
/ip address remove [find interface="wg-server"]

# 2. Buat Interface WireGuard
/interface wireguard add name=wg-server listen-port=13231 private-key="$mikrotikPrivKey"

# 3. Pasang IP Address pada Interface WireGuard
/ip address add address=10.8.0.2/24 interface=wg-server

# 4. Tambahkan Peer ke Server PC (Public IP: 38.253.224.108)
/interface wireguard peers add interface=wg-server public-key="$serverPubKey" endpoint-address=38.253.224.108 endpoint-port=51820 allowed-address=10.8.0.0/24 persistent-keepalive=25s

# 5. Izinkan Akses API & Winbox dari VPN Subnet 10.8.0.0/24
/ip service set api address=0.0.0.0/0 disabled=no port=8728
/ip service set winbox address=0.0.0.0/0 disabled=no port=8291
"@

Set-Content -Path $mikrotikRscPath -Value $mikrotikRscContent -Encoding ASCII

# 5. Enable IP Routing in Windows Registry
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip\Parameters" -Name "IPEnableRouter" -Value 1

# 6. Configure Windows Firewall for WireGuard UDP 51820
try {
    New-NetFirewallRule -DisplayName "Allow WireGuard UDP 51820" -Direction Inbound -LocalPort 51820 -Protocol UDP -Action Allow -ErrorAction SilentlyContinue
    Write-Host "Firewall rule for UDP 51820 configured."
} catch {
    Write-Host "Firewall warning: $_"
}

# 7. Install and Start WireGuard Tunnel Service
Write-Host "Installing WireGuard Tunnel Service (wg0)..."
& $wireguardExe /uninstalltunnelservice wg0 2>$null
Start-Sleep -Seconds 1
& $wireguardExe /installtunnelservice "$serverConfPath"
Start-Sleep -Seconds 2

# 8. Check service
Get-Service -Name "WireGuardTunnel`$wg0" -ErrorAction SilentlyContinue

Write-Host "`nWireGuard VPN Server setup completed successfully!"
