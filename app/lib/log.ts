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

/**
 * Synchronous variant of `write`, used by the global error handler. A fatal
 * crash can terminate the JS context before an async file write flushes, so
 * crash logging goes through the sync expo-file-system APIs to guarantee the
 * entry lands on disk.
 */
function writeSync(level: string, tag: string, msg: string, extra?: Record<string, unknown>) {
  try {
    if (!LOG_DIR.exists) {
      LOG_DIR.create({ intermediates: true, idempotent: true })
    }

    const f = new File(LOG_DIR, 'liblib.log')
    const entry = JSON.stringify({ t: new Date().toISOString(), l: level, tag, msg, ...extra })

    if (!f.exists) {
      f.create()
    }

    const existing = f.textSync()
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

type GlobalErrorHandler = (error: unknown, isFatal?: boolean) => void

let globalLoggingInstalled = false

/**
 * Routes uncaught/fatal JS errors through the on-disk log before delegating to
 * the app's previous handler (red box in dev, crash in prod). These never reach
 * the per-call-site try/catch blocks, so without this they're lost from the
 * saved logs. Writes synchronously so the entry survives a fatal crash. Safe to
 * call repeatedly; only the first call wires the handler.
 */
export function installGlobalErrorLogging() {
  if (globalLoggingInstalled) {
    return
  }

  globalLoggingInstalled = true

  const errorUtils = (
    globalThis as {
      ErrorUtils?: {
        getGlobalHandler?: () => GlobalErrorHandler | undefined
        setGlobalHandler?: (handler: GlobalErrorHandler) => void
      }
    }
  ).ErrorUtils

  if (!errorUtils?.setGlobalHandler) {
    return
  }

  const previous = errorUtils.getGlobalHandler?.()

  errorUtils.setGlobalHandler((error, isFatal) => {
    const e = error instanceof Error ? error : new Error(String(error))

    writeSync('error', 'crash', `${isFatal ? 'FATAL: ' : ''}${e.message}`, { stack: e.stack })

    previous?.(error, isFatal)
  })
}

export async function getLogs() {
  try {
    if (!LOG_DIR.exists) {
      LOG_DIR.create({ intermediates: true, idempotent: true })
    }

    const f = new File(LOG_DIR, 'liblib.log')

    return f.exists ? await f.text() : ''
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
