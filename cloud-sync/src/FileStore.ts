/**
 * Local store of named binary blobs. Used as the local half of `syncFiles`
 * — the host provides an implementation (e.g. backed by `expo-file-system`
 * for a directory like `covers/`), the engine remains agnostic about what
 * the files mean.
 */
export type FileStore = {
  list(): Promise<string[]>
  read(name: string): Promise<Uint8Array | null>
  write(name: string, data: Uint8Array): Promise<void>
}
