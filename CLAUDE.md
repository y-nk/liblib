# CLAUDE.md

## Before pushing

Always run these checks and fix any errors before committing:

```sh
pnpm format        # auto-format with oxfmt
pnpm lint          # lint with oxlint (0 errors required, warnings ok)
npx tsc --noEmit   # typecheck
npx expo export --platform android  # verify JS bundle builds
```

## Before pushing Android changes

If you changed native config (app.config.ts, plugins, native deps), verify prebuild works:

```sh
npx expo prebuild --clean --platform android --no-install
```

## Code style

- No semicolons
- Single quotes
- 2-space indent
- Trailing commas always
- 100 char print width
- Always curly braces (no braceless if/else/for)
- Blank line before and after block statements (if, for, while, try, switch)
- Blank line before return statements (unless it's the only statement)
- No explicit return types
- `console.log` is warn-only (ok for debug, remove before shipping)
- `any` is warn-only (prefer `unknown` when possible)
- Unused variables are errors (prefix with `_` if intentionally unused)

## Project structure

- `app/` — expo-router screens
- `components/` — reusable UI components
- `lib/` — business logic, types, hooks
- `lib/providers/` — ISBN lookup providers (open-library, google-books, openai, gemini)
- `lib/data/` — storage layer (books, settings)
