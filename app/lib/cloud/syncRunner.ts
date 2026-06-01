import {
  sync,
  syncFiles,
  type CloudAdapter,
  type SyncResult,
  type SyncState,
} from '@y_nk/react-native-cloud-sync'
import { buildDbHandle } from './dbHandle'
import { createFileSystemCoverStore } from './coverStore'
import { createGoogleDriveAdapter } from './googleSync'
import { createICloudAdapter } from './icloudSync'
import { getCloudState } from './state'
import { log } from '@/lib/log'

/** Highest known migration version — see `lib/migrations.ts`. */
const LOCAL_SCHEMA_VERSION = 10

/** Remote directory the app stores its cover blobs under. */
const COVERS_DIR = 'covers'

/**
 * Module-level in-flight guard. All sync entry points (manual tap, settings
 * "Sync now", auto-sync timer) funnel through `runConfiguredSync`, so a
 * shared promise here is the single chokepoint that prevents stacking.
 */
let inFlight: Promise<SyncResult> | null = null

/** True iff a sync is currently running anywhere in the app. */
export function isSyncInFlight() {
  return inFlight !== null
}

type SyncCompletedListener = () => void
const completedListeners = new Set<SyncCompletedListener>()

/**
 * Subscribe to successful syncs from any source (manual tap, settings, the
 * auto-sync timer, or the first sync after sign-in). Screens use this to
 * reload their data so pulled changes show without a manual refresh.
 */
export function subscribeSyncCompleted(fn: SyncCompletedListener) {
  completedListeners.add(fn)

  return () => {
    completedListeners.delete(fn)
  }
}

/**
 * Resolves the adapter for the currently-configured provider and runs the
 * engine, then reconciles the local covers directory against the matching
 * remote folder. Persists the resulting etag + lastSyncAt into the cloud
 * store.
 *
 * Throws if no provider is configured — callers should guard on
 * `getCloudState().provider` first.
 *
 * If a sync is already in flight, returns that same promise instead of
 * starting a second concurrent run.
 */
export async function runConfiguredSync() {
  if (inFlight) {
    return inFlight
  }

  inFlight = (async () => {
    const provider = getCloudState().provider

    if (!provider) {
      throw new Error('Sync is not enabled')
    }

    let adapter: CloudAdapter

    if (provider === 'google') {
      adapter = createGoogleDriveAdapter()
    } else {
      const icloud = createICloudAdapter()

      if (!icloud) {
        throw new Error('iCloud native module is not available in this build')
      }

      adapter = icloud
    }

    const { handle } = await buildDbHandle()
    const lastEtag = getCloudState().lastEtag
    const state: SyncState = lastEtag ? { lastEtag } : {}

    const result = await sync({
      handle,
      adapter,
      state,
      localSchemaVersion: LOCAL_SCHEMA_VERSION,
    })

    await syncFiles(adapter, createFileSystemCoverStore(), COVERS_DIR)

    getCloudState().setLastEtag(result.newEtag)
    getCloudState().setLastSyncAt(new Date().toISOString())

    for (const fn of completedListeners) {
      fn()
    }

    return result
  })()

  try {
    return await inFlight
  } catch (e) {
    log.error('sync', e instanceof Error ? e.message : String(e), {
      stack: e instanceof Error ? e.stack : undefined,
    })

    throw e
  } finally {
    inFlight = null
  }
}
