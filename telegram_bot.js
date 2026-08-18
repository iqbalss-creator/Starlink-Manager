/**
 * ═══════════════════════════════════════════════════════════════════
 *  STARLINK MANAGER - TELEGRAM BOT (Interactive Keyboard & Control)
 * ═══════════════════════════════════════════════════════════════════
 *  Fitur:
 *   1. 🔍 Cari Voucher Lengkap (MikroTik Live + Supabase Database)
 *   2. ⏰ Deteksi Waktu Pertama Kali Login (Mikhmon Records & Validity)
 *   3. ⏳ Deteksi Waktu Habis & Sisa Masa Aktif Presisi
 *   4. Interactive Buttons Keyboard (Tombol menu cepat di Telegram)
 *   5. Remote Control MikroTik via Chat & Button
 *   6. Monitoring & Alert Otomatis (Server + MikroTik)
 *   7. Laporan Harian Otomatis (Jam 07:00 WIB)
 *   8. Last Backup Inspector & Instant Delivery
 *   9. Alert Keamanan (Login, Brute-force, Link down)
 * ═══════════════════════════════════════════════════════════════════
 */

const net = require('net')
const fs = require('fs')
const path = require('path')

// ─── CONFIGURATION ──────────────────────────────────────────────────────────
const ENV_FILE = 'C:\\Project\\.env.local'
const CONFIG = loadEnv()

function loadEnv() {
    const cfg = {}
    if (fs.existsSync(ENV_FILE)) {
        fs.readFileSync(ENV_FILE, 'utf8').split('\n').forEach(line => {
            const m = line.match(/^([A-Z_]+)=["']?(.+?)["']?\s*$/)
            if (m) cfg[m[1]] = m[2]
        })
    }
    return {
        BOT_TOKEN: cfg.TELEGRAM_BOT_TOKEN || '',
        CHAT_ID: cfg.TELEGRAM_CHAT_ID || '',
        MT_HOST: cfg.MIKROTIK_HOST || '10.8.0.2',
        MT_PORT: parseInt(cfg.MIKROTIK_PORT || '8728'),
        MT_USER: cfg.MIKROTIK_USER || 'admin',
        MT_PASS: cfg.MIKROTIK_PASS || '',
        SUPABASE_URL: cfg.NEXT_PUBLIC_SUPABASE_URL || '',
        SUPABASE_KEY: cfg.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    }
}

const TELEGRAM_API = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}`
let lastUpdateId = 0

// State management for awaiting user input
const userState = {}

// ─── MENU KEYBOARD (TOMBOL TELEGRAM) ────────────────────────────────────────

const MAIN_KEYBOARD = {
    keyboard: [
        [{ text: '🔍 Cari Voucher' }, { text: '⚡ User Aktif' }],
        [{ text: '📊 Status Router' }, { text: '👥 Semua User' }],
        [{ text: '📈 Bandwidth' }, { text: '💾 Backup Sekarang' }],
        [{ text: '📦 Last Backup' }, { text: '🏥 Health Check' }],
        [{ text: '📋 Laporan' }, { text: '📜 Log Router' }],
        [{ text: '❓ Bantuan' }]
    ],
    resize_keyboard: true,
    persistent: true
}

// ─── MIKROTIK API CLIENT ────────────────────────────────────────────────────

function encodeLength(len) {
    if (len < 0x80) return Buffer.from([len])
    if (len < 0x4000) return Buffer.from([(len >> 8) | 0x80, len & 0xff])
    if (len < 0x200000) return Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff])
    return Buffer.from([(len >> 24) | 0xe0, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff])
}
function encodeWord(w) {
    const d = Buffer.from(w, 'utf8')
    return Buffer.concat([encodeLength(d.length), d])
}
function encodeSentence(words) {
    return Buffer.concat([...words.map(encodeWord), Buffer.from([0])])
}

function decodeLength(buf, pos) {
    if (pos >= buf.length) return null
    const b = buf[pos]
    if (b < 0x80) return { len: b, headerLen: 1 }
    if (b < 0xc0) { if (pos + 1 >= buf.length) return null; return { len: ((b & 0x3f) << 8) | buf[pos + 1], headerLen: 2 } }
    if (b < 0xe0) { if (pos + 2 >= buf.length) return null; return { len: ((b & 0x1f) << 16) | (buf[pos + 1] << 8) | buf[pos + 2], headerLen: 3 } }
    if (pos + 3 >= buf.length) return null
    return { len: ((b & 0x0f) << 24) | (buf[pos + 1] << 16) | (buf[pos + 2] << 8) | buf[pos + 3], headerLen: 4 }
}

function parseSentences(buf) {
    const sentences = []
    let pos = 0
    outer: while (pos < buf.length) {
        const start = pos
        const words = []
        while (pos < buf.length) {
            const r = decodeLength(buf, pos)
            if (!r) return { sentences, remaining: buf.subarray(start) }
            pos += r.headerLen
            if (r.len === 0) { sentences.push(words); continue outer }
            if (pos + r.len > buf.length) return { sentences, remaining: buf.subarray(start) }
            words.push(buf.subarray(pos, pos + r.len).toString('utf8'))
            pos += r.len
        }
        return { sentences, remaining: buf.subarray(start) }
    }
    return { sentences, remaining: Buffer.alloc(0) }
}

function parseAttrs(words) {
    const a = {}
    words.forEach(w => { if (w.startsWith('=')) { const eq = w.indexOf('=', 1); if (eq > 0) a[w.substring(1, eq)] = w.substring(eq + 1) } })
    return a
}

function mikrotikQuery(command, params = []) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket()
        socket.setTimeout(15000)
        const results = []
        let recvBuf = Buffer.alloc(0)
        let done = false
        let loggedIn = false

        const finish = (err) => {
            if (done) return
            done = true
            socket.destroy()
            if (err) reject(err); else resolve(results)
        }

        socket.connect(CONFIG.MT_PORT, CONFIG.MT_HOST, () => {
            socket.write(encodeSentence(['/login', `=name=${CONFIG.MT_USER}`, `=password=${CONFIG.MT_PASS}`]))
        })

        socket.on('data', (data) => {
            recvBuf = Buffer.concat([recvBuf, data])
            const { sentences, remaining } = parseSentences(recvBuf)
            recvBuf = remaining

            for (const words of sentences) {
                if (!words.length) continue
                const type = words[0]
                const attrs = parseAttrs(words)

                if (!loggedIn) {
                    if (type === '!done') {
                        loggedIn = true
                        socket.write(encodeSentence([command, ...params]))
                    } else if (type === '!trap') {
                        finish(new Error(`Login gagal: ${attrs.message || 'Auth error'}`))
                    }
                } else {
                    if (type === '!re') results.push(attrs)
                    else if (type === '!done') { finish(); return }
                    else if (type === '!trap') { finish(new Error(attrs.message || 'Command error')); return }
                }
            }
        })

        socket.on('error', (err) => finish(new Error(`Koneksi error: ${err.message}`)))
        socket.on('timeout', () => finish(new Error('Timeout 15s - MikroTik tidak merespon')))
    })
}

// ─── TELEGRAM API HELPERS ───────────────────────────────────────────────────

async function sendMessage(chatId, text, replyMarkup = MAIN_KEYBOARD, parseMode = 'HTML') {
    try {
        const payload = {
            chat_id: chatId,
            text,
            parse_mode: parseMode,
            disable_web_page_preview: true
        }
        if (replyMarkup) payload.reply_markup = replyMarkup

        await fetch(`${TELEGRAM_API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
    } catch (e) { console.error('sendMessage error:', e.message) }
}

async function sendDocument(chatId, filePath, caption = '') {
    try {
        const { exec } = require('child_process')
        await new Promise((resolve) => {
            const cmd = `curl.exe -s -F "chat_id=${chatId}" -F "caption=${caption}" -F "document=@${filePath}" "${TELEGRAM_API}/sendDocument"`
            exec(cmd, resolve)
        })
    } catch (e) { console.error('sendDocument error:', e.message) }
}

async function answerCallbackQuery(callbackQueryId, text = '') {
    try {
        await fetch(`${TELEGRAM_API}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: callbackQueryId, text })
        })
    } catch (e) {}
}

async function getUpdates() {
    try {
        const res = await fetch(`${TELEGRAM_API}/getUpdates?offset=${lastUpdateId + 1}&timeout=2`)
        const data = await res.json()
        if (data.ok && data.result.length > 0) {
            return data.result
        }
    } catch (e) { /* ignore polling errors */ }
    return []
}

// ─── HELPER FUNCTIONS ───────────────────────────────────────────────────────

function formatBytes(bytes) {
    const b = parseInt(bytes) || 0
    if (b >= 1073741824) return (b / 1073741824).toFixed(2) + ' GB'
    if (b >= 1048576) return (b / 1048576).toFixed(2) + ' MB'
    if (b >= 1024) return (b / 1024).toFixed(2) + ' KB'
    return b + ' B'
}

function formatUptime(uptime) {
    return uptime || 'N/A'
}

function isAuthorized(chatId) {
    return String(chatId) === String(CONFIG.CHAT_ID)
}

function parseUptimeToMs(uptimeStr) {
    if (!uptimeStr) return 0
    let totalMs = 0
    const w = uptimeStr.match(/(\d+)w/)
    const d = uptimeStr.match(/(\d+)d/)
    const h = uptimeStr.match(/(\d+)h/)
    const m = uptimeStr.match(/(\d+)m/)
    const s = uptimeStr.match(/(\d+)s/)
    if (w) totalMs += parseInt(w[1]) * 7 * 24 * 3600 * 1000
    if (d) totalMs += parseInt(d[1]) * 24 * 3600 * 1000
    if (h) totalMs += parseInt(h[1]) * 3600 * 1000
    if (m) totalMs += parseInt(m[1]) * 60 * 1000
    if (s) totalMs += parseInt(s[1]) * 1000
    return totalMs
}

function getValidityDurationMs(profileName = '', onLoginStr = '', validityStr = '') {
    const val = (validityStr || '').toLowerCase().trim()
    if (val.endsWith('d')) return parseInt(val) * 24 * 3600 * 1000
    if (val.endsWith('h')) return parseInt(val) * 3600 * 1000
    if (val.endsWith('w')) return parseInt(val) * 7 * 24 * 3600 * 1000
    if (val.endsWith('m')) return parseInt(val) * 60 * 1000

    if (onLoginStr) {
        const m = onLoginStr.match(/interval="?(\d+[dhwm])"?/i) || onLoginStr.match(/,(\d+[dhwm]),/i)
        if (m) return getValidityDurationMs('', '', m[1])
    }

    const p = (profileName || '').toLowerCase()
    if (p.includes('1-bulan') || p.includes('30-hari') || p.includes('30d') || p.includes('1bulan') || p.includes('bulanan')) return 30 * 24 * 3600 * 1000
    if (p.includes('2-minggu') || p.includes('14-hari') || p.includes('14d')) return 14 * 24 * 3600 * 1000
    if (p.includes('1-minggu') || p.includes('7-hari') || p.includes('7d') || p.includes('mingguan')) return 7 * 24 * 3600 * 1000
    if (p.includes('3-hari') || p.includes('3d')) return 3 * 24 * 3600 * 1000
    if (p.includes('2-hari') || p.includes('2d')) return 2 * 24 * 3600 * 1000
    if (p.includes('1-hari') || p.includes('24-jam') || p.includes('24jam') || p.includes('1d') || p.includes('harian')) return 24 * 3600 * 1000
    if (p.includes('12-jam') || p.includes('12jam') || p.includes('12h')) return 12 * 3600 * 1000
    if (p.includes('6-jam') || p.includes('6jam') || p.includes('6h')) return 6 * 3600 * 1000
    if (p.includes('5-jam') || p.includes('5jam') || p.includes('5h')) return 5 * 3600 * 1000
    if (p.includes('3-jam') || p.includes('3jam') || p.includes('3h')) return 3 * 3600 * 1000
    if (p.includes('2-jam') || p.includes('2jam') || p.includes('2h')) return 2 * 3600 * 1000
    if (p.includes('1-jam') || p.includes('1jam') || p.includes('1h')) return 1 * 3600 * 1000

    return 0
}

// ─── VOUCHER TIMELINE CALCULATOR (PERTAMA LOGIN & HABIS) ────────────────────

async function getVoucherTimeline(username, mtUser, activeSession, dbVoucher) {
    let firstLoginStr = null
    let currentSessionStr = null
    let expiryStr = null
    let remainingStr = null
    let expiryTimestamp = null
    let mikhmonData = null

    // 1. CARI DARI MIKROTIK SCRIPTS (Mikhmon Login Records)
    try {
        const scripts = await mikrotikQuery('/system/script/print')
        const userScript = scripts.find(s => 
            s.name.includes(`-|-${username}-|-`) || 
            (s.name.startsWith('20') && s.name.includes(`-${username}-`)) ||
            (s.comment === 'mikhmon' && s.name.includes(username))
        )
        if (userScript && userScript.name) {
            const parts = userScript.name.split('-|-')
            if (parts.length >= 7) {
                const dateStr = parts[0].trim()
                const timeStr = parts[1].trim()
                const price = parts[3] ? parts[3].trim() : ''
                const validity = parts[6] ? parts[6].trim() : ''
                const origComment = parts[8] ? parts[8].trim() : ''

                mikhmonData = { dateStr, timeStr, price, validity, origComment }

                const firstDate = new Date(`${dateStr} ${timeStr}`)
                if (!isNaN(firstDate.getTime())) {
                    firstLoginStr = firstDate.toLocaleString('id-ID', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) + ' WIB'
                }
            }
        }
    } catch (e) {}

    // 2. CARI WAKTU HABIS (EXPIRATION)
    // A. Dari comment MikroTik (Format "YYYY-MM-DD HH:mm:ss")
    if (mtUser && mtUser.comment) {
        const dateMatch = mtUser.comment.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?)/)
        if (dateMatch) {
            const expDate = new Date(dateMatch[1])
            if (!isNaN(expDate.getTime())) {
                expiryTimestamp = expDate.getTime()
                expiryStr = expDate.toLocaleString('id-ID', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) + ' WIB'
            }
        }
    }

    // B. Dari Scheduler MikroTik
    if (!expiryStr) {
        try {
            const schedulers = await mikrotikQuery('/system/scheduler/print')
            const sched = schedulers.find(s => 
                s.name === `exp-${username}` || 
                s.name === username || 
                s.name === `suspend-${username}` ||
                (s.comment && s.comment.includes(username))
            )
            if (sched && sched['start-date']) {
                const datePart = sched['start-date']
                const timePart = sched['start-time'] || '00:00:00'
                expiryStr = `${datePart} ${timePart}`
                try {
                    const parsedDate = new Date(`${datePart} ${timePart}`)
                    if (!isNaN(parsedDate.getTime())) expiryTimestamp = parsedDate.getTime()
                } catch (e) {}
            }
        } catch (e) {}
    }

    // C. Dari Database Supabase
    if (!expiryStr && dbVoucher && dbVoucher.expiry_date) {
        const expDate = new Date(dbVoucher.expiry_date)
        if (!isNaN(expDate.getTime())) {
            expiryTimestamp = expDate.getTime()
            expiryStr = expDate.toLocaleString('id-ID', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) + ' WIB'
        }
    }

    // 3. JIKA PERTAMA LOGIN BELUM KETEMU, DEDUKSI DARI EXPIRY - PROFILE VALIDITY
    if (!firstLoginStr && expiryTimestamp) {
        let profileOnLogin = ''
        try {
            const profiles = await mikrotikQuery('/ip/hotspot/user/profile/print')
            const prof = profiles.find(p => p.name === mtUser?.profile)
            if (prof) profileOnLogin = prof['on-login'] || ''
        } catch (e) {}

        const durationMs = getValidityDurationMs(mtUser?.profile, profileOnLogin, mikhmonData?.validity)
        if (durationMs > 0) {
            const calculatedFirstLogin = new Date(expiryTimestamp - durationMs)
            firstLoginStr = calculatedFirstLogin.toLocaleString('id-ID', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) + ' WIB'
        }
    }

    // 4. HITUNG SISA WAKTU
    if (expiryTimestamp) {
        const diffMs = expiryTimestamp - Date.now()
        if (diffMs > 0) {
            const totalHours = Math.floor(diffMs / (1000 * 60 * 60))
            const days = Math.floor(totalHours / 24)
            const remainingHours = totalHours % 24
            const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
            if (days > 0) {
                remainingStr = `🟢 Masih Berlaku (Sisa ${days} Hari ${remainingHours} Jam)`
            } else {
                remainingStr = `🟢 Masih Berlaku (Sisa ${totalHours} Jam ${minutes} Menit)`
            }
        } else {
            const pastMs = Math.abs(diffMs)
            const pastHours = Math.floor(pastMs / (1000 * 60 * 60))
            const pastDays = Math.floor(pastHours / 24)
            if (pastDays > 0) {
                remainingStr = `🔴 Sudah Habis (Lewat ${pastDays} hari yang lalu)`
            } else {
                remainingStr = `🔴 Sudah Habis (Lewat ${pastHours} jam yang lalu)`
            }
        }
    }

    // 5. SESI LOGIN BERJALAN SAAT INI (Jika Online)
    if (activeSession && activeSession.uptime) {
        const ms = parseUptimeToMs(activeSession.uptime)
        const loginDate = new Date(Date.now() - ms)
        currentSessionStr = `${loginDate.toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB (Uptime: ${formatUptime(activeSession.uptime)})`
    }

    // 6. DEFAULT JIKA BELUM LOGIN SAMA SEKALI
    if (!firstLoginStr) {
        if (mtUser && mtUser.uptime && mtUser.uptime !== '0s' && mtUser.uptime !== '') {
            firstLoginStr = `Tercatat Pernah Aktif (Total Akumulasi: ${mtUser.uptime})`
        } else {
            firstLoginStr = `⚪ Belum Pernah Login (Voucher Baru)`
        }
    }

    return {
        firstLogin: firstLoginStr,
        currentSession: currentSessionStr,
        expiry: expiryStr || '♾️ Unlimited / Sesuai Durasi Profil',
        remaining: remainingStr,
        mikhmonData
    }
}

// ─── VOUCHER SEARCH ENGINE (MIKROTIK + DATABASE) ────────────────────────────

async function handleVoucherSearch(chatId, searchQuery) {
    const q = searchQuery.trim()
    if (!q) {
        return sendMessage(chatId, 'Silakan masukkan kode voucher atau nama user yang ingin dicari.\nContoh: <code>/voucher user01</code> atau <code>/cari 1234</code>')
    }

    await sendMessage(chatId, `🔍 Sedang mencari voucher: <code>${q}</code> ...`, null)

    try {
        // 1. Ambil data dari MikroTik
        const mtUsers = await mikrotikQuery('/ip/hotspot/user/print')
        const mtActive = await mikrotikQuery('/ip/hotspot/active/print')

        // Cari yang cocok di MikroTik
        const matchedMt = mtUsers.filter(u => 
            (u.name && u.name.toLowerCase().includes(q.toLowerCase())) ||
            (u.comment && u.comment.toLowerCase().includes(q.toLowerCase()))
        )

        // 2. Ambil data dari Database Supabase
        let dbVoucher = null
        if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY) {
            try {
                const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/vouchers?mikrotik_username=ilike.*${encodeURIComponent(q)}*&select=*,packages(name,price),agents(name),customers(name,whatsapp_number)`, {
                    headers: {
                        'apikey': CONFIG.SUPABASE_KEY,
                        'Authorization': `Bearer ${CONFIG.SUPABASE_KEY}`
                    }
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data && data.length > 0) dbVoucher = data[0]
                }
            } catch (e) {}
        }

        // Jika tidak ditemukan di manapun
        if (matchedMt.length === 0 && !dbVoucher) {
            return sendMessage(chatId, `❌ Voucher dengan kode <code>${q}</code> <b>tidak ditemukan</b> di MikroTik maupun Database.`, MAIN_KEYBOARD)
        }

        // Jika ditemukan 1 atau cocok persis
        if (matchedMt.length === 1 || (matchedMt.length > 1 && matchedMt.some(u => u.name.toLowerCase() === q.toLowerCase()))) {
            const u = matchedMt.find(item => item.name.toLowerCase() === q.toLowerCase()) || matchedMt[0]
            const activeSession = mtActive.find(a => a.user === u.name)
            const timeline = await getVoucherTimeline(u.name, u, activeSession, dbVoucher)

            return renderVoucherDetailCard(chatId, u, activeSession, dbVoucher, timeline)
        }

        // Jika ditemukan banyak kecocokan (lebih dari 1)
        if (matchedMt.length > 1) {
            let text = `🔍 Ditemukan <b>${matchedMt.length}</b> voucher yang cocok dengan "<code>${q}</code>":\n\n`
            const inlineButtons = []

            matchedMt.slice(0, 8).forEach((u, idx) => {
                const isOnline = mtActive.some(a => a.user === u.name)
                const statusIcon = isOnline ? '🟢' : (u.disabled === 'true' ? '🔴' : '⚪')
                text += `${idx + 1}. ${statusIcon} <b>${u.name}</b> (Paket: ${u.profile || 'default'})\n`
                inlineButtons.push([{ text: `🔎 Detail ${u.name}`, callback_data: `vc_detail_${u.name}` }])
            })

            if (matchedMt.length > 8) text += `\n<i>... dan ${matchedMt.length - 8} voucher lainnya.</i>`

            return sendMessage(chatId, text, { inline_keyboard: inlineButtons })
        }

        // Jika hanya ada di Database
        if (dbVoucher && matchedMt.length === 0) {
            const timeline = await getVoucherTimeline(dbVoucher.mikrotik_username, null, null, dbVoucher)
            return renderDbOnlyVoucherCard(chatId, dbVoucher, timeline)
        }

    } catch (e) {
        await sendMessage(chatId, `❌ Error saat mencari voucher: ${e.message}`, MAIN_KEYBOARD)
    }
}

function renderVoucherDetailCard(chatId, mtUser, activeSession, dbVoucher, timeline) {
    const isOnline = !!activeSession
    const isDisabled = mtUser.disabled === 'true'
    const statusText = isDisabled ? '🔴 Nonaktif (Disabled)' : '🟢 Aktif (Enabled)'
    const onlineText = isOnline ? `🟢 <b>ONLINE SEKARANG</b>\n   • IP Address: <code>${activeSession.address || '-'}</code>\n   • MAC Address: <code>${activeSession['mac-address'] || '-'}</code>\n   • Sesi Berjalan: ${formatUptime(activeSession.uptime)}` : '⚪ <b>OFFLINE / Tidak Terhubung</b>'

    const txBytes = formatBytes(mtUser['bytes-in'] || 0)
    const rxBytes = formatBytes(mtUser['bytes-out'] || 0)
    const totalUsage = formatBytes((parseInt(mtUser['bytes-in'] || 0) + parseInt(mtUser['bytes-out'] || 0)))
    const uptimeUsed = formatUptime(mtUser.uptime)
    const limitUptime = mtUser['limit-uptime'] ? mtUser['limit-uptime'] : 'Unlimited'
    const limitBytes = mtUser['limit-bytes-total'] ? formatBytes(mtUser['limit-bytes-total']) : 'Unlimited'

    let text = `🎟️ <b>INFORMASI LENGKAP VOUCHER</b>\n`
    text += `━━━━━━━━━━━━━━━━━━━━━\n`
    text += `👤 <b>Username:</b> <code>${mtUser.name}</code>\n`
    text += `🔑 <b>Password:</b> <code>${mtUser.password || mtUser.name}</code>\n`
    text += `📦 <b>Paket / Profile:</b> <b>${mtUser.profile || 'default'}</b>\n`
    text += `⚡ <b>Status Akun:</b> ${statusText}\n`
    text += `🌐 <b>Status Koneksi:</b> ${onlineText}\n\n`

    text += `⏰ <b>Waktu & Masa Aktif:</b>\n`
    text += `• Pertama Kali Login: <b>${timeline.firstLogin}</b>\n`
    if (timeline.currentSession) {
        text += `• Sesi Login Hari Ini: <b>${timeline.currentSession}</b>\n`
    }
    text += `• Waktu Habis / Kadaluarsa: <b>${timeline.expiry}</b>\n`
    if (timeline.remaining) {
        text += `• Status Masa Aktif: <b>${timeline.remaining}</b>\n`
    }

    text += `\n📊 <b>Penggunaan & Kuota:</b>\n`
    text += `• Waktu Terpakai: <b>${uptimeUsed}</b> / ${limitUptime}\n`
    text += `• Total Data: <b>${totalUsage}</b> (⬇️ ${rxBytes} | ⬆️ ${txBytes})\n`
    text += `• Batas Kuota: <b>${limitBytes}</b>\n`
    if (mtUser.comment) text += `• Catatan: <i>${mtUser.comment}</i>\n`

    if (dbVoucher) {
        text += `\n💾 <b>Data Billing & Pelanggan:</b>\n`
        if (dbVoucher.customers) {
            text += `• Pelanggan: <b>${dbVoucher.customers.name || '-'}</b>\n`
            text += `• WhatsApp: <code>${dbVoucher.customers.whatsapp_number || '-'}</code>\n`
        }
        if (dbVoucher.packages) {
            text += `• Harga Paket: Rp ${(dbVoucher.packages.price || 0).toLocaleString('id-ID')}\n`
        }
        text += `• Status Pembayaran: <b>${dbVoucher.payment_status || 'Belum Lunas'}</b>\n`
        if (dbVoucher.agents) {
            text += `• Agen: ${dbVoucher.agents.name}\n`
        }
    } else if (timeline.mikhmonData) {
        if (timeline.mikhmonData.price) {
            text += `\n🏷️ <b>Harga Mikhmon:</b> Rp ${parseInt(timeline.mikhmonData.price).toLocaleString('id-ID')}\n`
        }
    }

    text += `━━━━━━━━━━━━━━━━━━━━━`

    const inlineBtns = [
        [
            { text: isDisabled ? '🟢 Aktifkan' : '🔴 Nonaktifkan', callback_data: `vc_toggle_${mtUser.name}_${isDisabled ? 'enable' : 'disable'}` },
            isOnline ? { text: '⚡ Kick User', callback_data: `vc_kick_${mtUser.name}` } : { text: '🔄 Refresh', callback_data: `vc_detail_${mtUser.name}` }
        ],
        [
            { text: '🗑️ Hapus Voucher', callback_data: `vc_del_${mtUser.name}` },
            { text: '🔍 Cari Voucher Lain', callback_data: 'cmd_prompt_search' }
        ]
    ]

    return sendMessage(chatId, text, { inline_keyboard: inlineBtns })
}

function renderDbOnlyVoucherCard(chatId, dbVoucher, timeline) {
    let text = `🎟️ <b>INFORMASI VOUCHER (HANYA DATABASE)</b>\n`
    text += `━━━━━━━━━━━━━━━━━━━━━\n`
    text += `👤 <b>Kode:</b> <code>${dbVoucher.mikrotik_username}</code>\n`
    text += `⚠️ <i>Catatan: Voucher ini belum terdaftar di MikroTik live router.</i>\n\n`
    
    text += `⏰ <b>Waktu & Masa Aktif:</b>\n`
    text += `• Pertama Kali Login: <b>${timeline.firstLogin}</b>\n`
    text += `• Waktu Habis / Kadaluarsa: <b>${timeline.expiry}</b>\n`
    if (timeline.remaining) {
        text += `• Status Masa Aktif: <b>${timeline.remaining}</b>\n`
    }
    
    if (dbVoucher.customers) {
        text += `\n• Pelanggan: <b>${dbVoucher.customers.name || '-'}</b>\n`
        text += `• WhatsApp: <code>${dbVoucher.customers.whatsapp_number || '-'}</code>\n`
    }
    if (dbVoucher.packages) {
        text += `• Paket: <b>${dbVoucher.packages.name}</b> (Rp ${(dbVoucher.packages.price || 0).toLocaleString('id-ID')})\n`
    }
    text += `• Status Pembayaran: <b>${dbVoucher.payment_status || 'Belum Lunas'}</b>\n`
    text += `━━━━━━━━━━━━━━━━━━━━━`

    return sendMessage(chatId, text, MAIN_KEYBOARD)
}

// ─── COMMAND HANDLERS ───────────────────────────────────────────────────────

const COMMANDS = {}

COMMANDS['/start'] = COMMANDS['/help'] = async (chatId) => {
    const text = `<b>Selamat Datang di Starlink Manager Bot!</b> 🚀

Gunakan tombol menu di bawah atau ketik perintah langsung:

<b>🔍 Pencarian & Manajemen Voucher:</b>
• <b>/voucher &lt;kode&gt;</b> atau <b>/cari &lt;kode&gt;</b> - Info detail voucher & waktu kadaluarsa
• <b>/active</b> - User voucher yang sedang online
• <b>/users</b> - Seluruh user voucher yang terdaftar
• <b>/adduser &lt;nama&gt; &lt;pass&gt; [profile]</b> - Tambah user baru
• <b>/deluser &lt;nama&gt;</b> - Hapus voucher
• <b>/kick &lt;nama&gt;</b> - Putus koneksi user

<b>📊 Monitoring & Status:</b>
• <b>/status</b> - Info CPU, RAM, Uptime & Router
• <b>/bandwidth</b> - Monitor traffic interface real-time
• <b>/health</b> - Cek kesehatan server & MikroTik
• <b>/report</b> - Laporan ringkasan sistem
• <b>/log</b> - Log sistem MikroTik

<b>💾 Backup & Recovery:</b>
• <b>/backup</b> - Buat backup baru sekarang
• <b>/lastbackup</b> - Info & download backup terakhir`
    await sendMessage(chatId, text, MAIN_KEYBOARD)
}

COMMANDS['/voucher'] = COMMANDS['/cari'] = COMMANDS['/search'] = async (chatId, args) => {
    if (args.length === 0) {
        userState[chatId] = 'awaiting_voucher_search'
        return sendMessage(chatId, `🔍 <b>Ketik Kode Voucher atau Nama User yang ingin dicari:</b>\n<i>(Contoh: 1234 atau user01)</i>`, {
            force_reply: true
        })
    }
    await handleVoucherSearch(chatId, args.join(' '))
}

COMMANDS['/status'] = async (chatId) => {
    try {
        const data = await mikrotikQuery('/system/resource/print')
        if (data.length === 0) return sendMessage(chatId, 'Tidak ada data resource.')
        const r = data[0]
        const usedMem = parseInt(r['total-memory']) - parseInt(r['free-memory'])
        const memPct = ((usedMem / parseInt(r['total-memory'])) * 100).toFixed(1)
        const usedHdd = parseInt(r['total-hdd-space']) - parseInt(r['free-hdd-space'])
        const hddPct = ((usedHdd / parseInt(r['total-hdd-space'])) * 100).toFixed(1)

        const identity = await mikrotikQuery('/system/identity/print')
        const name = identity.length > 0 ? identity[0].name : 'MikroTik'

        const text = `<b>Status Router: ${name}</b>

<b>Model:</b> ${r['board-name'] || 'N/A'}
<b>Versi:</b> ${r.version || 'N/A'}
<b>Uptime:</b> ${formatUptime(r.uptime)}
<b>CPU:</b> ${r['cpu-count']}x ${r.cpu} @ ${r['cpu-frequency']}MHz
<b>CPU Load:</b> ${r['cpu-load']}%
<b>RAM:</b> ${formatBytes(usedMem)} / ${formatBytes(r['total-memory'])} (${memPct}%)
<b>Disk:</b> ${formatBytes(usedHdd)} / ${formatBytes(r['total-hdd-space'])} (${hddPct}%)
<b>IP VPN:</b> ${CONFIG.MT_HOST}`

        const inlineBtn = {
            inline_keyboard: [
                [{ text: '⚡ User Aktif', callback_data: 'cmd_active' }, { text: '📈 Bandwidth', callback_data: 'cmd_bandwidth' }],
                [{ text: '🔍 Cari Voucher', callback_data: 'cmd_prompt_search' }, { text: '💾 Backup', callback_data: 'cmd_backup' }]
            ]
        }
        await sendMessage(chatId, text, inlineBtn)
    } catch (e) { await sendMessage(chatId, `Error: ${e.message}`) }
}

COMMANDS['/users'] = async (chatId) => {
    try {
        const data = await mikrotikQuery('/ip/hotspot/user/print')
        if (data.length === 0) return sendMessage(chatId, 'Tidak ada user hotspot.')
        let text = `<b>Daftar User Hotspot (${data.length})</b>\n\n`
        data.slice(0, 30).forEach((u, i) => {
            const status = u.disabled === 'true' ? '🔴 Nonaktif' : '🟢 Aktif'
            text += `${i + 1}. <b>${u.name}</b> | Profile: ${u.profile || '-'} | ${status}\n`
        })
        if (data.length > 30) text += `\n... dan ${data.length - 30} user lainnya.`
        await sendMessage(chatId, text)
    } catch (e) { await sendMessage(chatId, `Error: ${e.message}`) }
}

COMMANDS['/active'] = async (chatId) => {
    try {
        const data = await mikrotikQuery('/ip/hotspot/active/print')
        if (data.length === 0) return sendMessage(chatId, 'Tidak ada user hotspot yang sedang online saat ini.')
        let text = `<b>User Hotspot Aktif / Online (${data.length})</b>\n\n`
        data.slice(0, 30).forEach((u, i) => {
            text += `${i + 1}. <b>${u.user || u['mac-address']}</b>\n   IP: ${u.address || '-'} | Uptime: ${formatUptime(u.uptime)} | Bytes: ${formatBytes(u['bytes-out'] || 0)}\n`
        })
        if (data.length > 30) text += `\n... dan ${data.length - 30} user lainnya.`
        await sendMessage(chatId, text)
    } catch (e) { await sendMessage(chatId, `Error: ${e.message}`) }
}

COMMANDS['/adduser'] = async (chatId, args) => {
    if (args.length < 2) return sendMessage(chatId, 'Format: /adduser &lt;nama&gt; &lt;password&gt; [profile]\nContoh: /adduser user01 pass123 default')
    const [name, password, profile] = args
    try {
        const params = [`=name=${name}`, `=password=${password}`]
        if (profile) params.push(`=profile=${profile}`)
        await mikrotikQuery('/ip/hotspot/user/add', params)
        await sendMessage(chatId, `✅ User <b>${name}</b> berhasil ditambahkan ke MikroTik!`)
    } catch (e) { await sendMessage(chatId, `❌ Gagal menambah user: ${e.message}`) }
}

COMMANDS['/deluser'] = async (chatId, args) => {
    if (args.length < 1) return sendMessage(chatId, 'Format: /deluser &lt;nama&gt;')
    try {
        await mikrotikQuery('/ip/hotspot/user/remove', [`=numbers=${args[0]}`])
        await sendMessage(chatId, `✅ User <b>${args[0]}</b> berhasil dihapus!`)
    } catch (e) { await sendMessage(chatId, `❌ Gagal hapus user: ${e.message}`) }
}

COMMANDS['/kick'] = async (chatId, args) => {
    if (args.length < 1) return sendMessage(chatId, 'Format: /kick &lt;nama&gt;')
    try {
        const active = await mikrotikQuery('/ip/hotspot/active/print')
        const target = active.find(u => u.user === args[0])
        if (!target) return sendMessage(chatId, `User <b>${args[0]}</b> tidak ditemukan di daftar aktif.`)
        await mikrotikQuery('/ip/hotspot/active/remove', [`=numbers=${target['.id']}`])
        await sendMessage(chatId, `✅ User <b>${args[0]}</b> berhasil diputus koneksinya (kicked)!`)
    } catch (e) { await sendMessage(chatId, `❌ Gagal kick user: ${e.message}`) }
}

COMMANDS['/bandwidth'] = async (chatId) => {
    try {
        const ifaces = await mikrotikQuery('/interface/print')
        const running = ifaces.filter(i => i.running === 'true' && i.disabled !== 'true').slice(0, 10)
        if (running.length === 0) return sendMessage(chatId, 'Tidak ada interface yang sedang aktif.')

        let text = `<b>Monitor Traffic Interface</b>\n\n`
        for (const iface of running) {
            const tx = formatBytes(iface['tx-byte'] || '0')
            const rx = formatBytes(iface['rx-byte'] || '0')
            text += `🔹 <b>${iface.name}</b> (${iface.type || '-'})\n   ⬆️ TX: ${tx} | ⬇️ RX: ${rx}\n\n`
        }
        await sendMessage(chatId, text)
    } catch (e) { await sendMessage(chatId, `Error: ${e.message}`) }
}

COMMANDS['/log'] = async (chatId) => {
    try {
        const data = await mikrotikQuery('/log/print')
        if (data.length === 0) return sendMessage(chatId, 'Log kosong.')
        const recent = data.slice(-15)
        let text = `<b>Log Terbaru MikroTik (${recent.length})</b>\n\n`
        recent.forEach(l => {
            text += `[${l.time || ''}] ${l.topics || ''}: ${l.message || ''}\n`
        })
        await sendMessage(chatId, text)
    } catch (e) { await sendMessage(chatId, `Error: ${e.message}`) }
}

COMMANDS['/backup'] = async (chatId) => {
    await sendMessage(chatId, '⏳ Sedang memproses backup Server & MikroTik secara lengkap...')
    try {
        const { exec } = require('child_process')
        exec('powershell.exe -ExecutionPolicy Bypass -File C:\\Project\\backup_server.ps1', (err, stdout, stderr) => {
            if (err) {
                sendMessage(chatId, `❌ Error saat menjalankan backup: ${err.message}`)
            } else {
                sendMessage(chatId, '✅ Backup berhasil selesai dibuat dan file telah dikirimkan ke chat ini!')
            }
        })
    } catch (e) { await sendMessage(chatId, `Error: ${e.message}`) }
}

COMMANDS['/lastbackup'] = async (chatId) => {
    try {
        const serverBackupDir = 'C:\\Backups\\StarlinkManager'
        const mtBackupDir = 'C:\\Backups\\MikroTik'

        let latestFullZip = null
        let latestMtBackup = null
        let latestMtRsc = null

        if (fs.existsSync(serverBackupDir)) {
            const zips = fs.readdirSync(serverBackupDir)
                .filter(f => f.startsWith('backup_') && f.endsWith('.zip'))
                .map(f => ({ name: f, path: path.join(serverBackupDir, f), stat: fs.statSync(path.join(serverBackupDir, f)) }))
                .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
            if (zips.length > 0) latestFullZip = zips[0]
        }

        if (fs.existsSync(mtBackupDir)) {
            const backups = fs.readdirSync(mtBackupDir)
                .filter(f => f.endsWith('.backup'))
                .map(f => ({ name: f, path: path.join(mtBackupDir, f), stat: fs.statSync(path.join(mtBackupDir, f)) }))
                .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
            if (backups.length > 0) latestMtBackup = backups[0]

            const rscs = fs.readdirSync(mtBackupDir)
                .filter(f => f.endsWith('.rsc'))
                .map(f => ({ name: f, path: path.join(mtBackupDir, f), stat: fs.statSync(path.join(mtBackupDir, f)) }))
                .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
            if (rscs.length > 0) latestMtRsc = rscs[0]
        }

        if (!latestFullZip && !latestMtBackup) {
            return sendMessage(chatId, 'Belum ada file backup yang tersimpan di server. Ketik /backup untuk membuat sekarang.')
        }

        let text = `<b>Informasi File Backup Terakhir</b> 📦\n\n`
        if (latestFullZip) {
            const size = (latestFullZip.stat.size / (1024 * 1024)).toFixed(2)
            const date = new Date(latestFullZip.stat.mtime).toLocaleString('id-ID')
            text += `🗂️ <b>Backup Total Server (.zip):</b>\n   File: <code>${latestFullZip.name}</code>\n   Ukuran: ${size} MB\n   Waktu: ${date}\n\n`
        }
        if (latestMtBackup) {
            const size = (latestMtBackup.stat.size / 1024).toFixed(2)
            const date = new Date(latestMtBackup.stat.mtime).toLocaleString('id-ID')
            text += `⚙️ <b>MikroTik Winbox (.backup):</b>\n   File: <code>${latestMtBackup.name}</code>\n   Ukuran: ${size} KB\n   Waktu: ${date}\n\n`
        }
        if (latestMtRsc) {
            const size = (latestMtRsc.stat.size / 1024).toFixed(2)
            const date = new Date(latestMtRsc.stat.mtime).toLocaleString('id-ID')
            text += `📜 <b>MikroTik Config Export (.rsc):</b>\n   File: <code>${latestMtRsc.name}</code>\n   Ukuran: ${size} KB\n\n`
        }

        text += `<i>Klik tombol di bawah untuk mengunduh ulang file backup ke chat ini.</i>`

        const inlineKeyboard = {
            inline_keyboard: [
                [{ text: '📥 Kirim File ZIP Server', callback_data: 'send_last_zip' }],
                [{ text: '📥 Kirim MikroTik .backup', callback_data: 'send_last_backup' }, { text: '📥 Kirim .rsc', callback_data: 'send_last_rsc' }],
                [{ text: '🔄 Buat Backup Baru', callback_data: 'cmd_backup' }]
            ]
        }

        await sendMessage(chatId, text, inlineKeyboard)
    } catch (e) {
        await sendMessage(chatId, `Error memeriksa last backup: ${e.message}`)
    }
}

COMMANDS['/health'] = async (chatId) => {
    await checkHealth(chatId, true)
}

COMMANDS['/report'] = async (chatId) => {
    await sendDailyReport(chatId)
}

// ─── MONITORING & HEALTH CHECK ──────────────────────────────────────────────

let lastMikrotikStatus = true
let lastServerStatus = true

async function checkHealth(chatId = null, manual = false) {
    const targetChat = chatId || CONFIG.CHAT_ID
    let mikrotikOk = false
    let serverOk = true
    let alertMessages = []

    try {
        const res = await mikrotikQuery('/system/resource/print')
        if (res.length > 0) {
            mikrotikOk = true
            const r = res[0]
            const cpuLoad = parseInt(r['cpu-load'] || '0')
            const totalMem = parseInt(r['total-memory'] || '1')
            const freeMem = parseInt(r['free-memory'] || '0')
            const memPct = (((totalMem - freeMem) / totalMem) * 100).toFixed(1)

            if (cpuLoad > 85) alertMessages.push(`CPU MikroTik TINGGI: ${cpuLoad}%`)
            if (parseFloat(memPct) > 90) alertMessages.push(`RAM MikroTik TINGGI: ${memPct}%`)
        }
    } catch (e) {
        mikrotikOk = false
        alertMessages.push(`MikroTik OFFLINE: ${e.message}`)
    }

    try {
        const res = await fetch('http://127.0.0.1:3000/api/mikrotik?action=config')
        if (!res.ok) serverOk = false
    } catch (e) {
        serverOk = false
        alertMessages.push('Web Server (Next.js) OFFLINE!')
    }

    if (manual) {
        let text = `<b>Laporan Health Check Sistem</b> 🏥\n\n`
        text += `🔹 <b>MikroTik Router:</b> ${mikrotikOk ? '🟢 ONLINE' : '🔴 OFFLINE'}\n`
        text += `🔹 <b>Web Server (allstar.my.id):</b> ${serverOk ? '🟢 ONLINE' : '🔴 OFFLINE'}\n`
        text += `🔹 <b>VPN WireGuard Tunnel:</b> ${mikrotikOk ? '🟢 TERHUBUNG' : '🔴 TERPUTUS'}\n`
        if (alertMessages.length > 0) text += `\n<b>⚠️ Peringatan:</b>\n${alertMessages.map(a => '- ' + a).join('\n')}`
        else text += `\n✨ Semua layanan server dan router beroperasi normal.`
        await sendMessage(targetChat, text)
    } else {
        if (!mikrotikOk && lastMikrotikStatus) {
            await sendMessage(targetChat, `🚨 <b>ALERT: MikroTik Router OFFLINE!</b>\n${alertMessages.join('\n')}`)
        } else if (mikrotikOk && !lastMikrotikStatus) {
            await sendMessage(targetChat, `✅ <b>MikroTik Router kembali ONLINE!</b>`)
        }
        if (!serverOk && lastServerStatus) {
            await sendMessage(targetChat, `🚨 <b>ALERT: Web Server (allstar.my.id) OFFLINE!</b>`)
        } else if (serverOk && !lastServerStatus) {
            await sendMessage(targetChat, `✅ <b>Web Server kembali ONLINE!</b>`)
        }
        if (alertMessages.length > 0 && mikrotikOk) {
            for (const msg of alertMessages) {
                if (msg.includes('TINGGI')) await sendMessage(targetChat, `⚠️ <b>PERINGATAN:</b> ${msg}`)
            }
        }
    }

    lastMikrotikStatus = mikrotikOk
    lastServerStatus = serverOk
}

// ─── DAILY REPORT ───────────────────────────────────────────────────────────

async function sendDailyReport(chatId = null) {
    const targetChat = chatId || CONFIG.CHAT_ID

    try {
        const resource = await mikrotikQuery('/system/resource/print')
        const identity = await mikrotikQuery('/system/identity/print')
        const users = await mikrotikQuery('/ip/hotspot/user/print')
        const active = await mikrotikQuery('/ip/hotspot/active/print')
        const ifaces = await mikrotikQuery('/interface/print')

        const r = resource[0] || {}
        const name = identity.length > 0 ? identity[0].name : 'MikroTik'
        const runningIfaces = ifaces.filter(i => i.running === 'true').length
        const usedMem = parseInt(r['total-memory'] || '0') - parseInt(r['free-memory'] || '0')
        const memPct = ((usedMem / parseInt(r['total-memory'] || '1')) * 100).toFixed(1)

        const now = new Date()
        const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

        let text = `<b>📊 LAPORAN HARIAN STARLINK MANAGER</b>\n`
        text += `📅 <i>${dateStr}</i>\n\n`
        text += `🏢 <b>Router:</b> ${name} (${r['board-name'] || '-'})\n`
        text += `⏱️ <b>Uptime:</b> ${formatUptime(r.uptime)}\n`
        text += `⚙️ <b>CPU Load:</b> ${r['cpu-load'] || '0'}%\n`
        text += `💾 <b>RAM:</b> ${formatBytes(usedMem)} / ${formatBytes(r['total-memory'])} (${memPct}%)\n\n`
        text += `👥 <b>Total User Hotspot:</b> ${users.length}\n`
        text += `⚡ <b>User Aktif Sekarang:</b> ${active.length}\n`
        text += `🌐 <b>Interface Aktif:</b> ${runningIfaces} / ${ifaces.length}\n\n`
        text += `🟢 <b>Status Sistem:</b> Semua service aktif dan normal.\n\n`
        text += `<i>Laporan otomatis dikirim setiap hari jam 07:00 WIB.</i>`

        await sendMessage(targetChat, text)
    } catch (e) {
        await sendMessage(targetChat, `Gagal membuat laporan harian: ${e.message}`)
    }
}

// ─── SECURITY MONITORING ────────────────────────────────────────────────────

let lastLogCount = 0

async function checkSecurityAlerts() {
    try {
        const logs = await mikrotikQuery('/log/print')
        if (logs.length <= lastLogCount) { lastLogCount = logs.length; return }

        const newLogs = logs.slice(lastLogCount)
        lastLogCount = logs.length

        for (const log of newLogs) {
            const msg = (log.message || '').toLowerCase()
            const topics = (log.topics || '').toLowerCase()

            if (msg.includes('logged in') && (topics.includes('system') || topics.includes('info'))) {
                await sendMessage(CONFIG.CHAT_ID, `🔔 <b>LOGIN DETECTED</b>\n${log.message}\nWaktu: ${log.time || 'N/A'}`)
            }
            if (msg.includes('login failure') || msg.includes('login failed')) {
                await sendMessage(CONFIG.CHAT_ID, `🚨 <b>ALERT: Percobaan Login Gagal!</b>\n${log.message}\nWaktu: ${log.time || 'N/A'}`)
            }
            if (msg.includes('link down') && topics.includes('interface')) {
                await sendMessage(CONFIG.CHAT_ID, `⚠️ <b>ALERT: Interface Link Down!</b>\n${log.message}\nWaktu: ${log.time || 'N/A'}`)
            }
        }
    } catch (e) { /* ignore */ }
}

// ─── CALLBACK QUERY HANDLER (INLINE BUTTONS) ────────────────────────────────

async function processCallbackQuery(cq) {
    const chatId = cq.message.chat.id
    const data = cq.data

    await answerCallbackQuery(cq.id, 'Memproses...')

    if (data === 'cmd_status') return COMMANDS['/status'](chatId)
    if (data === 'cmd_active') return COMMANDS['/active'](chatId)
    if (data === 'cmd_bandwidth') return COMMANDS['/bandwidth'](chatId)
    if (data === 'cmd_backup') return COMMANDS['/backup'](chatId)
    if (data === 'cmd_health') return COMMANDS['/health'](chatId)

    if (data === 'cmd_prompt_search') {
        userState[chatId] = 'awaiting_voucher_search'
        return sendMessage(chatId, `🔍 <b>Ketik Kode Voucher atau Nama User yang ingin dicari:</b>\n<i>(Contoh: 1234 atau user01)</i>`, {
            force_reply: true
        })
    }

    if (data.startsWith('vc_detail_')) {
        const username = data.replace('vc_detail_', '')
        return handleVoucherSearch(chatId, username)
    }

    if (data.startsWith('vc_kick_')) {
        const username = data.replace('vc_kick_', '')
        try {
            const active = await mikrotikQuery('/ip/hotspot/active/print')
            const target = active.find(u => u.user === username)
            if (target) {
                await mikrotikQuery('/ip/hotspot/active/remove', [`=numbers=${target['.id']}`])
                await sendMessage(chatId, `✅ User <b>${username}</b> berhasil di-kick!`)
            } else {
                await sendMessage(chatId, `User <b>${username}</b> sudah tidak online.`)
            }
        } catch (e) {
            await sendMessage(chatId, `Gagal kick: ${e.message}`)
        }
        return handleVoucherSearch(chatId, username)
    }

    if (data.startsWith('vc_toggle_')) {
        const parts = data.split('_')
        const username = parts[2]
        const action = parts[3]
        try {
            const cmd = action === 'enable' ? '/ip/hotspot/user/enable' : '/ip/hotspot/user/disable'
            await mikrotikQuery(cmd, [`=numbers=${username}`])
            await sendMessage(chatId, `✅ Status voucher <b>${username}</b> diubah ke: <b>${action.toUpperCase()}</b>`)
        } catch (e) {
            await sendMessage(chatId, `Gagal update voucher: ${e.message}`)
        }
        return handleVoucherSearch(chatId, username)
    }

    if (data.startsWith('vc_del_')) {
        const username = data.replace('vc_del_', '')
        try {
            await mikrotikQuery('/ip/hotspot/user/remove', [`=numbers=${username}`])
            await sendMessage(chatId, `✅ Voucher <b>${username}</b> berhasil dihapus permanen dari MikroTik!`, MAIN_KEYBOARD)
        } catch (e) {
            await sendMessage(chatId, `Gagal hapus: ${e.message}`, MAIN_KEYBOARD)
        }
    }

    if (data === 'send_last_zip') {
        const p = 'C:\\Backups\\StarlinkManager\\latest_backup.zip'
        if (fs.existsSync(p)) {
            await sendMessage(chatId, 'Mengirim file ZIP backup server...')
            await sendDocument(chatId, p, 'Backup Lengkap Server Starlink Manager')
        } else {
            await sendMessage(chatId, 'File latest_backup.zip tidak ditemukan.')
        }
    }

    if (data === 'send_last_backup') {
        const mtDir = 'C:\\Backups\\MikroTik'
        const files = fs.existsSync(mtDir) ? fs.readdirSync(mtDir).filter(f => f.endsWith('.backup')).map(f => path.join(mtDir, f)).sort((a,b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs) : []
        if (files.length > 0) {
            await sendMessage(chatId, 'Mengirim file .backup MikroTik Winbox...')
            await sendDocument(chatId, files[0], 'MikroTik Winbox Backup File')
        } else {
            await sendMessage(chatId, 'File .backup MikroTik tidak ditemukan.')
        }
    }

    if (data === 'send_last_rsc') {
        const mtDir = 'C:\\Backups\\MikroTik'
        const files = fs.existsSync(mtDir) ? fs.readdirSync(mtDir).filter(f => f.endsWith('.rsc')).map(f => path.join(mtDir, f)).sort((a,b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs) : []
        if (files.length > 0) {
            await sendMessage(chatId, 'Mengirim script .rsc MikroTik...')
            await sendDocument(chatId, files[0], 'MikroTik Config Export Script')
        } else {
            await sendMessage(chatId, 'File .rsc MikroTik tidak ditemukan.')
        }
    }
}

// ─── MESSAGE PROCESSOR ─────────────────────────────────────────────────────

async function processMessage(msg) {
    const chatId = msg.chat.id
    const text = (msg.text || '').trim()

    if (!isAuthorized(chatId)) {
        return sendMessage(chatId, 'Akses Ditolak. Bot ini hanya dapat diakses oleh Admin.', null)
    }

    // Check if user is in an active state
    if (userState[chatId] === 'awaiting_voucher_search' && !text.startsWith('/')) {
        delete userState[chatId]
        return handleVoucherSearch(chatId, text)
    }

    // Map Keyboard button text to commands
    const textLower = text.toLowerCase()
    let commandToRun = text
    let args = []

    if (textLower.includes('cari voucher') || textLower === '🔍 cari voucher') {
        userState[chatId] = 'awaiting_voucher_search'
        return sendMessage(chatId, `🔍 <b>Ketik Kode Voucher atau Nama User yang ingin dicari:</b>\n<i>(Contoh: 1234 atau user01)</i>`, {
            force_reply: true
        })
    }
    else if (textLower.includes('status router') || textLower === '📊 status router' || textLower === '📊 status') commandToRun = '/status'
    else if (textLower.includes('user aktif') || textLower === '⚡ user aktif') commandToRun = '/active'
    else if (textLower.includes('semua user') || textLower === '👥 semua user') commandToRun = '/users'
    else if (textLower.includes('bandwidth') || textLower === '📈 bandwidth') commandToRun = '/bandwidth'
    else if (textLower.includes('backup sekarang') || textLower === '💾 backup sekarang') commandToRun = '/backup'
    else if (textLower.includes('last backup') || textLower === '📦 last backup') commandToRun = '/lastbackup'
    else if (textLower.includes('health check') || textLower === '🏥 health check') commandToRun = '/health'
    else if (textLower.includes('laporan') || textLower === '📋 laporan') commandToRun = '/report'
    else if (textLower.includes('log router') || textLower === '📜 log router' || textLower.includes('log mikrotik')) commandToRun = '/log'
    else if (textLower.includes('bantuan') || textLower === '❓ bantuan') commandToRun = '/help'
    else if (text.startsWith('/')) {
        const parts = text.split(/\s+/)
        commandToRun = parts[0].toLowerCase().split('@')[0]
        args = parts.slice(1)
    }

    const handler = COMMANDS[commandToRun]
    if (handler) {
        await handler(chatId, args)
    } else {
        await sendMessage(chatId, `Perintah tidak dikenali: <b>${text}</b>\nGunakan tombol menu di bawah atau ketik /help.`, MAIN_KEYBOARD)
    }
}

async function pollLoop() {
    while (true) {
        try {
            const updates = await getUpdates()
            for (const update of updates) {
                lastUpdateId = update.update_id
                if (update.message) await processMessage(update.message)
                if (update.callback_query) await processCallbackQuery(update.callback_query)
            }
        } catch (e) { /* ignore */ }
        await new Promise(r => setTimeout(r, 1500))
    }
}

// ─── SCHEDULER ──────────────────────────────────────────────────────────────

function startSchedulers() {
    setInterval(() => checkHealth(), 5 * 60 * 1000)
    setInterval(() => checkSecurityAlerts(), 2 * 60 * 1000)
    setInterval(() => {
        const now = new Date()
        if (now.getUTCHours() === 0 && now.getUTCMinutes() === 0) {
            sendDailyReport()
        }
    }, 60 * 1000)
}

// ─── STARTUP ────────────────────────────────────────────────────────────────

async function main() {
    console.log('=================================================')
    console.log(' Starlink Manager Telegram Bot (Accurate Timeline)')
    console.log('=================================================')
    console.log(`Bot Token: ...${CONFIG.BOT_TOKEN.slice(-8)}`)
    console.log(`Chat ID: ${CONFIG.CHAT_ID}`)
    console.log(`MikroTik: ${CONFIG.MT_HOST}:${CONFIG.MT_PORT}`)
    console.log('')

    try {
        const logs = await mikrotikQuery('/log/print')
        lastLogCount = logs.length
    } catch (e) {}

    startSchedulers()
    console.log('Schedulers started (health: 5min, security: 2min, report: daily 07:00)')
    console.log('Telegram polling started...\n')
    await pollLoop()
}

main().catch(console.error)
