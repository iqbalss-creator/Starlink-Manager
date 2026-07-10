import { createClient } from '@/utils/supabase/server'
import { PrintClient } from './print-client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function PrintPage({ searchParams }: { searchParams: Promise<{ users?: string }> }) {
  const resolvedParams = await searchParams
  const usersParam = resolvedParams.users

  if (!usersParam) {
    redirect('/dashboard/vouchers/mass')
  }

  const usernames = usersParam.split(',')
  
  const supabase = await createClient()
  const { data: vouchers } = await supabase
    .from('vouchers')
    .select('mikrotik_username, package_id, packages(name, price)')
    .in('mikrotik_username', usernames)

  return <PrintClient vouchers={vouchers || []} />
}
