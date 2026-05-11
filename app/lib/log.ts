import { File, Directory, Paths } from 'expo-file-system'

const LOG_DIR = new Directory(Paths.document, 'logs')
const MAX_SIZE = 512_000

async function write(level: string, tag: string, msg: string, extra?: Record<string, unknown>) {
  try {
    if (!LOG_DIR.exists) {
      LOG_DIR.create({ intermediates: true, idempotent: true })
    }

    const f = new File(LOG_DIR, 'liblib.log')
    const entry = JSON.stringify({ t: new Date().toISOString(), l: level, tag, msg, ...extra })

    if (!f.exists) {
      f.create()
    }

    const existing = await f.text()
    const updated = existing + entry + '\n'

    if (updated.length > MAX_SIZE) {
      const lines = updated.split('\n')
      const half = lines.slice(Math.floor(lines.length / 2))
      f.write(half.join('\n'))
    } else {
      f.write(updated)
    }
  } catch {
    // don't crash the app over logging
  }
}

export const log = {
  info: (tag: string, msg: string, extra?: Record<string, unknown>) => {
    console.log(`[${tag}]`, msg)
    write('info', tag, msg, extra)
  },
  warn: (tag: string, msg: string, extra?: Record<string, unknown>) => {
    console.log(`[${tag}] WARN:`, msg)
    write('warn', tag, msg, extra)
  },
  error: (tag: string, msg: string, extra?: Record<string, unknown>) => {
    console.log(`[${tag}] ERROR:`, msg)
    write('error', tag, msg, extra)
  },
}

export async function getLogs() {
  try {
    if (!LOG_DIR.exists) {
      LOG_DIR.create({ intermediates: true, idempotent: true })
    }

    const f = new File(LOG_DIR, 'liblib.log')

    if (!f.exists) {
      return ''
    }

    return await f.text()
  } catch {
    return ''
  }
}

export function clearLogs() {
  try {
    const f = new File(LOG_DIR, 'liblib.log')

    if (f.exists) {
      f.delete()
    }
  } catch {}
}
