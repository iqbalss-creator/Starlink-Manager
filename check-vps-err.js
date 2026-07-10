const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function getLogs() {
  await ssh.connect({ host: '103.181.143.132', username: 'Iqbal', password: 'Korindo582', readyTimeout: 10000 });
  const pm2 = await ssh.execCommand('tail -n 30 /home/Iqbal/.pm2/logs/starlink-manager-error.log');
  console.log('--- PM2 Error Log ---');
  console.log(pm2.stdout || pm2.stderr);
  ssh.dispose();
}
getLogs();
