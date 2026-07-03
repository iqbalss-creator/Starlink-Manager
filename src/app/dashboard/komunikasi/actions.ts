'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markReminderSent(voucherId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('vouchers')
    .update({ last_reminder_sent_at: new Date().toISOString() })
    .eq('id', voucherId)

  if (error) {
    console.error('Failed to mark reminder as sent', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard/komunikasi')
  return { success: true }
}
