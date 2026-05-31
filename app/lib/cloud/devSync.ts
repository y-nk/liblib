import { InMemoryCloudAdapter } from '@y_nk/react-native-cloud-sync'

/**
 * Process-wide singleton in-memory adapter so multiple taps of the sync
 * button during a single app session round-trip against the same fake
 * cloud. Thrown away when real adapters are the only path.
 */
export const devInMemoryAdapter = new InMemoryCloudAdapter()
