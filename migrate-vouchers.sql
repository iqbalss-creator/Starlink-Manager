-- 1. Buat tabel vouchers baru
CREATE TABLE IF NOT EXISTS vouchers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    mikrotik_username TEXT UNIQUE,
    package_id UUID REFERENCES packages(id),
    server TEXT DEFAULT 'all',
    status TEXT DEFAULT 'Belum Digunakan',
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Pindahkan data voucher yang sudah ada dari tabel customers ke tabel vouchers
INSERT INTO vouchers (customer_id, mikrotik_username, package_id, server, status, expiry_date)
SELECT id, mikrotik_username, package_id, server, status, expiry_date
FROM customers
WHERE mikrotik_username IS NOT NULL
ON CONFLICT (mikrotik_username) DO NOTHING;

-- 3. Hapus kolom-kolom lama dari tabel customers karena sudah dipindah ke tabel vouchers
ALTER TABLE customers 
DROP COLUMN IF EXISTS mikrotik_username,
DROP COLUMN IF EXISTS package_id,
DROP COLUMN IF EXISTS server,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS expiry_date;
