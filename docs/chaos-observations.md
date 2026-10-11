# Chaos & burst observations

**Status:** incomplete — blocked on live sandbox credentials (ENV-04 / AMB-10)  
**Rule:** Record only what was actually observed. Do not fabricate results.

Tooling ready: `docs/dev-tools.md`, `npm run sandbox:*`, `src/core/dev/dev-api.ts`.

---

## Environment

| Field | Value |
| --- | --- |
| Date | _pending_ |
| Account | _assigned sandbox account (not committed)_ |
| Platform | _iOS Simulator / Android Emulator / device_ |
| App build | Expo Go / dev client |
| API base | `https://sandbox3.staging.iamwarpspeed.com/v1` |

---

## DEV-01 Reset

| Step | Result |
| --- | --- |
| `npm run sandbox:reset` | _not run_ |
| Inbox baseline looks known | _pending_ |
| Credits restored | _pending_ |

Notes:

---

## DEV-02 Chaos

Config used: `{ "failureRate": 0.3, "latencyMs": 3000 }` then restore `{0,0}`.

| Check | Observed |
| --- | --- |
| Chaos enabled / held | _not run_ |
| Chaos restored to 0 (finally) | _not run_ |
| Loading feedback under latency | _pending_ |
| 429 / Retry-After honored | _pending_ |
| Uncertain 5xx keeps same idempotency key | _pending_ |
| Offline/outbox actions still flush later | _pending_ |
| Forced re-login only on real auth failure | _pending_ |
| Duplicate actions after recovery | _pending_ |

Notes:

---

## DEV-03 Burst

| Check | Observed |
| --- | --- |
| Burst triggered | _not run_ |
| Duplicate rows in inbox | _pending_ |
| Scroll jank / full-screen thrash | _pending_ |
| Pagination still coherent | _pending_ |
| Socket/sync catch-up after burst | _pending_ |

Notes:

---

## Follow-ups

- [ ] Run reset → chaos hold → restore → note results  
- [ ] Run burst while inbox open + scrolling  
- [ ] Update this file with dated observations  
- [ ] Mention outcomes honestly in README test results
