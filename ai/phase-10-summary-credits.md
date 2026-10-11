# AI working material — Phase 10 Summary + Credits

**Date:** 2026-10-11  
**Phase:** 10 — AI summary SSE + shared credits balance

## PDF coverage

- P-08 / SUM-01…SUM-04 streaming summary  
- P-09 / A-03 / SUM-03 / RT-04 credits from meta, header, socket  
- AS-18 / AS-19 no local decrement; no auto-retry after charge

## Design

- Separate summary transport via `expo/fetch` (not JSON envelope client)  
- Incremental SSE parser across chunk boundaries; flexible event/JSON shapes (AMB-01)  
- `X-User-Balance` on stream response → credits store  
- API client `onUserBalance` + socket `balance.updated` → same store  
- UI: `CreditsBadge` on inbox/thread; `SummaryPanel` with double-tap guard, cancel, 402 copy  
- Explicit “Try again” only — never auto re-request

## Trade-off

Exact sandbox SSE event names not live-captured yet; parser accepts `delta`/`done`/`error` plus typed JSON on `message`. Adjust after first live capture if needed.

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm test          → pass
```

## Next

Phase 11+ — chaos/burst notes, polish, README/demo (P2/P3).
