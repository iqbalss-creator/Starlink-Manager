# Contributing to Starlink Manager

Kami berterima kasih atas minat Anda untuk berkontribusi! Harap baca pedoman ini sebelum melakukan perubahan pada *source code*.

## Bagaimana Cara Berkontribusi?

1. **Laporkan Bug:** Jika menemukan *bug* atau celah keamanan (misalnya yang tercantum pada file `KNOWN_ISSUES.md`), laporkan atau buat *Issue* baru.
2. **Perbaikan *Technical Debt*:** Kontribusi sangat diharapkan pada pemecahan masalah *TypeScript* (67+ error) yang menghalangi kelancaran proses `build` ke produksi.
3. **Pengajuan Fitur:** Jangan menambahkan fitur besar sebelum mendiskusikannya di *Issues* untuk memastikan fitur tersebut sesuai dengan arsitektur saat ini (Next.js App Router).

## Aturan Penulisan Kode
- Kami menggunakan **TypeScript** (walaupun saat ini masih ada banyak isu *type safety*). Gunakan antarmuka (*Interface*) untuk mendefinisikan objek dari Database, terutama untuk `Customer`, `Voucher`, dan `Packages`.
- Gaya Penulisan: Ikuti standar ESLint bawaan Next.js.
- UI Framework: UI dibangun dengan **shadcn/ui** berbasis **Tailwind CSS**. Jika butuh komponen baru, utamakan menambahkan blok komponen dari dokumentasi resmi shadcn daripada menulis ulang gaya CSS manual.
- Interaksi Database: Akses basis data dilakukan lewat abstraksi fungsi di file berakhiran `actions.ts` atau *Server Actions*.

## Standar Pull Request (PR)
- Beri deskripsi ringkas mengenai apa yang diubah.
- Pastikan kodenya tidak merusak dependensi (kami merekomendasikan `npm run dev` untuk memastikan aplikasi bisa dirender secara lokal).
- Setiap pengajuan kode yang mengubah/memperbaiki *Technical Debt* harap menyertakan keterangan (contoh: "Fix TS Error pada modul Customers").
