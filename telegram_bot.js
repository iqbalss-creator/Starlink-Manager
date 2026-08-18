/**
 * ═══════════════════════════════════════════════════════════════════
 *  STARLINK MANAGER - TELEGRAM BOT (Interactive Keyboard & Control)
 * ═══════════════════════════════════════════════════════════════════
 *  Fitur:
 *   1. Interactive Buttons Keyboard (Tombol menu cepat di Telegram)
 *   2. Remote Control MikroTik via Chat & Button
 *   3. Monitoring & Alert Otomatis (Server + MikroTik)
 *   4. Laporan Harian Otomatis (Jam 07:00 WIB)
 *   5. Last Backup Inspector & Instant Delivery
 *   6. Alert Keamanan (Login, Brute-force, Link down)
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
    }
}

const TELEGRAM_API = `https://api.telegram.org/bot${CONFIG.BOT_TOKEN}`
let lastUpdateId = 0

// ─── MENU KEYBOARD (TOMBOL TELEGRAM) ────────────────────────────────────────

const MAIN_KEYBOARD = {
    keyboard: [
        [{ text: '📊 Status' }, { text: '⚡ User Aktif' }],
        [{ text: '👥 Semua User' }, { text: '📈 Bandwidth' }],
        [{ text: '💾 Backup Sekarang' }, { text: '📦 Last Backup' }],
        [{ text: '🏥 Health Check' }, { text: '📋 Laporan' }],
        [{ text: '📜 Log MikroTik' }, { text: '❓ Bantuan' }]
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

// ─── COMMAND HANDLERS ───────────────────────────────────────────────────────

const COMMANDS = {}

COMMANDS['/start'] = COMMANDS['/help'] = async (chatId) => {
    const text = `<b>Selamat Datang di Starlink Manager Bot!</b> 🚀

Gunakan tombol menu di bawah atau ketik perintah langsung:

<b>📊 Monitoring & Status:</b>
• /status - Info CPU, RAM, Uptime & Router
• /active - User hotspot yang sedang online
• /users - Seluruh daftar user hotspot
• /bandwidth - Monitor traffic interface
• /health - Cek kesehatan server & MikroTik
• /report - Laporan ringkasan sistem

<b>💾 Backup & Recovery:</b>
• /backup - Buat backup baru sekarang
• /lastbackup - Info & download backup terakhir

<b>⚙️ Konfigurasi & Remote:</b>
• /adduser &lt;nama&gt; &lt;pass&gt; [profile] - Tambah user
• /deluser &lt;nama&gt; - Hapus user
• /kick &lt;nama&gt; - Putus koneksi user aktif
• /interfaces - Daftar status interface
• /ip - Daftar IP Address
• /dhcp - Daftar DHCP Leases
• /log - Log sistem MikroTik
• /ping &lt;host&gt; - Ping dari router
• /reboot - Restart router MikroTik`
    await sendMessage(chatId, text, MAIN_KEYBOARD)
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
                [{ text: '💾 Backup Sekarang', callback_data: 'cmd_backup' }]
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

COMMANDS['/interfaces'] = async (chatId) => {
    try {
        const data = await mikrotikQuery('/interface/print')
        let text = `<b>Daftar Interface MikroTik (${data.length})</b>\n\n`
        data.forEach((i, idx) => {
            const status = i.running === 'true' ? '🟢 RUNNING' : '⚪ DOWN'
            text += `${idx + 1}. <b>${i.name}</b> | ${i.type || '-'} | ${status}\n`
        })
        await sendMessage(chatId, text)
    } catch (e) { await sendMessage(chatId, `Error: ${e.message}`) }
}

COMMANDS['/ip'] = async (chatId) => {
    try {
        const data = await mikrotikQuery('/ip/address/print')
        let text = `<b>Daftar IP Address (${data.length})</b>\n\n`
        data.forEach((ip, i) => {
            text += `${i + 1}. <b>${ip.address}</b>\n   Interface: ${ip.interface || '-'} | Network: ${ip.network || '-'}\n`
        })
        await sendMessage(chatId, text)
    } catch (e) { await sendMessage(chatId, `Error: ${e.message}`) }
}

COMMANDS['/dhcp'] = async (chatId) => {
    try {
        const data = await mikrotikQuery('/ip/dhcp-server/lease/print')
        if (data.length === 0) return sendMessage(chatId, 'Tidak ada DHCP leases.')
        let text = `<b>Daftar DHCP Leases (${data.length})</b>\n\n`
        data.slice(0, 25).forEach((l, i) => {
            const status = l.status || (l.dynamic === 'true' ? 'dynamic' : 'static')
            text += `${i + 1}. <b>${l['host-name'] || l['mac-address'] || '-'}</b>\n   IP: ${l.address || '-'} | Status: ${status}\n`
        })
        if (data.length > 25) text += `\n... dan ${data.length - 25} lease lainnya.`
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

COMMANDS['/ping'] = async (chatId, args) => {
    const target = args[0] || '8.8.8.8'
    try {
        const data = await mikrotikQuery('/ping', [`=address=${target}`, '=count=4'])
        if (data.length === 0) return sendMessage(chatId, `Ping ke ${target}: Tidak ada respon.`)
        let text = `<b>Hasil Ping ke ${target}</b>\n\n`
        data.forEach((p, i) => {
            if (p.time) text += `${i + 1}. ${p.time} ms (TTL: ${p.ttl || '-'})\n`
            else text += `${i + 1}. Request Timeout\n`
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

COMMANDS['/reboot'] = async (chatId) => {
    await sendMessage(chatId, '⚠️ Mengirim perintah REBOOT ke MikroTik...\nRouter akan offline beberapa saat.')
    try {
        await mikrotikQuery('/system/reboot')
    } catch (e) { /* reboot causes socket close */ }
    await sendMessage(chatId, 'Perintah reboot telah terkirim. MikroTik sedang restart...')
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

    // Check MikroTik
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

    // Check Server (Web App)
    try {
        const res = await fetch('http://127.0.0.1:3000/api/mikrotik?action=config')
        if (!res.ok) serverOk = false
    } catch (e) {
        serverOk = false
        alertMessages.push('Web Server (Next.js) OFFLINE!')
    }

    // Send alert if status changed or manual check
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

    // Map Keyboard button text to commands
    const textLower = text.toLowerCase()
    let commandToRun = text
    let args = []

    if (textLower.includes('status')) commandToRun = '/status'
    else if (textLower.includes('user aktif') || textLower === '⚡ user aktif') commandToRun = '/active'
    else if (textLower.includes('semua user') || textLower === '👥 semua user') commandToRun = '/users'
    else if (textLower.includes('bandwidth') || textLower === '📈 bandwidth') commandToRun = '/bandwidth'
    else if (textLower.includes('backup sekarang') || textLower === '💾 backup sekarang') commandToRun = '/backup'
    else if (textLower.includes('last backup') || textLower === '📦 last backup') commandToRun = '/lastbackup'
    else if (textLower.includes('health check') || textLower === '🏥 health check') commandToRun = '/health'
    else if (textLower.includes('laporan') || textLower === '📋 laporan') commandToRun = '/report'
    else if (textLower.includes('log mikrotik') || textLower === '📜 log mikrotik') commandToRun = '/log'
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
    // Health check every 5 minutes
    setInterval(() => checkHealth(), 5 * 60 * 1000)

    // Security alert check every 2 minutes
    setInterval(() => checkSecurityAlerts(), 2 * 60 * 1000)

    // Daily report at 07:00 WIB (UTC+7 = 00:00 UTC)
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
    console.log(' Starlink Manager Telegram Bot (Keyboard Active)')
    console.log('=================================================')
    console.log(`Bot Token: ...${CONFIG.BOT_TOKEN.slice(-8)}`)
    console.log(`Chat ID: ${CONFIG.CHAT_ID}`)
    console.log(`MikroTik: ${CONFIG.MT_HOST}:${CONFIG.MT_PORT}`)
    console.log('')

    // Send startup notification with interactive keyboard
    await sendMessage(CONFIG.CHAT_ID, `<b>Starlink Manager Bot v2.0 Siap Digunakan!</b> 🚀\n\nTombol menu cepat telah diaktifkan di bawah chat Anda.\nKetik /help atau tekan tombol apa saja untuk mulai.`, MAIN_KEYBOARD)

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
