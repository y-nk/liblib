import {
  FakeCloudAdapter,
  sync,
  type SyncResult,
  type SyncState,
} from '@y_nk/react-native-cloud-sync'
import { buildDbHandle } from './dbHandle'
import { createFileSystemCoverStore } from './coverStore'

/**
 * In-process singleton fake cloud + state so the dev sync button can be
 * tapped repeatedly during a single app session and observe round-trips
 * (push, then pull on a fresh device-like state).
 *
 * Thrown away when real adapters land — this module's whole purpose is to
 * make the engine demoable end-to-end before {Google,iCloud} adapters exist.
 */
export const devFakeAdapter = new FakeCloudAdapter()
const devState: SyncState = {}

/** Highest known migration version — see `lib/migrations.ts`. */
const LOCAL_SCHEMA_VERSION = 9

export async function runDevSync(): Promise<SyncResult> {
  const { handle } = await buildDbHandle()
  const covers = createFileSystemCoverStore()

  return sync({
    handle,
    adapter: devFakeAdapter,
    covers,
    state: devState,
    localSchemaVersion: LOCAL_SCHEMA_VERSION,
  })
}
