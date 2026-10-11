# AI working material — Phase 11 Chaos / Burst + Docs scaffold

**Date:** 2026-10-11  
**Phase:** 11 — DEV tools, restore-safe chaos, observation notes, README scaffold

## PDF coverage

- DEV-01…DEV-03 `/dev/reset`, `/dev/chaos`, `/dev/burst`  
- AS-24 restore chaos to 0  
- C-07 `ai/` continued  
- C-08 README scaffold (honest incomplete items)  
- C-09 recording explicitly deferred until live verification  
- A-04 chaos scenarios documented as pending observation

## Design

- Typed `createDevApi` + `withChaos` finally-restore helper  
- Node CLI `scripts/sandbox-dev.mjs` using `SANDBOX_EMAIL` / `SANDBOX_PASSWORD` (not `EXPO_PUBLIC_*`)  
- `docs/chaos-observations.md` marked **incomplete** — no fabricated results  
- README lists built/not-built and blocks live claims without credentials

## Trade-off

Could not execute live chaos/burst without assigned credentials. Tooling + checklists ship now; observations filled when credentials exist.

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm test          → pass
```

## Next

Phase 12–14 polish / resilience notes if needed, then 15–18 a11y/perf/README finalize + recording once live account available.
