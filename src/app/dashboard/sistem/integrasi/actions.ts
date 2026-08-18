'use server'

import { createClient } from '@/utils/supabase/server'
import { Setting } from '@/types'

export async function getSettings(): Promise<Setting[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('settings').select('*')
  
  if (error) {
    console.error('Error fetching settings:', error)
    return []
  }
  return data || []
}

export async function saveSettings(settings: Setting[]) {
  const supabase = await createClient()
  
  for (const s of settings) {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: s.key, value: s.value, description: s.description })
    if (error) {
      console.error('Error saving setting', s.key, error)
      throw new Error(`Gagal menyimpan pengaturan: ${s.key}`)
    }
  }
  return { success: true }
}
