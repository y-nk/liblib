import { File, Directory, Paths } from 'expo-file-system'

const COVERS_DIR = new Directory(Paths.document, 'covers')

function ensureDir() {
  if (!COVERS_DIR.exists) {
    COVERS_DIR.create({ intermediates: true, idempotent: true })
  }
}

function coverFile(isbn: string): File {
  return new File(COVERS_DIR, `${isbn}.jpg`)
}

export async function saveCoverFromUrl(isbn: string, url: string): Promise<string> {
  ensureDir()
  const dest = coverFile(isbn)
  if (dest.exists) {
    dest.delete()
  }
  const downloaded = await File.downloadFileAsync(url, dest)
  return downloaded.uri
}

export async function saveCoverFromDataUri(isbn: string, dataUri: string): Promise<string> {
  ensureDir()
  const comma = dataUri.indexOf(',')
  const base64 = comma >= 0 ? dataUri.slice(comma + 1) : dataUri
  const dest = coverFile(isbn)
  if (dest.exists) {
    dest.delete()
  }
  dest.create()
  dest.write(base64, { encoding: 'base64' })
  return dest.uri
}

export function deleteCover(isbn: string): void {
  const f = coverFile(isbn)
  if (f.exists) {
    f.delete()
  }
}
