import type { CloudAdapter, CloudFile, CloudListEntry, PutOptions, PutResult } from './CloudAdapter'
import { EtagMismatchError } from './errors'

type Entry = {
  data: Uint8Array
  etag: string
}

/**
 * In-memory CloudAdapter for tests and the dev app. Etags are a monotonic
 * counter bumped on every successful put.
 */
export class FakeCloudAdapter implements CloudAdapter {
  private readonly files = new Map<string, Entry>()
  private counter = 0

  // Test hooks ------------------------------------------------------------

  /** Force the next N puts to fail with EtagMismatchError before succeeding. */
  forceConflicts = 0

  /** Snapshot a deep copy of the entire fake cloud (useful for assertions). */
  snapshot() {
    const out = new Map<string, Entry>()

    for (const [p, e] of this.files) {
      out.set(p, { data: new Uint8Array(e.data), etag: e.etag })
    }

    return out
  }

  // CloudAdapter ----------------------------------------------------------

  async getFile(path: string): Promise<CloudFile | null> {
    const e = this.files.get(path)

    if (!e) {
      return null
    }

    return { data: new Uint8Array(e.data), etag: e.etag }
  }

  async putFile(path: string, data: Uint8Array, options?: PutOptions): Promise<PutResult> {
    if (this.forceConflicts > 0) {
      this.forceConflicts -= 1
      throw new EtagMismatchError(path)
    }

    const current = this.files.get(path)

    if (options?.ifMatchEtag !== undefined) {
      const currentEtag = current?.etag ?? null

      if (currentEtag !== options.ifMatchEtag) {
        throw new EtagMismatchError(path)
      }
    }

    this.counter += 1
    const etag = String(this.counter)
    this.files.set(path, { data: new Uint8Array(data), etag })

    return { etag }
  }

  async listFiles(dir: string): Promise<CloudListEntry[]> {
    const prefix = dir.endsWith('/') ? dir : `${dir}/`
    const out: CloudListEntry[] = []

    for (const [p, e] of this.files) {
      if (!p.startsWith(prefix)) {
        continue
      }

      const rest = p.slice(prefix.length)

      // Only direct children — no nested traversal.
      if (rest.includes('/')) {
        continue
      }

      out.push({ name: rest, etag: e.etag, size: e.data.byteLength })
    }

    return out
  }

  async deleteFile(path: string): Promise<void> {
    this.files.delete(path)
  }
}
