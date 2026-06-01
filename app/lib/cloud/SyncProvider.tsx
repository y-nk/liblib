import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ICloudNotAvailableError } from '@y_nk/react-native-cloud-sync'
import { runConfiguredSync, subscribeSyncCompleted } from './syncRunner'
import { signInWithGoogleDrive } from './googleSync'
import { enableICloudSync } from './icloudSync'
import { showSnackbar } from '@/lib/snackbar'

/**
 * Owns the app's sync coordination:
 *
 *  - `syncVersion` bumps on every successful sync (manual tap, auto-sync
 *    timer, or the first sync after sign-in). Screens read it with
 *    `useSyncVersion()` and reload on change, so pulled data shows without
 *    leaving the screen.
 *  - `enableGoogleDrive` / `enableICloud` run the provider sign-in flow, then
 *    kick off a first sync to pull the existing cloud library. The chooser UI
 *    (`EnableSyncSheet`) consumes these via `useEnableSync()` and stays
 *    presentation-only.
 *
 * `syncRunner` remains the non-React source of truth (it's driven from the
 * background timer too); this provider bridges it into the React tree.
 */
type SyncContextValue = {
  syncVersion: number
  signingIn: boolean
  /** Returns true once a provider was enabled, false on cancel/failure. */
  enableGoogleDrive: () => Promise<boolean>
  enableICloud: () => Promise<boolean>
}

const SyncContext = createContext<SyncContextValue>({
  syncVersion: 0,
  signingIn: false,
  enableGoogleDrive: async () => false,
  enableICloud: async () => false,
})

export function SyncProvider({ children }: { children: ReactNode }) {
  const [syncVersion, setSyncVersion] = useState(0)
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    return subscribeSyncCompleted(() => {
      setSyncVersion((v) => v + 1)
    })
  }, [])

  // Pull the existing cloud library right after sign-in. Fire-and-forget so
  // the chooser closes immediately; the snackbar reports the outcome and the
  // version bump refreshes subscribed screens.
  const runFirstSync = async () => {
    try {
      await runConfiguredSync()
      showSnackbar('Sync complete')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      showSnackbar(`Sync failed: ${msg}`, 'error')
    }
  }

  const enableGoogleDrive = async () => {
    if (signingIn) {
      return false
    }

    setSigningIn(true)

    try {
      const result = await signInWithGoogleDrive()

      if (!result) {
        // User cancelled the consent screen — leave provider unset.
        return false
      }

      runFirstSync()

      return true
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      showSnackbar(`Sign-in failed: ${msg}`, 'error')

      return false
    } finally {
      setSigningIn(false)
    }
  }

  const enableICloud = async () => {
    if (signingIn) {
      return false
    }

    setSigningIn(true)

    try {
      await enableICloudSync()
      runFirstSync()

      return true
    } catch (e) {
      if (e instanceof ICloudNotAvailableError) {
        showSnackbar('iCloud not available — sign into iCloud in iOS Settings', 'error')
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        showSnackbar(`iCloud sync failed: ${msg}`, 'error')
      }

      return false
    } finally {
      setSigningIn(false)
    }
  }

  // enableGoogleDrive/enableICloud close over `signingIn`, so the value is
  // recreated whenever it (or the version) changes.
  const value = useMemo(
    () => ({ syncVersion, signingIn, enableGoogleDrive, enableICloud }),
    [syncVersion, signingIn],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSyncVersion() {
  return useContext(SyncContext).syncVersion
}

export function useEnableSync() {
  const { signingIn, enableGoogleDrive, enableICloud } = useContext(SyncContext)

  return { signingIn, enableGoogleDrive, enableICloud }
}
