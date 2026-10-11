# AI working material — Phase 3 API & Data Contracts

**Date:** 2026-10-11  
**Phase:** 3 — Typed API client, validation, errors, retry policy (no screens)

## PDF / matrix coverage

- A-01…A-05 envelopes/errors/latency/5xx uncertainty  
- AUTH/THR/SYN schemas (types + zod)  
- ENV-01 base URL via `appConfig`  
- Retry-After / 429  
- `meta.userBalance` extraction (+ `X-User-Balance` header helper for later SSE)

## Modules

| Module | Role |
| --- | --- |
| `src/core/api/errors.ts` | Error taxonomy + safe user messages |
| `src/core/api/retry-policy.ts` | Retry-After parse, backoff+jitter, retry classification |
| `src/core/api/response-parser.ts` | Envelope/error JSON validation |
| `src/core/api/schemas.ts` | Auth/thread/sync zod schemas |
| `src/core/api/transport.ts` | Injectable fetch transport |
| `src/core/api/client.ts` | Auth header, timeout, cancel, 401 refresh hook, retries |
| `src/core/api/index.ts` | Public exports |

## Design choices

- **zod 4.6.5** for runtime validation at the boundary.
- **Timeout default 20s** (PDF latency up to 10s).
- **TokenProvider.refreshAccessToken** is a hook only — single-flight refresh lands in Phase 4.
- **Writes without Idempotency-Key are not auto-retried** on 5xx; uncertain outcome is flagged.
- **SSE summary** intentionally not parsed as JSON envelope (Phase 10).

## Corrections

- Zod 4 generic inference broke `envelopeSchema<T extends ZodType>`; switched `parseEnvelope` to `z.ZodType<T>`.
- Silenced logger in Jest to keep API client tests readable.

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm run test      → pass (36 tests)
```

## Next

Phase 4 — authentication subsystem wired to `TokenProvider`.
