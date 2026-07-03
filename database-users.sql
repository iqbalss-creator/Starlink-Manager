-- Tabel app_users untuk custom auth (Login tanpa email)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Karena ini custom auth lokal, kita simpan plain-text atau simple hash
  role TEXT NOT NULL DEFAULT 'reviewer',
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hapus tabel user_roles lama jika ada
DROP TABLE IF EXISTS user_roles;

-- Karena kita pakai custom auth (tanpa Supabase Auth), 
-- kita pastikan tabel ini bisa diakses (RLS dimatikan atau public access)
-- Next.js middleware yang akan memblokir akses jika belum login.
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;

-- Pastikan tabel settings juga tidak diblokir RLS jika kita tidak pakai Supabase Auth
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs DISABLE ROW LEVEL SECURITY;

-- Buat user admin default agar bisa login pertama kali
INSERT INTO app_users (username, password, role, full_name)
VALUES ('admin', 'admin', 'admin', 'Administrator')
ON CONFLICT (username) DO NOTHING;
