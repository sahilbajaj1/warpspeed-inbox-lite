# Resilience behavior

How Inbox Lite behaves under latency, 429s, 5xx, offline, and reconnect — the behaviors Phase 12 hardens for chaos exercises.

## Reads

- API timeout default **20s** (above PDF 10s latency).  
- Idempotent GET retries with backoff; **429 honors `Retry-After`** (bounded).  
- Mailbox pull-to-refresh also runs outbox flush + sync catch-up.  
- Offline: show SQLite-hydrated cache; refetch when online.

## Writes (star / archive / read)

- Persist outbox **before** optimistic UI.  
- Same **Idempotency-Key** kept across uncertain outcomes:  
  `server_failure`, `timeout`, `no_connection`, `rate_limited`, and `outcomeUncertain`.  
- 429 may schedule a delayed retry using `Retry-After` (capped at 30s).  
- Permanent failures (e.g. 403) revert UI, surface **Retry / Dismiss**.  
- Foreground + reconnect flush queued outbox intents.

## Realtime

- Subscribe → buffer → `/sync` catch-up → drain.  
- Version + tombstones ignore stale/out-of-order events.  
- 410 clears sync cursor and invalidates lists; **outbox preserved**.  
- Socket unauthorized → single-flight refresh → reconnect.

## Auth

- Single-flight refresh; new refresh token persisted before publish.  
- Refresh reuse / failure → clear session → login.

## Chaos tooling

Use `docs/dev-tools.md` and always restore `{ failureRate: 0, latencyMs: 0 }`.  
Record live results only in `docs/chaos-observations.md`.
