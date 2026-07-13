'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { mikrotikQuery } from '@/lib/mikrotik'

export async function getAgents() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('agents')
    .select(`
      id, name, username, whatsapp_number, commission_rate, created_at,
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
  const username = formData.get('username') as string || `agen_${name.replace(/\s+/g, '').toLowerCase()}`
  const password = formData.get('password') as string || 'admin'
  const whatsapp_number = formData.get('whatsapp_number') as string
  const commission_rate = parseFloat(formData.get('commission_rate') as string || '20')

  if (!name || !username) return { error: 'Nama dan Username agen wajib diisi' }

  const { data: existingUser } = await supabase.from('agents').select('id').eq('username', username).single()
  if (existingUser) return { error: 'Username sudah digunakan oleh agen lain' }

  const { error } = await supabase.from('agents').insert([{
    name,
    username,
    password,
    whatsapp_number,
    commission_rate,
    is_first_login: true
  }])

  if (error) {
    console.error('Error adding agent:', error)
    return { error: 'Gagal menambahkan agen' }
  }

  revalidatePath('/dashboard/agents')
  return { success: true }
}

export async function updateAgentAuth(id: string, formData: FormData) {
  const supabase = await createClient()
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const whatsapp_number = formData.get('whatsapp_number') as string
  const resetFirstLogin = formData.get('reset_first_login') === 'on'

  if (!username) return { error: 'Username tidak boleh kosong' }

  const { data: checkUser } = await supabase.from('agents').select('id').eq('username', username).neq('id', id).single()
  if (checkUser) return { error: 'Username sudah digunakan oleh agen lain' }

  const updateData: any = { username, whatsapp_number }
  if (password) {
    updateData.password = password
  }
  if (resetFirstLogin) {
    updateData.is_first_login = true
  }

  const { error } = await supabase.from('agents').update(updateData).eq('id', id)

  if (error) {
    console.error('Error updating agent auth:', error)
    return { error: 'Gagal mengupdate kredensial agen' }
  }

  revalidatePath('/dashboard/agents')
  return { success: true }
}

export async function deleteAgent(id: string) {
  const supabase = await createClient()
  
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

export async function generateAgentVouchers(agentId: string, packageId: string, server: string, quantity: number, prefix: string, randomType: 'numeric' | 'alphanumeric' = 'alphanumeric', existingComment?: string) {
  const supabase = await createClient()
  
  const { data: pkg } = await supabase.from('packages').select('*').eq('id', packageId).single()
  if (!pkg) return { error: 'Paket tidak ditemukan' }
  
  const { data: agent } = await supabase.from('agents').select('name').eq('id', agentId).single()
  const agentName = agent?.name || 'agen'
  const today = new Date()
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  const mikhmonDate = `${months[today.getMonth()]}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`
  const batchId = generateRandomString(6, 'alphanumeric').toUpperCase()
  const commentStr = existingComment || `vc-${batchId}-${mikhmonDate}-${agentName.replace(/\s+/g, '').toLowerCase().substring(0,5)}`
  const createdVouchersToInsert: any[] = []
  let lastError = null
  
  const chunkSize = 10;
  for (let i = 0; i < quantity; i += chunkSize) {
    const currentChunkSize = Math.min(chunkSize, quantity - i)
    const promises = Array.from({ length: currentChunkSize }).map(async () => {
      let username = '';
      let success = false;
      let attempt = 0;
      
      while (!success && attempt < 3) {
        attempt++;
        const randomStr = generateRandomString(5, randomType)
        username = `${prefix || 'vc'}${randomStr}`
        
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
          success = true;
        } catch (err: any) {
          console.error(`Gagal membuat voucher ${username} di MikroTik:`, err)
          lastError = err.message || 'Unknown error from Mikrotik API'
        }
      }
      
      if (success) {
        return {
          customer_id: null,
          agent_id: agentId,
          mikrotik_username: username,
          package_id: packageId,
          server: server,
          status: 'Belum Digunakan',
          settlement_status: 'Belum Setor',
          comment: commentStr
        }
      }
      return null;
    })
    
    const results = await Promise.all(promises);
    for (const res of results) {
      if (res) createdVouchersToInsert.push(res);
    }
  }

  if (createdVouchersToInsert.length > 0) {
    const { error: dbError } = await supabase.from('vouchers').insert(createdVouchersToInsert)
    if (dbError) {
      console.error("Bulk Insert Supabase Error:", dbError)
      return { error: `Berhasil di MikroTik, tapi gagal di Database: ${dbError.message}` }
    }
  }
  
  revalidatePath(`/dashboard/agents/${agentId}`)
  revalidatePath('/dashboard/agents')
  
  if (createdVouchersToInsert.length === 0 && lastError) {
    return { error: `Gagal ke MikroTik: ${lastError}` }
  }
  return { success: true, count: createdVouchersToInsert.length }
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

export async function deleteVoucherCloter(agentId: string, vouchers: {id: string, username: string}[], commentStr?: string) {
  const supabase = await createClient()
  let errorCount = 0

  if (commentStr) {
    try {
      const mtUsers = await mikrotikQuery('/ip/hotspot/user/print', [`?comment=${commentStr}`]) as any[]
      const chunkSize = 10;
      for (let i = 0; i < mtUsers.length; i += chunkSize) {
        const promises = mtUsers.slice(i, i + chunkSize).map(mt => 
          mikrotikQuery('/ip/hotspot/user/remove', [`=numbers=${mt['.id']}`])
            .catch(err => {
              console.error(`Gagal hapus dari MikroTik:`, err)
              errorCount++
            })
        );
        await Promise.all(promises);
      }
    } catch (err) {
      console.error(`Gagal print users by comment dari MikroTik:`, err)
    }
  } else {
    const chunkSize = 10;
    for (let i = 0; i < vouchers.length; i += chunkSize) {
      const promises = vouchers.slice(i, i + chunkSize).map(async v => {
        try {
          const mtUsers = await mikrotikQuery('/ip/hotspot/user/print', [`?name=${v.username}`]) as any[]
          if (mtUsers && mtUsers.length > 0) {
            await mikrotikQuery('/ip/hotspot/user/remove', [`=numbers=${mtUsers[0]['.id']}`])
          }
        } catch (err) {
          console.error(`Gagal hapus ${v.username} dari MikroTik:`, err)
          errorCount++
        }
      });
      await Promise.all(promises);
    }
  }

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
  
  const { error: updateError } = await supabase
    .from('vouchers')
    .update({ 
      settlement_status: 'Sudah Setor',
      settled_at: now
    })
    .in('id', voucherIds)
    
  if (updateError) {
    console.error('Error updating vouchers:', updateError)
    await supabase.from('agent_settlements').delete().eq('id', settlement.id)
    return { error: 'Gagal memperbarui status voucher' }
  }
  
  revalidatePath(`/dashboard/agents/${agentId}`)
  revalidatePath('/dashboard/agents')
  return { success: true }
}

export async function syncCloterVouchers(agentId: string, vouchers: any[], commentStr: string) {
  const supabase = await createClient()
  
  const { data: dbVouchers } = await supabase.from('vouchers')
    .select('*')
    .eq('agent_id', agentId)
    .eq('comment', commentStr)
    
  if (!dbVouchers || dbVouchers.length === 0) return { error: 'Cloter tidak ditemukan' }
  
  let mikrotikUsers: any[] = []
  try {
    mikrotikUsers = await mikrotikQuery('/ip/hotspot/user/print', [`?comment=${commentStr}`])
  } catch (err: any) {
    return { error: 'Gagal menghubungi Mikrotik: ' + err.message }
  }
  
  const mikrotikUserMap = new Map(mikrotikUsers.map(u => [u.name, u]))
  let deletedCount = 0
  let usedCount = 0
    for (const v of dbVouchers) {
      const mtUser = mikrotikUserMap.get(v.mikrotik_username)

      if (!mtUser) {
        // Ticket is missing from Mikrotik. The user wants it marked as "Terpakai" (Digunakan) instead of deleted.
        if (v.status !== 'Digunakan') {
          await supabase.from('vouchers').update({ status: 'Digunakan' }).eq('id', v.id)
          usedCount++
        }
      } else {
        // Tiket ada di Mikrotik, cek apakah sudah terpakai (uptime > 0s)
        if (mtUser.uptime && mtUser.uptime !== '0s') {
          if (v.status !== 'Digunakan') {
            await supabase.from('vouchers').update({ status: 'Digunakan' }).eq('id', v.id)
            usedCount++
          }
        } else {
          // Tiket masih utuh dan belum terpakai
          if (v.status !== 'Belum Digunakan') {
            await supabase.from('vouchers').update({ status: 'Belum Digunakan' }).eq('id', v.id)
          }
        }
      }
    }
  
  revalidatePath(`/dashboard/agents/${agentId}`)
  return { success: true, count: deletedCount, usedCount: usedCount }
}

export async function settlePartialVouchers(agentId: string, voucherIds: string[], totalSales: number, commissionRate: number) {
  if (voucherIds.length === 0) return { error: 'Tidak ada voucher untuk disetor' }
  
  const supabase = await createClient()
  
  const commissionAmount = totalSales * (commissionRate / 100)
  const netAmount = totalSales - commissionAmount
  const now = new Date().toISOString()
  
  const { data: settlement, error: settleError } = await supabase.from('agent_settlements').insert({
    agent_id: agentId,
    total_sales_amount: totalSales,
    commission_amount: commissionAmount,
    net_amount: netAmount,
    total_vouchers: voucherIds.length,
    note: `Setoran sebagian (${voucherIds.length} voucher)`
  }).select().single()
  
  if (settleError) return { error: settleError.message }
  
  const { error: updateError } = await supabase.from('vouchers').update({
    settlement_status: 'Sudah Setor',
    settlement_id: settlement.id
  }).in('id', voucherIds)
  
  if (updateError) return { error: updateError.message }
  
  revalidatePath(`/dashboard/agents/${agentId}`)
  return { success: true }
}
