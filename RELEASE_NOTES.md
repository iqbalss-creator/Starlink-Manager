# Release Notes - Starlink Manager

## v0.1.0 (Initial Audit Phase)
- **Feature:** Pembangunan *dashboard* (UI) dengan shadcn/ui dan Next.js (App Router).
- **Feature:** Integrasi MikroTik via raw sockets API untuk manajemen hotspot user (Tambah, Edit, Disable, Limitasi Profil).
- **Feature:** Pengelolaan paket pelanggan, voucher (aktif, suspended, nonaktif), tagihan (invoice), dan setoran agen (reseller).
- **Feature:** Pencatatan lalu lintas secara real-time dari *interface* router MikroTik.
- **Bug/Issue:** Fitur sinkronisasi belum dioptimasi (O(N) *latency* per user), middleware tidak diletakkan dengan nama file yang benar (`proxy.ts` vs `middleware.ts`), dan berbagai celah perizinan database serta 67 error *strict type checking* TypeScript yang membutuhkan perbaikan arsitektural.
- **Security:** *Technical debt* yang signifikan di area penyandian password yang saat ini masih berbentuk teks biasa (*plain-text*) serta celah injeksi cookie sesi. Seluruh poin ini tercatat di `KNOWN_ISSUES.md` dan dijadwalkan pada roadmap rilis berikutnya.
