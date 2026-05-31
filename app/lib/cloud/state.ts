import AsyncStorage from '@react-native-async-storage/async-storage'
import { nanoid } from 'nanoid/non-secure'

/**
 * AsyncStorage facade for cloud-sync state. All keys are namespaced under
 * `cloud.*` so a single `clearAll()` can wipe sync state without touching
 * the rest of the app.
 *
 * When `cloud.provider === undefined`, sync is considered disabled.
 */

export type CloudProvider = 'google' | 'apple'

const KEYS = {
  provider: 'cloud.provider',
  deviceId: 'cloud.deviceId',
  lastSyncAt: 'cloud.lastSyncAt',
  lastEtag: 'cloud.lastEtag',
  autoLocked: 'cloud.autoLocked',
  accountEmail: 'cloud.accountEmail',
  // Provider-specific opaque token blobs.
  googleToken: 'cloud.token.google',
  appleToken: 'cloud.token.apple',
} as const

const ALL_KEYS = Object.values(KEYS)

// Tiny pub/sub so UI surfaces (header sync button, settings sheet) can
// observe provider / auto-lock changes without re-querying AsyncStorage
// on every render.
type Listener = () => void
const listeners = new Set<Listener>()

export function subscribeCloudState(fn: Listener): () => void {
  listeners.add(fn)

  return () => {
    listeners.delete(fn)
  }
}

function notify() {
  for (const fn of listeners) {
    fn()
  }
}

export async function getProvider(): Promise<CloudProvider | undefined> {
  const raw = await AsyncStorage.getItem(KEYS.provider)

  if (raw === 'google' || raw === 'apple') {
    return raw
  }

  return undefined
}

export async function setProvider(provider: CloudProvider) {
  await AsyncStorage.setItem(KEYS.provider, provider)
  notify()
}

/**
 * Returns the device id, generating and persisting one on first call.
 * Once generated, the id is frozen for the lifetime of the install.
 */
export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEYS.deviceId)

  if (existing) {
    return existing
  }

  const id = nanoid()
  await AsyncStorage.setItem(KEYS.deviceId, id)

  return id
}

export async function getLastSyncAt(): Promise<string | undefined> {
  return (await AsyncStorage.getItem(KEYS.lastSyncAt)) ?? undefined
}

export async function setLastSyncAt(iso: string) {
  await AsyncStorage.setItem(KEYS.lastSyncAt, iso)
  notify()
}

export async function getLastEtag(): Promise<string | undefined> {
  return (await AsyncStorage.getItem(KEYS.lastEtag)) ?? undefined
}

export async function setLastEtag(etag: string) {
  await AsyncStorage.setItem(KEYS.lastEtag, etag)
}

export async function getAutoLocked(): Promise<boolean> {
  return (await AsyncStorage.getItem(KEYS.autoLocked)) === '1'
}

export async function setAutoLocked(locked: boolean) {
  await AsyncStorage.setItem(KEYS.autoLocked, locked ? '1' : '0')
  notify()
}

export async function getAccountEmail(): Promise<string | undefined> {
  return (await AsyncStorage.getItem(KEYS.accountEmail)) ?? undefined
}

export async function setAccountEmail(email: string) {
  await AsyncStorage.setItem(KEYS.accountEmail, email)
}

/** Wipes every `cloud.*` key. Cloud files on the remote provider are NOT touched. */
export async function clearAll() {
  await AsyncStorage.multiRemove(ALL_KEYS)
  notify()
}

export const CLOUD_KEYS = KEYS
