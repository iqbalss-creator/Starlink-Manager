-- 1. Create agents table
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    whatsapp_number TEXT,
    commission_rate NUMERIC DEFAULT 20.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Modify vouchers table
ALTER TABLE vouchers 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS settlement_status TEXT DEFAULT 'Belum Setor',
ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE;

-- 3. Create agent_settlements table for history
CREATE TABLE IF NOT EXISTS agent_settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    total_sales_amount NUMERIC NOT NULL DEFAULT 0,
    commission_amount NUMERIC NOT NULL DEFAULT 0,
    net_amount NUMERIC NOT NULL DEFAULT 0,
    total_vouchers INTEGER NOT NULL DEFAULT 0,
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
