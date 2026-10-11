# AI working material — Phase 4 Authentication

**Date:** 2026-10-11  
**Phase:** 4 — Session manager, SecureStore refresh tokens, login UI, single-flight refresh

## PDF coverage

- P-01 sign in  
- AUTH-01…AUTH-06  
- C-10 / ENV-04 — no credentials in repo  

## Design

- **Refresh token** in `expo-secure-store` only; **access token** memory-only  
- **Cold start** always refreshes with stored refresh token (rotates on launch)  
- **Single-flight** `refreshPromise` shared by API 401 waiters  
- **Session generation** ignores late refresh/login races; restore storage if a late persist lands after a newer session  
- **Persist-before-publish** for rotated refresh tokens  
- `bindApiTokenProvider` bridges session → `apiClient` without circular imports  
- Socket disconnect on logout is a stub (`onSessionCleared`) until Phase 9  

## Routes

- `/(auth)/login`  
- `/(main)` gated home placeholder + Sign out  
- Root index redirects by session status  

## Verification

```text
npm run typecheck → pass
npm run lint      → pass
npm test          → pass (session, refresh integration, LoginForm, prior suites)
```

## Corrections

- Login 401 must map to “Invalid email or password”, not “session expired”  
- Late refresh must not overwrite a newer refresh token in SecureStore  
- LoginForm unit tests use `UiProviders` (no Auth bootstrap) to avoid act races  

## Not done yet (later phases)

- Live credential verification against sandbox (needs emailed test account)  
- Socket reauth after refresh  
- Clearing SQLite/outbox on logout (Phase 8)
