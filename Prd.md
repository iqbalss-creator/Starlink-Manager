Product Requirements Document (PRD) - Starlink Manager
Versi Dokumen: 1.0
Tanggal: 29 Juni 2026
Penulis: Lead Product Manager
Status: Draf untuk Persetujuan
1. Latar Belakang & Visi Produk
Latar Belakang:
Saat ini, pengelolaan operasional bisnis penyedia layanan internet (ISP) berbasis Starlink masih dilakukan secara manual atau semi-manual, seringkali menggunakan spreadsheet. Proses ini rentan terhadap kesalahan manusia (human error), tidak efisien, dan sulit untuk diskalakan. Pencatatan pelanggan baru, pelacakan pembayaran, penanganan tagihan, dan pemantauan masa aktif layanan menjadi beban administratif yang signifikan seiring bertambahnya jumlah pelanggan.
Visi Produk:
Menjadi pusat kendali operasional (single source of truth) yang terintegrasi, modern, dan mudah digunakan untuk bisnis ISP Starlink. Starlink Manager akan mengotomatisasi tugas-tugas administratif yang berulang, memberikan visibilitas penuh terhadap kesehatan bisnis, dan memungkinkan pemilik untuk fokus pada pertumbuhan dan pelayanan pelanggan, bukan pada pekerjaan manual.
2. Target Pengguna (User Persona)
Nama: Pemilik/Admin ISP
Tujuan:
Mengelola seluruh data pelanggan di satu tempat.
Mengetahui dengan cepat siapa yang sudah dan belum membayar.
Mengotomatisasi proses penagihan dan pengingat.
Melihat performa bisnis (pendapatan, pelanggan baru) dalam sekejap.
Tantangan (Pain Points):
"Saya sering lupa siapa yang sudah jatuh tempo."
"Mencari data pelanggan di spreadsheet sangat lambat."
"Saya khawatir ada data yang salah input atau terhapus."
"Saya tidak punya gambaran jelas tentang pendapatan bulan ini."
3. Fitur Utama & Kebutuhan Pengguna (User Stories)
Fitur-fitur ini dikelompokkan berdasarkan prioritas untuk pengembangan.
Prioritas 1: Fondasi & Manajemen Inti (MVP - Minimum Viable Product)
F.1: Autentikasi & Keamanan
User Story: "Sebagai Admin, saya ingin login ke dalam sistem menggunakan email dan password agar data bisnis saya aman dan tidak bisa diakses sembarang orang."
F.2: Manajemen Paket Layanan (CRUD)
User Story: "Sebagai Admin, saya ingin dapat membuat, melihat, mengubah, dan menghapus daftar paket internet (misal: Home 10Mbps, Business 50Mbps) beserta harga dan durasinya."
F.3: Manajemen Pelanggan (CRUD)
User Story: "Sebagai Admin, saya ingin dapat menambahkan pelanggan baru, melihat daftar semua pelanggan, mengubah detail mereka (kontak, alamat), dan menetapkan paket layanan yang mereka gunakan."
Prioritas 2: Manajemen Keuangan & Operasional
F.4: Pencatatan Pembayaran
User Story: "Sebagai Admin, saat pelanggan membayar, saya ingin dapat mencatat pembayaran tersebut untuk pelanggan yang bersangkutan, yang secara otomatis akan memperbarui tanggal jatuh tempo mereka."
F.5: Dashboard Analitik
User Story: "Sebagai Admin, saat saya login, saya ingin langsung melihat ringkasan bisnis di halaman utama (dashboard), yang menampilkan total pendapatan, jumlah pelanggan aktif, dan tagihan yang akan jatuh tempo."
Prioritas 3: Otomatisasi & Fitur Lanjutan (Masa Depan)
F.6: Pembuatan Invoice & PDF
User Story: "Sebagai Admin, saya ingin dapat membuat invoice (tagihan) dalam format PDF untuk pelanggan tertentu."
F.7: Notifikasi Otomatis (Integrasi WhatsApp)
User Story: "Sebagai Admin, saya ingin sistem secara otomatis mengirimkan pengingat pembayaran melalui WhatsApp kepada pelanggan yang akan jatuh tempo."
4. Metrik Kesuksesan
Aktivasi: Jumlah pengguna (admin) yang berhasil login dan menggunakan aplikasi.
Retensi: Admin terus menggunakan aplikasi setiap hari/minggu untuk mengelola bisnisnya.
Efisiensi: Berkurangnya waktu yang dihabiskan untuk tugas administratif (diukur melalui feedback pengguna).
Akurasi Data: Berkurangnya kesalahan dalam pencatatan pembayaran dan masa aktif pelanggan.
Development Plan & High-Level Technical Strategy
Penulis: Lead Technical Architect
Rencana ini menerjemahkan PRD di atas menjadi langkah-langkah teknis yang nyata.
1. Pilihan Teknologi (Tech Stack)
Frontend: Next.js (React) - Untuk antarmuka yang cepat, modern, dan interaktif.
UI Library: Bootstrap 5 & shadcn/ui (atau sejenisnya) - Menggabungkan kemudahan Bootstrap dengan estetika modern dari komponen siap pakai.
Backend & Database: Supabase - Untuk database PostgreSQL, autentikasi, API, dan fungsi serverless.
Deployment: Vercel - Untuk hosting yang terintegrasi penuh dengan Next.js dan proses Continuous Deployment.
2. Fase Pengembangan (Sprints)
Proyek akan dibagi menjadi beberapa fase (sprint) yang fokus pada hasil yang dapat diuji.
Sprint 0: Persiapan Fondasi (Estimasi: 1-2 hari)
Tugas:
Setup proyek Supabase: membuat tabel database (profiles, packages, customers).
Setup proyek Next.js baru.
Konfigurasi koneksi Next.js ke Supabase.
Menerapkan Row Level Security (RLS) dasar di Supabase.
Hasil: Lingkungan pengembangan siap, database siap, koneksi aman.
Sprint 1: Autentikasi & Layout Utama (Estimasi: 2-3 hari)
Tugas:
Membuat halaman Login.
Mengimplementasikan alur kerja login dan logout menggunakan Supabase Auth.
Membuat layout utama aplikasi (Sidebar, Navbar) yang hanya dapat diakses setelah login.
Menerapkan protected routes (halaman yang tidak bisa diakses sebelum login).
Hasil: Versi pertama aplikasi yang dapat di-deploy. Pengguna bisa login/logout dengan aman.
Sprint 2: Fungsionalitas Manajemen Paket & Pelanggan (Estimasi: 4-5 har)
Tugas:
Membuat halaman "Paket" untuk menampilkan semua paket dari database.
Mengimplementasikan fungsionalitas CRUD (Create, Read, Update, Delete) untuk paket layanan menggunakan modal/form.
Membuat halaman "Customer" untuk menampilkan semua pelanggan dari database.
Mengimplementasikan fungsionalitas CRUD untuk pelanggan, termasuk form untuk memilih paket dari data yang sudah ada.
Membangun komponen UI yang dapat digunakan kembali (seperti tabel data, modal, tombol).
Hasil: Fitur inti aplikasi berfungsi penuh. Admin dapat mengelola data master (paket dan pelanggan) secara mandiri.
Sprint 3: Fungsionalitas Pembayaran & Dashboard Awal (Estimasi: 3-4 hari)
Tugas:
Membuat fungsi di dalam halaman detail pelanggan untuk "Mencatat Pembayaran".
Logika bisnis: Saat pembayaran dicatat, last_payment_date dan expiry_date pelanggan diperbarui secara otomatis berdasarkan durasi paket.
Membuat halaman "Pembayaran" untuk menampilkan riwayat semua transaksi.
Membangun halaman Dashboard versi pertama: menampilkan kartu statistik sederhana (Total Pelanggan, Paket Aktif) dengan data real-time dari Supabase.
Hasil: Aplikasi dapat digunakan untuk operasional harian (mencatat pembayaran) dan memberikan gambaran dasar tentang kondisi bisnis.
Sprint 4: Peningkatan Kualitas & Fitur Lanjutan (Estimasi: Berkelanjutan)
Tugas:
Dashboard Lanjutan: Membuat query yang lebih kompleks di Supabase untuk menampilkan grafik pendapatan bulanan.
Manajemen Invoice: Membuat tabel invoices di database dan fungsionalitas untuk men-generate tagihan.
Fungsi Serverless (Supabase Edge Functions):
Membuat fungsi terjadwal untuk memeriksa pelanggan yang akan jatuh tempo setiap hari.
Mempersiapkan integrasi untuk notifikasi (misalnya, mengirim email atau webhook ke layanan WhatsApp Gateway).
Peningkatan UX: Menerapkan fungsionalitas pencarian, filter, dan paginasi pada tabel data untuk memudahkan pengelolaan data dalam jumlah besar.
Refinement & Bug Fixing: Alokasi waktu untuk memperbaiki bug dan menyempurnakan alur kerja berdasarkan feedback.
3. Strategi Deployment & Testing
Version Control: Seluruh kode akan disimpan dalam repositori GitHub. Ini penting untuk pelacakan perubahan dan kolaborasi.
Deployment Otomatis: Akun Vercel akan dihubungkan ke repositori GitHub.
Setiap perubahan yang di-push ke branch utama akan secara otomatis men-deploy versi produksi terbaru.
Setiap pull request atau perubahan di branch lain akan secara otomatis membuat "Preview Deployment" dengan URL unik. Ini memungkinkan kita untuk meninjau perubahan sebelum dirilis ke produksi.
Lingkungan:
Development (Lokal): Pengembang akan menjalankan aplikasi di komputer masing-masing, terhubung ke database Supabase.
Staging/Preview (Vercel): Digunakan untuk meninjau fitur baru.
Production (Vercel): Aplikasi live yang diakses oleh pengguna.
Strategi Testing:
Manual Testing: Setelah setiap sprint, fitur baru akan diuji secara manual berdasarkan user stories di PRD.
Automated Testing (Fase Lanjutan): Setelah aplikasi stabil, kita dapat menambahkan end-to-end tests menggunakan Cypress atau Playwright untuk mengotomatisasi pengujian alur kerja kritis (seperti login, tambah customer) untuk mencegah regresi di masa depan.
4. Langkah Berikutnya (Action Items)
Persetujuan Dokumen: Anda menyetujui PRD dan Development Plan ini sebagai panduan utama proyek.
Setup Awal (Tugas Anda dengan Panduan Saya):
Membuat akun di GitHub, Supabase, dan Vercel.
Membuat proyek baru di Supabase dan menjalankan skrip SQL awal yang akan saya sediakan (seperti pada interaksi kita sebelumnya).
Eksekusi Sprint 0 & 1 (Tugas Saya):
Saya akan membangun Proyek Starter yang mencakup hasil dari Sprint 0 dan Sprint 1.
Saya akan menempatkan kode ini di repositori GitHub Anda.
Handover & Pelatihan Awal:
Saya akan memberikan panduan lengkap tentang cara menjalankan proyek di komputer Anda dan cara menghubungkannya ke Vercel agar aplikasi Anda bisa online.
Dengan rencana ini, kita memiliki peta jalan yang jelas, profesional, dan terstruktur untuk membangun Starlink Manager menjadi sebuah produk yang solid dan siap untuk masa depan.