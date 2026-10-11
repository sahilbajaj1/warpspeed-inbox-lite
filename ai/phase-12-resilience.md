# AI working material — Phase 12 Resilience

**Date:** 2026-10-11  
**Phase:** 12 — Resilience polish for chaos / reconnect / rate limits

## PDF coverage

- A-04 / A-05 uncertain writes + 429 / 5xx  
- THR-06 idempotency retention on retry  
- AS-25 recovery affordance (pull-to-refresh + foreground)  
- ER-10 recovery UX for failed actions

## Changes

1. Treat `rate_limited` / timeout / server_failure / offline as **keep-queued** (same key)  
2. Delayed retry after `Retry-After` on 429  
3. Failed-action banner with Retry / Dismiss  
4. `runForegroundRecovery` (outbox flush + sync catch-up) on app foreground  
5. Mailbox refresh triggers the same recovery path  
6. `docs/resilience.md` for interview defense

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm test          → pass
```

## Next

Phase 13–14 thin remaining P2 notes if needed; Phase 15–18 a11y/perf/README finalize + recording when credentials exist.
