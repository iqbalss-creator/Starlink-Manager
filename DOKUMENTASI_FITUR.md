# 📋 DOKUMENTASI FITUR LENGKAP - STARLINK MANAGER

Dokumentasi ini mencakup seluruh fitur yang telah selesai dibangun dan aktif pada sistem **Starlink Manager**.

---

## 1. Integrasi MikroTik RouterOS (RB1100AHx4)
- **Koneksi Jaringan**: Terhubung melalui WireGuard VPN Tunnel (`10.8.0.2:8728`) dengan enkripsi ChaCha20-Poly1305.
- **Port Forwarding Winbox**: Port `8291` diteruskan ke `10.8.0.2:8291` sehingga admin dapat login Winbox langsung melalui domain `allstar.my.id` tanpa VPN client.
- **Port Forwarding API & WebFig**: Port `8728` & `8080` aktif untuk sinkronisasi web dan WebFig browser.
- **Fitur API RouterOS**:
  - Query resource sistem (CPU, RAM, Uptime, Versi RouterOS).
  - Manajemen user hotspot (Tambah user, hapus user, enable/disable user).
  - Monitoring user hotspot aktif secara real-time.
  - Monitoring traffic bandwidth interface.
  - Export konfigurasi script (`.rsc`) dan binary backup (`.backup`).

---

## 2. Bot Telegram Interaktif (@StarlinkBackupBot)
- **Tampilan Menu Tombol (Interactive Keyboard)**:
  - `📊 Status`: Cek ringkasan router (CPU, RAM, Uptime, Board, OS Version).
  - `⚡ User Aktif`: Melihat user hotspot yang sedang online beserta IP dan waktu aktif.
  - `👥 Semua User`: Menampilkan seluruh user hotspot yang terdaftar di MikroTik.
  - `📈 Bandwidth`: Menampilkan status bandwidth TX/RX pada interface jaringan.
  - `💾 Backup Sekarang`: Memicu backup instan MikroTik & Server lalu mengirimkannya ke Telegram.
  - `📦 Last Backup`: Menampilkan info backup terakhir dan tombol unduh langsung (`.zip`, `.backup`, `.rsc`).
  - `🏥 Health Check`: Memeriksa kesehatan server web, MikroTik, dan VPN tunnel.
  - `📋 Laporan`: Mengirim ringkasan laporan harian manual.
  - `📜 Log MikroTik`: Menampilkan 15 baris log sistem router terbaru.
  - `❓ Bantuan`: Panduan penggunaan perintah bot.
- **Perintah Lanjutan (Advanced Commands)**:
  - `/adduser <nama> <pass> [profile]`
  - `/deluser <nama>`
  - `/kick <nama>`
  - `/ping <host>`
  - `/reboot`
- **Sistem Otomasi Background**:
  - **Health Monitor**: Interval 5 menit (Peringatan server/router offline & beban tinggi).
  - **Security Monitor**: Interval 2 menit (Deteksi login baru, failed login, interface down).
  - **Daily Report**: Setiap pukul 07:00 WIB.

---

## 3. Sistem Auto-Backup & Disaster Recovery
- **Jadwal Harian**: Setiap pukul 02:00 WIB melalui Windows Task Scheduler (`StarlinkManagerAutoBackup`).
- **Isi Backup Total**:
  1. Source code aplikasi Next.js.
  2. File konfigurasi `.env.local`, `Caddyfile`, dan keys VPN WireGuard.
  3. Binary backup resmi MikroTik (`.backup`).
  4. Script teks export konfigurasi MikroTik (`.rsc`).
- **Cloud Delivery**: Otomatis dikirim ke akun Telegram admin via Telegram Bot API.
- **Retensi Otomatis**: Menyimpan 7 file backup harian lokal terakhir untuk menghemat kapasitas disk.
- **1-Click Restore (`restore_server.ps1`)**: Memulihkan seluruh aplikasi, settingan, dan koneksi server dalam 1 perintah.

---

## 4. Web Dashboard & Server Production
- **Teknologi**: Next.js 15, React 19, TypeScript, Tailwind CSS, Supabase SSR.
- **Web Server**: Caddy Reverse Proxy dengan auto-renew sertifikat SSL Let's Encrypt / ZeroSSL pada `allstar.my.id`.
- **Database**: Cloud Database Supabase (PostgreSQL) untuk data voucher, billing, dan riwayat transaksi.
- **Background Daemon**: Menjalankan server Next.js dan Telegram Bot secara persisten.

---

## 5. Konfigurasi Windows Server
- **Auto Update Disabled**: Layanan `wuauserv`, `UsoSvc`, dan `WaaSMedicSvc` dinonaktifkan dengan kebijakan Group Policy Registry `NoAutoUpdate=1` agar server tidak reboot mendadak.
- **Auto Startup**: Seluruh layanan (WireGuard, Telegram Bot, dan Caddy) terkonfigurasi untuk langsung menyala otomatis saat komputer dinyalakan.
