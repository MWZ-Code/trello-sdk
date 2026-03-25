# PRD 01: API Endpoint Validation Test Suite

**Status:** Complete
**Commit:** `9a9c182`

## Problem Description

Before building the API client and sync engine, we need to validate that the Trello REST API endpoints behave as documented — confirming both successful responses and response shape consistency.

## Requirements

### Functional
1. Test suite covers core CRUD for: boards, lists, cards, labels, members, checklists
2. Each test validates (a) endpoint responds successfully and (b) response shape matches documented fields/types
3. Tests auto-create a dedicated board for write operations and tear it down after
4. User's existing "Test Board" is used for read-only tests

### Non-Functional
1. Suite runs within Trello rate limits (~75 API calls total)
2. Tests run sequentially to avoid rate limit collisions
3. Generous timeouts for network calls (30s per test, 60s for setup/teardown)

## Implementation

| File | Purpose |
|------|---------|
| `tests/helpers/client.ts` | Singleton TrelloClient from .env |
| `tests/helpers/validators.ts` | Shape assertion helpers + field specs |
| `tests/helpers/setup.ts` | Test board lifecycle (create/destroy) |
| `tests/unit_tests/boards.test.ts` | 9 tests — CRUD + nested resources |
| `tests/unit_tests/lists.test.ts` | 7 tests — CRUD + archive + list cards |
| `tests/unit_tests/cards.test.ts` | 13 tests — CRUD + comments + attachments |
| `tests/unit_tests/labels.test.ts` | 5 tests — CRUD + board labels |
| `tests/unit_tests/members.test.ts` | 4 tests — read-only member endpoints |
| `tests/unit_tests/checklists.test.ts` | 8 tests — checklist + check item CRUD |

## Success Criteria

- [x] `npm test` passes with 46/46 tests
- [x] Test board is created and cleaned up automatically
- [x] All 6 resource types have validated response shapes
- [x] Suite completes in under 60 seconds
