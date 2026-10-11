# AI working material — Phase 1 Project Foundation

**Date:** 2026-10-11  
**Phase:** 1 — Expo foundation only (no login, inbox, API client, or sync)

## Goal

Runnable Expo Router TypeScript app with tooling, env scaffold, providers, and smoke tests per `docs/implementation-plan.md` Slice 1.

## Deliverables completed

| # | Item | Location / notes |
| --- | --- | --- |
| 1 | Path alias `@/*` → `./src/*` | `tsconfig.json`; Jest `moduleNameMapper` |
| 2 | ESLint + Prettier | `eslint.config.js` (eslint-config-expo flat + prettier), `.prettierrc` |
| 3 | `.env.example` | Three `EXPO_PUBLIC_*` vars only; no credentials |
| 4 | Typed app config | `src/core/config/app-config.ts` |
| 5 | Package rename + scripts | `package.json` → `inbox-lite`; `app.json` slug/scheme updated |
| 6 | Jest + jest-expo + RNTL | `tests/foundation-smoke.test.tsx` |
| 7 | Root error boundary + providers | `src/app/providers/*` |
| 8 | Theme tokens | `src/shared/theme/tokens.ts` |
| 9 | a11y conventions (44pt) | `src/shared/a11y/conventions.ts` |
| 10 | NetInfo + AppState | `ConnectivityProvider`, `AppLifecycleProvider` |
| 11 | Dev logger | `src/core/logging/logger.ts` |
| 12 | Native deps | `@react-native-community/netinfo`, `expo-secure-store` via `npx expo install` |
| 13 | Thin routes | `src/app/_layout.tsx`, `index.tsx`, `+not-found.tsx`; removed tabs/modal/template dirs |
| 14 | AppScreen + KeyboardSafeContainer | `src/shared/components/*` |
| 15 | `.env` gitignored | Already in `.gitignore` |
| 16 | This file | `ai/phase-1-foundation.md` |

## Verification (executed)

```text
npm run typecheck  → pass
npm run lint       → pass (expo lint)
npm run test       → pass (2 tests in foundation smoke)
```

## Decisions

- **Error boundary theming:** Uses `useColorScheme` + static tokens so it works outside `ThemeProvider` when Expo Router catches layout errors.
- **SafeArea in tests:** `SafeAreaProvider` uses `initialMetrics` so RNTL can render screens that call `useSafeAreaInsets`.
- **expo/no-dynamic-env-var:** Config reads `process.env.EXPO_PUBLIC_*` with static property access only.
- **SecureStore:** Installed and plugin added for Phase 4 auth; not referenced in Phase 1 code paths.

## Intentionally not built

Login, session restore, API client, inbox UI, SQLite, socket/sync, TanStack Query, design-system primitives beyond `AppScreen`.

## Next slice

Phase 2 — minimal UI primitives (AppText, AppButton, AppTextInput, empty/error/loading states) per implementation plan.
