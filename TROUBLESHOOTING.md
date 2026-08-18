# Troubleshooting - Starlink Manager

Jika Anda mengalami kendala saat mengembangkan atau menjalankan aplikasi, periksa panduan berikut:

## Aplikasi Gagal di Build (`npm run build`)
- **Penyebab:** Proyek memiliki *Technical Debt* berupa 67 masalah TypeScript yang membuat proses *build* terhenti.
- **Solusi Sementara:** Anda bisa melewati proses cek TypeScript saat *build* jika dalam kondisi mendesak dengan mengecualikan linting di *Next.js configuration*, tetapi perbaikan tuntas wajib dilakukan sesuai Roadmap. Gunakan `npm run dev` untuk pengembangan lokal.

## Sinkronisasi MikroTik Berjalan Sangat Lambat atau Timeout
- **Penyebab:** Auto-sync atau fungsi `syncMikrotikUsers` melakukan looping dan pengiriman request individual per pengguna yang jumlahnya besar, melebihi batas waktu eksekusi Vercel (10 detik untuk plan gratis) atau PHP/Node limit.
- **Solusi:** Jalankan fungsi berat di latar belakang menggunakan cron server yang terpisah (misalnya memanggil endpoint API khusus tanpa menunggu hasil UI), atau pecah proses sync ke dalam kelompok-kelompok kecil (*batch processing*).

## Sesi Login Mendadak Beralih Menjadi Admin Secara Sendirinya
- **Penyebab:** Kesalahan membaca cookie di `src/utils/roles.ts` (jika cookie terkorupsi atau tidak terurai ke JSON) menyebabkan skrip secara otomatis "gagal-aman" menjadi `admin`. Ini adalah kerentanan serius.
- **Solusi:** Ubah `roles.ts` untuk mengembalikan status `null` atau `guest` ketika struktur cookie tidak valid, memaksa pengulangan login.

## Error pada Database ("Return array differs from object expectation")
- **Penyebab:** Kode frontend (misalnya di action Vouchers dan Analytics) mengharapkan `vouchers.packages` sebagai sebuah obyek `{}`, namun query Supabase (karena format skema tertentu) mengembalikannya sebagai array `[]`.
- **Solusi:** Tangani hasil tersebut dengan memeriksa tipe (contoh: `Array.isArray(pkg) ? pkg[0] : pkg`).

## Tampilan CSS/Tailwind Rusak
- **Penyebab:** Konfigurasi `postcss` atau `tailwind.config.ts` tidak membaca direktori dengan benar.
- **Solusi:** Hapus folder `.next` lalu jalankan ulang `npm run dev`. Pastikan ekstensi `.tsx` dan `.ts` termasuk dalam *content path* konfigurasi Tailwind.
