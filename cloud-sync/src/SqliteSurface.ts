/**
 * Surface of the `expo-sqlite` types the engine actually depends on.
 *
 * Keeping this as a narrow structural type rather than importing `SQLiteDatabase`
 * directly buys us two things:
 *
 *  - The package compiles even when the consumer hasn't installed `expo-sqlite`
 *    (e.g. future extraction to its own RN library).
 *  - Tests can inject a hand-rolled minimal fake without dragging the whole
 *    expo-sqlite TypeScript surface in.
 */

export type Changeset = Uint8Array

export type SqliteSession = {
  attachAsync(table: string | null): Promise<void>
  enableAsync(enabled: boolean): Promise<void>
  closeAsync(): Promise<void>
  createChangesetAsync(): Promise<Changeset>
  applyChangesetAsync(changeset: Changeset): Promise<void>
}

export type SqliteDb = {
  createSessionAsync(dbName?: string): Promise<SqliteSession>
  serializeAsync(databaseName?: string): Promise<Uint8Array>
  closeAsync(): Promise<void>
  getFirstAsync<T>(source: string, ...params: unknown[]): Promise<T | null>
}

/**
 * Provider passed to `SyncEngine.sync` describing how to obtain the running
 * db, swap it with the merged bytes, and bind a fresh session afterwards.
 *
 * The engine never touches the file system or `openDatabaseAsync` directly —
 * it just calls the hooks. This keeps the engine pure and lets the app own
 * the lifecycle of its singleton db connection.
 */
export type DbHandle = {
  /** Currently-open db with an attached session that's been recording writes. */
  db: SqliteDb
  /** The session that was attached before `sync()` was called. */
  session: SqliteSession
  /**
   * Open a fresh in-memory database from the given serialized bytes. Used
   * to apply the local changeset on top of the cloud snapshot without
   * touching the on-disk file until step 4 (swap).
   */
  deserialize(data: Uint8Array): Promise<SqliteDb>
  /**
   * Close the running db, atomically replace its bytes with `merged`, and
   * reopen. Returns the new db and a fresh attached session.
   */
  swapAndReopen(merged: Uint8Array): Promise<{ db: SqliteDb; session: SqliteSession }>
}
