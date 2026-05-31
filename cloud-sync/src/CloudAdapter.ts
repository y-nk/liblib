export type CloudFile = {
  data: Uint8Array
  etag: string
}

export type CloudListEntry = {
  name: string
  etag: string
  size: number
}

export type PutOptions = {
  ifMatchEtag?: string
}

export type PutResult = {
  etag: string
}

/**
 * Provider-agnostic cloud-storage surface. Stable across Google Drive, iCloud,
 * and the in-memory fake. All paths are slash-delimited and relative to a
 * provider-defined root.
 */
export type CloudAdapter = {
  getFile(path: string): Promise<CloudFile | null>
  putFile(path: string, data: Uint8Array, options?: PutOptions): Promise<PutResult>
  listFiles(dir: string): Promise<CloudListEntry[]>
  deleteFile(path: string): Promise<void>
}
