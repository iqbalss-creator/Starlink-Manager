export type Package = {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  created_at: string;
};

export interface Agent {
  id: string;
  name: string;
  whatsapp_number: string | null;
  commission_rate: number;
  created_at: string;
}

export interface Setting {
  key: string
  value: string
  description?: string
}

export interface SystemLog {
  id: string
  user_id?: string
  action_type: 'INSERT' | 'UPDATE' | 'DELETE'
  entity_type: string
  entity_id: string
  previous_data?: any
  new_data?: any
  created_at: string
}

export interface AgentSettlement {
  id: string;
  agent_id: string;
  total_sales_amount: number;
  commission_amount: number;
  net_amount: number;
  total_vouchers: number;
  settled_at: string;
  agents?: Agent | null;
}

export interface Voucher {
  id: string;
  customer_id: string | null;
  agent_id?: string | null;
  mikrotik_username: string | null;
  package_id: string | null;
  server: string | null;
  status: string;
  payment_status?: 'Lunas' | 'Belum Lunas';
  comment?: string;
  settlement_status?: 'Belum Setor' | 'Sudah Setor';
  settled_at?: string | null;
  expiry_date: string | null;
  last_reminder_sent_at?: string | null;
  created_at: string;
  packages?: Package | null;
  agents?: Agent | null;
}

export interface Customer {
  id: string;
  name: string;
  whatsapp_number: string;
  gender?: string | null;
  mikrotik_username?: string | null;
  package_id?: string | null;
  status?: string;
  expiry_date?: string | null;
  created_at: string;
  vouchers?: Voucher[];
  packages?: Package | null;
}

export interface Contact {
  id: string;
  name: string;
  whatsapp_number: string;
  gender?: string | null;
}

export type Payment = {
  id: string;
  customer_id: string;
  amount: number;
  payment_date: string;
  method: string;
  notes: string | null;
  status?: 'Lunas' | 'Hutang';
  created_at: string;
  customers?: Customer | null;
};
