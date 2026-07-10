const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function checkNginx() {
  await ssh.connect({ host: '103.181.143.132', username: 'Iqbal', password: 'Korindo582', readyTimeout: 10000 });
  const nginx = await ssh.execCommand('cat /etc/nginx/sites-available/allstar.my.id');
  console.log('--- Nginx ---');
  console.log(nginx.stdout);
  ssh.dispose();
}
checkNginx();
