import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data: vouchers, error: vErr } = await supabase
    .from('vouchers')
    .select('id, mikrotik_username, created_at, agent_id, agents(name)')
    .not('agent_id', 'is', null);

  if (vErr) {
    console.error('Error fetching vouchers:', vErr);
    return;
  }

  console.log(`Found ${vouchers.length} agent vouchers.`);

  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const updatePromises = vouchers.map(async (v) => {
    try {
      const agentName = (v.agents?.name || 'agen').replace(/\s+/g, '').toLowerCase().substring(0, 5);
      const createdDate = new Date(v.created_at);
      const mikhmonDate = `${months[createdDate.getMonth()]}/${createdDate.getDate().toString().padStart(2, '0')}/${createdDate.getFullYear()}`;
      const commentStr = `vc-${mikhmonDate}-${agentName}`;

      // Update in DB
      await supabase.from('vouchers').update({ comment: commentStr }).eq('id', v.id);
      
      // Update in Mikrotik using our API
      // Since it's a node script, we can't easily call our own Next.js API unless the server is running.
      // But we can just use node-fetch to call localhost:3000/api/mikrotik
      
      const res = await fetch('http://localhost:3000/api/mikrotik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: '/ip/hotspot/user/set',
          params: [`=numbers=${v.mikrotik_username}`, `=comment=${commentStr}`]
        })
      });

      if (!res.ok) {
         const errData = await res.text();
         console.error(`Failed to update MT for ${v.mikrotik_username}:`, errData);
      } else {
         console.log(`Updated ${v.mikrotik_username} -> ${commentStr}`);
      }
    } catch (e) {
      console.error(`Error on voucher ${v.mikrotik_username}:`, e);
    }
  });

  await Promise.all(updatePromises);
  console.log('Finished updating comments.');
}

run();
