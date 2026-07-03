-- 1. Lepas sementara paket dari pelanggan agar tidak terjadi error relasi
UPDATE customers SET package_id = NULL;

-- 2. Hapus semua data paket lama (termasuk Home 10Mbps dsb)
DELETE FROM packages;

-- 3. Masukkan data paket yang sudah disinkronkan murni dari MikroTik Anda
INSERT INTO packages (name, price, duration_days) VALUES
  ('1-jam', 2000, 1),
  ('6-jam', 5000, 1),
  ('1-hari', 8000, 1),
  ('1-minggu', 22000, 7),
  ('1-bulan-basic', 70000, 30),
  ('1-bulan-premium', 150000, 30),
  ('1-tahun', 1500000, 365),
  ('Pemasangan-Baru', 0, 30),
  ('irul', 0, 30),
  ('tamu', 0, 30);
