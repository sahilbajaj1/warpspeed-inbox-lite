# AI working material — Phase 13 Accessibility & list performance

**Date:** 2026-10-11  
**Phase:** 13 — A11y polish + FlashList tuning (start of P3)

## PDF coverage

- P-03 unread visually distinct (not color-only where practical)  
- C-04 usable UI / a11y basics / Dynamic Type overflow risk  
- ER-08 FlashList for ~3k threads  

## Changes

1. `usePrefersReducedMotion` + `AppActivityIndicator` (static marker when reduce motion)  
2. Wired reduce-motion-aware indicator into buttons, pagination, pending, summary, thread loading  
3. Unread cues: leading bar + bold + visible “Unread” caption; VoiceOver label already included unread  
4. `AppText` / inputs: allow font scaling with `maxFontSizeMultiplier` 1.4  
5. FlashList: `drawDistance`, `getItemType`, memoized row, stable `renderItem`  
6. `docs/a11y-perf.md` for defense notes  

## Trade-offs

- Cap Dynamic Type at 1.4 so dense inbox rows do not collapse; full unbounded scaling deferred.  
- Live burst blank-area verification still blocked on credentials — tuning is in place, not measured on device.

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm test          → pass (121)
```

## Next

Phase 14 — acceptance gate / matrix status sync for remaining P0 items; then 15–18 README finalize + recording when credentials exist.
