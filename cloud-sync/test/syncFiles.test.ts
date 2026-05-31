import { describe, expect, it } from 'vitest'
import { InMemoryCloudAdapter } from '../src/InMemoryCloudAdapter'
import { syncFiles } from '../src/syncFiles'
import { createInMemoryFileStore } from './inMemoryFileStore'

describe('syncFiles', () => {
  it('uploads new locals + downloads new remotes under the given dir', async () => {
    const adapter = new InMemoryCloudAdapter()
    await adapter.putFile('blobs/remote-only.jpg', new Uint8Array([9, 9, 9]))

    const store = createInMemoryFileStore({
      'local-only.jpg': new Uint8Array([1, 2, 3]),
    })

    const result = await syncFiles(adapter, store, 'blobs')

    expect(result.uploads).toBe(1)
    expect(result.downloads).toBe(1)

    const localAfter = await store.list()
    expect(localAfter.includes('remote-only.jpg')).toBe(true)
    expect(localAfter.includes('local-only.jpg')).toBe(true)

    const remoteAfter = await adapter.getFile('blobs/local-only.jpg')
    expect(remoteAfter !== null).toBeTruthy()
  })

  it('collision: same name on both sides leaves both untouched', async () => {
    const adapter = new InMemoryCloudAdapter()
    const remoteBytes = new Uint8Array([7, 7, 7])
    const localBytes = new Uint8Array([1, 1, 1])
    await adapter.putFile('blobs/shared.jpg', remoteBytes)

    const store = createInMemoryFileStore({ 'shared.jpg': localBytes })

    const result = await syncFiles(adapter, store, 'blobs')

    expect(result.uploads).toBe(0)
    expect(result.downloads).toBe(0)

    const localAfter = await store.read('shared.jpg')
    expect(localAfter !== null).toBeTruthy()
    expect(Array.from(localAfter!).join(',')).toBe('1,1,1')

    const remoteAfter = await adapter.getFile('blobs/shared.jpg')
    expect(Array.from(remoteAfter!.data).join(',')).toBe('7,7,7')
  })
})
