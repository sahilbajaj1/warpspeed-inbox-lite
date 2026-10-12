# Final review notes

**Phase:** 16  
**Purpose:** Interview defense — known risks, intentional cuts, what still needs live proof.

---

## Correctness bets (would defend)

1. **Refresh single-flight** — concurrent 401s share one refresh; new refresh persisted before publishing session.  
2. **Uncertain writes** — PATCH 5xx / timeout / offline keep the same idempotency key queued; permanent client errors surface via failed-action UX.  
3. **Realtime reconnect** — subscribe → buffer → `/sync` catch-up → drain; version + tombstones block resurrection.  
4. **Credits** — never local −1 on summary tap; meta / `X-User-Balance` / `balance.updated` only.  
5. **Secrets** — refresh in SecureStore; no credentials in repo; sandbox script env separate from `EXPO_PUBLIC_*`.

---

## Residual risks

| Risk | Mitigation today | Residual |
| --- | --- | --- |
| Live SSE field names differ | **Confirmed** `delta` + `{"text"}` | None for naming |
| Burst blank cells / jank | FlashList drawDistance + getItemType | API: no id dupes in 50; UI feel still needs simulator |
| Multi-device same account | Single-device assumption in docs | Refresh reuse → forced login |
| Full 3k offline cache | Cache pages/details touched | First launch still needs network |
| Dynamic Type >1.4× | Cap for dense rows | Extreme a11y sizes may clip |

---

## Complexity / leak watchlist

- Socket + AppState foreground recovery: ensure disconnect on logout (session teardown path).  
- Outbox flush timers: delayed 429 retry — cleared on logout / unmount of providers.  
- Summary abort: stream cancel must not auto-restart (SUM-02).  
- `useSyncExternalStore` snapshots: failed-commands / pending maps must return stable empty refs (fixed Phase 12).

---

## Intentional cuts

- Maestro E2E  
- Compose / search  
- Full VoiceOver certification  
- Pixel design system  
- Fabricating chaos numbers or a recording without a working live run  

---

## Submission status

1. ~~Assigned sandbox credentials~~ — local `.env` (gitignored)  
2. ~~Fill `docs/chaos-observations.md`~~ — API live smoke recorded 2026-10-11  
3. ~~Declare platform~~ — iPhone 16 / iOS 18.5 / Expo Go 57 in README  
4. Screen recording / demo assets — **removed from repo** (not part of local submission materials)

Optional follow-ups (not blockers): device offline flush observation, Maestro.
