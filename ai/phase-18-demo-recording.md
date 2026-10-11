# AI working material — Phase 18 Demo recording

**Date:** 2026-10-11  
**Phase:** 18 — Simulator demo + bugfix + finalize

## Done

1. Booted iPhone 16 sim + Expo Go + Metro  
2. Added Metro DEV `/__dev/sandbox-creds` + optional `EXPO_PUBLIC_DEMO_AUTO_LOGIN` (creds never in JS bundle)  
3. **Bugfix:** `useThreadActions` returned fresh `{}`/`[]` when `thread` undefined → `useSyncExternalStore` infinite loop on thread detail loading. Stable empty snapshots + `useCallback` actions.  
4. Captured `docs/demo-assets/inbox-lite-demo.mp4` (~17s) + screenshots  
5. README platform / matrix C-03 & C-09 updated  

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm test          → pass (121)
```

## Secrets

`.env` remains gitignored. `EXPO_PUBLIC_DEMO_AUTO_LOGIN` left `0` after capture.
