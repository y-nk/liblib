# Cloud Sync — implementation plan

Parent PRD: [`../README.md`](../README.md).

Six vertical tracer-bullet slices. Each slice cuts end-to-end through schema, package code, app integration, and tests where applicable.

## Topology

```
Step 1 (sequential):
  ./nanoid-migration.md           [AFK]

Step 2 (sequential, depends on Step 1):
  ./cloud-sync-engine.md          [AFK]

Step 3 (sequential, depends on Step 2):
  ./sync-ui-and-state.md          [AFK]

Step 4 (parallel wave, all depend on Step 3):
  ./google-drive-adapter.md       [HITL]
  ./icloud-adapter.md             [HITL]
  ./auto-sync-lock.md             [AFK]
```

## Slices

1. **[nanoid-migration](./nanoid-migration.md)** — `AFK`. Schema prerequisite: convert `shelves.id` from autoincrement integer to nanoid TEXT and rewrite `books.shelfId` references. Without this, multi-device sync silently overwrites shelves on primary-key collision.

2. **[cloud-sync-engine](./cloud-sync-engine.md)** — `AFK`. Build the `packages/cloud-sync` package: `CloudAdapter` interface, in-memory `FakeCloudAdapter`, `SyncEngine` with the full Approach-A merge flow (capture → pull → apply → swap → push with retry → cover diff), plus schema-version refusal gate. Tested end-to-end against the fake adapter. Wired into the app via a dev-only entry point so the engine is demoable before real adapters exist.

3. **[sync-ui-and-state](./sync-ui-and-state.md)** — `AFK`. User-facing surfaces: `RefreshCw` sync icon in the books header (idle / rotating / auto-locked states), `EnableSyncSheet` chooser, `SettingsSheet` rework (remove identity-only sign-in, add a Sync section), AsyncStorage facade for cloud state. Buttons still point at `'fake'` provider; real adapters are the next slices.

4. **[google-drive-adapter](./google-drive-adapter.md)** — `HITL`. Real `GoogleDriveAdapter` against Drive REST API + `appDataFolder` scope. Requires `drive.appdata` scope registered on Google Cloud Console (human prerequisite).

5. **[icloud-adapter](./icloud-adapter.md)** — `HITL`. Real `ICloudAdapter`: custom Swift native module + Expo config plugin for iCloud ubiquity container access. Requires iCloud container provisioning in Apple Developer + entitlement wiring in `app.config.ts` (human prerequisites). Largest native-side risk in the feature.

6. **[auto-sync-lock](./auto-sync-lock.md)** — `AFK`. Wires the long-press gesture's `cloud.autoLocked` state to a real 120-second foreground timer that runs `SyncEngine.sync()` unconditionally, with concurrency guards, app-state awareness, and exponential back-off on repeated failures.

## Notes on ordering

- Steps 1 → 2 → 3 are strictly sequential. Each one is a hard prerequisite for the next.
- Slices in Step 4 are independent of each other and may be implemented in parallel:
  - `google-drive-adapter` and `icloud-adapter` are platform-specific and orthogonal.
  - `auto-sync-lock` is pure app-side logic and does not depend on which adapter is configured — it can land before either real adapter ships and still be verifiable against the `'fake'` adapter from slice 3.
- The two HITL slices in Step 4 each gate on external setup (Google Cloud Console; Apple Developer) that the human user must complete before the slice can be verified end-to-end. AFK agents should stop short of provisioning external services.
