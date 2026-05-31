## Parent

`../README.md`

## What to build

Convert the `shelves.id` column from `INTEGER AUTOINCREMENT` to a nanoid `TEXT` primary key, and rewrite every `books.shelfId` value to point at the new nanoid id of the shelf it previously referenced by integer id.

This is the prerequisite that makes whole-db sync safe across two devices: without it, two devices independently creating their first shelf both get `id=1`, and a session-changeset merge would silently overwrite one shelf with the other.

Land this migration in `lib/migrations.ts` as version 9, behind the existing forward-only migration runner. After migration 9 ships, every shelf id everywhere in the codebase is a `string` (nanoid). New entities introduced later follow the same nanoid convention.

This slice has no UI surface. It is verified by:

- The existing app still works end-to-end after the migration runs against a pre-existing local database.
- The migration is covered by unit tests against an in-memory SQLite seeded with realistic pre-migration data.

## Acceptance criteria

- [ ] Migration 9 added to `lib/migrations.ts`; runs after migration 8, idempotent if re-run.
- [ ] After migration: `shelves.id` is `TEXT NOT NULL PRIMARY KEY`, populated with nanoids.
- [ ] After migration: every `books.shelfId` that previously pointed at an integer id now stores the corresponding nanoid; rows with `shelfId IS NULL` stay NULL.
- [ ] All app code paths reading or writing shelf ids accept and produce strings (no leftover `parseInt`/`Number()` on shelf ids).
- [ ] `createShelf` generates a nanoid client-side; no reliance on `lastInsertRowId`.
- [ ] Type updates: `Shelf.id`, `Book.shelfId`, route params (`useLocalSearchParams<{ shelfId?: string }>` remains correct; ensure nothing else casts to number).
- [ ] Unit tests cover: pre-migration data → post-migration data (shelves get string ids, books re-point correctly, mis-shelved books stay NULL, idempotency on re-run).
- [ ] `nanoid` (or `nanoid/non-secure` if `nanoid/async` is unavailable in RN) added as a dependency.
- [ ] `pnpm format && pnpm lint && npx tsc --noEmit && npx expo export --platform android` all pass.

## Blocked by

None — can start immediately.
