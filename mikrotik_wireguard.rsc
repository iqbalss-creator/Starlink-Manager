# ==========================================
# SCRIPT KONFIGURASI WIREGUARD MIKROTIK
# Salin dan paste perintah berikut di Terminal MikroTik (RouterOS v7)
# ==========================================

# 1. Hapus konfigurasi lama jika ada
/interface wireguard remove [find name="wg-server"]
/ip address remove [find interface="wg-server"]

# 2. Buat Interface WireGuard
/interface wireguard add name=wg-server listen-port=13231 private-key="cAMPa2j9DUHvoqu42aLfzbUlZhIKbcBJuIWLSytndEo="

# 3. Pasang IP Address pada Interface WireGuard
/ip address add address=10.8.0.2/24 interface=wg-server

# 4. Tambahkan Peer ke Server PC (Public IP: 38.253.224.108)
/interface wireguard peers add interface=wg-server public-key="nH6+VsqgZUeLKqeMRXQVbDpei69dYCf9OK1+BpBoYgs=" endpoint-address=38.253.224.108 endpoint-port=51820 allowed-address=10.8.0.0/24 persistent-keepalive=25s

# 5. Izinkan Akses API & Winbox dari VPN Subnet 10.8.0.0/24
/ip service set api address=0.0.0.0/0 disabled=no port=8728
/ip service set winbox address=0.0.0.0/0 disabled=no port=8291
