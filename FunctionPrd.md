# Product Requirements Document (PRD)

# Starlink Manager v2.1

## Module Navigation & Functional Scope

---

# Product Overview

Starlink Manager adalah aplikasi berbasis Google Apps Script yang digunakan untuk mengelola pelanggan Starlink, pembayaran, paket layanan, monitoring jaringan, serta administrasi operasional dalam satu dashboard terintegrasi.

Tujuan utama aplikasi adalah:

* Mengelola seluruh data pelanggan
* Mengelola paket internet
* Mengelola pembayaran dan invoice
* Monitoring perangkat jaringan
* Monitoring layanan Starlink
* Otomatisasi reminder
* Pelaporan operasional
* Integrasi dengan MikroTik dan layanan Google

---

# Navigation Structure

Aplikasi menggunakan **7 Menu Utama** agar sidebar tetap bersih, mudah dipahami, dan mudah dikembangkan.

---

# 1. Dashboard

## Tujuan

Memberikan ringkasan kondisi sistem secara real-time.

### Menu

* Overview
* Analytics
* Aktivitas Terbaru

### Fungsi

* Total Customer
* Customer Aktif
* Customer Suspend
* Customer Expired
* Total Pendapatan
* Pendapatan Hari Ini
* Pendapatan Bulan Ini
* Invoice Belum Dibayar
* Pembayaran Terbaru
* Customer Baru
* Aktivitas Sistem
* Grafik Pendapatan
* Grafik Customer
* Quick Action
* Shortcut Modul

---

# 2. Customer

## Tujuan

Mengelola seluruh data pelanggan.

### Menu

* Daftar Customer
* Paket Customer
* Riwayat Pembayaran
* Riwayat Invoice

### Fungsi

### Daftar Customer

* Tambah Customer
* Edit Customer
* Hapus Customer
* Detail Customer
* Cari Customer
* Filter Customer
* Import Customer
* Export Customer

### Paket Customer

* Lihat Paket Aktif
* Upgrade Paket
* Downgrade Paket
* Ganti Paket
* Perpanjang Paket

### Riwayat Pembayaran

* Daftar Pembayaran
* Detail Pembayaran
* Status Pembayaran

### Riwayat Invoice

* Daftar Invoice
* Status Invoice
* Download Invoice

---

# 3. Keuangan

## Tujuan

Mengelola seluruh transaksi keuangan.

### Menu

* Pembayaran
* Invoice
* Reminder Tagihan

---

## Pembayaran

### Fungsi

* Tambah Pembayaran
* Edit Pembayaran
* Hapus Pembayaran
* Konfirmasi Pembayaran
* Metode Pembayaran
* Cash
* Transfer
* QRIS
* Export Data

---

## Invoice

### Fungsi

* Generate Invoice
* Nomor Otomatis
* Cetak PDF
* Download PDF
* Kirim WhatsApp
* Kirim Email
* Status Invoice
* Lunas
* Belum Lunas
* Jatuh Tempo

---

## Reminder Tagihan

### Fungsi

* Reminder Manual
* Reminder Otomatis
* Jadwal Reminder
* Template Reminder
* Reminder WhatsApp
* Reminder Email

---

# 4. Jaringan

## Tujuan

Monitoring perangkat jaringan dan layanan Starlink.

### Menu

* MikroTik
* Starlink
* Monitoring

---

## MikroTik

### Fungsi

* Status Router
* User Hotspot
* Sinkron Customer
* Sinkron Paket
* Enable User
* Disable User
* Disconnect User
* Monitoring Interface
* Monitoring Traffic

---

## Starlink

### Fungsi

* Status Dish
* Online
* Offline
* Latency
* Download Speed
* Upload Speed
* Data Usage
* Device Information
* Riwayat Gangguan

---

## Monitoring

### Fungsi

* Status Router
* Status Starlink
* Status API
* Status Spreadsheet
* Error Monitoring
* Resource Monitoring
* Network Health

---

# 5. Laporan

## Tujuan

Menyediakan laporan operasional dan keuangan.

### Menu

* Pendapatan
* Customer
* Pembayaran
* Invoice
* Export

---

## Fungsi

* Laporan Pendapatan
* Laporan Customer
* Laporan Paket
* Laporan Pembayaran
* Laporan Invoice
* Grafik Statistik
* Export Excel
* Export PDF
* Filter Periode

---

# 6. Komunikasi

## Tujuan

Mengelola seluruh komunikasi kepada pelanggan.

### Menu

* WhatsApp
* Email
* Template

---

## WhatsApp

### Fungsi

* Kirim Manual
* Broadcast
* Reminder
* Invoice
* Riwayat Pengiriman
* Status Pengiriman

---

## Email

### Fungsi

* Kirim Manual
* Broadcast
* Reminder
* Invoice
* Riwayat Email

---

## Template

### Fungsi

* Template Reminder
* Template Invoice
* Template Broadcast
* Template Email
* Template WhatsApp

---

# 7. Sistem

## Tujuan

Mengelola konfigurasi aplikasi.

### Menu

* User Management
* Hak Akses
* Pengaturan
* Integrasi
* Backup
* Log Aktivitas
* Monitoring Sistem
* Tentang

---

## User Management

### Fungsi

* Tambah User
* Edit User
* Hapus User
* Reset Password
* Aktivitas User

---

## Hak Akses

### Fungsi

Role:

* Super Admin
* Admin
* Operator
* Viewer

Permission:

* Dashboard
* Customer
* Keuangan
* Jaringan
* Laporan
* Komunikasi
* Sistem

---

## Pengaturan

### Fungsi

### Umum

* Nama Aplikasi
* Logo
* Bahasa
* Zona Waktu

### Tema

* Dark Mode
* Light Mode
* Warna Tema

### Invoice

* Prefix
* Penomoran
* Template

### Reminder

* Jadwal
* Template

---

## Integrasi

### Fungsi

* Google Sheets
* Gmail
* Google Drive
* WhatsApp API
* MikroTik API
* Starlink API
* Webhook

---

## Backup

### Fungsi

* Backup Manual
* Backup Otomatis
* Restore
* Download Backup
* Riwayat Backup

---

## Log Aktivitas

### Fungsi

* Login
* Logout
* Tambah Data
* Edit Data
* Hapus Data
* Error Log
* API Log
* Filter

---

## Monitoring Sistem

### Fungsi

* Status Server
* Status Spreadsheet
* Status API
* Status Database
* Status Integrasi

---

## Tentang

### Fungsi

* Informasi Aplikasi
* Versi
* Changelog
* Dokumentasi
* Developer
* Lisensi

---

# Navigation Principle

* Maksimal 7 menu utama pada sidebar.
* Seluruh fitur dikelompokkan ke dalam submenu sesuai domain bisnis.
* Sidebar menggunakan Accordion Navigation (expand/collapse).
* Modul yang belum selesai dapat ditampilkan dengan status "Coming Soon" tanpa mengubah struktur navigasi.
* Struktur menu dianggap final dan menjadi acuan seluruh pengembangan berikutnya.
