# AI working material — Phase 5 Inbox & Pagination

**Date:** 2026-10-11  
**Phase:** 5 — Mailbox lists, cursor pagination, FlashList, TanStack Query

## PDF coverage

- P-02 inbox newest-first infinite scroll  
- P-03 unread visually distinct  
- THR-01 views + opaque `nextCursor` + limit ≤50  
- ENV-03 scale awareness via virtualization  

## Implementation

- `@tanstack/react-query@5.104.0` infinite queries per mailbox view  
- `@shopify/flash-list@2.0.2` (Expo SDK 57 pin)  
- Routes: `/(main)`, `/starred`, `/archived`, placeholder `/thread/[id]`  
- Deduplicate by id across pages; stop when `nextCursor` is null  
- Loading skeleton / empty / error / pagination footer / pull-to-refresh  

## Trade-offs

- Thread open navigates to a **placeholder** until Phase 6  
- Pull-to-refresh included as a safe recovery affordance (not a PDF requirement)  
- Live update merge deferred to Phase 9  

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm test          → 61 passed
```

## Next

Phase 6 — thread detail, HTML bodies, mark-read on open.
