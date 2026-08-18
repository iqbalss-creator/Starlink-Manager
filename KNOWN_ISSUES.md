# Known Issues - Starlink Manager

- **Build Errors:** Next.js gagal dibuild untuk mode produksi (exited with code 1) dikarenakan sekitar 67 masalah tipe data TypeScript. Kebanyakan bersumber dari relasi database tabel `vouchers` yang mengembalikan tipe Array padahal frontend berekspektasi Object, dan penggunaan API `FormData`.
- **Keamanan Cookie:** Metode fallback di `src/utils/roles.ts` sangat berbahaya karena mengembalikan string `'admin'` bila JSON parsing pada cookie mengalami kegagalan.
- **Autentikasi Palsu (Bypass):** `proxy.ts` digunakan dengan asumsi sebagai middleware untuk mencegah akses. Kenyataannya, Next.js hanya akan memuat middleware dari file yang spesifik bernama `middleware.ts`. Route `dashboard` saat ini rawan terbuka tanpa perlindungan (atau jika terlindungi, hal tersebut kebetulan terjadi secara server components).
- **Hardcoded Secrets:** Pada file API `src/app/api/mikrotik/route.ts`, koneksi mengasumsikan data credential akan ada pada `.env.local` namun cara pengiriman plain-text bisa disadap di sistem yang tidak terlindungi SSL.
- **Performa Sinkronisasi:** Membuka halaman Customer menyebabkan sinkronisasi massal via `syncMikrotikUsers`. Operasi ini looping secara internal dan akan mudah mendapatkan *execution timeout* pada aplikasi dengan data besar.
- **Agent Vouchers Deletion:** Proses hapus kloter via MikroTik API menggunakan iterasi sekuensial yang menyebabkan antarmuka "tergantung" hingga seluruh instruksi hapus selesai dilakukan.
