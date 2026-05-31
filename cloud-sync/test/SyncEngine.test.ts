import { describe, expect, expectAsyncThrows, it } from './harness'
import { InMemoryCloudAdapter } from '../src/InMemoryCloudAdapter'
import { sync, type SyncState } from '../src/SyncEngine'
import { SchemaTooNewError, SyncConflictError } from '../src/errors'
import { FakeDb, buildFakeHandle, type DiskSlot } from './fakeDb'

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

    const adapter = new InMemoryCloudAdapter()
    const state: SyncState = {}
    const result = await sync({
      handle,
      adapter,
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

    const adapter = new InMemoryCloudAdapter()
    const stateA: SyncState = {}
    await sync({
      handle: a.handle,
      adapter,
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

    const adapter = new InMemoryCloudAdapter()
    // Seed the cloud so the engine has an etag to mismatch against.
    await adapter.putFile(DB_PATH, new TextEncoder().encode('{}'))
    adapter.forceConflicts = 1

    const state: SyncState = { lastEtag: '1' }
    const result = await sync({
      handle,
      adapter,
      state,
      localSchemaVersion: LOCAL_SCHEMA,
    })

    expect(result.retries).toBe(1)
    expect(result.pushed).toBe(true)
  })

  it('etag race: fails after 4 attempts with SyncConflictError', async () => {
    const { db, handle } = await setupDevice([])
    db.applyRow('books', { id: 'b1', title: 'Dune' })

    const adapter = new InMemoryCloudAdapter()
    await adapter.putFile(DB_PATH, new TextEncoder().encode('{}'))
    adapter.forceConflicts = 99

    const state: SyncState = { lastEtag: '1' }

    await expectAsyncThrows(
      () =>
        sync({
          handle,
          adapter,
          state,
          localSchemaVersion: LOCAL_SCHEMA,
        }),
      (e) => e instanceof SyncConflictError,
    )
  })

  it('schema gate: cloud db with newer schema_version raises SchemaTooNewError', async () => {
    const { handle } = await setupDevice([])
    const adapter = new InMemoryCloudAdapter()
    // Seed a cloud db whose serialized state declares a newer schema.
    const seeded = new FakeDb({ schemaVersion: LOCAL_SCHEMA + 1, tables: new Map() })
    const seededBytes = await seeded.serializeAsync()
    await adapter.putFile(DB_PATH, seededBytes)

    await expectAsyncThrows(
      () =>
        sync({
          handle,
          adapter,
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

    const adapter = new InMemoryCloudAdapter()
    await sync({
      handle: a.handle,
      adapter,
      state: {},
      localSchemaVersion: LOCAL_SCHEMA,
    })

    // "Wipe" Device A: fresh blank device.
    const aPrime = await setupDevice([])
    await sync({
      handle: aPrime.handle,
      adapter,
      state: {},
      localSchemaVersion: LOCAL_SCHEMA,
    })

    const books = aPrime.current().state.tables.get('books')
    expect(books?.has('restored')).toBe(true)
  })
})
