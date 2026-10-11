# AI working material — Phase 9 Realtime + Sync

**Date:** 2026-10-11  
**Phase:** 9 — Socket.IO + sync catch-up + version/tombstones

## PDF coverage

- P-04 live updates without pull-to-refresh  
- SYN-01…SYN-03 sync token / catch-up / 410  
- RT-01…RT-03, RT-05, RT-06 socket auth + events + reauth  
- RT-04 balance.updated wired into minimal credits store (UI in Phase 10)  
- AS-15 / AS-16 / AS-17 naming, checkpoint-after-apply, subscribe-then-catch-up

## Design

1. Connect authenticated socket (`auth.token`, path `/socket.io`)  
2. Buffer `thread.upserted` / `thread.deleted` while catch-up runs  
3. `GET /sync?since=` until `hasMore === false`  
4. Apply with version + tombstone rules; persist checkpoint **after** apply  
5. Drain buffer → live mode  
6. 410 → clear cursor, invalidate mailbox queries, **keep outbox**  
7. `unauthorized` / connect_error → single-flight refresh → reconnect  

## Schema

SQLite v2 adds `meta` (sync cursor) and `tombstones`.

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm test          → pass
```

## Next

Phase 10 — AI summary SSE streaming + credits UI.
