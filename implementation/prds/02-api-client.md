# PRD 02: Trello REST API Client Layer

**Status:** Planned
**Depends on:** PRD 01 (test suite validates endpoints)

## Problem Description

The test suite uses `trello.js` directly, but the application needs a thin abstraction layer that wraps `trello.js` with rate-limit-aware request queuing, error normalization, and typed response models. This layer is the foundation for the sync engine and all CRUD operations.

## Current State

- `trello.js` is installed and validated (46 tests passing against live API)
- No application-level client wrapper exists yet
- Rate limit headers are available but not monitored
- No retry/backoff logic exists

## Requirements

### Functional
1. Wrap `trello.js` with a `TrelloApiClient` class that:
   - Exposes typed methods for all core CRUD operations (boards, lists, cards, labels, members, checklists)
   - Returns normalized response types (our own interfaces, not trello.js internals)
   - Handles pagination transparently (cards > 1,000, actions > 300)
2. Implement request queue with rate-limit awareness:
   - Monitor `x-rate-limit-*-remaining` headers from responses
   - Throttle when remaining < 10
   - On 429: wait full interval (10s) before retry
   - Exponential backoff: 10s → 20s → 40s
   - Never exceed 200 errors/10s (triggers full block)
3. Normalize errors into typed error classes:
   - `TrelloAuthError` (401)
   - `TrelloNotFoundError` (404)
   - `TrelloRateLimitError` (429)
   - `TrelloApiError` (other)
4. Support batch GET operations (up to 10 URLs per batch)

### Non-Functional
1. All methods must be async and cancellable
2. Request/response logging hook for debugging
3. Must work in both Node.js (tests) and browser (Tauri webview) environments

## Impacted Files

| File / Module | Change Type | Notes |
|---|---|---|
| `src/api/client.ts` | create | Main API client wrapper |
| `src/api/types.ts` | create | Normalized response types |
| `src/api/errors.ts` | create | Typed error classes |
| `src/api/rate-limiter.ts` | create | Request queue + throttling |
| `src/api/pagination.ts` | create | Transparent pagination helpers |
| `tests/unit_tests/api-client.test.ts` | create | Tests for wrapper behavior |

## Constraints

- Must not break existing test suite (tests use `trello.js` directly)
- Rate limiter must be configurable (for testing with shorter intervals)
- Do not add dependencies beyond `trello.js` — use native fetch/axios that ships with it

## Success Criteria

1. All existing 46 tests still pass
2. New tests validate rate-limit throttling behavior (mock-based)
3. New tests validate pagination for cards > 1,000 (requires a board with many cards, or mock)
4. New tests validate error normalization for 401, 404, 429 responses
5. `TrelloApiClient` can be used as a drop-in replacement for direct `trello.js` usage

## Out of Scope

- Webhook handling (PRD 03)
- Offline queue/sync (PRD 03)
- Authentication flow (handled separately when Tauri app shell exists)
