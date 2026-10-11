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
- Dev helpers for `/dev/reset`, `/dev/chaos`, `/dev/burst` with restore-to-0  

## What is not built / incomplete

- Live chaos/burst **observations** (tooling ready; blocked on credentials) — `docs/chaos-observations.md`  
- Screen recording ≤3 minutes (C-09) — pending live verification  
- Declared device/OS for the recording (C-03 finalize)  
- Maestro E2E; full VoiceOver / Dynamic Type device audit  
- Compose / reply / search (out of scope)  
- Perfect offline of the full ~3k corpus on first launch (caches fetched/opened data only)

Acceptance gate: `docs/acceptance-checklist.md` · matrix sync: `docs/requirements-matrix.md`

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

More detail: `docs/architecture.md`, `docs/assumptions.md`, `docs/requirements-matrix.md`.

## AI usage

Work was done with Cursor agents, phased 0→14. Uncurated working notes live in `ai/` (phase writeups). Spec/PDF remained authoritative; Expo APIs were checked against current docs rather than training memory.

## Test results (automated)

```text
npm run typecheck  → pass
npm run lint       → pass
npm test           → pass (see latest CI/local run)
```

Live sandbox / chaos / burst: **not yet recorded** (no credentials in environment at implementation time).

## What I would do next week

1. Run reset/chaos/burst against the assigned account; fill `docs/chaos-observations.md`  
2. Capture a ≤3m recording of login → inbox → detail → star/archive → summary  
3. Validate FlashList blank-area feel under live burst (tuning already in Phase 13 / `docs/a11y-perf.md`)  
4. Probe live SSE event names if the flexible parser needs a narrow fix  

## Time

Focused implementation across Phases 0–14. Honest wall-clock will be finalized at submission; do not treat this README as claiming a finished live demo until chaos notes + recording exist.

## Platform

Intended for iOS Simulator and/or Android Emulator via Expo. Exact device/OS used for the submission recording will be declared when recorded.
