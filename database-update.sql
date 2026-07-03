-- Update Tabel Payments untuk Fitur Hutang
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Lunas';

-- Update Tabel Customers untuk menyimpan Username MikroTik
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS mikrotik_username TEXT;
