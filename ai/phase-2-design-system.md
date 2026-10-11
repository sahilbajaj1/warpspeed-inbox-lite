# AI working material — Phase 2 Design System

**Date:** 2026-10-11  
**Phase:** 2 — Minimal reusable UI primitives (no inbox/thread feature components yet)

## Goal

Ship a small, accessible component set sufficient for login and list loading/empty/error/offline states.

## PDF coverage

- **C-04** — Visual design not assessed; UI must be usable
- Supports later P-01…P-03 UX states without inventing product features

## What was built

Semantic theme tokens (`textPrimary`, `surface`, `accent`, `error`, `warning`, `success`, …) plus:

- `AppText`, `AppButton`, `AppIconButton`, `AppTextInput`
- `ScreenHeader`, `AppDivider`, `LoadingSkeleton`
- `EmptyState`, `ErrorState`, `RetryAction`, `OfflineBanner`
- Existing `AppScreen` / `KeyboardSafeContainer` retained

Inbox/thread-specific components deferred to Phases 5–6 (extract when they have real responsibility).

## Trade-offs

- **No component library / animation kit** — restrained Pressable + tokens keep scope proportional.
- **OfflineBanner uses NetInfo** — `forceOffline` prop keeps tests deterministic.
- **EmptyState reuses RetryAction** — avoids a second button API for optional CTA.

## Verification (executed)

```text
npm run typecheck  → pass
npm run lint       → pass
npm run test       → pass (11 tests / 5 suites)
```

## Corrections during slice

- `ReactNode` must be imported from `react`, not `react-native` (TS2305).
- RNTL v14 `render` is async in this project — component tests must `await render(...)`.

## Intentionally deferred

Inbox/thread-specific components (ThreadListItem, StarButton, StreamingSummary, …) until those features exist.
