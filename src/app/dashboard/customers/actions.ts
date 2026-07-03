'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { mikrotikQuery } from '@/app/api/mikrotik/route'

export async function getCustomers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('customers')
    .select(`
      id, name, whatsapp_number, gender, created_at,
      vouchers (
        id, customer_id, mikrotik_username, package_id, server, status, payment_status, expiry_date, created_at,
        packages (id, name, price, duration_days)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching customers:', error)
    return []
  }

  return data
}

export async function getContacts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('contacts')
    .select('id, name, whatsapp_number, gender')
    .order('name', { ascending: true })

  if (error) {
    console.error('Error fetching contacts:', error)
    return []
  }

  return data
}

// Helper untuk parse uptime MikroTik (contoh: "1d 02:03:04" atau "1w2d" -> milliseconds)
function parseMikrotikUptime(uptimeStr: string | undefined): number {
  if (!uptimeStr) return 0;
  let totalSeconds = 0;
  const wMatch = uptimeStr.match(/(\d+)w/);
  if (wMatch) totalSeconds += parseInt(wMatch[1]) * 7 * 24 * 3600;
  const dMatch = uptimeStr.match(/(\d+)d/);
  if (dMatch) totalSeconds += parseInt(dMatch[1]) * 24 * 3600;
  const hMatch = uptimeStr.match(/(\d+)h/);
  if (hMatch) totalSeconds += parseInt(hMatch[1]) * 3600;
  const mMatch = uptimeStr.match(/(\d+)m/);
  if (mMatch) totalSeconds += parseInt(mMatch[1]) * 60;
  const sMatch = uptimeStr.match(/(\d+)s/);
  if (sMatch) totalSeconds += parseInt(sMatch[1]);
  if (uptimeStr.includes(':')) {
     const parts = uptimeStr.split(' ').pop()?.split(':');
     if (parts && parts.length === 3) {
       totalSeconds += parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
     }
  }
  return totalSeconds * 1000;
}

export async function syncMikrotikUsers() {
  const supabase = await createClient()
  
  // Ambil semua voucher di Supabase
  const { data: dbVouchers } = await supabase.from('vouchers').select('id, customer_id, mikrotik_username, package_id, status, server, expiry_date')
  const { data: dbPackages } = await supabase.from('packages').select('id, name, price, duration_days')
  
  if (!dbVouchers || !dbPackages) return

  try {
    const mtUsers = await mikrotikQuery('/ip/hotspot/user/print')
    
    for (const voucher of dbVouchers) {
      if (!voucher.mikrotik_username) continue
      
      const mtUser = mtUsers.find((u: any) => u.name === voucher.mikrotik_username)
      
      if (mtUser) {
        let needsUpdate = false
        const updates: any = {}
        
        const mtServer = mtUser.server || 'all'
        if (voucher.server !== mtServer) {
          updates.server = mtServer
          needsUpdate = true
        }
        
        const mtStatus = mtUser.disabled === 'true' ? 'Nonaktif' : 'Aktif'
        if (voucher.status !== mtStatus && voucher.status !== 'Suspended') { 
          updates.status = mtStatus
          needsUpdate = true
        }

        const pkg = dbPackages.find(p => p.name === mtUser.profile)
        if (pkg && voucher.package_id !== pkg.id) {
          updates.package_id = pkg.id
          needsUpdate = true
        }
        
        if (mtUser.comment && !mtUser.comment.startsWith('vc-')) {
          const parsedDate = new Date(mtUser.comment)
          if (!isNaN(parsedDate.getTime())) {
            const isoDate = parsedDate.toISOString()
              if (!voucher.expiry_date || new Date(voucher.expiry_date).toISOString() !== isoDate) {
              updates.expiry_date = isoDate
              updates.status = 'Aktif'
              needsUpdate = true
            }
          }
        } else if (mtUser.comment && mtUser.comment.startsWith('vc-') && mtUser.uptime && voucher.status === 'Belum Digunakan') {
          // Voucher digunakan tetapi komennya belum berubah dari vc- (karena tidak ada on-login script di MikroTik)
          // Kita akan kalkulasi otomatis berdasarkan uptime
          const uptimeMs = parseMikrotikUptime(mtUser.uptime)
          if (uptimeMs > 0 && pkg && pkg.duration_days) {
            const loginTime = new Date(Date.now() - uptimeMs)
            const expiryDate = new Date(loginTime.getTime() + (pkg.duration_days * 24 * 3600 * 1000))
            updates.expiry_date = expiryDate.toISOString()
            updates.status = 'Aktif'
            needsUpdate = true
          }
        }
        
        if (needsUpdate) {
          await supabase.from('vouchers').update(updates).eq('id', voucher.id)

          // Jika expiry_date baru pertama kali diisi, buat scheduler MikroTik otomatis
          if (updates.expiry_date && !voucher.expiry_date && voucher.mikrotik_username) {
            try {
              await createMikrotikScheduler(voucher.mikrotik_username, new Date(updates.expiry_date))
            } catch (e) {
              console.error('Gagal buat scheduler:', e)
            }
          }
        }
      } else {
        if (voucher.status !== 'Nonaktif') {
          await supabase.from('vouchers').update({ status: 'Nonaktif' }).eq('id', voucher.id)
        }
      }
    }

    // Trik narik voucher Mikhmon yang baru aja dipake login
    for (const mtUser of mtUsers) {
      // Cek apakah dia login di Mikhmon (comment vc- ATAU sudah jadi tanggal)
      let isMikhmonActive = false;
      let isDateComment = false;
      
      if (mtUser.comment && mtUser.uptime) {
        if (mtUser.comment.startsWith('vc-')) {
          isMikhmonActive = true;
        } else {
          const parsed = new Date(mtUser.comment);
          if (!isNaN(parsed.getTime())) {
            isMikhmonActive = true;
            isDateComment = true;
          }
        }
      }

      if (isMikhmonActive) {
        // Cek dulu udah ada belum di database kita
        const exists = dbVouchers.some(v => v.mikrotik_username === mtUser.name)
        if (!exists) {
          const uptimeMs = parseMikrotikUptime(mtUser.uptime)
          if (uptimeMs > 0 || isDateComment) {
            const pkg = dbPackages.find(p => p.name === mtUser.profile)
            if (pkg && pkg.duration_days) {
              let expiryDate: Date;
              
              if (isDateComment) {
                expiryDate = new Date(mtUser.comment);
              } else {
                const loginTime = new Date(Date.now() - uptimeMs)
                expiryDate = new Date(loginTime.getTime() + (pkg.duration_days * 24 * 3600 * 1000))
              }
              
              const isoDate = expiryDate.toISOString()
              
              // Buat Customer Baru untuk voucher ini
              const { data: newCust } = await supabase.from('customers').insert([{
                name: mtUser.name,
                whatsapp_number: '-',
                status: 'Aktif',
                expiry_date: isoDate
              }]).select().single()

              if (newCust) {
                // Masukin ke database voucher web kita
                const { data: newVoucher } = await supabase.from('vouchers').insert([{
                  customer_id: newCust.id,
                  mikrotik_username: mtUser.name,
                  package_id: pkg.id,
                  server: mtUser.server || 'all',
                  status: 'Aktif',
                  payment_status: 'Lunas',
                  comment: mtUser.comment,
                  expiry_date: isoDate
                }]).select().single()

                if (newVoucher) {
                  // Jangan lupa masukin cuannya ke payments
                  if (pkg.price > 0) {
                    await supabase.from('payments').insert([{
                      customer_id: newCust.id,
                      amount: pkg.price,
                      payment_date: new Date().toISOString(),
                      method: 'Tunai',
                      notes: `Voucher Aktif (Dari Mikhmon): ${mtUser.name}`
                    }])
                  }
                  
                  // Bikin scheduler buat matiin otomatis nanti pas abis
                  try {
                    await createMikrotikScheduler(mtUser.name, expiryDate)
                  } catch (e) {
                    console.error('Gagal buat scheduler untuk import mikhmon:', e)
                  }
                }
              }
            }
          }
        }
      }
    }

    // --- FITUR BARU: MENCATAT HISTORY LOGIN AKTIF ---
    // Pantau user yang sedang online saat ini dan simpan ke system_logs sebagai LOGIN_HISTORY
    try {
      const activeUsers = await mikrotikQuery('/ip/hotspot/active/print')
      if (activeUsers && activeUsers.length > 0) {
        // Ambil log 24 jam terakhir agar tidak duplikat
        const { data: recentLogs } = await supabase
          .from('system_logs')
          .select('entity_id, new_data')
          .eq('entity_type', 'LOGIN_HISTORY')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          
        const logsToInsert = []
        
        for (const active of activeUsers) {
          const voucher = dbVouchers.find(v => v.mikrotik_username === active.user)
          if (!voucher) continue
          
          const uptimeMs = parseMikrotikUptime(active.uptime)
          const sessionStartTime = Date.now() - uptimeMs
          
          // Cek apakah sesi login ini sudah dicatat (toleransi selisih waktu kalkulasi 5 menit)
          const alreadyLogged = recentLogs?.some(log => {
             if (log.entity_id !== voucher.id) return false
             const prevSessionStart = log.new_data?.session_start
             if (!prevSessionStart) return false
             return Math.abs(prevSessionStart - sessionStartTime) < 5 * 60 * 1000
          })
          
          if (!alreadyLogged) {
             const pkg = dbPackages.find(p => p.id === voucher.package_id)
             logsToInsert.push({
               action_type: 'UPDATE',
               entity_type: 'LOGIN_HISTORY',
               entity_id: voucher.id,
               new_data: {
                 username: active.user,
                 session_start: sessionStartTime,
                 mac_address: active['mac-address'],
                 ip_address: active.address,
                 package_name: pkg?.name || '-',
                 price: pkg?.price || 0,
                 source: 'Hotspot Active'
               }
             })
          }
        }
        
        if (logsToInsert.length > 0) {
           await supabase.from('system_logs').insert(logsToInsert)
        }
      }
    } catch(e) {
      console.error('Error tracking active users:', e)
    }

  } catch (err) {
    console.error('Gagal sinkronisasi dengan MikroTik:', err)
  }
  
  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard')
}

// Helper: buat atau perbarui scheduler MikroTik untuk disable user
async function createMikrotikScheduler(username: string, expiryDate: Date) {
  const schedulerName = `exp-${username}`
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  const d = expiryDate
  const mtDate = `${months[d.getMonth()]}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`
  // Gunakan jam persis dari expiry_date (bukan tengah malam)
  const mtTime = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
  const onEvent = `/ip hotspot user disable [find name="${username}"]`

  // Hapus scheduler lama jika sudah ada
  const existingSchedulers = await mikrotikQuery('/system/scheduler/print') as any[]
  const existing = existingSchedulers.find((s: any) => s.name === schedulerName)
  if (existing && existing['.id']) {
    await mikrotikQuery('/system/scheduler/remove', [`=.id=${existing['.id']}`])
  }

  await mikrotikQuery('/system/scheduler/add', [
    `=name=${schedulerName}`,
    `=start-date=${mtDate}`,
    `=start-time=${mtTime}`,
    `=interval=0`,
    `=on-event=${onEvent}`,
    `=comment=Auto-disable by Allstar Manager`,
  ])

  // Update comment user di MikroTik ke format Mikhmon (YYYY-MM-DD HH:mm:ss)
  const pad = (n: number) => String(n).padStart(2, '0')
  const formattedComment = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  try {
    await mikrotikQuery('/ip/hotspot/user/set', [
      `=numbers=${username}`,
      `=comment=${formattedComment}`
    ])
  } catch (err) {
    console.error(`Gagal update comment MikroTik untuk ${username}:`, err)
  }
}

export async function createCustomer(formData: FormData) {
  const name = formData.get('name') as string
  const whatsapp_number = formData.get('whatsapp_number') as string
  const gender = formData.get('gender') as string | null
  const package_id = formData.get('package_id') as string | null
  const status = formData.get('status') as string
  const server = formData.get('server') as string || 'all'
  const qty = parseInt(formData.get('quantity') as string || '1')
  const payment_status = formData.get('payment_status') as string || 'Lunas'

  const supabase = await createClient()

  // 1. Buat Customer (Hanya info diri)
  const { data: cust, error: custErr } = await supabase
    .from('customers')
    .insert([{ name, whatsapp_number, gender }])
    .select('id')
    .single()

  if (custErr || !cust) {
    throw new Error(custErr?.message || 'Gagal membuat pelanggan')
  }

  // Ambil profile mikrotik dari package
  let profile = 'default'
  if (package_id) {
    const { data: pkg } = await supabase.from('packages').select('name').eq('id', package_id).single()
    if (pkg) profile = pkg.name
  }

  // 2. Loop generate sebanyak qty (Voucher)
  for (let i = 0; i < qty; i++) {
    // Generate MikroTik Username (tambahkan index i agar unik jika > 1)
    let cleanName = name.substring(0, 3).toLowerCase().replace(/[^a-z]/g, '')
    while (cleanName.length < 3) cleanName += 'x'
    
    const cleanWa = whatsapp_number.replace(/\D/g, '')
    const last3 = cleanWa.length >= 3 ? cleanWa.substring(cleanWa.length - 3) : '000'
    
    // Gunakan nomor urut (1 digit) sesuai request
    const username = `${cleanName}${last3}${i + 1}`
    const password = username

    const today = new Date()
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
    const mikhmonDate = `${months[today.getMonth()]}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`
    const commentStr = `vc-${mikhmonDate}-${name.substring(0,5)}`

    // Insert ke MikroTik
    try {
      await mikrotikQuery('/ip/hotspot/user/add', [
        `=name=${username}`,
        `=password=${password}`,
        `=profile=${profile}`,
        `=server=${server}`,
        `=comment=${commentStr}`
      ])
    } catch (err) {
      if ((err as Error).message.includes('already exists')) {
        try {
          await mikrotikQuery('/ip/hotspot/user/set', [
            `=numbers=${username}`,
            `=password=${password}`,
            `=profile=default`,
            `=server=${server}`,
            `=comment=${commentStr}`
          ])
        } catch (fallbackErr) {
          console.error(fallbackErr)
          throw new Error(`Gagal update user yang sudah ada di MikroTik: ${(fallbackErr as Error).message}`)
        }
      } else {
        console.error(err)
        throw new Error(`Gagal membuat user di MikroTik: ${(err as Error).message}`)
      }
    }

    // Insert ke tabel Vouchers
    const { data: newVoucher, error: vErr } = await supabase.from('vouchers').insert([{
      customer_id: cust.id,
      mikrotik_username: username,
      package_id: package_id || null,
      server,
      status,
      payment_status,
      comment: commentStr,
      expiry_date: null
    }]).select('id').single()
    
    if (vErr) {
      console.error("Gagal insert voucher:", vErr)
      throw new Error("Gagal membuat voucher di database: " + vErr.message)
    }

    if (payment_status === 'Lunas' && package_id && pkg && pkg.price > 0) {
      await supabase.from('payments').insert([{
        customer_id: cust.id,
        amount: pkg.price,
        payment_date: new Date().toISOString(),
        method: 'Tunai',
        notes: `Pembelian Voucher: ${username}`
      }])
    }
  }

  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard') // Also update dashboard metrics
}

export async function addVouchersToCustomer(customerId: string, formData: FormData) {
  const name = formData.get('name') as string
  const whatsapp_number = formData.get('whatsapp_number') as string
  const package_id = formData.get('package_id') as string | null
  const status = formData.get('status') as string || 'Belum Digunakan'
  const server = formData.get('server') as string || 'all'
  const qty = parseInt(formData.get('quantity') as string || '1')
  const payment_status = formData.get('payment_status') as string || 'Lunas'

  const supabase = await createClient()

  // Ambil jumlah voucher yang sudah ada untuk generate nomor yang benar
  const { data: existingVouchers } = await supabase
    .from('vouchers')
    .select('id')
    .eq('customer_id', customerId)
  const existingCount = existingVouchers?.length || 0

  // Ambil profile mikrotik dari package
  let profile = 'default'
  let pkg: any = null
  if (package_id) {
    const { data: pkgData } = await supabase.from('packages').select('name, price').eq('id', package_id).single()
    if (pkgData) {
      profile = pkgData.name
      pkg = pkgData
    }
  }

  const today = new Date()
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec']
  const mikhmonDate = `${months[today.getMonth()]}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`
  const commentStr = `vc-${mikhmonDate}-${name.substring(0,5)}`

  let cleanName = name.substring(0, 3).toLowerCase().replace(/[^a-z]/g, '')
  while (cleanName.length < 3) cleanName += 'x'
  const cleanWa = whatsapp_number.replace(/\D/g, '')
  const last3 = cleanWa.length >= 3 ? cleanWa.substring(cleanWa.length - 3) : '000'

  for (let i = 0; i < qty; i++) {
    const suffix = existingCount + i + 1
    const username = `${cleanName}${last3}${suffix}`
    const password = username

    try {
      await mikrotikQuery('/ip/hotspot/user/add', [
        `=name=${username}`,
        `=password=${password}`,
        `=profile=${profile}`,
        `=server=${server}`,
        `=comment=${commentStr}`
      ])
    } catch (err) {
      if ((err as Error).message.includes('already exists')) {
        try {
          await mikrotikQuery('/ip/hotspot/user/set', [
            `=numbers=${username}`,
            `=password=${password}`,
            `=profile=${profile}`,
            `=server=${server}`,
            `=comment=${commentStr}`
          ])
        } catch (fallbackErr) {
          console.error(fallbackErr)
          throw new Error(`Gagal update user yang sudah ada di MikroTik: ${(fallbackErr as Error).message}`)
        }
      } else {
        console.error(err)
        throw new Error(`Gagal membuat user di MikroTik: ${(err as Error).message}`)
      }
    }

    const { data: newVoucher, error: vErr } = await supabase.from('vouchers').insert([{
      customer_id: customerId,
      mikrotik_username: username,
      package_id: package_id || null,
      server,
      status,
      payment_status,
      comment: commentStr,
      expiry_date: null
    }]).select('id').single()

    if (vErr) {
      console.error("Gagal insert voucher:", vErr)
      throw new Error("Gagal membuat voucher di database: " + vErr.message)
    }

    if (payment_status === 'Lunas' && package_id && pkg && (pkg as any).price > 0) {
      await supabase.from('payments').insert([{
        customer_id: customerId,
        amount: pkg.price,
        payment_date: new Date().toISOString(),
        method: 'Tunai',
        notes: `Pembelian Voucher: ${username}`
      }])
    }
  }

  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard')
}

export async function updateCustomer(id: string, formData: FormData) {
  const name = formData.get('name') as string
  const whatsapp_number = formData.get('whatsapp_number') as string
  const gender = formData.get('gender') as string | null
  
  const supabase = await createClient()

  // Update data pelanggan dasar
  const { error } = await supabase
    .from('customers')
    .update({ name, whatsapp_number, gender })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  // Mengubah paket/server/status dari form edit customer saat ini tidak mengubah semua voucher.
  // Idealnya ini akan dibuat form terpisah per-voucher nanti jika diperlukan.

  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard')
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient()
  
  // Ambil semua voucher untuk customer ini
  const { data: vouchers } = await supabase.from('vouchers').select('mikrotik_username').eq('customer_id', id)

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  // Hapus semua voucher dari MikroTik
  if (vouchers && vouchers.length > 0) {
    for (const v of vouchers) {
      if (!v.mikrotik_username) continue;
      try {
        const mtUsers = await mikrotikQuery('/ip/hotspot/user/print', [`?name=${v.mikrotik_username}`]) as any[]
        if (mtUsers && mtUsers.length > 0) {
          await mikrotikQuery('/ip/hotspot/user/remove', [`=numbers=${mtUsers[0]['.id']}`])
        }
      } catch (err) {}
    }
  }

  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard')
}

export async function deleteVoucher(id: string) {
  const supabase = await createClient()
  
  const { data: v } = await supabase.from('vouchers').select('*').eq('id', id).single()

  let mikrotikData = null;
  if (v && v.mikrotik_username) {
    try {
      const mtUsers = await mikrotikQuery('/ip/hotspot/user/print', [`?name=${v.mikrotik_username}`]) as any[]
      if (mtUsers && mtUsers.length > 0) {
        mikrotikData = mtUsers[0]
        await mikrotikQuery('/ip/hotspot/user/remove', [`=numbers=${mtUsers[0]['.id']}`])
      }
    } catch (err) {}
  }

  // Catat ke system log
  if (v) {
    const { logSystemAction } = await import('@/app/dashboard/sistem/log/actions')
    await logSystemAction('DELETE', 'vouchers', id, {
      ...v,
      mikrotik_data: mikrotikData
    })
  }

  const { error } = await supabase
    .from('vouchers')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard')
}

export async function updateExpiryDate(id: string, expiryDate: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('customers')
    .update({ expiry_date: new Date(expiryDate).toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard/invoices')
  revalidatePath('/dashboard')
}



export async function setVoucherExpiry(voucherId: string, expiryDateStr: string) {
  const supabase = await createClient()

  // Ambil data voucher (termasuk expiry_date lama untuk mempertahankan jam login)
  const { data: v, error: vErr } = await supabase
    .from('vouchers')
    .select('mikrotik_username, status, expiry_date')
    .eq('id', voucherId)
    .single()

  if (vErr || !v) throw new Error('Voucher tidak ditemukan')

  // Gabungkan tanggal baru dari picker dengan JAM dari expiry_date lama
  // Supaya scheduler tetap pakai jam login yang sama (bukan tengah malam)
  let expiryDate: Date
  if (expiryDateStr.length === 10) {
    // Format YYYY-MM-DD dari date picker — ambil jam dari expiry_date lama
    if (v.expiry_date) {
      const oldTime = new Date(v.expiry_date)
      const [year, month, day] = expiryDateStr.split('-').map(Number)
      expiryDate = new Date(year, month - 1, day,
        oldTime.getHours(), oldTime.getMinutes(), oldTime.getSeconds())
    } else {
      expiryDate = new Date(expiryDateStr)
    }
  } else {
    expiryDate = new Date(expiryDateStr)
  }

  // 1. Simpan expiry_date dan comment ke Supabase
  const isFuture = expiryDate > new Date()
  const newStatus = (v.status === 'Belum Digunakan' || v.status === 'Nonaktif') && isFuture ? 'Aktif' : v.status
  const pad = (n: number) => String(n).padStart(2, '0')
  const formattedComment = `${expiryDate.getFullYear()}-${pad(expiryDate.getMonth() + 1)}-${pad(expiryDate.getDate())} ${pad(expiryDate.getHours())}:${pad(expiryDate.getMinutes())}:${pad(expiryDate.getSeconds())}`

  const { error: updateErr } = await supabase
    .from('vouchers')
    .update({ 
      expiry_date: expiryDate.toISOString(),
      comment: formattedComment,
      ...(newStatus !== v.status && { status: newStatus })
    })
    .eq('id', voucherId)

  if (updateErr) throw new Error(updateErr.message)

  // 2. Buat / perbarui MikroTik Scheduler dengan jam yang tepat
  if (v.mikrotik_username) {
    try {
      await createMikrotikScheduler(v.mikrotik_username, expiryDate)

      // Jika user sebelumnya di-disable / belum aktif, dan expiry baru di masa depan, pastikan di-enable di MikroTik
      if (newStatus === 'Aktif' && v.status !== 'Aktif') {
        try {
          await mikrotikQuery('/ip/hotspot/user/enable', [`=numbers=${v.mikrotik_username}`])
        } catch (e) {}
      }
    } catch (e) {
      console.error('Gagal membuat scheduler MikroTik:', e)
    }
  }

  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard')
}

export async function payDebt(customerId: string) {
  const supabase = await createClient()

  // Ambil semua voucher yang belum lunas
  const { data: unpaidVouchers, error: getErr } = await supabase
    .from('vouchers')
    .select('id, mikrotik_username, packages(price)')
    .eq('customer_id', customerId)
    .eq('payment_status', 'Belum Lunas')

  if (getErr) throw new Error(getErr.message)
  if (!unpaidVouchers || unpaidVouchers.length === 0) return

  let totalPaid = 0
  for (const v of unpaidVouchers as any[]) {
    if (v.packages && v.packages.price) {
      totalPaid += v.packages.price
    }
  }

  // Update status voucher jadi Lunas
  const { error: upErr } = await supabase
    .from('vouchers')
    .update({ payment_status: 'Lunas' })
    .eq('customer_id', customerId)
    .eq('payment_status', 'Belum Lunas')

  if (upErr) throw new Error(upErr.message)

  // Catat ke tabel payments
  if (totalPaid > 0) {
    await supabase.from('payments').insert([{
      customer_id: customerId,
      amount: totalPaid,
      payment_date: new Date().toISOString(),
      method: 'Tunai',
      notes: 'Pelunasan Kasbon/Hutang Voucher'
    }])
  }

  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard')
}

export async function updateVoucherPaymentStatus(voucherId: string, newStatus: string) {
  const supabase = await createClient()

  // 1. Get voucher info
  const { data: v } = await supabase
    .from('vouchers')
    .select('customer_id, mikrotik_username, packages(price)')
    .eq('id', voucherId)
    .single()

  // 2. Update status
  const { error } = await supabase
    .from('vouchers')
    .update({ payment_status: newStatus })
    .eq('id', voucherId)

  if (error) throw new Error(error.message)
  
  // 3. Sync payments table
  if (v && v.packages) {
    const price = Array.isArray(v.packages) ? v.packages[0]?.price : v.packages?.price
    if (price && price > 0) {
      if (newStatus === 'Belum Lunas') {
        // Find and delete the latest payment for this amount
        const { data: latestPayments } = await supabase
          .from('payments')
          .select('id')
          .eq('customer_id', v.customer_id)
          .eq('amount', price)
          .order('payment_date', { ascending: false })
          .limit(1)
          
        if (latestPayments && latestPayments.length > 0) {
          await supabase.from('payments').delete().eq('id', latestPayments[0].id)
        }
      } else if (newStatus === 'Lunas') {
        // Create payment
        await supabase.from('payments').insert([{
          customer_id: v.customer_id,
          amount: price,
          payment_date: new Date().toISOString(),
          method: 'Tunai',
          notes: `Pembayaran Manual Voucher: ${v.mikrotik_username || '-'}`
        }])
      }
    }
  }

  revalidatePath('/dashboard/customers')
  revalidatePath('/dashboard')
}
