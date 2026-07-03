-- Mengaktifkan RLS
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Membuat policy agar user yang sudah login bisa membaca, menambah, mengubah, dan menghapus voucher
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON vouchers;
CREATE POLICY "Enable all access for authenticated users" 
ON vouchers 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
