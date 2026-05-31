import { describe, expect, expectAsyncThrows, it } from './harness'
import {
  ICloudAdapter,
  ICloudNotAvailableError,
  base64ToBytes,
  bytesToBase64,
  type ICloudNativeModule,
} from '../src/ICloudAdapter'
import { EtagMismatchError } from '../src/errors'

/**
 * Fake of the iOS ubiquity container the Swift module would expose. We model
 * the bridge surface (base64 + etag) directly so the adapter is exercised
 * exactly as it'll be exercised on-device, just without the network/iCloud
 * filesystem.
 */
class FakeICloudNative implements ICloudNativeModule {
  private readonly files = new Map<string, { data: Uint8Array; etag: string }>()
  private counter = 0
  available = true

  async isAvailable(): Promise<boolean> {
    return this.available
  }

  async getFile(path: string) {
    const f = this.files.get(path)

    if (!f) {
      return null
    }

    return { base64: bytesToBase64(f.data), etag: f.etag }
  }

  async putFile(path: string, base64: string, ifMatchEtag: string | null) {
    const current = this.files.get(path)

    if (ifMatchEtag !== null && (current?.etag ?? null) !== ifMatchEtag) {
      return { etagMismatch: true as const }
    }

    this.counter += 1
    const etag = `etag-${this.counter}`
    this.files.set(path, { data: base64ToBytes(base64), etag })

    return { etag }
  }

  async listFiles(dir: string) {
    const prefix = dir.endsWith('/') ? dir : `${dir}/`
    const out: { name: string; etag: string; size: number }[] = []

    for (const [p, e] of this.files) {
      if (!p.startsWith(prefix)) {
        continue
      }

      const rest = p.slice(prefix.length)

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

describe('ICloudAdapter base64 helpers', () => {
  it('round-trips arbitrary byte sequences', () => {
    const inputs = [
      new Uint8Array([]),
      new Uint8Array([0]),
      new Uint8Array([255, 0, 128]),
      new Uint8Array([1, 2, 3, 4, 5]),
      new Uint8Array(Array.from({ length: 257 }, (_, i) => i % 256)),
    ]

    for (const bytes of inputs) {
      const round = base64ToBytes(bytesToBase64(bytes))
      expect(round.byteLength).toBe(bytes.byteLength)

      for (let i = 0; i < bytes.byteLength; i += 1) {
        if (round[i] !== bytes[i]) {
          throw new Error(`mismatch at ${i}: ${round[i]} vs ${bytes[i]}`)
        }
      }
    }
  })

  it('matches the canonical base64 encoding for known strings', () => {
    const enc = new TextEncoder()
    expect(bytesToBase64(enc.encode('hello'))).toBe('aGVsbG8=')
    expect(bytesToBase64(enc.encode('Liblib'))).toBe('TGlibGli')
    expect(bytesToBase64(enc.encode(''))).toBe('')
  })
})

describe('ICloudAdapter', () => {
  it('assertAvailable resolves when the native module reports available', async () => {
    const native = new FakeICloudNative()
    const adapter = new ICloudAdapter({ native })
    await adapter.assertAvailable()
  })

  it('assertAvailable throws ICloudNotAvailableError when iCloud is offline', async () => {
    const native = new FakeICloudNative()
    native.available = false
    const adapter = new ICloudAdapter({ native })

    await expectAsyncThrows(
      () => adapter.assertAvailable(),
      (e) => e instanceof ICloudNotAvailableError,
    )
  })

  it('getFile returns null for missing paths', async () => {
    const adapter = new ICloudAdapter({ native: new FakeICloudNative() })
    expect(await adapter.getFile('liblib.db')).toBeNull()
  })

  it('round-trips data through putFile + getFile, preserving the etag', async () => {
    const adapter = new ICloudAdapter({ native: new FakeICloudNative() })
    const data = new Uint8Array([1, 2, 3, 4])
    const put = await adapter.putFile('liblib.db', data)
    const got = await adapter.getFile('liblib.db')

    expect(got !== null).toBeTruthy()
    expect(got?.data.byteLength).toBe(4)
    expect(got?.etag).toBe(put.etag)
  })

  it('putFile with stale ifMatchEtag throws EtagMismatchError', async () => {
    const adapter = new ICloudAdapter({ native: new FakeICloudNative() })
    await adapter.putFile('liblib.db', new Uint8Array([1]))

    await expectAsyncThrows(
      () => adapter.putFile('liblib.db', new Uint8Array([2]), { ifMatchEtag: 'wrong' }),
      (e) => e instanceof EtagMismatchError,
    )
  })

  it('putFile with current ifMatchEtag succeeds and bumps etag', async () => {
    const adapter = new ICloudAdapter({ native: new FakeICloudNative() })
    const first = await adapter.putFile('liblib.db', new Uint8Array([1]))
    const second = await adapter.putFile('liblib.db', new Uint8Array([2]), {
      ifMatchEtag: first.etag,
    })
    expect(second.etag !== first.etag).toBeTruthy()
  })

  it('listFiles enumerates direct children only', async () => {
    const adapter = new ICloudAdapter({ native: new FakeICloudNative() })
    await adapter.putFile('covers/a.jpg', new Uint8Array([1, 2, 3]))
    await adapter.putFile('covers/b.jpg', new Uint8Array([4, 5]))
    await adapter.putFile('covers/sub/c.jpg', new Uint8Array([6]))

    const out = await adapter.listFiles('covers')
    expect(out.length).toBe(2)
    const names = out.map((e) => e.name).sort()
    expect(names[0]).toBe('a.jpg')
    expect(names[1]).toBe('b.jpg')
  })

  it('deleteFile removes the file', async () => {
    const adapter = new ICloudAdapter({ native: new FakeICloudNative() })
    await adapter.putFile('liblib.db', new Uint8Array([1, 2, 3]))
    await adapter.deleteFile('liblib.db')
    expect(await adapter.getFile('liblib.db')).toBeNull()
  })
})
