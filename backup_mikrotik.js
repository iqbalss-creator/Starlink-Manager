const net = require('net')
const fs = require('fs')
const path = require('path')

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

function runMikrotikCommand(words) {
    return new Promise((resolve, reject) => {
        const socket = new net.Socket()
        socket.setTimeout(25000)
        let loggedIn = false

        socket.connect(8728, '10.8.0.2', () => {
            socket.write(encodeSentence(['/login', '=name=admin', '=password=qwe123!@#']))
        })

        socket.on('data', (buf) => {
            const str = buf.toString('utf8')
            if (!loggedIn && str.includes('!done')) {
                loggedIn = true
                console.log("Sending command:", words[0])
                socket.write(encodeSentence(words))
            } else if (loggedIn) {
                if (str.includes('!done')) {
                    socket.destroy()
                    resolve(true)
                } else if (str.includes('!trap')) {
                    socket.destroy()
                    reject(new Error(`Command error: ${str}`))
                }
            }
        })

        socket.on('error', reject)
        socket.on('timeout', () => { socket.destroy(); resolve(false); })
    })
}

async function backupMikrotik() {
    console.log("1. Generating MikroTik Backup and RSC Export on router...")
    const backupName = "allstar_mikrotik_backup"
    const exportName = "allstar_mikrotik_export"

    try {
        await runMikrotikCommand(['/system/backup/save', `=name=${backupName}`])
        console.log("✅ Binary backup generated on router.")
    } catch (e) {
        console.log("Backup command note:", e.message)
    }

    try {
        await runMikrotikCommand(['/export', `=file=${exportName}`])
        console.log("✅ RSC export generated on router.")
    } catch (e) {
        console.log("Export command note:", e.message)
    }

    console.log("\n2. Downloading backup files via FTP from MikroTik (10.8.0.2)...")
    const backupDir = "C:\\Backups\\MikroTik"
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

    const dateStr = new Date().toISOString().replace(/:/g, '-').slice(0, 19)
    const localBackupFile = path.join(backupDir, `mikrotik_${dateStr}.backup`)
    const localExportFile = path.join(backupDir, `mikrotik_${dateStr}.rsc`)

    await downloadViaCurl(`ftp://admin:qwe123!%40%23@10.8.0.2/${backupName}.backup`, localBackupFile)
    await downloadViaCurl(`ftp://admin:qwe123!%40%23@10.8.0.2/${exportName}.rsc`, localExportFile)

    if (fs.existsSync(localBackupFile)) {
        const size = (fs.statSync(localBackupFile).size / 1024).toFixed(2)
        console.log(`✅ Downloaded: ${localBackupFile} (${size} KB)`)
    }
    if (fs.existsSync(localExportFile)) {
        const size = (fs.statSync(localExportFile).size / 1024).toFixed(2)
        console.log(`✅ Downloaded: ${localExportFile} (${size} KB)`)
    }
}

function downloadViaCurl(url, dest) {
    return new Promise((resolve) => {
        const { exec } = require('child_process')
        exec(`curl.exe -s -o "${dest}" "${url}"`, (err, stdout, stderr) => {
            if (err) console.error("FTP download error:", err.message)
            resolve()
        })
    })
}

backupMikrotik()
