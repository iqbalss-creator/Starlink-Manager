require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function main() {
  const { data, error } = await supabase.from('customers').select('*')
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Customers in DB:')
    console.log(data)
  }
}

main()
