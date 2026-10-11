# Chaos & burst observations

**Status:** recorded (API live smoke, 2026-10-11)  
**Rule:** Record only what was actually observed. Do not fabricate results.

Tooling: `docs/dev-tools.md`, `npm run sandbox:*`, plus an ad-hoc authenticated probe script (not committed).

---

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-10-11 |
| Account | assigned sandbox account (credentials only in local gitignored `.env`) |
| Platform | Node 22 API client against sandbox (app UI recording still separate — see `docs/demo-recording.md`) |
| App build | API smoke (not Expo Go for these numbers) |
| API base | `https://sandbox3.staging.iamwarpspeed.com/v1` |

---

## DEV-01 Reset

| Step | Result |
| --- | --- |
| `npm run sandbox:reset` | **OK** — authenticated, `POST /dev/reset` → 200 (~889ms) |
| Inbox baseline looks known | **Yes** — first page 25 threads, `meta.nextCursor` present, `meta.syncToken` present, `meta.userBalance=25` |
| Credits restored | **Yes** — balance **25** immediately after reset |

Notes: Initial login on a cold connection took ~10.8s once (within PDF ≤10s “slow” band / network variance); subsequent calls ~190–200ms with chaos off.

---

## DEV-02 Chaos

Config used: `{ "failureRate": 0.3, "latencyMs": 3000 }` then restore `{0,0}`.

| Check | Observed |
| --- | --- |
| Chaos enabled / held | **Yes** — `POST /dev/chaos` 200; then 12 GETs + 6 PATCHes under chaos |
| Chaos restored to 0 (finally) | **Yes** — explicit restore + `npm run sandbox:chaos-off` → 200 |
| Loading feedback under latency | **Latency injected** — read latencies min/med/max **190 / 2601 / 3104** ms (median ≈ configured 3s) |
| 429 / Retry-After honored | **Not observed in this sample** — no `429` and no `Retry-After` headers on 12 reads / 6 writes |
| Uncertain 5xx keeps same idempotency key | **5xx seen on writes** — 2/6 PATCH → **503** `server_error` after ~2.1s; app policy keeps key queued (unit-tested). Live UI retry not screen-recorded here |
| Offline/outbox actions still flush later | **Not exercised in this API session** (requires device airplane mode) |
| Forced re-login only on real auth failure | **Not triggered** — session remained valid through chaos |
| Duplicate actions after recovery | **Idempotent PATCH retry** (pre-chaos): same `Idempotency-Key` → 200, **same version** |

Chaos read status histogram (n=12): `{ "200": 9, "500": 2, "503": 1 }`  
Chaos write status histogram (n=6): `{ "200": 4, "503": 2 }`  
Post-chaos read latencies: **198, 194, 198** ms (injection clearly cleared).

Notes:

- Chaos produces **latency + 5xx**, not only failures — matches resilience design (honor delays; do not blind-replay writes).  
- No rate-limit sample this run; Retry-After path remains covered by unit tests + code.

---

## DEV-03 Burst

| Check | Observed |
| --- | --- |
| Burst triggered | **Yes** — `POST /dev/burst` 200 (~200ms) |
| Duplicate rows in inbox | **None in first 50** after ~12s wait — `unique=50`, `dupesInPage=0` |
| Scroll jank / full-screen thrash | **Not measured in UI** this session (API-only). FlashList tuning in place (`docs/a11y-perf.md`) |
| Pagination still coherent | **Yes** pre-burst: page2 overlap with page1 ids = **0**; post-burst first page filled with newer ids vs pre-burst sample |
| Socket/sync catch-up after burst | **`GET /sync?since=`** → 200, `hasMore=false`, new sync token present (~1138ms); change payload non-empty |

Notes: After burst wait, first page of 50 were all new relative to the pre-burst id set (simulator delivery working). UI scroll feel still needs a simulator pass when recording.

---

## Bonus live checks (same session)

| Check | Observed |
| --- | --- |
| Thread detail | `GET /threads/:id` 200; messages present; `bodyHtml` length ~2.2KB on sample |
| AI summary SSE | `POST .../summary` → `text/event-stream`; events named **`delta`** with `data: {"text":"..."}`; stream completed (`done`); ~18.6s |
| Credits | Start **25** → after first summary header `X-User-Balance: 24` → after second probe **23**; list `meta.userBalance` matched |
| Chaos left off | Confirmed via `sandbox:chaos-off` at end |

---

## Follow-ups

- [x] Run reset → chaos hold → restore → note results  
- [x] Run burst + sync catch-up  
- [x] Update this file with dated observations  
- [ ] Expo Simulator UI scroll/feel under burst (for recording)  
- [ ] Airplane-mode outbox flush on device  
- [ ] Capture ≤3m screen recording (`docs/demo-recording.md`)  
