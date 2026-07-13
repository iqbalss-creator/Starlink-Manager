const { NodeSSH } = require('node-ssh'); 
const ssh = new NodeSSH(); 
ssh.connect({host: '103.181.143.132', username: 'Iqbal', password: 'Korindo582'}).then(() => 
  ssh.execCommand('cd Starlink-Manager && npx tsx -e "import { mikrotikQuery } from \\"./src/app/api/mikrotik/route.ts\\"; mikrotikQuery(\\"/ip/hotspot/profile/print\\").then(r => console.log(\\"PROFILES:\\", r.length)).catch(console.error); mikrotikQuery(\\"/ip/hotspot/print\\").then(r => console.log(\\"SERVERS:\\", r.length)).catch(e => console.error(e))"')
).then(r => { console.log(r.stdout || r.stderr); process.exit(0) }).catch(console.error);
