import { Directory, File, Paths } from 'expo-file-system'

const COVERS_DIR = new Directory(Paths.document, 'covers')

function ensureDir() {
  if (!COVERS_DIR.exists) {
    COVERS_DIR.create({ intermediates: true, idempotent: true })
  }
}

/**
 * App-side `FileStore` over the local `<document>/covers/` directory.
 * Matches the on-disk layout already produced by `lib/covers.ts`. The
 * engine itself is blob-agnostic; "cover" is the app's vocabulary for
 * the kind of file we happen to put in this store.
 */
export function createFileSystemCoverStore() {
  return {
    async list() {
      ensureDir()
      const entries = COVERS_DIR.list()

      return entries.filter((e) => e instanceof File).map((e) => e.name)
    },

    async read(name: string) {
      const f = new File(COVERS_DIR, name)

      if (!f.exists) {
        return null
      }

      return new Uint8Array(await f.arrayBuffer())
    },

    async write(name: string, data: Uint8Array) {
      ensureDir()
      const f = new File(COVERS_DIR, name)

      if (f.exists) {
        f.delete()
      }

      f.create()
      f.write(data)
    },
  }
}
