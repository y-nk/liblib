import AsyncStorage from '@react-native-async-storage/async-storage'
import { nanoid } from 'nanoid/non-secure'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

/**
 * Cloud-sync state, persisted on AsyncStorage via zustand. React code can
 * read reactively with the `useCloudStore` hook; the async wrapper functions
 * below preserve the original facade for non-React callers (the sync engine,
 * the auto-sync timer) and await rehydration so a value is never read before
 * the persisted state has loaded.
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
  deviceId?: string
  lastSyncAt?: string
  lastEtag?: string
  autoLocked: boolean
  accountEmail?: string
}

type CloudActions = {
  setProvider: (provider: CloudProvider) => void
  setDeviceId: (id: string) => void
  setLastSyncAt: (iso: string) => void
  setLastEtag: (etag: string) => void
  setAutoLocked: (locked: boolean) => void
  setAccountEmail: (email: string) => void
  reset: () => void
}

const INITIAL: CloudState = {
  provider: undefined,
  deviceId: undefined,
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
      setDeviceId: (deviceId) => set({ deviceId }),
      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
      setLastEtag: (lastEtag) => set({ lastEtag }),
      setAutoLocked: (autoLocked) => set({ autoLocked }),
      setAccountEmail: (accountEmail) => set({ accountEmail }),
      reset: () => set({ ...INITIAL }),
    }),
    {
      name: 'cloud-state',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

/** Resolves once the persisted state has been read back from AsyncStorage. */
function whenHydrated(): Promise<void> {
  if (useCloudStore.persist.hasHydrated()) {
    return Promise.resolve()
  }

  return new Promise((resolve) => {
    const unsub = useCloudStore.persist.onFinishHydration(() => {
      unsub()
      resolve()
    })
  })
}

// Facade -----------------------------------------------------------------

/**
 * Subscribe to cloud-state changes. Returns an unsubscribe function. Used by
 * UI surfaces (header sync button, settings sheet) that aren't already
 * reading the store via the hook.
 */
export function subscribeCloudState(fn: () => void): () => void {
  return useCloudStore.subscribe(fn)
}

export async function getProvider(): Promise<CloudProvider | undefined> {
  await whenHydrated()

  return useCloudStore.getState().provider
}

export async function setProvider(provider: CloudProvider) {
  await whenHydrated()
  useCloudStore.getState().setProvider(provider)
}

/**
 * Returns the device id, generating and persisting one on first call. Once
 * generated, the id is frozen for the lifetime of the install.
 */
export async function getDeviceId(): Promise<string> {
  await whenHydrated()
  const existing = useCloudStore.getState().deviceId

  if (existing) {
    return existing
  }

  const id = nanoid()
  useCloudStore.getState().setDeviceId(id)

  return id
}

export async function getLastSyncAt(): Promise<string | undefined> {
  await whenHydrated()

  return useCloudStore.getState().lastSyncAt
}

export async function setLastSyncAt(iso: string) {
  await whenHydrated()
  useCloudStore.getState().setLastSyncAt(iso)
}

export async function getLastEtag(): Promise<string | undefined> {
  await whenHydrated()

  return useCloudStore.getState().lastEtag
}

export async function setLastEtag(etag: string) {
  await whenHydrated()
  useCloudStore.getState().setLastEtag(etag)
}

export async function getAutoLocked(): Promise<boolean> {
  await whenHydrated()

  return useCloudStore.getState().autoLocked
}

export async function setAutoLocked(locked: boolean) {
  await whenHydrated()
  useCloudStore.getState().setAutoLocked(locked)
}

export async function getAccountEmail(): Promise<string | undefined> {
  await whenHydrated()

  return useCloudStore.getState().accountEmail
}

export async function setAccountEmail(email: string) {
  await whenHydrated()
  useCloudStore.getState().setAccountEmail(email)
}

/**
 * Wipes all cloud state — the persisted store and the provider token blobs.
 * Cloud files on the remote provider are NOT touched.
 */
export async function clearAll() {
  await whenHydrated()
  useCloudStore.getState().reset()
  await AsyncStorage.multiRemove([CLOUD_KEYS.googleToken, CLOUD_KEYS.appleToken])
}
