# Acceptance checklist — Inbox Lite

**Phase:** 14 (acceptance gate / matrix sync)  
**Rule:** Mark only what is true. Live sandbox API rows are filled from observed runs only.

Legend: ✅ met in code/tests · ⚠️ partial / needs live · ❌ not met · ⬚ blocked (credentials)

---

## P0 product

| ID | Criteria | Status | Evidence |
| --- | --- | --- | --- |
| P-01 | Sign in → inbox; invalid stays on login | ✅ | `LoginForm`, session manager, auth tests |
| P-02 | Infinite inbox, newest first, no id dupes | ✅ | infinite query + FlashList + thread-list tests |
| P-03 | Unread distinct (not color-only) | ✅ | bar + bold + “Unread”; `docs/a11y-perf.md` |
| P-05 | Open thread, read messages | ✅ | Thread detail + HTML WebView docs |
| P-06 | Open marks read | ✅ | `useMarkThreadRead` + outbox |
| P-07 | Star / archive / unread feel instant | ✅ | optimistic queue + coalescing tests |
| C-01 | Expo SDK 57 + TS strict | ✅ | `package.json`, `tsc` |
| C-02 | Expo Router navigation | ✅ | `src/app/` |
| C-03 | Declare tested platform | ✅ | README: iPhone 16 / iOS 18.5 / Expo Go 57 |
| C-10 | No custom backend | ✅ | sandbox base URL only |
| A-01 / A-02 | Envelopes parsed safely | ✅ | response-parser / errors tests |
| AUTH-01…06 | Login, refresh single-flight, logout, bearer, reuse fail | ✅ | session/refresh tests |
| THR-01…06 | List/detail/PATCH/idempotency | ✅ | threads API + outbox tests |
| ENV-01 | Correct base URL | ✅ | config + `.env.example` |
| ENV-04 | No credentials in repo | ✅ | `.env` gitignored; example only |

## P1 realtime / offline

| ID | Criteria | Status | Evidence |
| --- | --- | --- | --- |
| P-04 | Live updates without PTR | ✅ | socket + sync (PTR also present as recovery) |
| P-10 | Offline queue + flush | ✅ | SQLite outbox + cache |
| SYN-01…03 | syncToken, catch-up, 410 | ✅ | sync-engine tests |
| RT-01…06 | Socket auth, upsert/delete, reauth | ✅ | realtime-client / reconciler tests |
| A-04 / A-05 | 429 / uncertain 5xx | ✅ | retry-policy + resilience docs |
| ENV-02 | Socket host `/socket.io` | ✅ | realtime client config |
| ENV-03 | Usable with ~3k | ⚠️ | FlashList tuned; live scroll pending |

## P2 AI / chaos

| ID | Criteria | Status | Evidence |
| --- | --- | --- | --- |
| P-08 / SUM-* | SSE summary, no auto-retry, 402 | ✅ | summary tests + panel |
| P-09 / credits | meta + header + socket | ✅ | credits-store tests |
| DEV-01 | Reset helper | ✅ | scripts + unit |
| DEV-02 / DEV-03 | Chaos / burst observed | ⚠️ | API smoke recorded; UI scroll feel pending |

## P3 polish / submit

| ID | Criteria | Status | Evidence |
| --- | --- | --- | --- |
| C-04 | Usable + a11y basics | ⚠️ | Phase 13; no full device VO audit |
| C-05 | Honest time | ⚠️ | finalize at submission |
| C-06 | Incremental git history | ✅ | phase commits on `master` |
| C-07 | `ai/` present | ✅ | phase-0…14 notes |
| C-08 | README sections | ⚠️ | filled; time TBD |
| C-09 | ≤3m recording | ⬚ | deferred — demo/recording artifacts removed |

---

## Automated gate (must stay green)

```bash
npm run typecheck
npm run lint
npm test
```

## Live gate

| Step | Status |
| --- | --- |
| Login with assigned account | ✅ API |
| List/paginate inbox | ✅ API |
| Open thread + PATCH star / idempotency | ✅ API |
| Summarise with credits visible | ✅ API (`delta` SSE; balance drops) |
| `sandbox:reset` / chaos / restore-to-0 / burst | ✅ API — `docs/chaos-observations.md` |
| Scroll inbox UI + Starred/Archived tabs | ✅ simulator smoke |
| Open thread detail + actions UI | ✅ simulator (fixed update-loop bug) |
| Airplane mode → action → reconnect flush | ⬚ not observed on device |

---

## Cut / incomplete (honest)

- Device offline flush observation  
- Maestro E2E  
- Full Dynamic Type / VoiceOver device audit  
- Caching the entire ~3k corpus offline on first launch  
