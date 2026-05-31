import { sync, type SyncResult, type SyncState } from '@y_nk/react-native-cloud-sync'
import { buildDbHandle } from './dbHandle'
import { createFileSystemCoverStore } from './coverStore'
import { devFakeAdapter } from './devSync'
import { getLastEtag, getProvider, setLastEtag, setLastSyncAt } from './state'

/** Highest known migration version — see `lib/migrations.ts`. */
const LOCAL_SCHEMA_VERSION = 9

/**
 * Resolves the adapter for the currently-configured provider and runs the
 * engine. Persists the resulting etag + lastSyncAt into the cloud state
 * facade. In this slice only the `'fake'` provider is wired; real adapters
 * land in later slices.
 *
 * Throws if no provider is configured — callers should guard on
 * `getProvider()` first.
 */
export async function runConfiguredSync(): Promise<SyncResult> {
  const provider = await getProvider()

  if (!provider) {
    throw new Error('Sync is not enabled')
  }

  // Only `'fake'` ships in this slice; real Google/Apple adapters arrive in
  // their own slices and will replace this branch.
  if (provider !== 'fake') {
    throw new Error(`Provider not yet implemented: ${provider}`)
  }

  const adapter = devFakeAdapter
  const { handle } = await buildDbHandle()
  const covers = createFileSystemCoverStore()

  const lastEtag = await getLastEtag()
  const state: SyncState = lastEtag ? { lastEtag } : {}

  const result = await sync({
    handle,
    adapter,
    covers,
    state,
    localSchemaVersion: LOCAL_SCHEMA_VERSION,
  })

  await setLastEtag(result.newEtag)
  await setLastSyncAt(new Date().toISOString())

  return result
}
