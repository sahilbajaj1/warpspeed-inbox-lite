# Architecture — Inbox Lite

**Goal:** A small, defendable offline-capable inbox client against an imperfect sandbox API.  
**Stack target (verified 2026-10-11):** Expo SDK **57** (React Native **0.86**, React **19.2.3**, Node **≥22.13**). Local Node: **22.16.0**.

---

## 1. Architectural principles

1. **Thin screens, thick domain cores** — Expo Router files compose hooks/components; networking, refresh, sync, and DB stay out of UI.
2. **Single ownership of server truth** — Confirmed thread state lives in one reconciler-backed store/cache; optimistic overlays are separate and temporary.
3. **Fail safe on auth** — Prefer forced re-login over reusing a refresh token.
4. **Durable before optimistic (offline writes)** — Persist outbox → update UI → sync. Never claim queued if persist fails.
5. **Proportionate abstraction** — Introduce modules when they have a real responsibility; no empty folder trees.

---

## 2. High-level system diagram

```text
┌─────────────────────────────────────────────────────────────┐
│ UI (Expo Router screens + feature components)               │
│  login · inbox/starred/archived · thread detail · summary   │
└───────────────┬───────────────────────────────┬─────────────┘
                │ hooks                         │ actions
┌───────────────▼──────────────┐   ┌────────────▼─────────────┐
│ TanStack Query (reads)       │   │ Mutation Outbox          │
│ infinite threads, thread by id│   │ idempotency + coalesce   │
└───────────────┬──────────────┘   └────────────┬─────────────┘
                │                               │
        ┌───────▼───────────────────────────────▼───────┐
        │ Event Reconciler (version + tombstones)       │
        │ Confirmed threads ↔ Optimistic overlay        │
        └───────┬───────────────────────────┬───────────┘
                │                           │
     ┌──────────▼──────────┐     ┌──────────▼──────────┐
     │ API Client          │     │ Realtime Client     │
     │ envelope, retry,    │     │ Socket.IO auth      │
     │ refresh attach      │     │ event buffer        │
     └──────────┬──────────┘     └──────────┬──────────┘
                │                           │
     ┌──────────▼───────────────────────────▼──────────┐
     │ Session Manager · Refresh Coordinator · SecureStore│
     └──────────────────────────────────────────────────┘
                │
     ┌──────────▼──────────┐     ┌─────────────────────┐
     │ Expo SQLite         │     │ Credits Store       │
     │ threads cache       │     │ meta / header / sock│
     │ outbox · sync cursor│     └─────────────────────┘
     └─────────────────────┘
```

---

## 3. Layer responsibilities

| Layer | Owns | Must not own |
| --- | --- | --- |
| `app/` routes | Navigation, screen composition, layout | API calls, token refresh, DB transactions |
| `features/*` | Feature UI, feature hooks, view-models | Transport retries, socket lifecycle |
| `core/api` | HTTP transport, envelope parse, error taxonomy, retry policy | Business optimistic rules |
| `core/auth` | Session, SecureStore refresh, single-flight refresh | Thread merging |
| `core/database` | Schema, migrations, repositories | UI rendering |
| `core/sync` | Socket, sync engine, reconciler, outbox processor | Form validation |
| `features/credits` | Single balance projection | Inventing credit deltas locally (except displaying authoritative values) |
| `shared/*` | Theme, primitives, cross-cutting hooks | Feature business rules |

---

## 4. Data ownership model

| Data class | Source of truth | Persistence | Notes |
| --- | --- | --- | --- |
| Access token | Session manager (memory) | Not in SQLite; optional short-lived memory only | Expires ~5 min |
| Refresh token | Session manager | **SecureStore only** | Single-use; rotate carefully |
| Confirmed threads | Server via GET/PATCH/sync/socket | SQLite cache for offline | Version-gated |
| Optimistic overlays | Local intent | Derived from outbox rows | Not a new server version |
| Pending mutations | Outbox repository | SQLite (durable) | Idempotency key stable per logical op |
| Sync checkpoint | Sync cursor store | SQLite | Advance only after apply |
| Credits | Authoritative remote signals | Memory (+ optional cache) | meta / `X-User-Balance` / socket |
| UI query cache | TanStack Query | Memory | Hydrate from SQLite when offline |

**Rule:** Do not keep independent writable copies of the same thread in Query cache, SQLite, and a third Zustand store without a clear write path. Preferred: reconciler applies to a thread repository; Query reads from repository or is updated via controlled cache writes from the reconciler.

---

## 5. Critical subsystems

### 5.1 API client

- Base URL from config: `EXPO_PUBLIC_API_BASE_URL` (default sandbox `/v1`).
- Timeout configured above worst-case latency (PDF: up to 10s) — e.g. 15–20s.
- Attach bearer access token; on 401, await single-flight refresh (except for auth endpoints).
- Parse `{ data, meta }` with runtime validation; extract `userBalance`.
- Normalize errors; never surface stack traces.
- Retry: safe for idempotent reads; for writes only when idempotency key is present and outcome is uncertain — never blind non-idempotent replay.
- Honor `Retry-After` on 429 (bounded wait).

### 5.2 Auth / refresh

```text
N requests → 401 → join shared refreshPromise → one POST /auth/refresh
                 → persist new refreshToken FIRST
                 → publish new accessToken
                 → retry eligible requests once
Refresh itself never triggers refresh.
refresh_token_reused / refresh failure → clear session → login.
SessionGeneration increments on login/logout to ignore late responses.
```

### 5.3 Optimistic mutations / outbox

1. Create command + stable idempotency key (UUID per logical user intent).
2. Transaction: insert outbox + apply optimistic thread fields.
3. Processor (single-flight per action id): PATCH with key.
4. Success → reconcile confirmed thread; drop/complete outbox.
5. 5xx / timeout → keep key; mark uncertain; retry with backoff when online; reconcile via sync/GET when needed.
6. Permanent 4xx (except 401/429 handled specially) → fail action; revert overlay; surface error.
7. Coalesce rapid toggles on same field: keep latest intent; supersede older pending when safe.

### 5.4 Realtime + sync

**Reconnect sequence (prefer):**

1. Ensure valid access token.
2. Connect/authenticate socket; buffer events.
3. Run `GET /sync?since=checkpoint` until `hasMore === false`.
4. Apply buffered events with version/tombstone rules.
5. Persist checkpoint after successful apply.

**Merge rules:**

- Upsert only if `incoming.version >= confirmed.version` (and not tombstoned at higher/equal delete version — exact tombstone rule documented in code).
- Delete creates tombstone; later lower-version upsert ignored.
- Optimistic overlay applied on top of confirmed state for UI.

**410 on sync:** baseline reload (re-fetch list pages / invalidate), preserve outbox.

### 5.5 AI summary streaming

- Separate transport path: `text/event-stream`, not envelope parser.
- Incremental SSE parser across chunk boundaries.
- Update UI on `delta`; finish on `done`; show `error`.
- Read `X-User-Balance` when present; also listen for `balance.updated`.
- Cancellation stops reader; **no automatic re-request**.
- Guard against double-tap starting two streams.

### 5.6 Credits

One store/projector. Inputs: authenticated `meta.userBalance`, summary header, socket event.  
If no monotonic version exists (unknown U-04): use “latest received in session with logical clocks” — e.g. ignore updates older than last applied if we can sequence by local receive order per connection epoch; document limitation.

---

## 6. Navigation structure (planned)

```text
app/
  _layout.tsx          providers, error boundary, bootstrap
  (auth)/login.tsx
  (main)/
    _layout.tsx        tabs or segmented mailboxes + auth gate
    index.tsx          inbox
    starred.tsx
    archived.tsx
    thread/[id].tsx
```

Expo Router chosen because it is the employer’s standard and SDK 57 supports it; no compatibility blocker identified at audit time.

---

## 7. Dependency choices (initial)

| Concern | Choice | Trade-off |
| --- | --- | --- |
| Framework | Expo SDK 57 + Expo Router | Aligns with brief; Node 22 required |
| Language | TypeScript strict | Slight setup cost |
| Validation | zod | Runtime safety vs bundle size (acceptable) |
| Server cache | TanStack Query v5 | Excellent pagination; must integrate carefully with reconciler |
| List virtualization | `@shopify/flash-list` | Best for ~3k rows; watch Expo pin quirks → FlatList fallback |
| Persistence | `expo-sqlite` | Durable outbox; more code than AsyncStorage |
| Secrets | `expo-secure-store` | Refresh tokens only |
| Realtime | `socket.io-client` | Matches API |
| HTML email | TBD Phase 6 (WebView locked down vs render-html) | Security vs fidelity |
| Tests | Jest + RNTL; Maestro optional | Focus on risk tests |

Exact versions pinned at `create-expo-app` / `expo install` time in Phase 1.

---

## 8. Highest-risk technical areas

| Risk | Why hard | Mitigation |
| --- | --- | --- |
| Refresh-token reuse | Concurrent 401s can revoke session | Single-flight + persist-before-publish + session generation |
| 5xx after successful PATCH | Blind retry / wrong UI | Idempotency keys + reconcile |
| Missed events on reconnect | Socket ≠ catch-up | Subscribe → buffer → sync → merge |
| Stale overwrites | Out-of-order events | Version + tombstones |
| Offline action loss | Process kill | SQLite outbox before UI promise |
| SSE on RN | Chunking / fetch streaming | Spike early in Phase 10; document fallback |
| Untrusted HTML | XSS / tracking | No JS execution; constrained renderer |
| Dual stores drift | Query vs SQLite vs memory | Clear ownership + reconciler as write gate |
| ~3k threads + burst | Jank / dupes | FlashList, stable keys, incremental updates |

---

## 9. Explicit non-goals

- Custom backend
- Compose/reply/search
- Pixel-perfect design system
- Perfect offline of entire 3k corpus on first launch (cache what we’ve fetched + details opened; document)

---

## 10. Interview defense summary

This architecture optimizes for **correctness under an imperfect API** (auth rotation, uncertain writes, realtime races) rather than feature breadth. The central idea is a **version-aware reconciler** sitting between transport (HTTP/socket) and UI, with a **durable outbox** for offline intent and a **single-flight session** for tokens.
