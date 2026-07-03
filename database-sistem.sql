-- Tabel Settings untuk Integrasi
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);

-- Tabel System Logs untuk Undo System
CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  action_type TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  entity_type TEXT NOT NULL, -- 'customers', 'payments', dsb
  entity_id TEXT,
  previous_data JSONB,
  new_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Mengaktifkan RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Membuat policy untuk akses penuh bagi user yang sudah login (authenticated)
CREATE POLICY "Enable all access for authenticated users" ON settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for authenticated users" ON system_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
