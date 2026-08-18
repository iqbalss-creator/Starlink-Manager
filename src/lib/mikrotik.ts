import { NextResponse } from 'next/server'
import net from 'net'
import { createHash } from 'crypto'
import { createClient } from '@/utils/supabase/server'

const TIMEOUT_MS = 20000 // 20 detik untuk koneksi tunnel

// ─── Encoding ──────────────────────────────────────────────────────────────

function encodeLength(len: number): Buffer {
  if (len < 0x80) return Buffer.from([len])
  if (len < 0x4000) return Buffer.from([(len >> 8) | 0x80, len & 0xff])
  if (len < 0x200000) return Buffer.from([(len >> 16) | 0xc0, (len >> 8) & 0xff, len & 0xff])
  return Buffer.from([(len >> 24) | 0xe0, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff])
}

function encodeWord(word: string): Buffer {
  const data = Buffer.from(word, 'utf8')
  return Buffer.concat([encodeLength(data.length), data])
}

function encodeSentence(words: string[]): Buffer {
  return Buffer.concat([...words.map(encodeWord), Buffer.from([0])])
}

// ─── Decoding ──────────────────────────────────────────────────────────────

function decodeLength(buf: Buffer, pos: number): { len: number; headerLen: number } | null {
  if (pos >= buf.length) return null
  const b = buf[pos]
  if (b < 0x80) return { len: b, headerLen: 1 }
  if (b < 0xc0) {
    if (pos + 1 >= buf.length) return null
    return { len: ((b & 0x3f) << 8) | buf[pos + 1], headerLen: 2 }
  }
  if (b < 0xe0) {
    if (pos + 2 >= buf.length) return null
    return { len: ((b & 0x1f) << 16) | (buf[pos + 1] << 8) | buf[pos + 2], headerLen: 3 }
  }
  if (pos + 3 >= buf.length) return null
  return { len: ((b & 0x0f) << 24) | (buf[pos + 1] << 16) | (buf[pos + 2] << 8) | buf[pos + 3], headerLen: 4 }
}

// Parse as many complete sentences as possible; return unparsed remainder
function parseSentences(buf: Buffer): { sentences: string[][]; remaining: Buffer } {
  const sentences: string[][] = []
  let pos = 0

  outer: while (pos < buf.length) {
    const sentenceStart = pos
    const words: string[] = []

    while (pos < buf.length) {
      const r = decodeLength(buf, pos)
      if (!r) {
        // Need more data to determine length
        return { sentences, remaining: buf.subarray(sentenceStart) }
      }
      const { len, headerLen } = r
      pos += headerLen

      if (len === 0) {
        // End of sentence
        sentences.push(words)
        continue outer
      }

      if (pos + len > buf.length) {
        // Word data not fully received yet
        return { sentences, remaining: buf.subarray(sentenceStart) }
      }

      words.push(buf.subarray(pos, pos + len).toString('utf8'))
      pos += len
    }

    // Incomplete sentence
    return { sentences, remaining: buf.subarray(sentenceStart) }
  }

  return { sentences, remaining: Buffer.alloc(0) }
}

function parseAttrs(words: string[]): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const w of words) {
    if (w.startsWith('=')) {
      const eq = w.indexOf('=', 1)
      if (eq > 0) attrs[w.substring(1, eq)] = w.substring(eq + 1)
    }
  }
  return attrs
}

// ─── MD5 helper for old RouterOS challenge ─────────────────────────────────

function md5ChallengeResponse(pass: string, challenge: string): string {
  const hash = createHash('md5')
  hash.update(Buffer.from([0])) // null byte prefix
  hash.update(Buffer.from(pass, 'utf8'))
  hash.update(Buffer.from(challenge, 'hex'))
  return '00' + hash.digest('hex')
}

// ─── Main query function ───────────────────────────────────────────────────

let cachedConfig: any = null;
let cacheTime = 0;

export async function getMikrotikConfig() {
  if (cachedConfig && Date.now() - cacheTime < 60000) {
    return cachedConfig;
  }

  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['mikrotik_host', 'mikrotik_user', 'mikrotik_password', 'mikrotik_port'])
  
  const getSetting = (key: string, envFallback: string) => {
    const found = settings?.find(s => s.key === key)
    return found?.value || envFallback
  }

  const host = getSetting('mikrotik_host', process.env.MIKROTIK_HOST || '')
  const port = parseInt(getSetting('mikrotik_port', process.env.MIKROTIK_PORT || '8728'))
  const user = getSetting('mikrotik_user', process.env.MIKROTIK_USER || 'admin')
  const pass = getSetting('mikrotik_password', process.env.MIKROTIK_PASS || '')

  const result = { host, port, user, pass }
  cachedConfig = result;
  cacheTime = Date.now();
  return result
}

export async function mikrotikQuery(command: string, params: string[] = []): Promise<Record<string, string>[]> {
  const { host, port, user, pass } = await getMikrotikConfig()

  return new Promise((resolve, reject) => {
    if (!host) {
      reject(new Error('MIKROTIK_HOST tidak dikonfigurasi di pengaturan Integrasi atau .env.local'))
      return
    }

    const socket = new net.Socket()
    socket.setTimeout(TIMEOUT_MS)

    const results: Record<string, string>[] = []
    let recvBuf = Buffer.alloc(0)
    let done = false

    // 3-state login machine:
    // 'sent_with_pass'  → sent /login =name= =password= (modern RouterOS 6.43+)
    // 'sent_challenge'  → sent /login =name= =response= (old RouterOS MD5)
    // 'authenticated'   → sending actual command
    let loginPhase: 'sent_with_pass' | 'sent_challenge' | 'authenticated' = 'sent_with_pass'

    const finish = (err?: Error) => {
      if (done) return
      done = true
      socket.destroy()
      if (err) reject(err)
      else resolve(results)
    }

    const send = (words: string[]) => socket.write(encodeSentence(words))

    const handleSentences = (sentences: string[][]) => {
      for (const words of sentences) {
        if (!words.length) continue
        const type = words[0]
        const attrs = parseAttrs(words)

        if (loginPhase === 'sent_with_pass') {
          if (type === '!done') {
            if (attrs.ret) {
              // Old RouterOS: sent challenge, need MD5 response
              loginPhase = 'sent_challenge'
              send(['/login', `=name=${user}`, `=response=${md5ChallengeResponse(pass, attrs.ret)}`])
            } else {
              // Modern RouterOS: logged in directly
              loginPhase = 'authenticated'
              send([command, ...params])
            }
          } else if (type === '!trap') {
            finish(new Error(`Login gagal: ${attrs.message || 'Username atau password salah'}`))
          }
        } else if (loginPhase === 'sent_challenge') {
          if (type === '!done') {
            loginPhase = 'authenticated'
            send([command, ...params])
          } else if (type === '!trap') {
            finish(new Error(`Autentikasi gagal: ${attrs.message || 'Password salah'}`))
          }
        } else {
          // authenticated — receiving command results
          if (type === '!re') {
            results.push({ ...attrs })
          } else if (type === '!done') {
            finish()
            return
          } else if (type === '!trap') {
            finish(new Error(`Error perintah: ${attrs.message || 'Unknown error'}`))
            return
          }
        }
      }
    }

    socket.connect(port, host, () => {
      // Try modern login first (RouterOS 6.43+ accepts password directly)
      // If old RouterOS, it will respond with =ret=CHALLENGE which we handle above
      loginPhase = 'sent_with_pass'
      send(['/login', `=name=${user}`, `=password=${pass}`])
    })

    socket.on('data', (data: Buffer) => {
      recvBuf = Buffer.concat([recvBuf, data])
      const { sentences, remaining } = parseSentences(recvBuf)
      recvBuf = remaining as any
      if (sentences.length > 0) handleSentences(sentences)
    })

    socket.on('timeout', () =>
      finish(new Error(`Timeout setelah ${TIMEOUT_MS / 1000}s — pastikan API service aktif di MikroTik (IP → Services → api, port ${port})`))
    )

    socket.on('error', (err: NodeJS.ErrnoException) => {
      const msg = err.code === 'ECONNREFUSED'
        ? `Port ${port} ditolak oleh ${host} — pastikan MikroTik API service aktif`
        : err.code === 'ENOTFOUND'
        ? `Host '${host}' tidak ditemukan — periksa MIKROTIK_HOST di .env.local`
        : `Koneksi error: ${err.message}`
      finish(new Error(msg))
    })
  })
}

