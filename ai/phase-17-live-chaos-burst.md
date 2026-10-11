# AI working material — Phase 17 Live chaos / burst

**Date:** 2026-10-11  
**Phase:** 17 — Live sandbox observations

## Unblock

User supplied sandbox credentials. Stored **only** in gitignored `.env` (verified `git check-ignore`). **Not** committed. **Not** copied into docs/`ai/`.

## Commands / probes run

1. `npm run sandbox:reset` → 200  
2. Authenticated probe: inbox pagination, detail, PATCH + idempotent retry  
3. Chaos `{failureRate:0.3,latencyMs:3000}` → 12 reads + 6 writes → restore `{0,0}` + `sandbox:chaos-off`  
4. `POST /dev/burst` → wait 12s → list 50 (0 dupes) + `/sync`  
5. Summary SSE sample: `event: delta` / `data: {"text":...}`; `X-User-Balance` decremented  

## Artifacts

- `docs/chaos-observations.md` filled with real numbers  
- Assumptions AMB-01 / AMB-10 updated  
- Matrix DEV-02 done; DEV-03 partial (UI feel open)  

## Next

Phase 18: UI recording on simulator (human) + README platform/time finalize. API side of live gate is complete.
