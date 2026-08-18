# 🚀 Starlink Manager & MikroTik Cloud Gateway

Aplikasi Manajemen ISP, Voucher Hotspot, Monitoring Starlink, dan Integrasi MikroTik RouterOS berbasis **Next.js**, **Supabase Cloud**, **WireGuard VPN**, dan **Telegram Bot Controller**.

---

## 🌟 Fitur Utama yang Telah Dibuat

### 1. 🌐 Web Dashboard & Billing Management
- **Dashboard Utama**: Monitoring koneksi Starlink, traffic bandwidth real-time, status router, dan data ringkasan pendapatan.
- **Manajemen Hotspot & Voucher**: Pembuatan voucher otomatis, cetak voucher massal, status voucher aktif, dan riwayat pemakaian.
- **Manajemen Pelanggan & Agen**: Pencatatan data pelanggan, paket langganan, tanggal jatuh tempo, dan pembagian komisi agen.
- **Laporan Keuangan**: Rekapitulasi transaksi harian, bulanan, grafik penjualan, dan riwayat invoice.
- **Cloud Database (Supabase)**: Seluruh data pelanggan, voucher, dan transaksi tersimpan aman di Supabase PostgreSQL Cloud.
- **Web Server & SSL Otomatis (Caddy)**: Akses HTTPS otomatis melalui domain `allstar.my.id` dan `www.allstar.my.id`.

---

### 2. 🔒 WireGuard VPN & Winbox Port Forwarding
- **Dedicated WireGuard Tunnel (`10.8.0.1/24`)**: PC Server bertindak sebagai VPN Gateway dengan port UDP `51820`.
- **Koneksi MikroTik Router (`10.8.0.2`)**: Router MikroTik (RB1100AHx4) terhubung secara aman tanpa memerlukan IP Publik statis di lokasi router.
- **Akses Winbox Jarak Jauh Tanpa VPN Client**:
  - `Winbox Port 8291` di-forward langsung ke MikroTik via `netsh portproxy`.
  - Akses Winbox dari mana saja cukup masukkan IP/Domain server (`allstar.my.id`).
  - `API Port 8728` & `WebFig Port 8080` turut diforward untuk integrasi web & dashboard.

---

### 3. 🤖 Telegram Bot All-in-One (`@StarlinkBackupBot`)
Bot Telegram cerdas yang dilengkapi **Keyboard Menu Interaktif** untuk memonitor dan mengontrol router langsung dari HP:

#### 🎮 Remote Control MikroTik
| Perintah / Tombol | Fungsi |
|---|---|
| `📊 Status` (`/status`) | Menampilkan Uptime, CPU Load, RAM, Disk, dan identitas MikroTik |
| `⚡ User Aktif` (`/active`) | Menampilkan daftar user hotspot yang sedang online |
| `👥 Semua User` (`/users`) | Menampilkan seluruh user hotspot yang terdaftar |
| `📈 Bandwidth` (`/bandwidth`) | Monitor TX/RX traffic pada interface aktif secara real-time |
| `💾 Backup Sekarang` (`/backup`) | Membuat backup MikroTik & Server lalu langsung kirim ke Telegram |
| `📦 Last Backup` (`/lastbackup`) | Info backup terakhir & tombol unduh file `.zip`, `.backup`, `.rsc` |
| `🏥 Health Check` (`/health`) | Cek status kesehatan server web, MikroTik, dan VPN tunnel |
| `📋 Laporan` (`/report`) | Kirim ringkasan harian performa sistem |
| `📜 Log MikroTik` (`/log`) | Menampilkan 15 log sistem terbaru router |
| `/adduser <nama> <pass> [profile]` | Menambahkan user hotspot baru ke MikroTik |
| `/deluser <nama>` | Menghapus user hotspot dari MikroTik |
| `/kick <nama>` | Memutus koneksi user aktif tertentu |
| `/ping <host>` | Melakukan test ping dari MikroTik ke internet |
| `/reboot` | Merestart router MikroTik secara remote |

#### 🔔 Fitur Otomatis Bot:
- **Auto Health Check (Tiap 5 Menit)**: Mengirim peringatan jika Web Server / MikroTik offline atau jika CPU > 85% & RAM > 90%.
- **Security Alerts (Tiap 2 Menit)**: Deteksi login ke Winbox, percobaan login gagal (*brute-force*), dan interface *link down*.
- **Laporan Harian (Tiap Jam 07:00 WIB)**: Rekap otomatis user aktif, status resource, dan kesehatan sistem.

---

### 4. 📦 Sistem Backup Otomatis & Disaster Recovery
- **Backup Harian Terjadwal (Jam 02:00 Pagi)**:
  - Mengambil **Binary Backup (`.backup`)** & **Config Script (`.rsc`)** dari MikroTik via API + FTP.
  - Mengompresi seluruh source code aplikasi, konfigurasi Caddy, dan kredensial `.env.local`.
  - Mengirimkan seluruh arsip backup ke **Cloud Telegram Admin**.
  - Melakukan rotasi otomatis (menyimpan 7 backup lokal terakhir).
- **1-Click Disaster Recovery (`restore_server.ps1`)**:
  - Memulihkan seluruh sistem dari backup zip dalam satu kali klik jika server bermasalah atau dipindah ke PC baru.

---

### 5. ⚙️ Optimalisasi Sistem Operasi Windows
- **Windows Auto-Update Disabled**: Menonaktifkan pembaruan otomatis Windows via Registry Policy, Services (`wuauserv`, `UsoSvc`, `WaaSMedicSvc`), dan Task Scheduler agar server tidak restart mendadak.
- **Windows Shell & Settings Fix**: Memperbaiki ACL permission AppContainer untuk Windows Settings dan Windows Search.
- **Windows Auto-Start Services**:
  - `StarlinkTelegramBot`: Berjalan otomatis saat PC menyala.
  - `WireGuardTunnel$wg0`: Berjalan sebagai Windows Service background.
  - `StarlinkManagerAutoBackup`: Berjalan terjadwal di Task Scheduler.

---

## 🛠️ Struktur File Proyek

```
C:\Project\
├── src/                          # Source code Next.js (Dashboard, Hotspot, Billing)
├── public/                       # Logo & static assets
├── .env.local                    # Secrets & API credentials
├── Caddyfile                     # Konfigurasi reverse proxy SSL HTTPS
├── telegram_bot.js               # Telegram Bot Daemon (Interactive Menu & Remote API)
├── backup_mikrotik.js            # Script penarik backup .backup & .rsc dari MikroTik
├── backup_server.ps1             # Script auto backup total & sender ke Telegram
├── restore_server.ps1            # Script 1-klik pemulihan bencana (Disaster Recovery)
├── disable_windows_update.ps1    # Script pemati Windows Update permanen
├── setup_wireguard.ps1           # Script inisialisasi VPN WireGuard
├── setup_winbox_forwarding.ps1   # Script konfigurasi Port Proxy Winbox
├── setup_backup_scheduler.ps1    # Script registrasi auto-backup Windows Task
├── setup_telegram_bot_service.ps1# Script registrasi auto-start Telegram Bot
└── mikrotik_wireguard.rsc        # Script konfigurasi WireGuard untuk MikroTik
```
