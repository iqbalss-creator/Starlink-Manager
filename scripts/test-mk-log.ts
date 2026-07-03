import { mikrotikQuery } from '../src/app/api/mikrotik/route'

async function test() {
  const result = await mikrotikQuery('/log/print', ['?topics=hotspot,info,debug'])
  console.log('Logs:', result.slice(-5))
}

test()
