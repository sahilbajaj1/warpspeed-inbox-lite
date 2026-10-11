# Demo recording runbook (≤3 minutes)

**PDF:** C-09 — screen recording of **working features only**  
**Status:** Script ready; capture blocked until sandbox credentials + a green live smoke (`docs/acceptance-checklist.md` live gate).

---

## Before record

1. `npm run sandbox:reset` (with local `.env` credentials)  
2. Confirm chaos is off (`npm run sandbox:chaos-off`)  
3. Cold start: `npx expo start` → iOS Simulator or Android Emulator  
4. Declare platform in README Platform section after capture  
5. Do **not** demo unfinished items (chaos observations, Maestro, compose)

Target length: **≤ 180 seconds**. Prefer one continuous take.

---

## Shot list (~2:30)

| # | Seconds | Action | Show |
| --- | --- | --- | --- |
| 1 | 0:00–0:20 | Launch → login with assigned account | Error-free sign-in → inbox |
| 2 | 0:20–0:45 | Scroll inbox; switch Starred / Archived tabs | Pagination / views |
| 3 | 0:45–1:10 | Open an unread thread | Messages + HTML body; unread clears |
| 4 | 1:10–1:40 | Star → mark unread → archive (or reverse) | Instant UI; optional Syncing… |
| 5 | 1:40–2:10 | Summarise; watch credits badge | Streaming text; balance update |
| 6 | 2:10–2:30 | Quick offline beat (optional if time): airplane → star → online | Queue then flush |
| 7 | 2:30–2:45 | Stop on a stable inbox frame | End cleanly |

If offline beat risks overtime, cut #6 and end after summary.

---

## Do not show

- Fabricated chaos results  
- Broken / error-only paths unless briefly recovered  
- Secrets on screen (password visible longer than necessary)  
- Dev menu / `.env` contents  

---

## After record

1. Name file clearly (e.g. `inbox-lite-demo.mp4`) — keep **out of git** unless submission requires otherwise  
2. Update README **Platform** with exact simulator/device + OS  
3. Tick C-09 in `docs/requirements-matrix.md` / acceptance checklist  
4. If a feature failed mid-take, re-record; do not ship a broken demo  
