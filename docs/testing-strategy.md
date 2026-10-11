# Testing Strategy — Inbox Lite

**Principle:** Test the highest engineering risks, not implementation trivia.  
**Claim rule:** Never claim a behavior works without executing a relevant verification.

---

## 1. Test pyramid (proportionate)

| Layer | Tooling | Focus | Volume |
| --- | --- | --- | --- |
| Unit | Jest | Parsers, retry, refresh coordinator, reconcile, SSE, credits | High |
| Component | Jest + RNTL | Login form, list item, banners, star, summary UI | Medium |
| Integration | Jest (+ MSW or fake transport) | Auth flows, outbox replay, sync races | Medium |
| Manual / device | iOS Simulator and/or Android Emulator | Streaming, FlashList feel, chaos/burst | Critical paths |
| E2E | Maestro (optional, P3) | Smoke only | Low |

Prefer fake/clock-controlled unit tests for races. Use the real sandbox for chaos/burst and streaming proof when credentials exist.

---

## 2. Risk → test mapping

| Risk | Automated coverage | Manual / sandbox |
| --- | --- | --- |
| Refresh storms revoke session | Unit: 10 waiters → 1 refresh | Optional: throttle + multi-request |
| Refresh token reuse | Unit: reused token → session clear | — |
| 5xx after PATCH applied | Integration: uncertain outcome + same idempotency key | Chaos writes |
| Out-of-order / duplicate socket | Unit: reconciler | `/dev/burst` + observe |
| Stale upsert after delete | Unit: tombstone | — |
| Missed events on reconnect | Integration: buffer + sync ordering | Toggle network |
| Offline action lost on kill | Integration: outbox persist | Kill app mid-offline |
| Sync 410 | Unit/integration: baseline reload keeps outbox | Age token if possible |
| SSE partial chunks | Unit: parser fixtures | Live summary once |
| Double credit spend | Unit: no auto-retry; UI guard | Tap spam on summary |
| Invalid/malformed API | Unit: zod failures | — |
| 429 Retry-After | Unit: parser + waiter | Chaos |
| Large HTML / list | Component/perf notes | Open heavy thread; scroll 3k |

---

## 3. Unit tests (must-have)

From master instructions — each maps to a module:

| Area | Cases |
| --- | --- |
| API validation | Valid envelope; missing data; wrong types; error envelope |
| Retry-After | Integer seconds; HTTP-date if present; missing header fallback |
| Retry classification | GET 503 retryable; PATCH 500 → uncertain not blind success; 401 → refresh path; 402/404 no retry |
| Token refresh coordinator | Single-flight; success rotation; failure; reuse code; refresh request does not recurse |
| Thread ordering | Newest `lastMessageAt` first; stable tie-break by id |
| Deduplication | Same id across pages collapses |
| Version comparison | Older ignored; newer applied; equal upsert idempotent |
| Optimistic overlay | Pending star overlays confirmed false; confirmed catches up |
| Mutation coalescing | Rapid star/unstar keeps latest intent |
| Idempotency preservation | Retry retains key |
| Sync cursor | Don’t advance before apply; hasMore loop |
| SSE parser | Partial chunk; multi-event chunk; delta/done/error |
| Credit reconciliation | meta + header + socket; missing meta safe; zero credits |

---

## 4. Integration tests (must-have)

| Flow | Assert |
| --- | --- |
| Login → inbox | Session set; threads query runs |
| Expired token during multiple requests | One refresh; all succeed or coherent fail |
| Open thread → mark read | Overlay + PATCH; list reflects read |
| Star online | Immediate UI; confirmed reconcile |
| Archive offline | Durable outbox; UI pending; flush on online |
| Restart with pending action | Outbox reloads; no duplicate concurrent processors |
| Replay after reconnect | Pending sends; socket echo safe |
| PATCH 5xx after apply | No divergent final state after sync |
| Duplicate socket event | Single row |
| Out-of-order socket event | Final state = highest version |
| Delete then stale upsert | Stays deleted |
| Sync token expiration (410) | Baseline reload; pending kept |
| Foreground sync | Catch-up invoked |
| Summary streaming | Incremental text; done |
| Insufficient credits | 402 UI; no loop |
| Logout with pending work | User data cleared; no cross-account leak; sockets down |

---

## 5. Component tests

Behavior-based (roles, text, disabled state) — avoid internal spy-only tests:

- Login form (validation, submit loading, disable while pending)
- ThreadListItem (unread vs read, star affordance)
- ThreadList (empty / error / list rendering with fixtures)
- EmptyState / OfflineBanner
- StarButton / ThreadActionBar (pending/disabled)
- StreamingSummary (partial text, error, busy)
- CreditBalance (0 and N)

---

## 6. End-to-end (optional)

Maestro smoke **only if** unit/integration P0–P1 green:

1. Login  
2. Load inbox  
3. Open thread  
4. Star  
5. Archive  
6. Back to inbox  
7. AI summary  

Do not trade critical unit coverage for E2E tooling.

---

## 7. Chaos & burst (PDF tools)

**Preconditions:** Assigned test account only. Record **observed** results in `docs/chaos-observations.md` (create when executed).

### Reset
`POST /dev/reset` → known baseline before scenarios.

### Chaos
Example: `{ "failureRate": 0.3, "latencyMs": 3000 }` then restore `{ "failureRate": 0, "latencyMs": 0 }`.

Verify: loading feedback, retries, action persistence, idempotency, recovery, no duplicate actions.

### Burst
`POST /dev/burst` → 200 threads / 10s.

Verify: ordering, no duplicate rows, no full-screen refresh thrash, scroll responsiveness, pagination stability, version handling, no dropped changes after sync.

---

## 8. Verification commands (planned)

```bash
npm run typecheck
npm run lint
npm test
npx expo start   # manual device smoke
```

Exact script names set in Phase 1.

---

## 9. Definition of “tested enough” for submission

- All P0 flows verified automated and/or on simulator  
- Refresh single-flight automated  
- At least one offline→restart→replay path verified  
- At least one realtime reconcile path automated  
- Summary streaming verified on device **or** explicitly marked incomplete  
- Chaos/burst either observed with notes **or** explicitly incomplete  
- README test results section matches actual runs (no fabrication)

---

## 10. What we will not do

- Snapshot-test every styled view  
- Claim FPS numbers without measurement  
- Commit credentials to fixtures  
- Skip failing tests with `.skip` without documenting why in README
