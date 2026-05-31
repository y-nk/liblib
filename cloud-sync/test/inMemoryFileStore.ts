import type { FileStore } from '../src/FileStore'

export function createInMemoryFileStore(initial?: Record<string, Uint8Array>): FileStore {
  const files = new Map<string, Uint8Array>(
    initial ? Object.entries(initial).map(([k, v]) => [k, new Uint8Array(v)]) : [],
  )

  return {
    async list() {
      return Array.from(files.keys())
    },
    async read(name) {
      const v = files.get(name)

      return v ? new Uint8Array(v) : null
    },
    async write(name, data) {
      files.set(name, new Uint8Array(data))
    },
  }
}
