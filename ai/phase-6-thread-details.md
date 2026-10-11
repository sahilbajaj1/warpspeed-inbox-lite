# AI working material — Phase 6 Thread Details

**Date:** 2026-10-11  
**Phase:** 6 — Thread detail, HTML bodies, mark-read on open

## PDF coverage

- P-05 open thread / read messages  
- P-06 opening marks read  
- THR-04 `bodyHtml` up to ~200KB  
- Version-aware cache merges for PATCH responses  

## Implementation

- `GET /threads/:id` via TanStack Query  
- Chronological message ordering  
- Locked-down WebView HTML renderer + sanitizer (`docs/html-email-rendering.md`)  
- Optimistic mark-read with stable Idempotency-Key; inbox rows update immediately  
- 404 → deleted/not-found UI  

## Trade-offs

- Links intentionally non-navigable  
- Remote images not yet blocked (documented follow-up)  
- Durable offline outbox for mark-read deferred to Phase 8 (optimistic UI kept on network errors)

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm test          → 69 passed
```

## Next

Phase 7 — optimistic star / unstar / archive / mark unread.
