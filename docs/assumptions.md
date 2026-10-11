# Assumptions & Ambiguities — Inbox Lite

Conservative interpretations used when the PDF is silent or underspecified.  
Update this file when an assumption is confirmed or overturned by live API behavior.

---

## A. Confirmed from PDF (not assumptions)

- Base URL: `https://sandbox3.staging.iamwarpspeed.com/v1`
- Socket host: `https://sandbox3.staging.iamwarpspeed.com`, path `/socket.io`
- Access TTL: 5 minutes; refresh single-use; reuse revokes session
- Envelope success/error shapes; `meta.userBalance` on authenticated responses
- Thread `version`; sync token 1h → 410; PATCH idempotency 24h
- SSE summary not envelope-wrapped; credit charged when stream starts
- Events at-least-once and possibly out of order; own echoes included
- Latency up to 10s; 429 with Retry-After; 5xx may follow successful write
- ~3,000 threads; background simulator mutates inbox

---

## B. Conservative assumptions (implementation defaults)

| ID | Topic | Assumption | Why | Risk if wrong |
| --- | --- | --- | --- | --- |
| AS-01 | Socket URL | Connect to origin **without** `/v1` | PDF shows `io("https://sandbox3.staging.iamwarpspeed.com", …)` | Connect failures — easy fix |
| AS-02 | List payload | Inbox list threads do **not** require embedding full `messages` | Sample thread has no messages; detail endpoint does | Extra bandwidth only |
| AS-03 | Message order | Display messages in API array order; if timestamps exist, stable sort by sent time then id | PDF says “read its messages” without sort rule | Wrong conversation order — validate on first fetch |
| AS-04 | Mark read | Opening thread always attempts mark-read if currently unread; no-op if already read | Matches product bullet | Extra PATCH if race |
| AS-05 | Mailbox views | `view=inbox\|starred\|archived` are mutually exclusive server filters; we do not locally fake filters | PDF query param | Wrong membership if we filter client-side |
| AS-06 | Archive effect | Archiving removes from inbox view once confirmed/optimistic; appears under archived | Standard mail UX + view param | If server keeps in inbox, UI mismatch — probe |
| AS-07 | Starred + archived | A thread can theoretically be both; UI follows server booleans | Fields are independent in schema | Odd edge in switcher |
| AS-08 | Cursor | `nextCursor` is opaque; never decode or synthesize | Explicit PDF | Broken pagination |
| AS-09 | Limit | Use 25 default; never exceed 50 | PDF max | 400s from server |
| AS-10 | Idempotency key | One UUID per logical user intent; retries reuse; new user gesture may create new key unless coalesced | PDF 24h semantics | Double apply if new key on retry |
| AS-11 | Coalescing | Rapid toggles on same field: keep latest intent; supersede earlier pending before send when possible | Prevents flip-flop storms | If supersede too early, lost intent — serialize per thread field |
| AS-12 | 5xx on PATCH | Treat as **unknown outcome**, not definite failure | PDF warning | User confusion if we show hard failure |
| AS-13 | Refresh persistence | Persist new refresh token before publishing new access token to waiters | Reuse hazard | Session revoke |
| AS-14 | Process death mid-rotate | If only old or only new token recoverable inconsistently, **fail to login** rather than risk reuse | Safety | Extra login prompts |
| AS-15 | Sync types | `/sync` uses `thread.upsert` / `thread.delete` (PDF); sockets use `thread.upserted` / `thread.deleted` | Literal PDF naming difference | Parser miss — handle both families |
| AS-16 | Checkpoint advance | Persist `syncToken` only after changes applied successfully | Prevent gaps/skips | Re-apply dupes (safer than skip) |
| AS-17 | Reconnect | Authenticated socket first, buffer events, then sync catch-up | Missed-event risk | Slightly more complex |
| AS-18 | Credits | Do not locally decrement on summary tap; wait for header/socket/meta | Avoid double-decrement | Brief stale high balance |
| AS-19 | Summary retry | Never auto-retry after start/charge; user must explicitly tap again | Credit cost | User must re-tap after failure |
| AS-20 | HTML | Treat `bodyHtml` as untrusted; block JS; careful external nav | Security baseline | Reduced HTML fidelity |
| AS-21 | Offline cache scope | Persist fetched pages + opened thread details, not necessarily entire 3k corpus upfront | 8–12h scope | Offline only for seen data |
| AS-22 | Credentials | Live credentials only in gitignored `.env`; never log tokens | Submission safety | — |
| AS-23 | Expo Router | Use Expo Router unless install/runtime blocker appears | Employer standard | Switch only if blocked |
| AS-24 | Dev endpoints | Use `/dev/*` only against assigned test account; restore chaos to 0 after tests | PDF | Polluted local testing |
| AS-25 | Pull-to-refresh | Not required for P0; may add later as recovery affordance | PDF stresses live updates | Users without socket may need manual recovery — sync on foreground covers much |

---

## C. Ambiguities (ask only if material)

| ID | Ambiguity | Material? | Interim choice |
| --- | --- | --- | --- |
| AMB-01 | Exact SSE event names and JSON shapes beyond `{ text }` deltas | Yes for Phase 10 | Implement flexible parser; adjust after first live capture |
| AMB-02 | Whether balance is monotonically versioned | Medium | Document receive-order policy |
| AMB-03 | Whether mark-read should happen if opening while offline forever | Low | Queue outbox |
| AMB-04 | Participant display when `name` missing | Low | Fall back to email |
| AMB-05 | Timezone / relative timestamp formatting | Low | Locales relative + absolute a11y |
| AMB-06 | Multi-device simultaneous refresh of same account | Medium | Fail safe to login on reuse |
| AMB-07 | Does `expiresIn` clock start at issue time from server or client receive? | Low | Refresh on 401 primary; optional proactive refresh at 80% TTL |
| AMB-08 | Starred view: archived starred threads included? | Low | Trust server view |
| AMB-09 | FlashList version vs Expo expected pin | Low | Prefer working FlashList; exclude from expo fix if needed |
| AMB-10 | Test credentials not in PDF | **Blocking for live API** | User must supply via `.env` — **ask when starting Slice 4** |

---

## D. Questions for warpSpeed / user (only when blocking)

1. **Test account email/password** (required for Phase 4+ live verification).  
2. Optional: sample SSE transcript if sandbox unreachable.  
3. Optional: preferred HTML rendering constraint beyond “usable”.

Do **not** email warpSpeed for speculative design preferences covered by judgement.

---

## E. Assumption change log

| Date | Change | Trigger |
| --- | --- | --- |
| 2026-10-11 | Initial assumptions from PDF audit | Phase 0 |
