const { NodeSSH } = require('node-ssh')
const ssh = new NodeSSH()

async function rebuildClean() {
  try {
    await ssh.connect({
      host: '103.181.143.132',
      username: 'Iqbal',
      password: 'Korindo582',
      readyTimeout: 10000
    })
    
    console.log('Connected, pulling and running clean build...')
    
    const cmds = [
      'git pull origin main',
      'rm -rf .next',
      'npm run build',
      'pm2 restart starlink-manager'
    ]

    for (const cmd of cmds) {
      console.log(`Running: ${cmd}`)
      const res = await ssh.execCommand(cmd, { cwd: '/home/Iqbal/Starlink-Manager' })
      console.log(res.stdout || res.stderr)
    }

    ssh.dispose()
    console.log('Build finished.')
  } catch (err) {
    console.error('Error:', err.message)
    if (ssh) ssh.dispose()
  }
}
rebuildClean()
