# FINAL ENGINEERING AUDIT — Inbox Lite

**Auditor role:** Principal / Staff mobile + integration review (independent of implementer claims)  
**Date:** 2026-10-11  
**Baseline commit (pre-audit fixes):** `5d22f1a`  
**Post-audit commit:** see git log after this file lands  
**Authoritative product/API source:** `coding-test-brief.pdf` (not present in workspace at audit time; requirements reconstructed from Phase-0 matrix + prior PDF extraction in `docs/requirements-matrix.md` / `docs/assumptions.md`)

**Status legend used below**

| Status | Meaning |
| --- | --- |
| VERIFIED | Observed via executed test and/or live/simulator run |
| IMPLEMENTED BUT UNVERIFIED | Present in code; not re-proven in this audit pass |
| PARTIALLY IMPLEMENTED | Material gaps remain |
| MISSING | Not found |
| FAILED | Broken / incorrect |
| NOT APPLICABLE | Outside PDF scope |

---

## A. Executive summary

Inbox Lite is a **feature-complete Expo SDK 57 TypeScript client** for the warpSpeed sandbox inbox API: auth with single-flight refresh, cursor mailboxes, optimistic durable mutations, SQLite outbox/cache, Socket.IO + `/sync` catch-up, SSE summaries/credits, and documented chaos/burst API observations plus a ≤3m simulator recording.

**Verdict direction:** **READY WITH DOCUMENTED LIMITATIONS** after audit fixes (see §H). No open P0. Remaining gaps are verification depth (device offline film, list profiling under live burst UI) and honesty about wall-clock vs focused hours — not missing core PDF product surfaces.

Automated gate executed this audit: `typecheck` pass, `lint` pass, `npm test` **122** pass.

---

## B. Requirements compliance (condensed)

| ID | PDF requirement | Implementation | Test evidence | Status | Severity if gap |
| --- | --- | --- | --- | --- | --- |
| P-01 | Sign in | `LoginForm` + `session-manager` | LoginForm + session tests; live login VERIFIED | VERIFIED | — |
| P-02 | Inbox newest-first + scroll load | Infinite query + FlashList | Unit + live pagination VERIFIED | VERIFIED | — |
| P-03 | Unread distinct | Bold + bar + “Unread” label | Component tests + screenshots | VERIFIED | — |
| P-04 | Live updates w/o PTR | Socket + sync | Unit reconciler/sync; live sync after burst VERIFIED (API) | IMPLEMENTED BUT UNVERIFIED (UI live mail while open) | P2 |
| P-05 | Open thread / messages | Thread detail + WebView | Simulator screenshot VERIFIED; update-loop fixed earlier | VERIFIED | — |
| P-06 | Open marks read | `useMarkThreadRead` + outbox | Unit + code path | IMPLEMENTED BUT UNVERIFIED (device) | P2 |
| P-07 | Instant archive/star/unread | Optimistic queue | Queue/coalesce tests | VERIFIED (unit) | — |
| P-08 | AI stream summary | SSE `expo/fetch` | Parser/unit + live SSE VERIFIED | VERIFIED | — |
| P-09 | Credits current | meta/header/socket store | Unit + live balance drop VERIFIED | VERIFIED | — |
| P-10 | Offline usable + queue | SQLite outbox/cache | Unit hydrate/replay; **device airplane film missing** | PARTIALLY IMPLEMENTED (code yes / device film no) | P1→doc |
| C-01 | Expo + TS | SDK 57 | typecheck VERIFIED | VERIFIED | — |
| C-02 | Expo Router | `src/app` | Smoke | VERIFIED | — |
| C-03 | Declare platform | README iPhone 16 / iOS 18.5 | Recording VERIFIED | VERIFIED | — |
| C-04 | Usable / a11y basics | Phase 13 | Component a11y tests | PARTIALLY (no full VO audit) | P2 |
| C-05 | Honest time | README | Stated; no invented hour count | PARTIALLY | P3 |
| C-06 | Full git history | Incremental commits | `git log` VERIFIED | VERIFIED | — |
| C-07 | `ai/` materials | phase-0…18 | Present VERIFIED | VERIFIED | — |
| C-08 | README sections | README | Present VERIFIED | VERIFIED | — |
| C-09 | ≤3m recording | `docs/demo-assets/inbox-lite-demo.mp4` ~17s | Duration parse VERIFIED | VERIFIED | — |
| C-10 | No custom backend | Sandbox URL only | Code inspection + live API | VERIFIED | — |
| AUTH-01…06 | Login/refresh/logout/bearer/reuse | `session-manager` + SecureStore | Concurrent refresh + reuse tests VERIFIED; **transient refresh keep-token fixed this audit** | VERIFIED | — |
| THR-01…06 | Threads/PATCH/idempotency | threads API + outbox | Unit + live PATCH idempotency | VERIFIED | — |
| SYN-01…03 | Sync token / catch-up / 410 | sync-engine | Unit + live sync | VERIFIED | — |
| RT-01…06 | Socket auth/events/reauth | realtime-client | Unit; live socket connect logged on sim | IMPLEMENTED BUT UNVERIFIED (full RT matrix on device) | P2 |
| SUM-01…04 | SSE / credits / 402 | summary + credits | Unit + live stream | VERIFIED | — |
| DEV-01…03 | reset/chaos/burst | scripts + notes | Live API observations VERIFIED; UI burst feel unverified | PARTIALLY | P2 |
| ENV-01…04 | Base URL / socket / 3k / secrets | config + `.env` gitignored | Live + gitignore VERIFIED | VERIFIED | — |

Full ID inventory remains in `docs/requirements-matrix.md` (synced Phase 14; not every row re-executed this audit).

---

## C. Architecture assessment

**Strengths**

- Feature-oriented modules (`features/*`) with thin Expo Router screens.
- Clear ownership: SessionManager (auth), TanStack Query + reconciler (confirmed threads), outbox (pending mutations), credits store (balance), sync cursor/tombstones (realtime durability).
- Networking centralized in `createApiClient` (envelope, timeout, 401 single-flight refresh, retries).
- Persist-before-optimistic for outbox enqueue (critical invariant).

**Weaknesses / intentional simplicity**

- Process singletons (`auth-runtime`, `action-queue-runtime`, `database-runtime`) — appropriate for RN app process, tested via reset helpers.
- Providers previously lived under `src/app/providers` (Expo Router warned); **moved to `src/providers/` this audit**.
- No Clean Architecture ceremony — correct for this scope.

**Trade-off accepted:** SQLite caches touched mailboxes/details only — not a full offline replica of ~3k threads.

---

## D. Security findings

| Finding | Sev | Status |
| --- | --- | --- |
| Refresh token in SecureStore; access in memory | — | OK |
| API logs path/method only (no tokens) | — | OK |
| Logout clears Query + SQLite + queue + credits + stops sync | — | OK |
| HTML WebView: JS off, nav blocked, sanitizer | — | OK; tightened `originWhitelist` this audit |
| Metro `/__dev/sandbox-creds` exposed creds whenever `.env` set | P1 | **Fixed** — requires `EXPO_PUBLIC_DEMO_AUTO_LOGIN=1` |
| Transient refresh failures previously wiped refresh token | P1 | **Fixed** — only auth failures clear session |
| PDF absent from repo (process) | P3 | Documented; matrix used as stand-in |

No credentials committed (`.env` gitignored; verified).

---

## E. Reliability findings

| Area | Assessment |
| --- | --- |
| Outbox | Durable before UI; same idempotency key on uncertain 5xx/429/offline |
| Sync checkpoint | Advanced only after apply; 410 → baseline reload preserving outbox |
| Realtime | Buffer during catch-up; version + tombstones |
| Credits | Remote-only (no local −1) |
| Foreground recovery | Outbox flush + sync catch-up |

**Residual:** Device airplane-mode → kill → reopen → reconnect not filmed this engagement (code paths unit-covered).

---

## F. Performance findings

| Observation | Evidence |
| --- | --- |
| FlashList 2 + drawDistance + getItemType + memo rows | Code + `docs/a11y-perf.md` |
| Live burst API: 0 dupes in first 50 after 12s | `docs/chaos-observations.md` |
| UI scroll jank under burst | **NOT MEASURED** (no Instruments/FPS capture) |
| Startup / TTI | **NOT MEASURED** |

Do not claim FlashList superiority beyond “compatible virtualization is in use.”

---

## G. Test results

### Commands (this audit)

```text
npm run typecheck  → pass
npm run lint       → pass
npm test           → pass (122 tests, 36 suites)
```

### Environments

| Env | Used |
| --- | --- |
| Node 22.16.0 / Jest | Yes |
| Live sandbox API | Yes (Phase 17 notes; chaos-off rechecked) |
| iPhone 16 Simulator / Expo Go 57 | Yes (Phase 18 recording) |
| Android | Not exercised |

### Limitations

- Jest does not prove Socket.IO mid-flight races on device.
- `coding-test-brief.pdf` missing from disk during audit — compliance cross-checked against Phase-0 extraction artifacts.
- Worker force-exit warning on Jest teardown (timers) — noisy, not a product failure.

---

## H. Defect register

| ID | Sev | Defect | Root cause | Fix | Regression |
| --- | --- | --- | --- | --- | --- |
| AUD-01 | P1 | Transient refresh failure cleared SecureStore refresh token | `clearSession` on all refresh errors | Keep token unless unauthorized/reuse | `session-manager.test.ts` updated (+1) |
| AUD-02 | P1 | Metro always served sandbox password if env present | Ungated middleware | Gate on `EXPO_PUBLIC_DEMO_AUTO_LOGIN=1` | Manual: endpoint 404 when flag 0 |
| AUD-03 | P1 | Thread detail max update depth (pre-existing, Phase 18) | `useSyncExternalStore` new `{}`/`[]` | Stable empties + callbacks | Already shipped `5d22f1a`; still green |
| AUD-04 | P2 | Providers under `src/app` → Router warnings | Misplaced modules | Moved to `src/providers/` | typecheck/tests |
| AUD-05 | P2 | WebView `originWhitelist=['*']` overly broad | Convenience default | Restrict to about:blank/srcdoc | Inspection |
| AUD-06 | P2 | Offline device film missing | Time/automation limits | Documented limitation | N/A |
| AUD-07 | P3 | README index said chaos notes pending | Doc drift | Fixed index | N/A |

**Open P0:** none  
**Open P1 product defects:** none (offline device film is verification gap, not a known code defect)

---

## I. Remaining risks

1. Refresh **5xx after server rotation** while client keeps old refresh — inherent uncertain-refresh problem; user may need one re-login (documented fail-soft vs fail-closed trade-off flipped toward keep-token).
2. Credits last-writer-wins without server version — disclosed in assumptions.
3. Live mailbox “new mail appears without interaction” not stopwatch-verified in this audit.
4. Android never run.
5. Expo Go first-run sheet may appear in demo video — product still visible.

---

## J. Submission checklist

| Deliverable | Status |
| --- | --- |
| Working Expo TS app | ✅ |
| Runs on iOS Simulator (declared) | ✅ |
| Git history incremental | ✅ |
| `ai/` working materials | ✅ |
| README honest | ✅ |
| Recording ≤3m | ✅ ~17s |
| No secrets in git | ✅ |
| PDF in repo | ❌ missing file (not required for run; helpful for reviewers) |

---

## K. Interview defense notes (selected)

1. **Single-flight refresh** — Prevents refresh-token reuse under concurrent 401s; persist rotated refresh before publishing.
2. **Uncertain PATCH 5xx** — Keep same idempotency key; never invent success/failure.
3. **Persist-before-optimistic** — Offline invariant: UI only after SQLite upsert.
4. **Subscribe → buffer → sync → drain** — Closes reconnect race between live and catch-up.
5. **Credits remote-only** — Avoids double-decrement vs header/socket.
6. **WebView locked down** — Untrusted HTML; JS off; block navigations.
7. **FlashList without estimatedItemSize** — FlashList 2 auto layout; tuned drawDistance.
8. **Transient refresh keep-token** — Distinguishes AUTH revoke from network blips.
9. **Dev creds endpoint gated** — Demo convenience without always-on secret HTTP.
10. **Cut line** — Full 3k offline corpus and Maestro deferred; correctness of P0/P1 paths protected.

---

## Release readiness gates

| Gate | Result |
| --- | --- |
| A Specification | PASS (with PDF-file absence noted) |
| B Correctness | PASS (critical unit + live API + sim smoke) |
| C Security | PASS (after AUD-01/02/05) |
| D Reliability | PASS with limitations (device offline film) |
| E Performance | NOT VERIFIED (no FPS/Instruments) — no known severe defect |
| F Maintainability | PASS |
| G Testing | PASS (122 automated) |
| H Submission | PASS |

**Final recommendation:** **READY WITH DOCUMENTED LIMITATIONS**
