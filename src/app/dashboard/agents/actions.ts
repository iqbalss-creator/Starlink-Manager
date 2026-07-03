'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { mikrotikQuery } from '@/app/api/mikrotik/route'

export async function getAgents() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('agents')
    .select(`
      id, name, whatsapp_number, commission_rate, created_at,
      vouchers (
        id, mikrotik_username, package_id, server, status, settlement_status, settled_at, created_at,
        packages (id, name, price, duration_days)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching agents:', error)
    return []
  }
  return data
}

export async function addAgent(formData: FormData) {
  const supabase = await createClient()
  const name = formData.get('name') as string
  const whatsapp_number = formData.get('whatsapp_number') as string
  const commission_rate = parseFloat(formData.get('commission_rate') as string || '20')

  if (!name) return { error: 'Nama agen wajib diisi' }

  const { error } = await supabase.from('agents').insert([{
    name,
    whatsapp_number,
    commission_rate
  }])

  if (error) {
    console.error('Error adding agent:', error)
    return { error: 'Gagal menambahkan agen' }
  }

  revalidatePath('/dashboard/agents')
  return { success: true }
}

export async function deleteAgent(id: string) {
  const supabase = await createClient()
  
  // Vouchers connected to this agent will have their agent_id set to NULL due to ON DELETE CASCADE or SET NULL
  // Since we set ON DELETE CASCADE in our migration, all vouchers for this agent will be deleted.
  const { error } = await supabase.from('agents').delete().eq('id', id)
  
  if (error) {
    console.error('Error deleting agent:', error)
    return { error: 'Gagal menghapus agen' }
  }
  
  revalidatePath('/dashboard/agents')
  return { success: true }
}

function generateRandomString(length: number, type: 'numeric' | 'alphanumeric' = 'alphanumeric') {
  const chars = type === 'numeric' ? '0123456789' : 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function generateAgentVouchers(agentId: string, packageId: string, server: string, quantity: number, prefix: string, randomType: 'numeric' | 'alphanumeric' = 'alphanumeric') {
  const supabase = await createClient()
  
  // Get package details
  const { data: pkg } = await supabase.from('packages').select('*').eq('id', packageId).single()
  if (!pkg) return { error: 'Paket tidak ditemukan' }
  
  const { data: agent } = await supabase.from('agents').select('name').eq('id', agentId).single()
  const agentName = agent?.name || 'agen'
  const today = new Date()
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  const mikhmonDate = `${months[today.getMonth()]}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`
  const commentStr = `vc-${mikhmonDate}-${agentName.replace(/\s+/g, '').toLowerCase().substring(0,5)}`
  const createdVouchers = []
  let lastError = null
  
  for (let i = 0; i < quantity; i++) {
    const randomStr = generateRandomString(5, randomType)
    const username = `${prefix || 'vc'}${randomStr}`
    
    // Create in Mikrotik
    try {
      const mikrotikParams = [
        `=name=${username}`,
        `=password=${username}`,
        `=profile=${pkg.name}`,
        `=comment=${commentStr}`
      ]
      if (server !== 'all') {
        mikrotikParams.push(`=server=${server}`)
      }
      
      await mikrotikQuery('/ip/hotspot/user/add', mikrotikParams)
      
      // Save to Supabase
      const { data: newVoucher, error: dbError } = await supabase.from('vouchers').insert([{
        customer_id: null,
        agent_id: agentId,
        mikrotik_username: username,
        package_id: packageId,
        server: server,
        status: 'Belum Digunakan',
        settlement_status: 'Belum Setor',
        comment: commentStr
      }]).select().single()
      
      if (!dbError && newVoucher) {
        createdVouchers.push(newVoucher)
      }
    } catch (err: any) {
      console.error(`Gagal membuat voucher ${username} di MikroTik:`, err)
      lastError = err.message || 'Unknown error from Mikrotik API'
    }
  }
  
  revalidatePath(`/dashboard/agents/${agentId}`)
  revalidatePath('/dashboard/agents')
  
  if (createdVouchers.length === 0 && lastError) {
    return { error: `Gagal ke MikroTik: ${lastError}` }
  }
  return { success: true, count: createdVouchers.length }
}

export async function getAgentSettlements(agentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('agent_settlements')
    .select('*')
    .eq('agent_id', agentId)
    .order('settled_at', { ascending: false })
    
  if (error) {
    console.error('Error fetching settlements:', error)
    return []
  }
  return data
}
export async function deleteVoucherCloter(agentId: string, vouchers: {id: string, username: string}[]) {
  const supabase = await createClient()
  let errorCount = 0

  for (const v of vouchers) {
    try {
      const mtUsers = await mikrotikQuery('/ip/hotspot/user/print', [`?name=${v.username}`]) as any[]
      if (mtUsers && mtUsers.length > 0) {
        await mikrotikQuery('/ip/hotspot/user/remove', [`=numbers=${mtUsers[0]['.id']}`])
      }
    } catch (err) {
      console.error(`Gagal hapus ${v.username} dari MikroTik:`, err)
      errorCount++
    }
  }

  // 2. Delete from Supabase
  const voucherIds = vouchers.map(v => v.id)
  const { error: dbError } = await supabase
    .from('vouchers')
    .delete()
    .in('id', voucherIds)

  if (dbError) {
    return { error: `Gagal menghapus dari database: ${dbError.message}` }
  }

  revalidatePath(`/dashboard/agents/${agentId}`)
  revalidatePath('/dashboard/agents')
  
  if (errorCount > 0) {
    return { success: true, message: `Berhasil hapus dari DB, tapi ${errorCount} gagal dihapus dari MikroTik (mungkin sudah tidak ada).` }
  }
  
  return { success: true }
}
export async function settleAgentVouchers(agentId: string, voucherIds: string[], totalSales: number, commissionRate: number) {
  if (voucherIds.length === 0) return { error: 'Tidak ada voucher untuk disetor' }
  
  const supabase = await createClient()
  
  const commissionAmount = totalSales * (commissionRate / 100)
  const netAmount = totalSales - commissionAmount
  const now = new Date().toISOString()
  
  // 1. Create settlement record
  const { data: settlement, error: settlementError } = await supabase.from('agent_settlements').insert([{
    agent_id: agentId,
    total_sales_amount: totalSales,
    commission_amount: commissionAmount,
    net_amount: netAmount,
    total_vouchers: voucherIds.length,
    settled_at: now
  }]).select().single()
  
  if (settlementError) {
    console.error('Error creating settlement:', settlementError)
    return { error: 'Gagal mencatat setoran' }
  }
  
  // 2. Update vouchers status
  const { error: updateError } = await supabase
    .from('vouchers')
    .update({ 
      settlement_status: 'Sudah Setor',
      settled_at: now
    })
    .in('id', voucherIds)
    
  if (updateError) {
    console.error('Error updating vouchers:', updateError)
    // Rollback settlement
    await supabase.from('agent_settlements').delete().eq('id', settlement.id)
    return { error: 'Gagal memperbarui status voucher' }
  }
  
  revalidatePath(`/dashboard/agents/${agentId}`)
  revalidatePath('/dashboard/agents')
  return { success: true }
}
