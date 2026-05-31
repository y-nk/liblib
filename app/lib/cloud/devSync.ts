import { FakeCloudAdapter } from '@y_nk/react-native-cloud-sync'

/**
 * Process-wide singleton fake adapter so multiple taps of the sync button
 * during a single app session round-trip against the same in-memory cloud.
 * Thrown away when real adapters land.
 */
export const devFakeAdapter = new FakeCloudAdapter()
