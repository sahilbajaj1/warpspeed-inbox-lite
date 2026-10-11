# AI working material — Phase 8 Offline Persistence

**Date:** 2026-10-11  
**Phase:** 8 — SQLite cache + durable outbox

## PDF coverage

- P-10 offline use + flush when connection returns  
- ER-05 durable mutation outbox  
- AS-21 cache fetched pages + opened details (not full 3k upfront)

## Design

- `expo-sqlite` (~57.0.4) with WAL + `user_version` migrations  
- Tables: `outbox`, `mailbox_pages`, `threads`, `thread_details`  
- **Persist outbox before optimistic UI** — disk failure does not claim success  
- On relaunch: hydrate Query from cache → restore outbox → re-apply overlays  
- Interrupted `in_flight` rows remapped to `queued` (same idempotency key)  
- Connectivity restore calls `flushQueued()`  
- Logout clears Query + SQLite user data  
- Jest uses in-memory repositories (native SQLite unavailable in Node)

## Trade-off

Memory fallback when SQLite open fails (tests / unsupported platforms). Production path uses SQLite.

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm test          → pass
```

## Next

Phase 9 — Socket.IO realtime + sync catch-up with version/tombstones.
