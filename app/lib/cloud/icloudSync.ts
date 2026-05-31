import { NativeModules, Platform } from 'react-native'
import {
  ICloudAdapter,
  ICloudNotAvailableError,
  type ICloudNativeModule,
} from '@y_nk/react-native-cloud-sync'
import { setProvider } from './state'

/**
 * Drives the "Sync with iCloud" button. There's no OAuth flow — iCloud
 * access is entitlement-based — so all we do is:
 *
 *   1. Pre-flight `FileManager.default.ubiquityIdentityToken` via the native
 *      module's `isAvailable()`. If iCloud isn't usable on this device,
 *      throw `ICloudNotAvailableError` so the UI can surface the "sign into
 *      iCloud in iOS Settings" message.
 *   2. Persist `cloud.provider = 'apple'`. There's nothing to revoke when
 *      the user later disables sync.
 *
 * Returns nothing on success (no email/identity to display in Settings —
 * that surface should show "Synced with iCloud" and the last-sync stamp).
 */

let cachedAdapter: ICloudAdapter | null = null

function getNativeModule(): ICloudNativeModule | null {
  if (Platform.OS !== 'ios') {
    return null
  }

  const mod = (NativeModules as { LiblibICloud?: ICloudNativeModule }).LiblibICloud

  return mod ?? null
}

/**
 * Builds (and caches) the configured `ICloudAdapter`. Returns `null` when
 * the native module isn't linked (e.g. running on Android, or running JS
 * code in Expo Go without the prebuilt native pod). Callers should treat
 * `null` the same as "iCloud not available".
 */
export function createICloudAdapter(): ICloudAdapter | null {
  if (cachedAdapter) {
    return cachedAdapter
  }

  const native = getNativeModule()

  if (!native) {
    return null
  }

  cachedAdapter = new ICloudAdapter({ native })

  return cachedAdapter
}

/**
 * Throws `ICloudNotAvailableError` if the device can't reach iCloud Drive
 * (no signed-in account, or the native module isn't linked into this
 * binary). On success persists `cloud.provider = 'apple'`.
 */
export async function enableICloudSync(): Promise<void> {
  const adapter = createICloudAdapter()

  if (!adapter) {
    throw new ICloudNotAvailableError()
  }

  await adapter.assertAvailable()
  await setProvider('apple')
}
