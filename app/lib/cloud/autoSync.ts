import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native'
import { getAutoLocked, getProvider, subscribeCloudState } from './state'
import { isSyncInFlight, runConfiguredSync } from './syncRunner'
import { showSnackbar } from '@/lib/snackbar'

/**
 * Foreground auto-sync timer. When `cloud.autoLocked` is `true` and a
 * provider is configured, this runs `runConfiguredSync()` every
 * `BASE_INTERVAL_MS`. The timer is scoped to the app's foreground lifetime
 * — backgrounding the app stops it; foregrounding resumes it.
 *
 * Concurrency is enforced at `runConfiguredSync` (shared in-flight promise),
 * so a manual tap mid-tick is harmless: both calls await the same run.
 *
 * Back-off: after `MAX_CONSECUTIVE_FAILURES` consecutive failures, the
 * interval grows to `BACKOFF_INTERVAL_MS` to avoid a snackbar storm. A
 * subsequent successful sync (from any source) resets to the base interval.
 *
 * The module exposes a single `startAutoSync()` entry point that returns a
 * disposer; `_layout.tsx` calls it once at mount and releases on unmount.
 */

const BASE_INTERVAL_MS = 120_000
const BACKOFF_INTERVAL_MS = 600_000
const MAX_CONSECUTIVE_FAILURES = 3

type Status = {
  /** True while the foreground timer is actively scheduling ticks. */
  running: boolean
  /** True iff we're in the post-failure back-off window. */
  backedOff: boolean
}

type Listener = (s: Status) => void
const statusListeners = new Set<Listener>()
let currentStatus: Status = { running: false, backedOff: false }

export function subscribeAutoSyncStatus(fn: Listener): () => void {
  statusListeners.add(fn)
  fn(currentStatus)

  return () => {
    statusListeners.delete(fn)
  }
}

function setStatus(next: Partial<Status>) {
  const merged = { ...currentStatus, ...next }

  if (merged.running === currentStatus.running && merged.backedOff === currentStatus.backedOff) {
    return
  }

  currentStatus = merged

  for (const fn of statusListeners) {
    fn(currentStatus)
  }
}

export function getAutoSyncStatus(): Status {
  return currentStatus
}

/**
 * Starts the auto-sync controller. Safe to call once at app mount; the
 * returned function must be invoked on unmount to release the timer +
 * subscriptions.
 *
 * Pass `intervalMs` to override the base 120s cadence (e.g. for dev
 * verification — the issue's acceptance criterion asks for a 10s test).
 */
export function startAutoSync(intervalMs: number = BASE_INTERVAL_MS): () => void {
  let timer: ReturnType<typeof setInterval> | null = null
  let consecutiveFailures = 0
  let currentIntervalMs = intervalMs
  let disposed = false
  let foreground = AppState.currentState === 'active'

  const tick = async () => {
    if (disposed) {
      return
    }

    // Concurrency guard at module level — skip if a manual sync (or a slow
    // previous tick) is still running.
    if (isSyncInFlight()) {
      return
    }

    // Re-check provider + locked on every tick; either flag may have flipped
    // between the subscribe-driven restart and this fire.
    const [provider, locked] = await Promise.all([getProvider(), getAutoLocked()])

    if (!provider || !locked) {
      return
    }

    try {
      await runConfiguredSync()
      consecutiveFailures = 0

      if (currentIntervalMs !== intervalMs) {
        // Recovered from back-off — restore the base cadence.
        currentIntervalMs = intervalMs
        restartTimer()
      }

      setStatus({ backedOff: false })
    } catch (e) {
      consecutiveFailures += 1
      const msg = e instanceof Error ? e.message : String(e)
      showSnackbar(`Sync failed: ${msg}`, 'error')

      if (
        consecutiveFailures >= MAX_CONSECUTIVE_FAILURES &&
        currentIntervalMs !== BACKOFF_INTERVAL_MS
      ) {
        currentIntervalMs = BACKOFF_INTERVAL_MS
        restartTimer()
        setStatus({ backedOff: true })
      }
    }
  }

  const stopTimer = () => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }

    setStatus({ running: false })
  }

  const restartTimer = () => {
    if (timer !== null) {
      clearInterval(timer)
      timer = null
    }

    if (!foreground || disposed) {
      return
    }

    timer = setInterval(tick, currentIntervalMs)
    setStatus({ running: true })
  }

  const evaluate = async () => {
    if (disposed) {
      return
    }

    const [provider, locked] = await Promise.all([getProvider(), getAutoLocked()])
    const shouldRun = foreground && !!provider && locked

    if (shouldRun) {
      if (timer === null) {
        restartTimer()
      }

      return
    }

    stopTimer()
  }

  const onAppStateChange = (next: AppStateStatus) => {
    const nowForeground = next === 'active'

    if (nowForeground === foreground) {
      return
    }

    foreground = nowForeground
    evaluate()
  }

  const appStateSub: NativeEventSubscription = AppState.addEventListener('change', onAppStateChange)
  const unsubscribeCloud = subscribeCloudState(() => {
    evaluate()
  })

  // Kick off — populates status immediately based on persisted state.
  evaluate()

  return () => {
    disposed = true
    appStateSub.remove()
    unsubscribeCloud()
    stopTimer()
  }
}
