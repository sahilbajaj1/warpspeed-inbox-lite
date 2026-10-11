# AI working material — Phase 7 Optimistic Actions

**Date:** 2026-10-11  
**Phase:** 7 — Star / unstar / archive / mark unread with coalescing + idempotency

## PDF coverage

- P-07 instant archive/star/mark unread  
- THR-05/THR-06 PATCH + Idempotency-Key  
- A-05 uncertain 5xx after apply  

## Design

- In-memory `ThreadActionQueue` (durable SQLite outbox arrives in Phase 8)  
- Coalesce rapid toggles on the same field; keep key while queued; new key only for follow-up after in-flight  
- Optimistic cache updates + mailbox membership (archive leaves inbox, enters archived)  
- Uncertain failures stay queued with the **same** key (no blind success assumption)  
- Permanent failures revert optimistic field  

## UI

- `StarButton` on list rows  
- `ThreadActionBar` on thread detail (star / archive / read)  
- `PendingActionIndicator` while syncing  

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm test          → pass
```

## Next

Phase 8 — Expo SQLite persistence for outbox + offline cache.
