const { NodeSSH } = require('node-ssh')
const ssh = new NodeSSH()

const host = '103.181.143.132'
const password = 'Korindo582'
const usernames = ['ubuntu', 'iqbal', 'Iqbal', 'root']

async function tryLogin() {
  let successfulUser = null
  for (const username of usernames) {
    console.log(`Mencoba login sebagai: ${username}...`)
    try {
      await ssh.connect({
        host: host,
        username: username,
        password: password,
        tryKeyboard: true,
        readyTimeout: 10000
      })
      console.log(`✅ BERHASIL login sebagai: ${username}!`)
      successfulUser = username
      break
    } catch (err) {
      console.log(`❌ Gagal login sebagai ${username}: ${err.message}`)
    }
  }

  if (!successfulUser) {
    console.log('Semua username gagal. Kemungkinan besar password yang Anda buat salah (typo) atau username berbeda.')
    return
  }

  console.log('\nMemulai proses instalasi otomatis di VPS...')
  const commands = [
    'echo "Korindo582" | sudo -S apt update && sudo -S apt upgrade -y',
    'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -',
    'sudo apt install -y nodejs git',
    'sudo npm install -g pm2',
    'rm -rf Starlink-Manager',
    'git clone https://x-access-token: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@github.com/iqbalss-creator/Starlink-Manager.git',
    'cd Starlink-Manager && npm install',
    `cd Starlink-Manager && cat << 'EOF' > .env.local
NEXT_PUBLIC_SUPABASE_URL=https://ibapvnccesbcuhmzjcdc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImliYXB2bmNjZXNiY3VobXpqY2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2NzIwOTUsImV4cCI6MjA5ODI0ODA5NX0.HljYSj1jKR8Iy7PrE13zwnz6Y3PqlmSDlR3JRoOcpjk
MIKROTIK_HOST=id-10.tunnel.id
MIKROTIK_USER=admin
MIKROTIK_PASS="qwe123!@#"
MIKROTIK_PORT=6158
EOF`,
    'cd Starlink-Manager && npm run build',
    'cd Starlink-Manager && pm2 start npm --name "starlink-manager" -- start',
    'pm2 save'
  ]

  for (const cmd of commands) {
    console.log(`\nMenjalankan: ${cmd.split(' ')[0]}...`)
    const result = await ssh.execCommand(cmd, { cwd: '/home/' + successfulUser })
    if (result.stdout) console.log(result.stdout)
    if (result.stderr) console.error(result.stderr)
  }

  console.log('\n🎉 PROSES SELESAI! Aplikasi Starlink Manager sudah aktif.')
  ssh.dispose()
}

tryLogin()
