import { File, Directory, Paths } from 'expo-file-system'

const COVERS_DIR = new Directory(Paths.document, 'covers')

export async function saveCoverFromUrl(isbn: string, url: string) {
  if (!COVERS_DIR.exists) {
    COVERS_DIR.create({ intermediates: true, idempotent: true })
  }

  const dest = new File(COVERS_DIR, `${isbn}.jpg`)

  if (dest.exists) {
    dest.delete()
  }

  const downloaded = await File.downloadFileAsync(url, dest)

  return downloaded.uri
}

export async function saveCoverFromDataUri(isbn: string, dataUri: string) {
  if (!COVERS_DIR.exists) {
    COVERS_DIR.create({ intermediates: true, idempotent: true })
  }

  const comma = dataUri.indexOf(',')
  const base64 = comma >= 0 ? dataUri.slice(comma + 1) : dataUri
  const dest = new File(COVERS_DIR, `${isbn}.jpg`)

  if (dest.exists) {
    dest.delete()
  }

  dest.create()
  dest.write(base64, { encoding: 'base64' })

  return dest.uri
}

export function deleteCover(isbn: string) {
  const f = new File(COVERS_DIR, `${isbn}.jpg`)

  if (f.exists) {
    f.delete()
  }
}
