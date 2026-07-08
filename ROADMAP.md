# Roadmap - Starlink Manager

## Completed
- Setup Next.js App Router & Tailwind CSS.
- Integrasi UI Shadcn.
- Database Schema & Supabase Client configuration.
- Halaman dashboard utama, list customer, agent, package, payment, invoice, analytics.
- Sinkronisasi MikroTik API (add, edit, delete, live traffic).
- Fitur piutang & settlement agen.

## Current Development
- **Fixing Build Errors:** Menangani 67 error TypeScript yang mencegah build production Next.js.
- **Perbaikan RLS:** Mengamankan kebijakan akses Row Level Security di database Supabase agar tidak dieksploitasi oleh pihak ketiga.
- **Perbaikan Middleware:** Memindahkan/mengganti nama `src/proxy.ts` menjadi `src/middleware.ts` untuk memastikan route terlindungi.
- **Hashing Sandi:** Menambahkan lapisan hashing sederhana (misalnya `bcrypt`) pada tabel `app_users`.

## Short Term
- Mengubah fungsi sinkronisasi MikroTik (`syncMikrotikUsers`) agar menggunakan batch processing yang lebih efisien dan terhindar dari *timeout*.
- Menambahkan Error Boundary global (`error.tsx`) untuk mencegah crash aplikasi saat terjadi kesalahan internal.
- Menambahkan dokumentasi yang komprehensif bagi developer di GitHub.

## Medium Term
- Pindah dari scheduler MikroTik yang kaku ke sistem internal Job Scheduler / Cron agar aplikasi memiliki kendali penuh atas sesi internet pelanggan.
- Implementasi Payment Gateway (Xendit/Midtrans) untuk memfasilitasi pembayaran QRIS secara otomatis (saat ini QRIS mungkin masih manual).
- Melengkapi fungsi notifikasi pengingat pembayaran ke WhatsApp pelanggan menggunakan API pihak ketiga (misalnya WABlas, Fonnte, dll).

## Long Term
- Fitur multi-router (mendukung banyak MikroTik secara terpisah dalam satu dashboard).
- Sistem manajemen topologi jaringan tingkat lanjut untuk perangkat jaringan selain MikroTik (misal OLT, OLT ZTE, Huawei, dll).
- Integrasi ke Starlink API lokal untuk memonitor dishy stats (kecepatan ping, uptime) secara komprehensif jika dimungkinkan.

## Technical Debt
- Segera tangani referensi relasi Supabase yang menghasilkan return `packages` tipe Array (sedangkan kode mengasumsikan tipe Object).
- Perbaiki logic fallback cookie di `utils/roles.ts` agar tidak otomatis memberikan hak akses admin jika terjadi kegagalan sistem.
