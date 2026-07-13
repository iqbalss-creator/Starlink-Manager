'use server'

import { createClient } from '@/utils/supabase/server'
import { mikrotikQuery } from '@/lib/mikrotik'

export async function logSystemAction(
  actionType: 'INSERT' | 'UPDATE' | 'DELETE',
  entityType: string,
  entityId: string,
  previousData: any,
  newData: any = null
) {
  const supabase = await createClient()
  await supabase.from('system_logs').insert([{
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId,
    previous_data: previousData,
    new_data: newData
  }])
}

export async function undoAction(logId: string) {
  const supabase = await createClient()
  
  // Ambil data log
  const { data: log, error } = await supabase.from('system_logs').select('*').eq('id', logId).single()
  if (error || !log) throw new Error('Log tidak ditemukan')

  if (log.action_type === 'DELETE') {
    // Jika DELETE, undo berarti mengembalikan data (INSERT)
    const { mikrotik_data, ...dbData } = log.previous_data || {}
    
    // Kembalikan ke Supabase
    if (dbData && Object.keys(dbData).length > 0) {
      const { error: insertErr } = await supabase.from(log.entity_type).insert([dbData])
      if (insertErr) throw new Error('Gagal mengembalikan data ke database: ' + insertErr.message)
    }

    // Jika entitasnya vouchers, kembalikan juga ke MikroTik
    if (log.entity_type === 'vouchers' && mikrotik_data) {
      try {
        await mikrotikQuery('/ip/hotspot/user/add', [
          `=name=${mikrotik_data.name}`,
          `=password=${mikrotik_data.password}`,
          `=profile=${mikrotik_data.profile}`,
          `=comment=${mikrotik_data.comment || ''}`
        ])
      } catch (e) {
        console.error('Gagal kembalikan ke MikroTik', e)
      }
    }
  } else if (log.action_type === 'UPDATE') {
    // Jika UPDATE, undo berarti mengupdate kembali ke previous_data
    const { mikrotik_data, ...dbData } = log.previous_data || {}
    if (dbData && Object.keys(dbData).length > 0) {
      const { error: updateErr } = await supabase.from(log.entity_type).update(dbData).eq('id', log.entity_id)
      if (updateErr) throw new Error('Gagal membatalkan update database: ' + updateErr.message)
    }
  } else if (log.action_type === 'INSERT') {
    // Jika INSERT, undo berarti menghapus data (DELETE)
    const { error: delErr } = await supabase.from(log.entity_type).delete().eq('id', log.entity_id)
    if (delErr) throw new Error('Gagal membatalkan penambahan data: ' + delErr.message)
  }

  // Setelah undo berhasil, hapus log-nya
  await supabase.from('system_logs').delete().eq('id', logId)
  return { success: true }
}

export async function getSystemLogs() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false })
  if (error) return []
  return data
}
