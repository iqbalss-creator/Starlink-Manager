# Business Rules - Starlink Manager

## 1. Manajemen Pelanggan & Voucher
- **Pembuatan Pelanggan:** Setiap pelanggan dapat memiliki beberapa voucher aktif sekaligus. Jika agen membuat voucher, kepemilikan voucher akan dikaitkan dengan agen tersebut.
- **Siklus Hidup Voucher:** 
  - Status default: `Belum Digunakan`.
  - Saat login pertama, status berubah menjadi `Aktif` dan dihitung masa berlakunya.
  - Setelah masa aktif habis, status menjadi `Nonaktif` atau `Suspended` dan akses internet diputus melalui MikroTik scheduler.
- **Pemutusan Akses:** Dilakukan secara otomatis melalui MikroTik scheduler yang diset sesuai tanggal `expiry_date`.

## 2. Keuangan & Pembayaran
- **Sistem Pembayaran:** Mendukung metode 'Tunai', 'Transfer', dan 'QRIS'.
- **Status Piutang:** Voucher dapat dibuat dengan status `Belum Lunas`. Sistem mengizinkan pelunasan secara kolektif (Kasbon/Hutang).
- **Komisi Agen (Reseller):** Agen menerima persentase komisi (`commission_rate`, default 20%) dari penjualan voucher.
- **Sistem Setoran (Settlement):** Agen melakukan setoran ke pusat setelah dipotong komisi. Status voucher berubah menjadi `Sudah Setor`.

## 3. Integrasi MikroTik
- **Sinkronisasi Otomatis:** Sistem berjalan setiap 2 menit (auto-sync) untuk memperbarui data pemakaian aktif dari Hotspot MikroTik ke Database (status Aktif, masa aktif, dll).
- **Naming Convention:** Username MikroTik dihasilkan berdasarkan nama pelanggan dan 3 digit terakhir WhatsApp ditambah nomor urut (contoh: `ali1231`).
- **Import Otomatis Mikhmon:** Voucher yang dihasilkan dari Mikhmon yang sedang digunakan (terdeteksi dari comment "vc-" atau format tanggal) akan otomatis ditarik ke dalam database Starlink Manager.

## 4. Keamanan Akses
- Terdapat role `admin` dan `reviewer`. Role `reviewer` tidak memiliki akses ke pengaturan sistem dan manajemen pengguna, serta tidak bisa melihat saldo detail jika disembunyikan.
