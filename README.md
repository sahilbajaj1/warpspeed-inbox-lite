# Inbox Lite

Expo / React Native take-home client for the warpSpeed sandbox inbox API.

**Stack:** Expo SDK 57 · React Native 0.86 · React 19 · TypeScript · Expo Router · TanStack Query · Expo SQLite · Socket.IO · `expo/fetch` SSE

## How to run

```bash
npm install
cp .env.example .env   # optional overrides; never commit secrets
npm run typecheck
npm run lint
npm test
npx expo start
```

Sign in with the **assigned sandbox account** (emailed separately — not in this repo).

Optional sandbox tool credentials (scripts only, gitignored `.env`):

```bash
SANDBOX_EMAIL=...
SANDBOX_PASSWORD=...
```

```bash
npm run sandbox:reset
npm run sandbox:chaos -- --rate 0.3 --latency 3000 --hold 20
npm run sandbox:burst
npm run sandbox:chaos-off
```

See `docs/dev-tools.md`.

## What was built

- Login / session restore / single-flight refresh / SecureStore refresh token  
- Inbox, Starred, Archived with cursor pagination (FlashList)  
- Thread detail with locked-down HTML WebView + mark-read  
- Optimistic star / archive / unread with coalescing + idempotency  
- SQLite durable outbox + offline mailbox/detail cache  
- Socket.IO realtime + `/sync` catch-up with version/tombstones  
- AI summary SSE streaming + shared credits badge  
- Resilience: uncertain 5xx keep-queued, 429 Retry-After, foreground recovery  
- A11y basics: reduce-motion indicators, non-color unread cues, Dynamic Type caps  
- Dev helpers for `/dev/reset`, `/dev/chaos`, `/dev/burst` with restore-to-0  

## What is not built / incomplete

- Device airplane-mode outbox flush observation (code covered; not filmed in the ≤3m demo)  
- Maestro E2E; full VoiceOver / Dynamic Type device audit  
- Compose / reply / search (out of scope)  
- Perfect offline of the full ~3k corpus on first launch (caches fetched/opened data only)

## Key decisions

| Area | Choice | Why |
| --- | --- | --- |
| Navigation | Expo Router under `src/app/` | Employer standard on SDK 57 |
| Persistence | Expo SQLite outbox + thread cache | Survive process death for offline writes |
| Reads | TanStack Query infinite queries | Cursor pages + hydration from SQLite |
| Realtime | Subscribe → buffer → sync → drain | Avoid missed events on reconnect |
| Summary | `expo/fetch` SSE, not envelope client | PDF stream is not `{ data, meta }` |
| Credits | Authoritative remote only | No local −1 on tap (avoids double-decrement) |
| Chaos | `withChaos` / CLI `finally` restore | Never leave sandbox failure injection on |

## Docs index

| Doc | Purpose |
| --- | --- |
| `docs/architecture.md` | System design |
| `docs/requirements-matrix.md` | PDF traceability + status |
| `docs/acceptance-checklist.md` | Code vs live acceptance gate |
| `docs/assumptions.md` | Ambiguity resolutions |
| `docs/resilience.md` | Uncertain writes / 429 / recovery |
| `docs/a11y-perf.md` | Accessibility + FlashList notes |
| `docs/demo-recording.md` | ≤3m recording shot list |
| `docs/final-review.md` | Risks, cuts, submission blockers |
| `docs/chaos-observations.md` | Live chaos/burst results (pending) |
| `docs/dev-tools.md` | Sandbox CLI helpers |
| `docs/html-email-rendering.md` | WebView HTML strategy |
| `ai/` | Uncurated phase working notes |

## AI usage

Work was done with Cursor agents, phased 0→18. Uncurated working notes live in `ai/` (phase writeups). Spec/PDF remained authoritative; Expo APIs were checked against current docs rather than training memory. Human accountability stayed on secret safety, refresh single-flight, and honest incomplete claims. Credentials live only in gitignored `.env`.

## Test results (automated)

```text
npm run typecheck  → pass
npm run lint       → pass
npm test           → pass (121)
```

Live sandbox (2026-10-11 API smoke): reset OK; chaos latency/5xx observed then restored to 0; burst produced new threads with **no id dupes** in first 50; summary SSE `delta` events + credits 25→24. Details: `docs/chaos-observations.md`.

## What I would do next week

1. Validate FlashList blank-area feel while scrolling during/after a live burst on device  
2. Film one offline → reconnect outbox flush as a short addendum if reviewers want it  
3. Move `src/app/providers/*` outside the route tree to silence Expo Router default-export warnings  
4. Optional Maestro smoke for login → open thread  

## Time

Brief target: **8–12 focused hours**. Implementation spans Phases 0–18 as incremental commits on `master` (see git log). Wall-clock across the calendar window is higher than focused hours (agent-assisted, multi-session); treat the brief’s 8–12h as the focused engineering band, not wall-clock.

## Platform

**Tested for submission recording:** iPhone 16 Simulator, **iOS 18.5**, Expo Go **SDK 57**, Metro on macOS. Demo: `docs/demo-assets/inbox-lite-demo.mp4` (~17 seconds).
