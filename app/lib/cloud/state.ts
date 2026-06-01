import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Cloud-sync state, persisted on AsyncStorage via zustand. React code reads it
 * reactively with the `useCloudStore` hook; non-React callers (the sync
 * engine, the auto-sync timer, the sign-in modules) use `useCloudStore
 * .getState()` / `.subscribe()`.
 *
 * When `provider === undefined`, sync is considered disabled.
 */

export type CloudProvider = 'google' | 'apple'

// Provider-specific opaque token blobs live under their own keys (managed by
// the google/apple sign-in modules), not in the persisted store.
export const CLOUD_KEYS = {
  googleToken: 'cloud.token.google',
  appleToken: 'cloud.token.apple',
} as const

type CloudState = {
  provider?: CloudProvider
  lastSyncAt?: string
  lastEtag?: string
  autoLocked: boolean
  accountEmail?: string
}

type CloudActions = {
  setProvider: (provider: CloudProvider) => void
  setLastSyncAt: (iso: string) => void
  setLastEtag: (etag: string) => void
  setAutoLocked: (locked: boolean) => void
  setAccountEmail: (email: string) => void
  /** Wipes cloud state + the provider token blobs. Remote files are untouched. */
  clearAll: () => Promise<void>
}

const INITIAL: CloudState = {
  provider: undefined,
  lastSyncAt: undefined,
  lastEtag: undefined,
  autoLocked: false,
  accountEmail: undefined,
}

export const useCloudStore = create<CloudState & CloudActions>()(
  persist(
    (set) => ({
      ...INITIAL,
      setProvider: (provider) => set({ provider }),
      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
      setLastEtag: (lastEtag) => set({ lastEtag }),
      setAutoLocked: (autoLocked) => set({ autoLocked }),
      setAccountEmail: (accountEmail) => set({ accountEmail }),
      clearAll: async () => {
        set({ ...INITIAL })
        await AsyncStorage.multiRemove([CLOUD_KEYS.googleToken, CLOUD_KEYS.appleToken])
      },
    }),
    {
      name: 'cloud-state',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
