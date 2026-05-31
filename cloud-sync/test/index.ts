/**
 * Entry point for the in-package test harness. Importing this module
 * (statically or dynamically) runs every registered case and prints
 * `ok` / `FAIL` lines. The process exits with code 1 on any failure.
 *
 *   ts-node packages/cloud-sync/test/index.ts
 *
 * When the project adopts vitest/jest, delete this file and the harness;
 * the `.test.ts` files import a runner-shaped `describe`/`it`/`expect`
 * so the swap is mechanical.
 */
import './SyncEngine.test'
import './GoogleDriveAdapter.test'
import './ICloudAdapter.test'
import { runAll } from './harness'

async function main() {
  // eslint-disable-next-line no-console
  console.log('cloud-sync tests')
  const { passed, failed } = await runAll()
  // eslint-disable-next-line no-console
  console.log(`\n${passed} passed, ${failed} failed`)

  if (failed > 0) {
    // eslint-disable-next-line no-undef
    process.exit(1)
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e)
  // eslint-disable-next-line no-undef
  process.exit(1)
})
