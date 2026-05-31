import {
  sync,
  type CloudAdapter,
  type SyncResult,
  type SyncState,
} from '@y_nk/react-native-cloud-sync'
import { buildDbHandle } from './dbHandle'
import { createFileSystemCoverStore } from './coverStore'
import { devFakeAdapter } from './devSync'
import { createGoogleDriveAdapter } from './googleSync'
import { createICloudAdapter } from './icloudSync'
import { getLastEtag, getProvider, setLastEtag, setLastSyncAt } from './state'

/** Highest known migration version — see `lib/migrations.ts`. */
const LOCAL_SCHEMA_VERSION = 9

/**
 * Module-level in-flight guard. All sync entry points (manual tap, settings
 * "Sync now", auto-sync timer) funnel through `runConfiguredSync`, so a
 * shared promise here is the single chokepoint that prevents stacking.
 */
let inFlight: Promise<SyncResult> | null = null

/** True iff a sync is currently running anywhere in the app. */
export function isSyncInFlight(): boolean {
  return inFlight !== null
}

/**
 * Resolves the adapter for the currently-configured provider and runs the
 * engine. Persists the resulting etag + lastSyncAt into the cloud state
 * facade. In this slice only the `'fake'` provider is wired; real adapters
 * land in later slices.
 *
 * Throws if no provider is configured — callers should guard on
 * `getProvider()` first.
 *
 * If a sync is already in flight, returns that same promise instead of
 * starting a second concurrent run.
 */
export async function runConfiguredSync(): Promise<SyncResult> {
  if (inFlight) {
    return inFlight
  }

  inFlight = (async () => {
    const provider = await getProvider()

    if (!provider) {
      throw new Error('Sync is not enabled')
    }

    let adapter: CloudAdapter

    if (provider === 'google') {
      adapter = createGoogleDriveAdapter()
    } else if (provider === 'apple') {
      const icloud = createICloudAdapter()

      if (!icloud) {
        throw new Error('iCloud native module is not available in this build')
      }

      adapter = icloud
    } else {
      adapter = devFakeAdapter
    }
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
  })()

  try {
    return await inFlight
  } finally {
    inFlight = null
  }
}
