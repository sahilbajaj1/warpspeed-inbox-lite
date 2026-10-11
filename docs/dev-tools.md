# Sandbox developer tools

PDF tools for the assigned test account only (AS-24). Never leave chaos enabled.

## Endpoints

| Tool | Request | Purpose |
| --- | --- | --- |
| Reset | `POST /dev/reset` | Restore inbox + credits baseline |
| Chaos | `POST /dev/chaos` `{ failureRate, latencyMs }` | Inject failures/latency; `{0,0}` turns off |
| Burst | `POST /dev/burst` | Deliver ~200 threads over ~10s |

## Credentials

Put these in a **gitignored** `.env` (never commit):

```bash
SANDBOX_EMAIL=your-assigned-account@example.com
SANDBOX_PASSWORD=...
EXPO_PUBLIC_API_BASE_URL=https://sandbox3.staging.iamwarpspeed.com/v1
```

App sign-in still uses the UI; these vars are only for `scripts/sandbox-dev.mjs`.

## Commands

```bash
npm run sandbox:reset
npm run sandbox:chaos -- --rate 0.3 --latency 3000 --hold 20
npm run sandbox:chaos-off
npm run sandbox:burst
```

`sandbox:chaos` always restores `{ failureRate: 0, latencyMs: 0 }` in a `finally` block after `--hold` seconds.

## Observation checklist

Fill `docs/chaos-observations.md` with **observed** results only — do not invent outcomes.

### After chaos

- Loading / offline feedback still usable  
- Read retries honor `Retry-After` / backoff  
- Star/archive/unread stay pending with the same idempotency key on uncertain 5xx  
- No duplicate rows after recovery  
- Session survives refresh pressure (or fails safe to login)

### After burst

- No duplicate thread ids in the visible inbox  
- Order remains newest-first / stable enough to scan  
- No full-screen remount thrash  
- Scroll stays responsive  
- Sync/socket catch-up does not drop obvious changes
