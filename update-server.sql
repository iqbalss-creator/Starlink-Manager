-- Tambahkan kolom server untuk pengaturan server hotspot
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS server TEXT DEFAULT 'all';
