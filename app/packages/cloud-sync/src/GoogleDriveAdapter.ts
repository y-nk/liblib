import type { CloudAdapter, CloudFile, CloudListEntry, PutOptions, PutResult } from './CloudAdapter'
import { EtagMismatchError } from './errors'

/**
 * Async producer of a Google OAuth access token with the
 * `https://www.googleapis.com/auth/drive.appdata` scope. The adapter calls
 * this once per request; on a 401 it calls it again with `forceRefresh=true`
 * so the host can run `GoogleSignin.getTokens()` and persist the new token.
 */
export type GoogleTokenProvider = (forceRefresh?: boolean) => Promise<string>

export type GoogleDriveAdapterOptions = {
  getAccessToken: GoogleTokenProvider
  /**
   * Injectable for tests. Defaults to the global `fetch`. The adapter only
   * uses the subset of the Fetch API that's available on both React Native
   * and standard Node 22+.
   */
  fetchImpl?: typeof fetch
}

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files'
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files'
const SPACE = 'appDataFolder'
const COVERS_DIR_NAME = 'covers'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

type DriveFile = {
  id: string
  name: string
  parents?: string[]
  mimeType?: string
}

type DriveListResponse = {
  files?: DriveFile[]
}

/**
 * `CloudAdapter` against the Google Drive REST API scoped to the per-app
 * hidden `appDataFolder`. Paths are slash-delimited and map as:
 *
 *   "liblib.db"          → file named `liblib.db` whose parent is `appDataFolder`
 *   "covers"             → directory listing of the `covers/` folder
 *   "covers/abc123.jpg"  → file named `abc123.jpg` whose parent is the
 *                          `covers/` folder file (auto-created on first put).
 *
 * Concurrency control uses Drive's HTTP `ETag` header on read and the
 * `If-Match` request header on update; a `412 Precondition Failed` is mapped
 * to `EtagMismatchError`. Token expiry surfaces as a `401`; the adapter
 * transparently refreshes via the supplied `getAccessToken(true)` and
 * retries the request once.
 */
export class GoogleDriveAdapter implements CloudAdapter {
  private readonly fetchImpl: typeof fetch
  private readonly getAccessToken: GoogleTokenProvider

  /**
   * Cache for the auto-created `covers/` folder's Drive file id. Lazily
   * resolved (or created) on first list/put under `covers/`.
   */
  private coversFolderId: string | null = null

  constructor(opts: GoogleDriveAdapterOptions) {
    this.getAccessToken = opts.getAccessToken
    this.fetchImpl = opts.fetchImpl ?? fetch
  }

  // CloudAdapter ----------------------------------------------------------

  async getFile(path: string): Promise<CloudFile | null> {
    const { parentId, name } = await this.resolveParent(path, false)

    if (parentId === null) {
      return null
    }

    const file = await this.findChild(parentId, name)

    if (!file) {
      return null
    }

    const res = await this.authedFetch(`${DRIVE_FILES}/${encodeURIComponent(file.id)}?alt=media`)

    if (res.status === 404) {
      return null
    }

    if (!res.ok) {
      throw new Error(`Drive getFile ${path} failed: ${res.status}`)
    }

    const etag = etagFromResponse(res)
    const buf = await res.arrayBuffer()

    return { data: new Uint8Array(buf), etag }
  }

  async putFile(path: string, data: Uint8Array, options?: PutOptions): Promise<PutResult> {
    const { parentId, name } = await this.resolveParent(path, true)

    if (parentId === null) {
      throw new Error(`Could not resolve parent for ${path}`)
    }

    const existing = await this.findChild(parentId, name)

    if (existing === null) {
      // First write — multipart create. If the caller passed
      // `ifMatchEtag` expecting an existing remote, that's a conflict.
      if (options?.ifMatchEtag !== undefined) {
        throw new EtagMismatchError(path)
      }

      return await this.createMultipart(parentId, name, data)
    }

    return await this.updateMultipart(existing.id, data, options?.ifMatchEtag, path)
  }

  async listFiles(dir: string): Promise<CloudListEntry[]> {
    const parentId = await this.resolveDirId(dir, false)

    if (parentId === null) {
      return []
    }

    const q = `'${parentId}' in parents and trashed=false and ` + `mimeType!='${FOLDER_MIME}'`
    const url =
      `${DRIVE_FILES}?` +
      `spaces=${SPACE}&` +
      `q=${encodeURIComponent(q)}&` +
      `fields=${encodeURIComponent('files(id,name,size,headRevisionId)')}&` +
      `pageSize=1000`

    const res = await this.authedFetch(url)

    if (!res.ok) {
      throw new Error(`Drive listFiles ${dir} failed: ${res.status}`)
    }

    const body = (await res.json()) as DriveListResponse & {
      files?: (DriveFile & { size?: string; headRevisionId?: string })[]
    }
    const out: CloudListEntry[] = []

    for (const f of body.files ?? []) {
      out.push({
        name: f.name,
        etag: f.headRevisionId ?? f.id,
        size: f.size ? Number(f.size) : 0,
      })
    }

    return out
  }

  async deleteFile(path: string): Promise<void> {
    const { parentId, name } = await this.resolveParent(path, false)

    if (parentId === null) {
      return
    }

    const file = await this.findChild(parentId, name)

    if (!file) {
      return
    }

    const res = await this.authedFetch(`${DRIVE_FILES}/${encodeURIComponent(file.id)}`, {
      method: 'DELETE',
    })

    if (!res.ok && res.status !== 404) {
      throw new Error(`Drive deleteFile ${path} failed: ${res.status}`)
    }
  }

  // Internals -------------------------------------------------------------

  /**
   * Splits `path` into a parent Drive folder id + the child file name.
   * `create` controls whether intermediate folders (today only `covers/`)
   * are auto-created when missing.
   */
  private async resolveParent(
    path: string,
    create: boolean,
  ): Promise<{ parentId: string | null; name: string }> {
    const slash = path.lastIndexOf('/')

    if (slash < 0) {
      // Root of appDataFolder.
      return { parentId: SPACE, name: path }
    }

    const dir = path.slice(0, slash)
    const name = path.slice(slash + 1)
    const parentId = await this.resolveDirId(dir, create)

    return { parentId, name }
  }

  private async resolveDirId(dir: string, create: boolean): Promise<string | null> {
    if (dir === '' || dir === '/') {
      return SPACE
    }

    // Strip trailing slash if any, then validate single-level (we only
    // support `covers/` for now).
    const clean = dir.endsWith('/') ? dir.slice(0, -1) : dir

    if (clean === COVERS_DIR_NAME) {
      return this.getOrCreateCoversFolder(create)
    }

    throw new Error(`Unsupported directory: ${dir}`)
  }

  private async getOrCreateCoversFolder(create: boolean): Promise<string | null> {
    if (this.coversFolderId) {
      return this.coversFolderId
    }

    const existing = await this.findChild(SPACE, COVERS_DIR_NAME, FOLDER_MIME)

    if (existing) {
      this.coversFolderId = existing.id

      return existing.id
    }

    if (!create) {
      return null
    }

    const res = await this.authedFetch(DRIVE_FILES, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: COVERS_DIR_NAME,
        mimeType: FOLDER_MIME,
        parents: [SPACE],
      }),
    })

    if (!res.ok) {
      throw new Error(`Drive create covers/ folder failed: ${res.status}`)
    }

    const body = (await res.json()) as DriveFile
    this.coversFolderId = body.id

    return body.id
  }

  private async findChild(
    parentId: string,
    name: string,
    mimeType?: string,
  ): Promise<DriveFile | null> {
    // Drive's `q` doesn't support directly escaping single quotes in names;
    // we escape with a backslash per the docs.
    const safeName = name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    const clauses = [`'${parentId}' in parents`, `name='${safeName}'`, 'trashed=false']

    if (mimeType) {
      clauses.push(`mimeType='${mimeType}'`)
    }

    const q = clauses.join(' and ')
    const url =
      `${DRIVE_FILES}?` +
      `spaces=${SPACE}&` +
      `q=${encodeURIComponent(q)}&` +
      `fields=${encodeURIComponent('files(id,name,mimeType,parents)')}&` +
      `pageSize=2`

    const res = await this.authedFetch(url)

    if (!res.ok) {
      throw new Error(`Drive findChild ${name} failed: ${res.status}`)
    }

    const body = (await res.json()) as DriveListResponse

    return body.files?.[0] ?? null
  }

  private async createMultipart(
    parentId: string,
    name: string,
    data: Uint8Array,
  ): Promise<PutResult> {
    const boundary = makeBoundary()
    const metadata = { name, parents: [parentId] }
    const body = buildMultipartBody(boundary, metadata, data)

    const res = await this.authedFetch(`${DRIVE_UPLOAD}?uploadType=multipart`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      // RN fetch accepts Uint8Array directly; the DOM lib types don't reflect
      // that, so we widen via BodyInit explicitly.
      body: body as unknown as BodyInit,
    })

    if (!res.ok) {
      throw new Error(`Drive create ${name} failed: ${res.status}`)
    }

    const etag = etagFromResponse(res)

    return { etag }
  }

  private async updateMultipart(
    fileId: string,
    data: Uint8Array,
    ifMatchEtag: string | undefined,
    path: string,
  ): Promise<PutResult> {
    const boundary = makeBoundary()
    const body = buildMultipartBody(boundary, {}, data)
    const headers: Record<string, string> = {
      'Content-Type': `multipart/related; boundary=${boundary}`,
    }

    if (ifMatchEtag !== undefined) {
      headers['If-Match'] = ifMatchEtag
    }

    const res = await this.authedFetch(
      `${DRIVE_UPLOAD}/${encodeURIComponent(fileId)}?uploadType=multipart`,
      { method: 'PATCH', headers, body: body as unknown as BodyInit },
    )

    if (res.status === 412) {
      throw new EtagMismatchError(path)
    }

    if (!res.ok) {
      throw new Error(`Drive update ${fileId} failed: ${res.status}`)
    }

    const etag = etagFromResponse(res)

    return { etag }
  }

  /**
   * Wraps `fetchImpl` with bearer-token injection + a single 401 retry that
   * forces a token refresh via `getAccessToken(true)`.
   */
  private async authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken(false)
    const res = await this.fetchImpl(url, withAuth(init, token))

    if (res.status !== 401) {
      return res
    }

    const fresh = await this.getAccessToken(true)

    return await this.fetchImpl(url, withAuth(init, fresh))
  }
}

function withAuth(init: RequestInit, token: string): RequestInit {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)

  return { ...init, headers }
}

function etagFromResponse(res: Response): string {
  // Drive returns a strong ETag on file content responses and on multipart
  // upload responses. Fall back to the file's headRevisionId in the body if
  // the header is somehow missing (some proxies strip it); the caller never
  // sees the placeholder, only round-trips it as `ifMatchEtag`.
  const raw = res.headers.get('etag') ?? res.headers.get('ETag')

  return raw ?? ''
}

function makeBoundary(): string {
  // The boundary just has to be unique within the body; the exact value
  // doesn't matter as long as it doesn't collide with the metadata or bytes.
  return `liblib-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

/**
 * Builds an RFC2387 multipart/related body for Drive's multipart upload:
 *
 *   --boundary
 *   Content-Type: application/json; charset=UTF-8
 *
 *   {metadata json}
 *   --boundary
 *   Content-Type: application/octet-stream
 *
 *   <bytes>
 *   --boundary--
 *
 * Returned as a single Uint8Array so the host's fetch implementation
 * (RN's polyfilled one) treats it as an opaque body.
 */
function buildMultipartBody(
  boundary: string,
  metadata: Record<string, unknown>,
  data: Uint8Array,
): Uint8Array {
  const enc = new TextEncoder()
  const head = enc.encode(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/octet-stream\r\n\r\n`,
  )
  const tail = enc.encode(`\r\n--${boundary}--\r\n`)
  const out = new Uint8Array(head.byteLength + data.byteLength + tail.byteLength)
  out.set(head, 0)
  out.set(data, head.byteLength)
  out.set(tail, head.byteLength + data.byteLength)

  return out
}
