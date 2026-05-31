import { describe, expect, it } from 'vitest'
import { GoogleDriveAdapter } from '../src/GoogleDriveAdapter'
import { EtagMismatchError } from '../src/errors'

/**
 * Tiny in-memory Drive REST mock. Only models the surface the adapter
 * actually hits: list with `q` predicates, multipart create + update,
 * GET ?alt=media, DELETE — all scoped to `appDataFolder`.
 */
type StoredFile = {
  id: string
  name: string
  parents: string[]
  mimeType: string
  data: Uint8Array
  etag: string
}

class FakeDrive {
  private readonly files = new Map<string, StoredFile>()
  private counter = 0
  /** Force the next N PATCH uploads to respond 412. */
  forceConflicts = 0
  /** Force the next N requests with a stale token to respond 401. */
  expireNextRequests = 0
  validToken = 'tok-good'
  callLog: string[] = []

  private nextId() {
    this.counter += 1

    return `id-${this.counter}`
  }

  private nextEtag() {
    this.counter += 1

    return `etag-${this.counter}`
  }

  list(parentId: string, name?: string, mimeType?: string) {
    const out: StoredFile[] = []

    for (const f of this.files.values()) {
      if (!f.parents.includes(parentId)) {
        continue
      }

      if (name !== undefined && f.name !== name) {
        continue
      }

      if (mimeType !== undefined && f.mimeType !== mimeType) {
        continue
      }

      if (mimeType === undefined && f.mimeType === 'application/vnd.google-apps.folder') {
        // listFiles filters folders out; findChild without mimeType keeps them.
        // To make tests deterministic, drop folders only when name is undefined
        // (i.e. directory listing path).
        if (name === undefined) {
          continue
        }
      }

      out.push(f)
    }

    return out
  }

  insertFile(opts: {
    name: string
    parents: string[]
    mimeType: string
    data: Uint8Array
  }): StoredFile {
    const f: StoredFile = {
      id: this.nextId(),
      name: opts.name,
      parents: opts.parents,
      mimeType: opts.mimeType,
      data: opts.data,
      etag: this.nextEtag(),
    }
    this.files.set(f.id, f)

    return f
  }

  updateFile(id: string, data: Uint8Array): StoredFile {
    const f = this.files.get(id)

    if (!f) {
      throw new Error(`updateFile: ${id} missing`)
    }

    f.data = data
    f.etag = this.nextEtag()

    return f
  }

  getFile(id: string) {
    return this.files.get(id)
  }

  deleteFile(id: string) {
    this.files.delete(id)
  }

  fetch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as URL).toString()
    const method = init?.method ?? 'GET'
    this.callLog.push(`${method} ${url}`)

    // Auth check ---------------------------------------------------------
    const headers = new Headers(init?.headers)
    const auth = headers.get('Authorization')

    if (this.expireNextRequests > 0) {
      this.expireNextRequests -= 1

      return jsonResponse(401, { error: 'expired' })
    }

    if (auth !== `Bearer ${this.validToken}`) {
      return jsonResponse(401, { error: 'invalid token' })
    }

    // GET ?alt=media -----------------------------------------------------
    if (method === 'GET' && url.includes('/drive/v3/files/') && url.includes('alt=media')) {
      const id = decodeURIComponent(url.split('/drive/v3/files/')[1].split('?')[0])
      const file = this.files.get(id)

      if (!file) {
        return new Response(null, { status: 404 })
      }

      return new Response(file.data as unknown as BodyInit, {
        status: 200,
        headers: { ETag: `"${file.etag}"` },
      })
    }

    // List ---------------------------------------------------------------
    if (method === 'GET' && url.includes('/drive/v3/files?')) {
      const parsed = new URL(url)
      const q = parsed.searchParams.get('q') ?? ''
      const parentMatch = /'([^']+)' in parents/.exec(q)
      const nameMatch = /name='((?:\\.|[^'\\])*)'/.exec(q)
      const mimeKeepMatch = /mimeType='([^']+)'/.exec(q)
      const mimeExcludeMatch = /mimeType!='([^']+)'/.exec(q)
      const parentId = parentMatch?.[1] ?? ''
      const name = nameMatch ? nameMatch[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\') : undefined
      let files = this.list(parentId, name, mimeKeepMatch?.[1])

      if (mimeExcludeMatch) {
        files = files.filter((f) => f.mimeType !== mimeExcludeMatch[1])
      }

      const body = {
        files: files.map((f) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          parents: f.parents,
          headRevisionId: f.etag,
          size: String(f.data.byteLength),
        })),
      }

      return jsonResponse(200, body)
    }

    // Create folder (JSON POST, no upload endpoint) ---------------------
    if (
      method === 'POST' &&
      url === 'https://www.googleapis.com/drive/v3/files' &&
      headers.get('Content-Type') === 'application/json'
    ) {
      const meta = JSON.parse((init?.body as string) ?? '{}')
      const f = this.insertFile({
        name: meta.name,
        parents: meta.parents ?? [],
        mimeType: meta.mimeType ?? 'application/octet-stream',
        data: new Uint8Array(),
      })

      return jsonResponse(200, { id: f.id, name: f.name, parents: f.parents })
    }

    // Multipart create --------------------------------------------------
    if (method === 'POST' && url.includes('/upload/drive/v3/files')) {
      const { metadata, data } = parseMultipart(init?.body as Uint8Array)
      const f = this.insertFile({
        name: metadata.name ?? 'unnamed',
        parents: metadata.parents ?? [],
        mimeType: 'application/octet-stream',
        data,
      })

      return new Response(JSON.stringify({ id: f.id, name: f.name }), {
        status: 200,
        headers: { ETag: `"${f.etag}"`, 'Content-Type': 'application/json' },
      })
    }

    // Multipart update (PATCH) ------------------------------------------
    if (method === 'PATCH' && url.includes('/upload/drive/v3/files/')) {
      if (this.forceConflicts > 0) {
        this.forceConflicts -= 1

        return new Response(null, { status: 412 })
      }

      const id = decodeURIComponent(url.split('/upload/drive/v3/files/')[1].split('?')[0])
      const existing = this.files.get(id)

      if (!existing) {
        return new Response(null, { status: 404 })
      }

      const ifMatch = headers.get('If-Match')

      if (ifMatch !== null) {
        // Drive accepts both `"etag"` and `etag` forms; the adapter
        // round-trips whatever we returned in the ETag header, which is the
        // quoted form, so compare against that.
        if (ifMatch !== `"${existing.etag}"`) {
          return new Response(null, { status: 412 })
        }
      }

      const { data } = parseMultipart(init?.body as Uint8Array)
      const f = this.updateFile(id, data)

      return new Response(JSON.stringify({ id: f.id }), {
        status: 200,
        headers: { ETag: `"${f.etag}"`, 'Content-Type': 'application/json' },
      })
    }

    // Delete -------------------------------------------------------------
    if (method === 'DELETE' && url.includes('/drive/v3/files/')) {
      const id = decodeURIComponent(url.split('/drive/v3/files/')[1].split('?')[0])
      this.deleteFile(id)

      return new Response(null, { status: 204 })
    }

    return new Response(`unhandled ${method} ${url}`, { status: 500 })
  }
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function parseMultipart(body: Uint8Array | undefined): {
  metadata: { name?: string; parents?: string[] }
  data: Uint8Array
} {
  if (!body) {
    return { metadata: {}, data: new Uint8Array() }
  }

  // We only need a fuzzy parse — extract the first JSON object as metadata
  // and the bytes between the second blank-line and the trailing boundary
  // as data. This mirrors how Drive's real parser works on multipart bodies
  // produced by our `buildMultipartBody`.
  const text = new TextDecoder().decode(body)
  const jsonStart = text.indexOf('{')
  const jsonEnd = text.indexOf('}', jsonStart)
  const metadata: { name?: string; parents?: string[] } =
    jsonStart >= 0 && jsonEnd > jsonStart ? JSON.parse(text.slice(jsonStart, jsonEnd + 1)) : {}

  // Bytes section is delimited by `Content-Type: application/octet-stream\r\n\r\n`
  // and the trailing `\r\n--boundary--` marker.
  const marker = 'application/octet-stream\r\n\r\n'
  const start = text.indexOf(marker)

  if (start < 0) {
    return { metadata, data: new Uint8Array() }
  }

  const dataStartByte = byteLengthOfUtf8(text.slice(0, start + marker.length))
  const tailIdx = text.lastIndexOf('\r\n--')
  const dataEndByte = tailIdx > 0 ? byteLengthOfUtf8(text.slice(0, tailIdx)) : body.byteLength

  return { metadata, data: body.slice(dataStartByte, dataEndByte) }
}

function byteLengthOfUtf8(s: string): number {
  return new TextEncoder().encode(s).byteLength
}

describe('GoogleDriveAdapter', () => {
  it('putFile creates a new file in appDataFolder on first write', async () => {
    const drive = new FakeDrive()
    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => drive.validToken,
      fetchImpl: drive.fetch,
    })

    const data = new TextEncoder().encode('hello')
    const result = await adapter.putFile('liblib.db', data)

    expect(result.etag.length > 0).toBeTruthy()
    const stored = drive.list('appDataFolder', 'liblib.db')
    expect(stored.length).toBe(1)
    expect(stored[0].data.byteLength).toBe(5)
  })

  it('getFile returns null when the path is missing', async () => {
    const drive = new FakeDrive()
    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => drive.validToken,
      fetchImpl: drive.fetch,
    })

    const out = await adapter.getFile('liblib.db')
    expect(out).toBeNull()
  })

  it('round-trips data through putFile + getFile, preserving the etag', async () => {
    const drive = new FakeDrive()
    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => drive.validToken,
      fetchImpl: drive.fetch,
    })

    const data = new Uint8Array([1, 2, 3, 4])
    const put = await adapter.putFile('liblib.db', data)
    const got = await adapter.getFile('liblib.db')

    expect(got !== null).toBeTruthy()
    expect(got?.data.byteLength).toBe(4)
    expect(got?.etag).toBe(put.etag)
  })

  it('putFile with stale ifMatchEtag throws EtagMismatchError', async () => {
    const drive = new FakeDrive()
    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => drive.validToken,
      fetchImpl: drive.fetch,
    })

    await adapter.putFile('liblib.db', new Uint8Array([1]))

    await expect(
      adapter.putFile('liblib.db', new Uint8Array([2]), { ifMatchEtag: '"wrong"' }),
    ).rejects.toThrow(EtagMismatchError)
  })

  it('putFile with current ifMatchEtag succeeds and bumps etag', async () => {
    const drive = new FakeDrive()
    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => drive.validToken,
      fetchImpl: drive.fetch,
    })

    const first = await adapter.putFile('liblib.db', new Uint8Array([1]))
    const second = await adapter.putFile('liblib.db', new Uint8Array([2]), {
      ifMatchEtag: first.etag,
    })

    expect(second.etag !== first.etag).toBeTruthy()
  })

  it('listFiles auto-creates the covers/ folder on first put under it', async () => {
    const drive = new FakeDrive()
    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => drive.validToken,
      fetchImpl: drive.fetch,
    })

    expect((await adapter.listFiles('covers')).length).toBe(0)

    await adapter.putFile('covers/abc.jpg', new Uint8Array([7, 7, 7]))

    const listed = await adapter.listFiles('covers')
    expect(listed.length).toBe(1)
    expect(listed[0].name).toBe('abc.jpg')
    expect(listed[0].size).toBe(3)
  })

  it('deleteFile removes the file', async () => {
    const drive = new FakeDrive()
    const adapter = new GoogleDriveAdapter({
      getAccessToken: async () => drive.validToken,
      fetchImpl: drive.fetch,
    })

    await adapter.putFile('liblib.db', new Uint8Array([1, 2, 3]))
    await adapter.deleteFile('liblib.db')

    expect(await adapter.getFile('liblib.db')).toBeNull()
  })

  it('401 from Drive triggers token refresh and retries the request', async () => {
    const drive = new FakeDrive()
    let calls = 0
    const adapter = new GoogleDriveAdapter({
      getAccessToken: async (forceRefresh) => {
        calls += 1

        // First call returns the stale token, refresh returns the good one.
        if (forceRefresh) {
          return drive.validToken
        }

        return 'tok-stale'
      },
      fetchImpl: drive.fetch,
    })

    // First request hits the 401 branch in the fake (stale token), so it
    // forces a refresh and retries with the good token.
    await adapter.putFile('liblib.db', new Uint8Array([42]))

    // Two calls: initial + forced refresh.
    expect(calls >= 2).toBeTruthy()
    const stored = drive.list('appDataFolder', 'liblib.db')
    expect(stored.length).toBe(1)
  })
})
