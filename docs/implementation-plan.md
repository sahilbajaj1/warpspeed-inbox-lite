# Implementation Plan — Inbox Lite

**Estimated total effort:** 8–12 hours focused (brief). Plan for ~10h with explicit cut lines.  
**Calendar window:** 5 days.  
**Rule:** Small, reviewable, independently testable increments. Commit after each verified slice. Do not continue past a broken foundation.

---

## Priority order (from master instructions)

| Priority | Scope |
| --- | --- |
| **P0** | Foundation, authentication, inbox, thread details, basic actions |
| **P1** | Token refresh correctness, optimistic updates, realtime sync, offline persistence |
| **P2** | AI streaming, credits, resilience, chaos/burst testing |
| **P3** | Accessibility, performance refinements, documentation |

PDF requirements remain the target; priority only orders work and guides cuts.

---

## Phase map vs effort

| Phase | Name | Priority | Est. | Exit criteria |
| --- | --- | --- | --- | --- |
| 0 | Spec audit (this) | — | 1.0h | Docs complete; API contracts extracted |
| 1 | Project foundation | P0 | 1.0h | Expo TS app boots; lint/test harness; env; providers |
| 2 | Design system (minimal) | P0 | 0.75h | Primitives needed for login/inbox only |
| 3 | API + contracts | P0 | 1.0h | Typed client, validation, errors, retry policy unit-tested |
| 4 | Authentication | P0→P1 | 1.25h | Login, restore, single-flight refresh, logout |
| 5 | Inbox + pagination | P0 | 1.25h | Infinite list, views, skeletons/empty/error |
| 6 | Thread details | P0 | 1.0h | Messages + HTML strategy + mark read |
| 7 | Optimistic actions | P1 | 1.0h | Star/unstar/archive/unread with idempotency |
| 8 | Offline persistence | P1 | 1.0h | SQLite cache + outbox survives restart |
| 9 | Realtime + sync | P1 | 1.25h | Socket + catch-up + version/tombstones |
| 10–11 | Summary + credits | P2 | 1.0h | SSE stream + shared balance |
| 12–14 | Resilience + chaos/burst | P2 | 0.75h | Observed notes; restore chaos to 0 |
| 15–16 | Perf/a11y/review/docs | P3 | 1.0h | README, `ai/`, acceptance gate |

Sum ≈ **12.25h** — intentional over-plan; cut from P3 then thin P2 polish if needed. Protect P0+P1 correctness.

---

## Slice plan (commit cadence)

### Slice 0 — Spec audit *(current)*
- **Goal:** Trace PDF → requirements, architecture, plan, assumptions, testing.
- **Files:** `docs/*`, `ai/phase-0-*`
- **Tests:** Doc review only
- **Next:** Foundation project

### Slice 1 — Expo foundation
- **Goal:** Runnable Expo Router TypeScript app with tooling.
- **PDF covered:** C-01, C-02, ENV-01 (config scaffold)
- **Create:** Expo app, `tsconfig` strict + paths, ESLint, Prettier, Jest/RNTL, `.env.example`, app bootstrap, error boundary, theme tokens stub, network/lifecycle stubs
- **Acceptance:** `npx tsc --noEmit`, lint, unit test smoke, app starts
- **Failure cases:** Wrong Node; template mismatch — pin SDK 57

### Slice 2 — Minimal UI primitives
- **Goal:** Enough components for login + list states
- **PDF covered:** C-04
- **Create:** AppText, AppButton, AppTextInput, AppScreen, Empty/Error/Loading, OfflineBanner stub
- **Acceptance:** Component tests for button/input disabled states

### Slice 3 — API layer
- **Goal:** Transport + validation without screens
- **PDF covered:** A-01…A-05, AUTH/THR contracts (types)
- **Create:** `client`, `errors`, `retry-policy`, `response-parser`, domain schemas
- **Acceptance:** Unit tests for envelope, Retry-After, error classes
- **Note:** No credentials in repo

### Slice 4a — Login + session restore
- **PDF:** P-01, AUTH-01, AUTH-03/04 (partial)
- **Acceptance:** Login success/fail; cold start restore with mocked storage

### Slice 4b — Refresh coordinator
- **PDF:** AUTH-02, AUTH-05, AUTH-06
- **Acceptance:** 10 concurrent → 1 refresh; reuse → login; logout cleanup

### Slice 5 — Inbox infinite query
- **PDF:** P-02, P-03, THR-01, ENV-03
- **Acceptance:** Cursor pagination; unread styling; starred/archived routes
- **Perf note:** Integrate FlashList; fallback documented if broken

### Slice 6 — Thread detail + mark read
- **PDF:** P-05, P-06, THR-04
- **Acceptance:** Messages render; open marks read optimistically; HTML choice documented

### Slice 7 — Optimistic star/archive/unread
- **PDF:** P-07, THR-05, THR-06, A-05
- **Acceptance:** Instant UI; stable idempotency key; pending indicator

### Slice 8 — SQLite + outbox
- **PDF:** P-10
- **Acceptance:** Offline action → kill app → relaunch → still pending → flushes online

### Slice 9 — Socket + sync
- **PDF:** P-04, SYN-*, RT-*
- **Acceptance:** Live upsert/delete; 410 recovery; reconnect race test (unit/integration)

### Slice 10 — Summary SSE + credits
- **PDF:** P-08, P-09, SUM-*, RT-04
- **Acceptance:** Stream renders; 402 handled; no auto-retry; balance updates

### Slice 11 — Chaos/burst + docs
- **PDF:** DEV-*, C-06…C-08
- **Acceptance:** Notes with observed results; README honest

---

## Working agreement per slice

Before coding:
1. State goal in plain English  
2. List PDF IDs covered  
3. List files to touch  
4. Note design trade-off  
5. Define acceptance + failure cases  

After coding:
1. Run relevant tests / lint / tsc  
2. Review races/leaks/complexity  
3. Commit with meaningful message  
4. Log AI decisions/corrections in `ai/`  
5. Report: done / files / tests / pass-fail / remaining / next  

---

## Cut lines if time runs short

| If behind after… | Keep | Defer |
| --- | --- | --- |
| 6h | Auth + inbox + detail + online actions | Offline durability polish, AI |
| 8h | Above + single-flight refresh + basic socket upsert | Full sync 410 path polish, chaos writeup depth |
| 10h | Above + outbox offline + summary MVP | Maestro, deep a11y, burst perf tuning |
| Always | Honest README incomplete list | Fake completeness |

**Never cut:** secret safety, refresh single-flight, idempotency for retries, version checks on merges (if realtime is claimed).

---

## Ambiguity handling during implementation

- Prefer conservative interpretation (see `assumptions.md`).
- Ask the candidate (user) only when decision **materially** affects correctness or scope.
- Document chosen interpretation next to the requirement ID.

---

## First implementation slice after Phase 0

**Slice 1 — Project foundation only.**  
Do not implement login or inbox until foundation typecheck/lint/test smoke passes.
