import type { Changeset, DbHandle, SqliteDb, SqliteSession } from '../src/SqliteSurface'

/**
 * In-memory SqliteDb that fakes just enough of expo-sqlite to drive the
 * SyncEngine's tests end-to-end:
 *
 *  - Row store keyed by (table, primary key).
 *  - schema_version row (read via getFirstAsync).
 *  - Session that records inserts/updates since the last `enableAsync(true)`
 *    snapshot and replays them on `applyChangesetAsync`.
 *  - `serializeAsync` returns a JSON-encoded snapshot; `deserialize` on the
 *    handle reads it back. Bytes are arbitrary — what matters is that they
 *    round-trip a db state.
 */

type Row = Record<string, unknown> & { id: string }

type DbState = {
  schemaVersion: number
  tables: Map<string, Map<string, Row>>
}

function cloneState(s: DbState): DbState {
  const tables = new Map<string, Map<string, Row>>()

  for (const [name, rows] of s.tables) {
    const inner = new Map<string, Row>()

    for (const [k, v] of rows) {
      inner.set(k, { ...v })
    }

    tables.set(name, inner)
  }

  return { schemaVersion: s.schemaVersion, tables }
}

function stateToBytes(s: DbState): Uint8Array {
  const serializable = {
    schemaVersion: s.schemaVersion,
    tables: Array.from(s.tables, ([name, rows]) => [name, Array.from(rows.entries())]),
  }

  return new TextEncoder().encode(JSON.stringify(serializable))
}

function stateFromBytes(b: Uint8Array): DbState {
  const obj = JSON.parse(new TextDecoder().decode(b)) as {
    schemaVersion: number
    tables: [string, [string, Row][]][]
  }
  const tables = new Map<string, Map<string, Row>>()

  for (const [name, rows] of obj.tables) {
    tables.set(name, new Map(rows))
  }

  return { schemaVersion: obj.schemaVersion, tables }
}

// Changeset wire format — JSON-encoded list of (table, row) inserts/updates.
type ChangesetWire = { table: string; row: Row }[]

function changesetToBytes(c: ChangesetWire): Changeset {
  return new TextEncoder().encode(JSON.stringify(c))
}

function changesetFromBytes(b: Changeset): ChangesetWire {
  return JSON.parse(new TextDecoder().decode(b)) as ChangesetWire
}

class FakeSession implements SqliteSession {
  private snapshot: DbState
  private enabled = false
  // The session captures all writes after the snapshot moment.
  // For the fake, "write" = mutating `db.state.tables` directly via the
  // test helper `applyWrite` below, which calls back into `recordWrite`.
  private recorded: ChangesetWire = []

  constructor(private readonly db: FakeDb) {
    this.snapshot = cloneState(db.state)
    db.bindSession(this)
  }

  recordWrite(table: string, row: Row) {
    if (this.enabled) {
      this.recorded.push({ table, row })
    }
  }

  async attachAsync(_table: string | null) {}

  async enableAsync(enabled: boolean) {
    this.enabled = enabled

    if (enabled) {
      this.snapshot = cloneState(this.db.state)
      this.recorded = []
    }
  }

  async closeAsync() {
    this.enabled = false
    this.db.unbindSession(this)
  }

  async createChangesetAsync(): Promise<Changeset> {
    return changesetToBytes(this.recorded)
  }

  async applyChangesetAsync(changeset: Changeset) {
    const writes = changesetFromBytes(changeset)

    for (const w of writes) {
      this.db.applyRow(w.table, w.row, /* fromChangeset */ true)
    }
  }
}

export class FakeDb implements SqliteDb {
  public state: DbState
  private sessions = new Set<FakeSession>()
  public closed = false

  constructor(initial?: DbState) {
    this.state = initial ? cloneState(initial) : { schemaVersion: 9, tables: new Map() }
  }

  bindSession(s: FakeSession) {
    this.sessions.add(s)
  }

  unbindSession(s: FakeSession) {
    this.sessions.delete(s)
  }

  applyRow(table: string, row: Row, fromChangeset = false) {
    let t = this.state.tables.get(table)

    if (!t) {
      t = new Map()
      this.state.tables.set(table, t)
    }

    t.set(row.id, { ...row })

    if (!fromChangeset) {
      for (const s of this.sessions) {
        s.recordWrite(table, row)
      }
    }
  }

  // -------- SqliteDb surface ------------------------------------------

  async createSessionAsync(_dbName?: string) {
    return new FakeSession(this) as unknown as SqliteSession
  }

  async serializeAsync(_databaseName?: string) {
    return stateToBytes(this.state)
  }

  async closeAsync() {
    this.closed = true
  }

  async getFirstAsync<T>(source: string, ..._params: unknown[]): Promise<T | null> {
    if (/^\s*SELECT\s+version\s+FROM\s+schema_version/i.test(source)) {
      return { version: this.state.schemaVersion } as unknown as T
    }

    return null
  }
}

/**
 * Build a `DbHandle` over a `FakeDb` and a captured "disk" state (a slot
 * holding the current serialized bytes). `swapAndReopen` replaces the disk
 * slot and returns a fresh FakeDb so the engine's swap step is observable.
 */
export type DiskSlot = { bytes: Uint8Array }

export async function buildFakeHandle(
  initial: FakeDb,
  disk: DiskSlot,
): Promise<{ handle: DbHandle; disk: DiskSlot; current: () => FakeDb }> {
  let currentDb = initial
  const session = (await initial.createSessionAsync()) as FakeSession & SqliteSession
  await session.enableAsync(true)

  const handle: DbHandle = {
    db: currentDb,
    session,
    async deserialize(data) {
      const st = stateFromBytes(data)

      return new FakeDb(st)
    },
    async swapAndReopen(merged) {
      await currentDb.closeAsync()
      disk.bytes = merged
      const reopened = new FakeDb(stateFromBytes(merged))
      currentDb = reopened
      const fresh = (await reopened.createSessionAsync()) as FakeSession & SqliteSession
      await fresh.enableAsync(true)

      return { db: reopened, session: fresh }
    },
  }

  return { handle, disk, current: () => currentDb }
}
