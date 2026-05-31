import type { CloudAdapter } from './CloudAdapter'
import type { FileStore } from './FileStore'

export type SyncFilesResult = {
  uploads: number
  downloads: number
}

/**
 * One-shot diff between a local `FileStore` and a remote directory under
 * the given `CloudAdapter`. Files that exist locally but not remotely get
 * uploaded; files that exist remotely but not locally get downloaded.
 * Collisions (same name on both sides) are intentionally left alone — the
 * local copy wins by virtue of not being overwritten, and the remote
 * bytes stay too.
 *
 * Agnostic about what the files are; the app composes this with the
 * `SyncEngine` for whatever blob types it cares about (in liblib's case,
 * the covers/ directory).
 */
export async function syncFiles(
  adapter: CloudAdapter,
  store: FileStore,
  dir: string,
): Promise<SyncFilesResult> {
  const [localNames, remoteEntries] = await Promise.all([store.list(), adapter.listFiles(dir)])

  const localSet = new Set(localNames)
  const remoteByName = new Map(remoteEntries.map((e) => [e.name, e]))

  let uploads = 0
  let downloads = 0

  for (const name of localNames) {
    if (remoteByName.has(name)) {
      continue
    }

    const data = await store.read(name)

    if (!data) {
      continue
    }

    await adapter.putFile(`${dir}/${name}`, data)
    uploads += 1
  }

  for (const [name] of remoteByName) {
    if (localSet.has(name)) {
      continue
    }

    const fetched = await adapter.getFile(`${dir}/${name}`)

    if (!fetched) {
      continue
    }

    await store.write(name, fetched.data)
    downloads += 1
  }

  return { uploads, downloads }
}
