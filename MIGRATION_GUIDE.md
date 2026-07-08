# Migration Guide - Starlink Manager

Dokumen ini menjelaskan hal-hal yang perlu disiapkan saat ingin memigrasikan project ini ke server atau penyedia layanan lain.

## 1. Lingkungan (Environment Variables)
Anda harus mengatur variabel berikut di production (sebaiknya gunakan manajer rahasia yang aman, jangan gunakan plain-text `.env.local` di kontrol versi):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `MIKROTIK_HOST`
- `MIKROTIK_USER`
- `MIKROTIK_PASS`
- `MIKROTIK_PORT`

## 2. Dependensi Eksternal
- **Supabase (PostgreSQL):** Platform bergantung secara kuat pada struktur database yang di-*host* di Supabase. Migrasi harus dilakukan dengan mengekspor *schema* beserta data (terutama tabel `app_users`, `vouchers`, `customers`, `settings`, dll).
- **MikroTik RouterOS:** Konektivitas API menggunakan port API (default: 8728) ke router secara langsung. Pastikan server produksi (Vercel, VPS, dsb) tidak diblokir akses port API MikroTik-nya.

## 3. Catatan Migrasi Database
Saat berpindah ke Supabase project baru, jalankan kembali script-script di bawah ini pada SQL Editor Supabase:
- `database-sistem.sql`
- `database-users.sql`
- `setup-agents-system.sql`
- Dan file SQL migrasi lainnya yang tersedia di root proyek.

Pastikan menonaktifkan RLS (jika custom auth tetap digunakan) atau mengatur policy RLS dengan benar sebelum sistem dirilis secara live. 
**Peringatan:** Setup saat ini rawan celah keamanan apabila RLS terekspos karena kebijakan akses tabel yang terlalu longgar. Disarankan membenahi file `.sql` sebelum migrasi server.

## 4. Proses Build & Deployment
Proyek Next.js tidak akan dapat dikompilasi hingga error TypeScript teratasi. Untuk sementara, deployment di lingkungan Vercel atau lainnya mungkin perlu menggunakan perintah `next build --no-lint` atau melonggarkan cek tipe data jika keadaan sangat terpaksa. Perbaikan penuh harus dilakukan sesuai dengan roadmap.
