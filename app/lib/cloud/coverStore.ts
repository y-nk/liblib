import { Directory, File, Paths } from 'expo-file-system'
import type { CoverStore } from '@y_nk/react-native-cloud-sync'

const COVERS_DIR = new Directory(Paths.document, 'covers')

function ensureDir() {
  if (!COVERS_DIR.exists) {
    COVERS_DIR.create({ intermediates: true, idempotent: true })
  }
}

/**
 * CoverStore backed by the app's existing `<document>/covers/` directory.
 * Matches the on-disk layout already produced by `lib/covers.ts`.
 */
export function createFileSystemCoverStore(): CoverStore {
  return {
    async list() {
      ensureDir()
      const entries = COVERS_DIR.list()

      return entries.filter((e) => e instanceof File).map((e) => e.name)
    },

    async read(name) {
      const f = new File(COVERS_DIR, name)

      if (!f.exists) {
        return null
      }

      return new Uint8Array(await f.arrayBuffer())
    },

    async write(name, data) {
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
