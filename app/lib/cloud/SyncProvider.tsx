import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { subscribeSyncCompleted } from './syncRunner'

/**
 * Monotonic counter that bumps on every successful sync from any source —
 * manual tap, the auto-sync timer, or the first sync after sign-in. Screens
 * read it with `useSyncVersion()` and reload when it changes, so pulled data
 * shows without leaving and re-entering the screen.
 *
 * The non-React `syncRunner` stays the source of truth (it's driven from the
 * background timer too); this provider just bridges its completion event into
 * the React tree so a value change re-renders only the consumers.
 */
const SyncVersionContext = createContext(0)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    return subscribeSyncCompleted(() => {
      setVersion((v) => v + 1)
    })
  }, [])

  return <SyncVersionContext.Provider value={version}>{children}</SyncVersionContext.Provider>
}

export function useSyncVersion() {
  return useContext(SyncVersionContext)
}
