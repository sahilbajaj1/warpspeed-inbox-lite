# Requirements Traceability Matrix — Inbox Lite

**Source of truth:** `coding-test-brief.pdf` (warpSpeed take-home, 4 pages)  
**Audit date:** 2026-10-11  
**Status legend:** `not_started` | `in_progress` | `done` | `partial` | `deferred` | `blocked`

---

## A. Explicit PDF requirements

### Product capabilities (page 1)

| ID | Exact requirement | Source | User-visible behavior | Technical implications | Edge cases | Priority | Owner / module | Acceptance criteria | Test cases | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P-01 | Sign in with the test account | p1 §The product #1 | User enters email/password and reaches inbox on success | `POST /auth/login`; store tokens securely; route guard | Invalid credentials; network failure; slow login (≤10s) | P0 | `features/auth`, `core/auth` | Valid credentials → authenticated main app; invalid → clear error, stay on login | Successful login; invalid login | not_started |
| P-02 | See inbox: list of threads, newest first, keep loading on scroll | p1 §The product #2 | Infinite scroll inbox, newest `lastMessageAt` first | Cursor pagination via `meta.nextCursor`; virtualized list | Empty inbox; end of list (`nextCursor` null); ~3k threads; duplicate pages | P0 | `features/inbox` | Scroll loads more until null cursor; order newest-first; no duplicate rows by id | Pagination; ordering; dedupe; large dataset | not_started |
| P-03 | Unread threads visually distinct | p1 §The product #2 | Unread rows look different from read | Style from `isRead` | Optimistic mark-read; remote read update | P0 | `features/inbox` components | Unread vs read distinguishable without relying on color alone where practical | ThreadListItem unread styling | not_started |
| P-04 | Stay up to date without pull-to-refresh while app open | p1 §The product #3 | New mail and remote thread changes appear live | Socket.IO + sync catch-up; version-aware merge | Duplicate/out-of-order events; own echoes; reconnect gaps | P1 | `core/sync`, `features/inbox` | Changes appear without manual refresh while connected | Duplicate event; out-of-order; reconnect race | not_started |
| P-05 | Open a thread and read its messages | p1 §The product #4 | Thread detail shows full conversation | `GET /threads/:id`; ordered messages; HTML body handling | Missing thread (404); large `bodyHtml` (~200KB); malformed HTML | P0 | `features/threads` | All messages visible in correct order; long content scrollable | Fetch detail; large/malformed HTML | not_started |
| P-06 | Opening a thread marks it as read | p1 §The product #4 | Opened thread becomes read in detail and list | Optimistic `isRead: true` + `PATCH` with idempotency | Offline open; already read; 5xx after apply | P0 | `features/threads`, mutation outbox | Opening unread thread flips to read in UI immediately; syncs when possible | Mark read on open; offline read | not_started |
| P-07 | Archive, star, mark unread — feel instant | p1 §The product #5 | Actions update UI immediately | Optimistic overlay + durable outbox + PATCH | Rapid taps; 5xx-after-apply; offline; superseded intents | P0/P1 | `features/inbox` actions, `mutation-outbox` | UI updates before network completes; permanent failures surface; pending survives restart | Online star; offline archive; 5xx after apply | not_started |
| P-08 | Summarise a thread with AI; stream summary | p1 §The product #6 | Button streams summary text onto thread screen | `POST .../summary` as `text/event-stream`; SSE parser | Partial chunks; cancel; 402 credits; 5–30s duration | P2 | `features/summary` | Incremental text; done/error handled; no auto-retry that re-charges | Partial stream; fail/cancel; insufficient credits | not_started |
| P-09 | See remaining AI credits, kept current | p1 §The product #7 | Balance visible and updates | Single credit model from `meta.userBalance`, `X-User-Balance`, `balance.updated` | Missing meta; concurrent updates; zero credits | P2 | `features/credits` | One shared balance; updates from all three sources without double-decrement | Balance while streaming; socket update | not_started |
| P-10 | Keep using app on bad connection; offline actions apply when connection returns | p1 §The product #8 | App usable offline for cached data; queued actions flush later | SQLite cache + outbox + connectivity monitor | Restart mid-queue; persistence failure; account leak | P1 | `core/database`, `core/sync`, connectivity | Offline action durably queued then UI; survives restart; flushes on reconnect | Offline archive + restart; replay after reconnect | not_started |

### Platform / process constraints (pages 1, 4)

| ID | Exact requirement | Source | User-visible behavior | Technical implications | Edge cases | Priority | Owner | Acceptance criteria | Test cases | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Expo (current SDK) with TypeScript | p1 Constraints | N/A (engineering) | Expo SDK 57 + RN 0.86 + TS strict | Dependency drift | P0 | project root | App builds/runs on Expo SDK 57 TypeScript template | `tsc` / Expo start | not_started |
| C-02 | Expo Router is standard but not required | p1 Constraints | Navigation between login/inbox/detail | Prefer Expo Router unless blocked | Deep link restore | P0 | `app/` routes | Auth and main navigation work | Smoke navigation | not_started |
| C-03 | Must run on iOS or Android (sim/emulator OK); declare tested platform | p1 Constraints | App runs on declared platform | Document in README | Device vs simulator differences | P0 | README | README states tested OS/runtime | Manual smoke | not_started |
| C-04 | Visual design not assessed; must be usable | p1 Constraints | Usable UI | Restrained primitives; a11y basics | Dynamic type overflow | P3 | `shared/theme`, UI | Primary flows usable without design polish | Component a11y smoke | not_started |
| C-05 | 8–12h focused; 5 calendar days; report time honestly | p1 Time | N/A | Scope trade-offs; incomplete items explicit | Over-scoping | P3 | README / `ai/` | Honest time + incomplete list in README | N/A | not_started |
| C-06 | Submit code + full git history (no squash/rewrite) | p4 What to submit | N/A | Incremental commits | Accidental amend/rebase | P3 | git | History shows incremental slices | Review log | not_started |
| C-07 | `ai/` folder with uncurated AI working material | p4 What to submit | N/A | Preserve transcripts/plans/rules | Credential leakage in exports | P3 | `ai/` | `ai/` present; secrets redacted only | Manual review | in_progress |
| C-08 | README covering run, built/not built, decisions, AI, next week, time | p4 What to submit | N/A | Final docs phase | Incomplete claims | P3 | README | All README sections filled honestly | Manual review | not_started |
| C-09 | Screen recording ≤3 minutes of working features only | p4 What to submit | Demo of real features | Record after verification | Demo of unfinished features | P3 | submission | Recording ≤3m; only working flows | Manual | not_started |
| C-10 | Do not invent a custom backend; use supplied API | p1 The test API | App talks to sandbox | Base URL fixed; no local mock server as product | Dev fixtures for unit tests only | P0 | `core/api` | All runtime networking hits sandbox | Integration against API | not_started |

### API conventions (page 2)

| ID | Exact requirement | Source | User-visible behavior | Technical implications | Edge cases | Priority | Owner | Acceptance criteria | Test cases | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A-01 | Success envelope `{ data, meta }` | p2 Conventions | N/A | Typed parser; reject invalid shapes | Missing fields; wrong types | P0 | `response-parser` | Valid envelope parses; invalid → InvalidResponse error | Validation unit tests | not_started |
| A-02 | Error envelope `{ error: { code, message } }` | p2 Conventions | Human-readable errors; never raw stacks | Normalize by status + code | Malformed error body | P0 | `errors` | User sees safe message; code preserved for logic | Error normalization tests | not_started |
| A-03 | `meta.userBalance` on every authenticated response | p2 Conventions | Credits stay current after API calls | Extract meta → credit store | Missing meta; stale overwrite | P2 | credits + API client | Present balance updates store | Meta extraction tests | not_started |
| A-04 | Some 5xx, latency up to 10s, 429 + Retry-After | p2 Conventions | Loading/retry UX under chaos | Timeouts >10s; honor Retry-After; cautious write retries | 5xx after successful write | P1 | `retry-policy`, UI feedback | Reads can retry; writes not blindly replayed; 429 waits | Retry-After; chaos scenarios | not_started |
| A-05 | Write failing with 5xx may still have been applied | p2 Conventions | No false “failed” that double-applies | Idempotency-Key; reconcile via GET/sync/socket | Duplicate star toggles | P1 | mutation outbox | Same logical op keeps same key; UI reconciles truth | 5xx after PATCH applied | not_started |

### Authentication API (page 2)

| ID | Exact requirement | Source | User-visible behavior | Technical implications | Edge cases | Priority | Owner | Acceptance criteria | Test cases | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUTH-01 | `POST /auth/login` `{ email, password }` → `{ accessToken, refreshToken, expiresIn }` | p2 Auth | Sign-in | Persist refresh securely; keep access in memory (+ short cache if needed) | Wrong password; timeout | P0 | auth API | Tokens stored; session active | Successful / invalid login | not_started |
| AUTH-02 | `POST /auth/refresh` `{ refreshToken }` → new tokens | p2 Auth | Seamless session | Single-flight refresh; persist new refresh before publish | Concurrent 401s; process death mid-rotate | P1 | refresh-coordinator | N parallel 401s → 1 refresh | Ten concurrent → one refresh | not_started |
| AUTH-03 | `POST /auth/logout` `{ refreshToken }` → `{}` | p2 Auth | Signed out | Clear tokens, cache, sockets, queues scoped to user | Logout during in-flight request | P0 | session-manager | Post-logout no user data/network with old tokens | Logout during active request | not_started |
| AUTH-04 | Send `Authorization: Bearer <accessToken>` | p2 Auth | Authenticated API works | Client interceptor | Missing header → 401 | P0 | api client | Authed requests include bearer | Header injection unit | not_started |
| AUTH-05 | Access tokens expire after 5 minutes (`expiresIn` seconds) | p2 Auth | Session continues via refresh | Proactive/reactive refresh | Clock skew; request during refresh | P1 | session-manager | Expired access does not force re-login if refresh ok | Token expiration tests | not_started |
| AUTH-06 | Refresh tokens are single-use; reuse → 401 `refresh_token_reused`, session revoked | p2 Auth | Forced re-login if reuse | Never retry refresh with old token; fail to login | Multi-instance / race writing old token | P1 | token-storage, refresh | Reuse path clears session → login | Reused refresh token | not_started |

### Threads / sync / summary API (pages 2–3)

| ID | Exact requirement | Source | User-visible behavior | Technical implications | Edge cases | Priority | Owner | Acceptance criteria | Test cases | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| THR-01 | `GET /threads?view=&cursor=&limit=` newest by `lastMessageAt`; views inbox/starred/archived; limit default 25 max 50; `meta.nextCursor` opaque | p2–3 Threads | Inbox / starred / archived lists | Never invent cursors; stop at null; clamp limit ≤50 | Concurrent pagination + live upsert | P0 | inbox API | Correct views; cursor-only pagination | Cursor pagination tests | not_started |
| THR-02 | Thread shape includes id, subject, participants, snippet, lastMessageAt, messageCount, isRead, isStarred, isArchived, version | p2 sample | List/detail render these fields | Runtime validation (zod or equivalent) | Extra unknown fields; missing required | P0 | models | Invalid thread rejected/logged safely | Schema validation | not_started |
| THR-03 | `version` increases on every server change | p2 Threads | Correct merge of updates | Version compare; ignore older confirmed state | Out-of-order socket vs PATCH response | P1 | event-reconciler | Newer version wins; older dropped | Version comparison tests | not_started |
| THR-04 | `GET /threads/:id` includes `messages`; `bodyHtml` up to ~200KB | p2–3 | Read full email bodies | Memory-conscious rendering; untrusted HTML | Malformed HTML; XSS-ish content | P0 | threads + HTML renderer | Large bodies render without crash; scripts not executed | Large/malformed content | not_started |
| THR-05 | `PATCH /threads/:id` body any of `{ isRead, isStarred, isArchived }` returns updated thread | p3 | Star/archive/read/unread | Optional Idempotency-Key; 24h dedupe | Partial body; conflict with remote | P0 | threads API / outbox | PATCH updates confirmed state | Star online; mark unread | not_started |
| THR-06 | Idempotency-Key on PATCH: same key within 24h returns original result without re-applying | p3 | Safe retries | Persist key per logical action | New key on retry (bug) | P1 | mutation-outbox | Retries reuse key | Idempotency preservation | not_started |
| SYN-01 | Thread responses (`meta`) and socket events include `syncToken` | p3 Sync | Invisible catch-up | Persist checkpoint after apply | Advance before apply (bug) | P1 | sync-cursor-store | Checkpoint only after successful apply | Sync cursor tests | not_started |
| SYN-02 | `GET /sync?since=<syncToken>` returns changes (upsert/delete), new syncToken, hasMore | p3 Sync | Catch-up after disconnect | Paginate while hasMore | Empty changes; delete then stale upsert | P1 | sync-engine | Full catch-up until hasMore false | Paginated sync; delete+stale upsert | not_started |
| SYN-03 | Sync tokens older than 1 hour → 410 Gone; reload from start | p3 Sync | May briefly reload lists | Baseline reload; preserve pending local actions | Offline >1h | P1 | sync-engine | 410 → safe baseline; pending retained | Sync token expiration | not_started |
| SUM-01 | `POST /threads/:id/summary` → `text/event-stream` with delta/done/error | p3 AI summary | Streaming summary UI | Custom SSE reader; not JSON envelope | Chunk boundaries; multi-event chunks | P2 | summary service | Correct incremental parse | SSE parser unit + stream integration | not_started |
| SUM-02 | Summary 5–30s; costs 1 credit when stream starts | p3 AI summary | Credit decreases at start | Do not auto-retry; charge awareness | Cancel after charge; disconnect mid-stream | P2 | summary | Failed/cancelled does not auto re-request | Cancel/fail no auto-retry | not_started |
| SUM-03 | New balance via `X-User-Balance` header and `balance.updated` socket | p3 AI summary | Credits update during/after summary | Header parse + socket reconcile | Header missing | P2 | credits | Balance updates from header and socket | Streaming balance test | not_started |
| SUM-04 | No credits → 402 `insufficient_credits` | p3 AI summary | Clear insufficient-credits message | Map 402; disable or warn CTA | Race to zero | P2 | summary UI | User sees recoverable error; no crash | Insufficient credits | not_started |

### Real-time (page 3)

| ID | Exact requirement | Source | User-visible behavior | Technical implications | Edge cases | Priority | Owner | Acceptance criteria | Test cases | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RT-01 | Connect `io(host, { auth: { token: accessToken } })` path `/socket.io` | p3 | Live updates | Single socket instance; auth on connect | Connect with expired token | P1 | realtime-client | One authenticated socket while logged in | Connect / unauthorized connect | not_started |
| RT-02 | `thread.upserted` `{ thread, syncToken }` | p3 | List/detail update | Version merge; buffer during catch-up | Duplicate; older version | P1 | event-reconciler | Upsert applied if newer | Duplicate / out-of-order upsert | not_started |
| RT-03 | `thread.deleted` `{ id, version, syncToken }` | p3 | Thread disappears | Tombstones block stale upsert resurrection | Delayed upsert after delete | P1 | event-reconciler | Deleted stays deleted vs stale upsert | Delete then stale upsert | not_started |
| RT-04 | `balance.updated` `{ userBalance }` | p3 | Credits update | Shared credit store | Concurrent with HTTP meta | P2 | credits | Socket updates balance | Socket balance test | not_started |
| RT-05 | Own changes echoed; at-least-once; may be out of order | p3 | No flicker/wrong final state | Idempotent reconcile vs optimistic overlay | Echo confirms pending action | P1 | reconciler | Echoes don’t duplicate rows or undo newer intent incorrectly | Echo + pending overlay | not_started |
| RT-06 | Expired socket token → `unauthorized` `{ code: token_expired }` then disconnect; bad connect → `connect_error` message `unauthorized` | p3 | Brief reconnect after refresh | Reauth after refresh; no refresh recursion | Refresh fails → login | P1 | realtime-client + auth | Socket reauths after refresh; failure → login | Socket reauth after refresh | not_started |

### Dev testing tools (page 4)

| ID | Exact requirement | Source | User-visible behavior | Technical implications | Edge cases | Priority | Owner | Acceptance criteria | Test cases | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DEV-01 | `POST /dev/reset` restores inbox and credits | p4 Tools | Known baseline for tests | Dev-only usage; never rate-limited | Accidental prod use (N/A sandbox) | P2 | test helpers / scripts | Reset returns account to baseline | Manual / scripted reset | not_started |
| DEV-02 | `POST /dev/chaos` `{ failureRate, latencyMs }`; set both 0 to off | p4 Tools | App resilient under chaos | Document observed results | Leaving chaos on | P2 | chaos scripts + notes | Chaos exercised; restored to 0 | Chaos verification notes | not_started |
| DEV-03 | `POST /dev/burst` delivers 200 threads over 10s | p4 Tools | Inbox absorbs burst | Ordering, dedupe, scroll stability | Pagination during burst | P2 | performance notes | No dupes; order ok; no full-screen thrash | Burst observation record | not_started |

### Account / environment facts (page 2)

| ID | Exact requirement | Source | User-visible behavior | Technical implications | Edge cases | Priority | Owner | Acceptance criteria | Test cases | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ENV-01 | Base URL `https://sandbox3.staging.iamwarpspeed.com/v1` | p2 | API works | Typed config from env; no hardcoded secrets | Trailing slash mistakes | P0 | `core/config` | Requests hit correct host | Config unit | not_started |
| ENV-02 | Real-time Socket.IO same host, path `/socket.io` | p2 | Live updates | Socket URL without `/v1` | Wrong path | P1 | realtime-client | Connects to host `/socket.io` | Connect smoke | not_started |
| ENV-03 | ~3,000 threads in test account; background simulator delivers mail/changes | p2 | Busy inbox | Virtualization + sync required | Memory pressure | P0/P1 | inbox + sync | Usable with full account | Large list scroll | not_started |
| ENV-04 | Login details emailed separately | p2 | Candidate can sign in | Credentials only in local `.env` (gitignored) | Accidental commit | P0 | `.env.example` | No credentials in repo | Secret scan / review | not_started |

---

## B. Engineering recommendations (not explicit PDF product features)

These improve reliability/maintainability within the brief’s judgement focus. They are **not** PDF product requirements.

| ID | Recommendation | Rationale | Priority | Status |
| --- | --- | --- | --- | --- |
| ER-01 | Feature-oriented folders; thin Expo Router screens | Interviewability; SoC | P0 | planned |
| ER-02 | Strict TS + zod (or similar) at API boundary | Untrusted external data | P0 | planned |
| ER-03 | TanStack Query for server-cache reads + infinite queries | Pagination, cancellation, focus refetch | P0 | planned |
| ER-04 | Single-flight refresh + session generation id | Prevent refresh-token reuse / late session writes | P1 | planned |
| ER-05 | Durable mutation outbox in Expo SQLite | Offline + restart survival | P1 | planned |
| ER-06 | Version-aware reconciler + deletion tombstones | At-least-once / out-of-order sockets | P1 | planned |
| ER-07 | Subscribe-then-catch-up reconnect sequence | Avoid missed events between live and sync | P1 | planned |
| ER-08 | FlashList if Expo-compatible (SDK 57 supports) | ~3k threads | P0 | planned (verify at integrate) |
| ER-09 | SecureStore for refresh token only | Secrets ≠ SQLite | P0 | planned |
| ER-10 | Central error taxonomy + feature recovery | Chaos/5xx/429 UX | P1 | planned |
| ER-11 | Root error boundary + network/lifecycle monitors | Production hygiene | P0 | planned |
| ER-12 | Jest + RNTL unit/component; Maestro optional | Risk-based testing | P0/P3 | planned |
| ER-13 | Prefer isolated WebView or sanitizing HTML renderer for `bodyHtml` | Untrusted HTML | P0 | planned (choice in Phase 6) |

---

## C. Optional enhancements

| ID | Enhancement | Why optional | Priority | Status |
| --- | --- | --- | --- | --- |
| OE-01 | Pull-to-refresh | PDF emphasizes live updates without PTR; still useful as recovery | P3 | deferred unless needed |
| OE-02 | Search / filters beyond view tabs | Not in brief | — | out of scope |
| OE-03 | Compose / reply | Not in brief | — | out of scope |
| OE-04 | Dark mode polish | “Where practical” only | P3 | nice-to-have |
| OE-05 | Maestro E2E suite | Time permitting; unit/integration first | P3 | optional |
| OE-06 | Fancy animations | Design not assessed | — | avoid |
| OE-07 | Custom component library beyond needed primitives | Avoid framework-building | — | avoid |

---

## D. Unknowns requiring validation

| ID | Unknown | Impact | Proposed validation | Decision if blocked |
| --- | --- | --- | --- | --- |
| U-01 | Exact login credentials (emailed separately) | Cannot hit real API | Await credentials in local `.env` | Use fixtures for unit tests; block integration |
| U-02 | Exact SSE wire format (event names, `data:` framing, id fields) | Summary parser | Capture raw stream from sandbox once credentials available | Conservative standard SSE: `event:` + `data:` JSON |
| U-03 | Whether `X-User-Balance` is always present on summary responses | Credits accuracy | Observe headers during first stream | Fall back to socket / next meta |
| U-04 | Whether balance has a monotonic version | Stale overwrite risk | Inspect payloads | Last-writer with session/request sequencing heuristic (document) |
| U-05 | Whether list `GET /threads` includes messages or only metadata | Inbox perf | Inspect response | Never render bodies in list regardless |
| U-06 | Sync change `type` exact strings (`thread.upsert` vs `thread.upserted`) | Parser bugs | Capture `/sync` sample | Support documented sync types from PDF: `thread.upsert`, `thread.delete` |
| U-07 | RN/Expo streaming reliability for `fetch` + ReadableStream | Summary feature | Emulator verification | Document alternative transport if needed |
| U-08 | HTML renderer choice vs CSP/JS execution on RN WebView | Security | Spike in Phase 6 | Prefer no JS; block navigations |
| U-09 | FlashList v2 vs Expo “expected version” pin | Install friction | `expo install` then verify; exclude pin if needed | FlatList fallback |
| U-10 | Whether starred/archived threads still appear in inbox view | Mailbox correctness | Reset + API probe | Follow server `view` semantics literally |
| U-11 | Logout behavior if refresh already revoked | Cleanup completeness | Force reuse then logout | Always clear local session even if logout API fails |
| U-12 | Rate-limit scope (per endpoint vs global) | Retry UX | Chaos/429 observation | Honor Retry-After always |

---

## API contract checklist (verified against PDF)

### Authentication
- [x] `POST /auth/login` — body `{ email, password }` — returns `{ accessToken, refreshToken, expiresIn }`
- [x] `POST /auth/refresh` — body `{ refreshToken }` — returns rotated tokens
- [x] `POST /auth/logout` — body `{ refreshToken }` — returns `{}`

### Threads
- [x] `GET /threads` — query `view`, `cursor`, `limit` — `meta.nextCursor`
- [x] `GET /threads/:id` — thread + messages
- [x] `PATCH /threads/:id` — `{ isRead?, isStarred?, isArchived? }` + optional `Idempotency-Key`
- [x] `GET /sync?since=<syncToken>` — changes + syncToken + hasMore; 410 if expired
- [x] `POST /threads/:id/summary` — SSE, not envelope

### Socket events
- [x] `thread.upserted` — `{ thread, syncToken }`
- [x] `thread.deleted` — `{ id, version, syncToken }`
- [x] `balance.updated` — `{ userBalance }`
- [x] Unauthorized: `unauthorized` / `connect_error` message `unauthorized`

### Testing utilities
- [x] `POST /dev/reset`
- [x] `POST /dev/chaos`
- [x] `POST /dev/burst`

### Critical behavioral constraints (cross-cutting)
- Access TTL: 5 minutes  
- Refresh: single-use; reuse revokes session  
- Thread `version` monotonic per thread on server  
- Sync token TTL: 1 hour → 410  
- Mutations: 5xx may mean applied  
- Latency: up to 10s  
- 429: Retry-After  
- Sockets: duplicates + reordering  
- Summary: incremental, 1 credit at start  
- Credits: meta + header + socket  
- Scale: ~3,000 threads  

---

## Coverage note

Every user-facing bullet on PDF page 1 (P-01…P-10) and every documented endpoint/event is listed above. Engineering recommendations (B) and optional work (C) are explicitly separated from PDF obligations (A).
