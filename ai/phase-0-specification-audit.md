# AI working material — Phase 0 Specification Audit

**Date:** 2026-10-11  
**Tool:** Cursor (Composer / Auto agent)  
**Phase:** 0 — Specification audit only (no app implementation)

## Inputs

- Master implementation instructions (phased build plan) provided in chat
- Authoritative brief: `coding-test-brief.pdf` (warpSpeed Inbox Lite, 4 pages)

## What the AI was asked to do

1. Read the PDF line by line  
2. Produce requirements matrix, architecture, implementation plan, assumptions, testing strategy  
3. Extract/verify API contracts  
4. **Not** start feature implementation until audit complete  

## Actions taken

1. Read full PDF text (all 4 pages).  
2. Verified current Expo stable via Expo docs: **SDK 57** → RN 0.86, React 19.2.3, Node ≥22.13. Local Node **22.16.0** OK.  
3. Confirmed Expo SDK 57 docs list Expo Router, `expo-sqlite`, `expo-secure-store`, `@shopify/flash-list`, NetInfo.  
4. Noted FlashList Expo “expected version” pin quirk (GitHub issue #47523) — may need `expo.install.exclude` or FlatList fallback.  
5. Wrote docs under `docs/` and this AI note under `ai/`.

## Decisions (AI-assisted, human-accountable)

| Decision | Choice | Overruled alternatives |
| --- | --- | --- |
| Navigation | Expo Router | React Navigation-only — unnecessary; Router is employer standard |
| Persistence | Expo SQLite for cache/outbox | AsyncStorage-only — weaker durability for outbox |
| Server cache | TanStack Query v5 | Hand-rolled fetch cache — more bug surface for pagination |
| List | FlashList preferred, FlatList fallback | Building custom recycler — out of scope |
| Sync vs socket naming | Treat PDF literally: sync `thread.upsert`/`thread.delete` vs socket `*.upserted`/`*.deleted` | Assuming identical strings — would be a silent bug |
| Credits | No local decrement on tap | Optimistic −1 — risks double-decrement vs header/socket |
| Scope | Protect P0+P1 correctness; cut P3 first | Building full design system early — against brief judgement |

## Incorrect or risky suggestions caught during audit

- Master instruction folder tree is a **proposal**, not a command to create empty folders — docs record “introduce modules when they have responsibilities.”  
- Do not invent endpoints beyond PDF (e.g. no search API).  
- Do not treat PATCH 5xx as definite rollback.  
- Do not put refresh tokens in SQLite.

## Credentials

- PDF states login details are emailed separately.  
- **No credentials were available or written into the repo during Phase 0.**

## Files produced

- `docs/requirements-matrix.md`
- `docs/architecture.md`
- `docs/implementation-plan.md`
- `docs/assumptions.md`
- `docs/testing-strategy.md`
- `ai/phase-0-specification-audit.md`

## Next slice

Phase 1 / Slice 1: create Expo TypeScript foundation only, after this audit commit.
