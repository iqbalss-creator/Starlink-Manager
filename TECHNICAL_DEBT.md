# Technical Debt - Starlink Manager

## 1. Arsitektur & Framework
- **Middleware yang Salah Tempat:** Terdapat file `src/proxy.ts` yang berisi logika routing (cek cookie session dan redirect), mirip dengan fungsi middleware pada Next.js. Namun, Next.js mengharuskan file ini bernama `middleware.ts` (atau diletakkan di root / `src`). Karena salah nama, *route protection* ini tidak akan dieksekusi oleh Next.js, membuka semua halaman secara publik.

## 2. Kualitas Kode & TypeScript
- **TypeScript Compilation Errors:** Saat ini terdapat 67 error saat menjalankan `tsc --noEmit`. Error ini akan mencegah `next build` berhasil jika dijalankan secara penuh di lingkungan CI/CD. 
  - Masalah utamanya adalah inference type pada `FormData`, komponen `recharts` Tooltip Formatter, serta ketidakcocokan tipe relasi database antara `vouchers` dan `packages` akibat pemanggilan dari query Supabase.
- **Variabel Luar Scope:** Penggunaan variabel `pkg` di luar block scope-nya di beberapa tempat (misalnya di `actions.ts`).

## 3. Database & Keamanan
- **Custom Authentication Plain-text:** Tabel `app_users` menyimpan kata sandi dalam bentuk *plain-text*. Disarankan segera bermigrasi ke metode *hashing* sederhana (misal: bcrypt) atau menggunakan otentikasi native dari Supabase.
- **Row Level Security (RLS) Terbuka Lebar:** Kebanyakan kebijakan RLS disetel ke `USING (true) WITH CHECK (true)` untuk semua pengguna terotentikasi, atau `DISABLE ROW LEVEL SECURITY`. Jika *Anon Key* Supabase terekspos ke klien, seluruh database bisa diakses atau diubah oleh pihak luar.
- **Session Cookie Rentan:** `src/utils/roles.ts` memparsing cookie sesi secara manual. Jika terjadi kegagalan saat parsing, sistem me-return `'admin'` sebagai fallback. Hal ini berpotensi memberikan hak akses admin kepada pengguna dengan sesi yang rusak.

## 4. Performa & Skalabilitas (MikroTik Sync)
- **Logika Sync yang Lambat:** `syncMikrotikUsers` dalam `customers/actions.ts` bekerja dengan mengambil seluruh daftar user hotspot (via API `/ip/hotspot/user/print`), kemudian mencocokkannya satu per satu dengan database melalui proses looping.
- **Risiko Timeout:** Seiring bertambahnya jumlah pelanggan, sinkronisasi ini dapat memakan waktu lama, memberatkan router MikroTik, dan menyebabkan timeout pada server (Next.js server action limit / auto-sync interval di klien).

## 5. UI/UX & Handling
- **Kurangnya Error Boundary Global:** Proyek ini belum memiliki file `error.tsx` maupun `not-found.tsx` di level root, sehingga error yang tidak tertangani akan membuat UI crash secara penuh tanpa *fallback* yang bersih.
- **Feedback State Kurang:** Beberapa aksi server belum memiliki loading state yang cukup jelas di UI (misalnya spinner saat menghapus/sinkronisasi).
