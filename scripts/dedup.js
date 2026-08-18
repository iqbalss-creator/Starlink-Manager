import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function run() {
  const { data } = await supabase.from('contacts').select('*');
  const seen = new Set();
  const toDelete = [];
  
  for (const c of data) {
    const key = (c.name || '').toLowerCase().trim();
    if (seen.has(key)) {
      toDelete.push(c.id);
    } else {
      seen.add(key);
    }
  }
  
  console.log('Found ' + toDelete.length + ' duplicates to delete.');
  
  if (toDelete.length > 0) {
    // Delete in chunks to avoid URL length errors or limit issues
    const chunkSize = 100;
    for (let i = 0; i < toDelete.length; i += chunkSize) {
      const chunk = toDelete.slice(i, i + chunkSize);
      const { error } = await supabase.from('contacts').delete().in('id', chunk);
      if (error) {
         console.error('Error deleting chunk:', error);
      }
    }
    console.log('Duplicates deleted.');
  }
}

run();
