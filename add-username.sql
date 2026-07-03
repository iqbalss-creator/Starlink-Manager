-- 1. Tambahkan kolom mikrotik_username jika belum ada
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS mikrotik_username TEXT;

-- 2. (Opsional) Jika Anda ingin membersihkan data pelanggan lama yang error/kosong
-- DELETE FROM customers WHERE mikrotik_username IS NULL;
