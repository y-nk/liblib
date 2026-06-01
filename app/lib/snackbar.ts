/**
 * Tiny global snackbar event bus. The single mounted <Snackbar /> component
 * (rendered at the root layout) subscribes to `subscribe()` and renders the
 * most recent message; any module can call `showSnackbar()` without holding
 * a React ref.
 *
 * Intentionally minimal — `expo-router` doesn't ship a toast and the rest of
 * the app currently only needs error reporting from sync failures.
 */

export type SnackbarKind = 'info' | 'error'

export type SnackbarMessage = {
  id: number
  text: string
  kind: SnackbarKind
  durationMs: number
}

type Listener = (msg: SnackbarMessage | null) => void

const listeners = new Set<Listener>()
let counter = 0

export function subscribe(fn: Listener) {
  listeners.add(fn)

  return () => {
    listeners.delete(fn)
  }
}

export function showSnackbar(text: string, kind: SnackbarKind = 'info', durationMs = 3000) {
  counter += 1
  const msg: SnackbarMessage = { id: counter, text, kind, durationMs }

  for (const fn of listeners) {
    fn(msg)
  }
}

export function dismissSnackbar() {
  for (const fn of listeners) {
    fn(null)
  }
}
