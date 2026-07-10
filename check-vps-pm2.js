const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function getPm2() {
  await ssh.connect({ host: '103.181.143.132', username: 'Iqbal', password: 'Korindo582', readyTimeout: 10000 });
  const pm2 = await ssh.execCommand('pm2 status');
  console.log('--- PM2 Status ---');
  console.log(pm2.stdout || pm2.stderr);
  ssh.dispose();
}
getPm2();
