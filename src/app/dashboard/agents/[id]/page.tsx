import { createClient } from '@/utils/supabase/server'
import AgentDetailClient from './agent-detail-client'
import { redirect } from 'next/navigation'

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params

  // 1. Get Agent Data
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()

  if (agentError || !agent) {
    redirect('/dashboard/agents')
  }

  // 2. Get Unsettled Vouchers (Cloter Depan)
  const { data: unsettledVouchers } = await supabase
    .from('vouchers')
    .select(`
      id, mikrotik_username, package_id, server, status, settlement_status, settled_at, created_at,
      packages (id, name, price, duration_days)
    `)
    .eq('agent_id', id)
    .eq('settlement_status', 'Belum Setor')
    .order('created_at', { ascending: false })

  // 3. Get Settlements History (Cloter Belakang / Sudah Setor)
  const { data: settlements } = await supabase
    .from('agent_settlements')
    .select('*')
    .eq('agent_id', id)
    .order('settled_at', { ascending: false })

  // 4. Get Packages for Voucher Generation
  const { data: packages } = await supabase
    .from('packages')
    .select('*')
    .order('price', { ascending: true })

  // 5. Get all vouchers for stock grouping
  const { data: allVouchers } = await supabase
    .from('vouchers')
    .select(`
      id, mikrotik_username, status, created_at, package_id,
      packages (id, name, price, duration_days)
    `)
    .eq('agent_id', id)
    .order('created_at', { ascending: false })

  return (
    <AgentDetailClient 
      agent={agent} 
      unsettledVouchers={unsettledVouchers || []} 
      settlements={settlements || []} 
      packages={packages || []} 
      allVouchers={allVouchers || []}
    />
  )
}
