import { describe, expect, expectAsyncThrows, it } from './harness'
import { FakeCloudAdapter } from '../src/FakeCloudAdapter'
import { sync, type SyncState } from '../src/SyncEngine'
import { SchemaTooNewError, SyncConflictError } from '../src/errors'
import { FakeDb, buildFakeHandle, type DiskSlot } from './fakeDb'
import { createInMemoryCoverStore } from './coverStore'

const LOCAL_SCHEMA = 9
const DB_PATH = 'liblib.db'

async function setupDevice(initialRows: { table: string; id: string; [k: string]: unknown }[]) {
  const db = new FakeDb()

  for (const r of initialRows) {
    const { table, ...rest } = r
    db.applyRow(table, rest as { id: string })
  }

  const disk: DiskSlot = { bytes: await db.serializeAsync() }
  const { handle, current } = await buildFakeHandle(db, disk)

  return { db, handle, disk, current }
}

describe('SyncEngine', () => {
  it('Case A: first-ever sync uploads local to empty cloud', async () => {
    const { db, handle } = await setupDevice([{ table: 'books', id: 'b1', title: 'Dune' }])
    // Write happens *after* the session is bound — so it's recorded.
    db.applyRow('books', { id: 'b2', title: 'Foundation' })

    const adapter = new FakeCloudAdapter()
    const state: SyncState = {}
    const result = await sync({
      handle,
      adapter,
      covers: createInMemoryCoverStore(),
      state,
      localSchemaVersion: LOCAL_SCHEMA,
    })

    expect(result.pulled).toBe(false)
    expect(result.pushed).toBe(true)
    expect(result.retries).toBe(0)
    expect(state.lastEtag).toBe(result.newEtag)

    const remote = await adapter.getFile(DB_PATH)
    expect(remote !== null).toBeTruthy()
  })

  it('Case B: second-device sync merges local on top of cloud books', async () => {
    // Device A bootstraps cloud with one book.
    const a = await setupDevice([])
    a.db.applyRow('books', { id: 'A', title: 'From A' })

    const adapter = new FakeCloudAdapter()
    const stateA: SyncState = {}
    await sync({
      handle: a.handle,
      adapter,
      covers: createInMemoryCoverStore(),
      state: stateA,
      localSchemaVersion: LOCAL_SCHEMA,
    })

    // Device B starts empty, writes its own book locally, then syncs.
    const b = await setupDevice([])
    b.db.applyRow('books', { id: 'B', title: 'From B' })

    const stateB: SyncState = {}
    const result = await sync({
      handle: b.handle,
      adapter,
      covers: createInMemoryCoverStore(),
      state: stateB,
      localSchemaVersion: LOCAL_SCHEMA,
    })

    expect(result.pulled).toBe(true)
    expect(result.pushed).toBe(true)

    const remoteAfter = await adapter.getFile(DB_PATH)
    expect(remoteAfter !== null).toBeTruthy()
    // After merge the cloud db must hold both rows.
    const local = b.current()
    const books = local.state.tables.get('books')
    expect(books?.has('A')).toBe(true)
    expect(books?.has('B')).toBe(true)
  })

  it('etag race: passes after 1 retry', async () => {
    const { db, handle } = await setupDevice([])
    db.applyRow('books', { id: 'b1', title: 'Dune' })

    const adapter = new FakeCloudAdapter()
    // Seed the cloud so the engine has an etag to mismatch against.
    await adapter.putFile(DB_PATH, new TextEncoder().encode('{}'))
    adapter.forceConflicts = 1

    const state: SyncState = { lastEtag: '1' }
    const result = await sync({
      handle,
      adapter,
      covers: createInMemoryCoverStore(),
      state,
      localSchemaVersion: LOCAL_SCHEMA,
    })

    expect(result.retries).toBe(1)
    expect(result.pushed).toBe(true)
  })

  it('etag race: fails after 4 attempts with SyncConflictError', async () => {
    const { db, handle } = await setupDevice([])
    db.applyRow('books', { id: 'b1', title: 'Dune' })

    const adapter = new FakeCloudAdapter()
    await adapter.putFile(DB_PATH, new TextEncoder().encode('{}'))
    adapter.forceConflicts = 99

    const state: SyncState = { lastEtag: '1' }

    await expectAsyncThrows(
      () =>
        sync({
          handle,
          adapter,
          covers: createInMemoryCoverStore(),
          state,
          localSchemaVersion: LOCAL_SCHEMA,
        }),
      (e) => e instanceof SyncConflictError,
    )
  })

  it('cover diff: uploads new locals + downloads new remotes', async () => {
    const { handle } = await setupDevice([])
    const adapter = new FakeCloudAdapter()
    // Seed remote covers.
    await adapter.putFile('covers/remote-only.jpg', new Uint8Array([9, 9, 9]))

    const covers = createInMemoryCoverStore({
      'local-only.jpg': new Uint8Array([1, 2, 3]),
    })

    const result = await sync({
      handle,
      adapter,
      covers,
      state: {},
      localSchemaVersion: LOCAL_SCHEMA,
    })

    expect(result.coverUploads).toBe(1)
    expect(result.coverDownloads).toBe(1)

    const finalLocal = await covers.list()
    expect(finalLocal.includes('remote-only.jpg')).toBe(true)
    expect(finalLocal.includes('local-only.jpg')).toBe(true)

    const cloudRemote = await adapter.getFile('covers/local-only.jpg')
    expect(cloudRemote !== null).toBeTruthy()
  })

  it('cover collision: local wins (no overwrite either way)', async () => {
    const { handle } = await setupDevice([])
    const adapter = new FakeCloudAdapter()
    const remoteBytes = new Uint8Array([7, 7, 7])
    const localBytes = new Uint8Array([1, 1, 1])
    await adapter.putFile('covers/shared.jpg', remoteBytes)

    const covers = createInMemoryCoverStore({ 'shared.jpg': localBytes })

    const result = await sync({
      handle,
      adapter,
      covers,
      state: {},
      localSchemaVersion: LOCAL_SCHEMA,
    })

    expect(result.coverUploads).toBe(0)
    expect(result.coverDownloads).toBe(0)

    // Local content unchanged.
    const localAfter = await covers.read('shared.jpg')
    expect(localAfter !== null).toBeTruthy()
    expect(Array.from(localAfter!).join(',')).toBe('1,1,1')

    // Remote content unchanged.
    const remoteAfter = await adapter.getFile('covers/shared.jpg')
    expect(Array.from(remoteAfter!.data).join(',')).toBe('7,7,7')
  })

  it('schema gate: cloud db with newer schema_version raises SchemaTooNewError', async () => {
    const { handle } = await setupDevice([])
    const adapter = new FakeCloudAdapter()
    // Seed a cloud db whose serialized state declares a newer schema.
    const seeded = new FakeDb({ schemaVersion: LOCAL_SCHEMA + 1, tables: new Map() })
    const seededBytes = await seeded.serializeAsync()
    await adapter.putFile(DB_PATH, seededBytes)

    await expectAsyncThrows(
      () =>
        sync({
          handle,
          adapter,
          covers: createInMemoryCoverStore(),
          state: {},
          localSchemaVersion: LOCAL_SCHEMA,
        }),
      (e) => e instanceof SchemaTooNewError,
    )
  })

  it('round-trip restore: write → sync → wipe → re-sync → state restored', async () => {
    // Device A populates cloud.
    const a = await setupDevice([])
    a.db.applyRow('books', { id: 'restored', title: 'Hyperion' })

    const adapter = new FakeCloudAdapter()
    await sync({
      handle: a.handle,
      adapter,
      covers: createInMemoryCoverStore(),
      state: {},
      localSchemaVersion: LOCAL_SCHEMA,
    })

    // "Wipe" Device A: fresh blank device.
    const aPrime = await setupDevice([])
    await sync({
      handle: aPrime.handle,
      adapter,
      covers: createInMemoryCoverStore(),
      state: {},
      localSchemaVersion: LOCAL_SCHEMA,
    })

    const books = aPrime.current().state.tables.get('books')
    expect(books?.has('restored')).toBe(true)
  })
})
