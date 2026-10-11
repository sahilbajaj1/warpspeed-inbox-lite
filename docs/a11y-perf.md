# Accessibility & list performance notes

**Phase:** 13  
**PDF coverage:** P-03 (unread distinct), C-04 (usable / a11y basics), ER-08 (FlashList), ~3k / burst stability

---

## Accessibility

| Concern | Approach |
| --- | --- |
| Touch targets | `MIN_TOUCH_TARGET_SIZE` 44pt on rows, buttons, star control + hitSlop |
| Labels | Row announces `Unread. {sender}. {subject}`; star has label + hint; errors use `accessibilityLiveRegion` |
| Unread not color-only | Bold type + thick leading bar (primary text color) + visible “Unread” caption |
| Reduce motion | `usePrefersReducedMotion` → `AppActivityIndicator` swaps spinner for a static marker |
| Dynamic Type | `AppText` / inputs allow font scaling with `maxFontSizeMultiplier` 1.4 to keep dense list rows usable |

**Not claimed:** Full VoiceOver audit on device, custom focus order, or WCAG AAA contrast certification.

---

## FlashList (v2.0.2)

| Knob | Value / rationale |
| --- | --- |
| Stable keys | `keyExtractor` → `thread.id` |
| Recycling types | `getItemType` → `read` \| `unread` (different row density) |
| Draw distance | `280` dp (`THREAD_LIST_DRAW_DISTANCE`) to reduce blank cells under burst |
| Row memo | `ThreadListItem` wrapped in `memo`; `renderItem`/`getItemType` via `useCallback` |
| Theme refresh | `extraData` includes accent/background so scheme changes rebind cells |

FlashList 2 no longer requires `estimatedItemSize`; auto layout is used.

**Manual check still needed with live credentials:** scroll 3k + `POST /dev/burst` for blank-area / dupe feel; record in `docs/chaos-observations.md`.

---

## What to demo / defend

1. Toggle Reduce Motion in OS settings → loading affordances stay informative without spinning.  
2. Greyscale / color-blind: unread still readable via weight + bar + “Unread” text.  
3. FlashList tuning is intentional for burst, not premature micro-optimization elsewhere.
