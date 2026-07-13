const { NodeSSH } = require('node-ssh')
const ssh = new NodeSSH()

const host = '103.181.143.132'
const password = 'Korindo582'
const username = 'Iqbal'

async function deploy() {
  try {
    console.log(`Connecting to VPS...`)
    await ssh.connect({
      host,
      username,
      password,
      readyTimeout: 10000
    })
    console.log(`✅ Connected! Uploading deploy.zip...`)
    
    await ssh.putFile('deploy.tar.gz', 'deploy.tar.gz')
    console.log(`✅ Upload finished! Executing setup commands...`)
    
    const commands = [
      'pm2 stop all',
      'echo "Korindo582" | sudo -S rm -rf Starlink-Manager',
      'mkdir Starlink-Manager',
      'tar -xzf deploy.tar.gz -C Starlink-Manager',
      'cd Starlink-Manager && rm -rf node_modules .next',
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
      'cd Starlink-Manager && pm2 restart starlink-manager || pm2 start npm --name "starlink-manager" -- run start',
      'pm2 save'
    ]

    for (const cmd of commands) {
      console.log(`Running: ${cmd.split(' ')[0]}...`)
      const result = await ssh.execCommand(cmd)
      if (result.stdout) console.log(result.stdout)
      if (result.stderr) console.error(result.stderr)
    }

    console.log('🎉 DEPLOYMENT SELESAI!')
    process.exit(0)
  } catch (err) {
    console.error('Deployment failed:', err)
    process.exit(1)
  }
}

deploy()
