const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

const host = env.match(/MIKROTIK_HOST=(.*)/)[1].trim();
const user = env.match(/MIKROTIK_USER=(.*)/)[1].trim();
const passMatch = env.match(/MIKROTIK_PASS=(.*)/);
let pass = passMatch ? passMatch[1].trim() : '';
if (pass.startsWith('"') && pass.endsWith('"')) pass = pass.slice(1, -1);
const port = env.match(/MIKROTIK_PORT=(.*)/)[1].trim();

const settings = [
  { key: 'mikrotik_host', value: host, description: 'IP Address MikroTik' },
  { key: 'mikrotik_user', value: user, description: 'Username admin MikroTik' },
  { key: 'mikrotik_password', value: pass, description: 'Password MikroTik' },
  { key: 'mikrotik_port', value: port, description: 'Port API MikroTik' }
];

async function insert() {
  for (const s of settings) {
    const res = await supabase.from('settings').upsert(s);
    console.log(res.error ? 'Error ' + s.key : 'Saved ' + s.key);
  }
}
insert();
