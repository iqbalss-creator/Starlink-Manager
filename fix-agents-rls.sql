-- Mengaktifkan RLS untuk tabel agents dan agent_settlements
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_settlements ENABLE ROW LEVEL SECURITY;

-- Membuat policy agar aplikasi bisa membaca, menambah, mengubah, dan menghapus data agents
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON agents;
CREATE POLICY "Enable all access for authenticated users" 
ON agents 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Membuat policy agar aplikasi bisa membaca, menambah, mengubah, dan menghapus data agent_settlements
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON agent_settlements;
CREATE POLICY "Enable all access for authenticated users" 
ON agent_settlements 
FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
