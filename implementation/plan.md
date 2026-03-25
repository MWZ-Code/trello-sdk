# Trello API — Implementation Plan

## Overview

This is the top-level implementation plan for the Trello API desktop application. The project follows a phased roadmap, each phase building on validated work from the previous one.

## Status

| Phase | Description | Status | PRD |
|-------|-------------|--------|-----|
| 1A | Trello API Research | **Complete** | — |
| 1B | API Endpoint Validation (Test Suite) | **Complete** | [prds/01-api-test-suite.md](prds/01-api-test-suite.md) |
| 2 | Trello REST API Client | **Complete** | [prds/02-api-client.md](prds/02-api-client.md) |
| 3 | Local SQLite Database & Sync Engine | **Complete** | [prds/03-sqlite-sync-engine.md](prds/03-sqlite-sync-engine.md) |
| 4 | Board Rule Schema & Enforcement | Planned | [prds/04-board-rule-schema.md](prds/04-board-rule-schema.md) |
| 5 | Role-Based Access Control | Planned | [prds/05-rbac.md](prds/05-rbac.md) |
| 6 | Work Documentation & Evidence Linking | Planned | [prds/06-work-documentation.md](prds/06-work-documentation.md) |
| 7 | Tauri Desktop Application Shell | Planned | [prds/07-tauri-app-shell.md](prds/07-tauri-app-shell.md) |
| 8 | Agentic UX | Planned | [prds/08-agentic-ux.md](prds/08-agentic-ux.md) |

## Architecture (as implemented)

```
┌───────────────────────────────────────────────────────────────┐
│                     Current Implementation                     │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  src/api/                                               │  │
│  │  TrelloApiClient — typed wrapper around trello.js       │  │
│  │  • Error normalization (401/404/429 → typed errors)     │  │
│  │  • Transparent pagination (>1,000 cards)                │  │
│  │  • Batch GET support (up to 10 URLs)                    │  │
│  │  • Full CRUD: boards, lists, cards, labels, members,    │  │
│  │    checklists, comments, attachments                    │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         │                                      │
│  ┌──────────────────────┴──────────────────────────────────┐  │
│  │  src/sync/                                              │  │
│  │  State Reconciliation Sync Engine (Approach B)          │  │
│  │  • No action replay — fetch current state, upsert       │  │
│  │  • Idempotent: double-sync produces identical state     │  │
│  │  • Full resync from genesis = same code path            │  │
│  │  • Configurable poller (default 60s interval)           │  │
│  │  • Syncs all non-closed boards automatically            │  │
│  └──────────────────────┬──────────────────────────────────┘  │
│                         │                                      │
│  ┌──────────────────────┴──────────────────────────────────┐  │
│  │  src/db/                                                │  │
│  │  SQLite (better-sqlite3) — per-user DB files            │  │
│  │  • 12 tables: boards, lists, cards, members, labels,    │  │
│  │    checklists, check_items, card_members, card_labels,  │  │
│  │    board_members, sync_meta, schema_version             │  │
│  │  • WAL mode, soft-deletes, auto-migration               │  │
│  │  • Trusted-host model (no encryption)                   │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  tests/ — 94 tests (Vitest)                             │  │
│  │  • 46 API endpoint validation tests (live Trello)       │  │
│  │  • 22 TrelloApiClient wrapper tests (live Trello)       │  │
│  │  • 20 DB schema/repository tests (in-memory SQLite)     │  │
│  │  • 6 sync engine tests (live Trello + in-memory DB)     │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                         │
                         ▼
                  Trello REST API
```

## Key Decisions (implemented)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API Client | `trello.js` wrapped in `TrelloApiClient` | TypeScript, ~100% API coverage, actively maintained. Wrapper adds error normalization and pagination. |
| Local Database | SQLite via `better-sqlite3`, per-user files | WAL mode, fast sync, no server dependency. Per-user isolation via separate DB files. |
| Sync Strategy | State reconciliation (Approach B) | Fetch current state → upsert. No action replay. Inherently idempotent. Full resync = same code path as incremental. |
| Version Resolution | `dateLastActivity` comparison for cards/boards; incoming sync authoritative for all other entities | Cards/boards have timestamps. Lists/labels/checklists don't — stale writes self-correct on next 60s sync cycle. |
| Deletion | Soft-delete (`deleted_at` column) | Preserves history. Storage is not a concern at current scale. |
| Multi-user Isolation | Separate SQLite DB file per `idMember` | Trusted-host model — no encryption. Simple, clean isolation. |
| Board Selection | Auto-sync all non-closed boards | Explicit selection is a trivial future enhancement if needed. |
| Offline Queue | Deferred | All writes go directly to Trello API for now. Offline queue adds complexity that isn't needed yet. |
| FK Constraints | Disabled during sync, enabled otherwise | Trello data can have cross-board references and reference archived entities not in local cache. |
| Desktop Engine | Tauri (planned, not yet implemented) | Rust backend + web frontend. Deferred to PRD 07. |
| UI | Custom React + Tailwind (planned) | Embedding Trello UI blocked by CSP/ToS. Deferred to PRD 07. |

## Current Codebase Structure

```
trello-api/
├── CLAUDE.md                    # Project scope
├── package.json                 # Dependencies: trello.js, better-sqlite3, vitest
├── tsconfig.json
├── vitest.config.ts
├── .env.example                 # TRELLO_API_KEY, TRELLO_TOKEN, TEST_BOARD_NAME
│
├── research/                    # Phase 1A research artifacts
│   ├── authentication.md
│   ├── rest-api-endpoints.md
│   ├── data-models.md
│   ├── sdks-and-libraries.md
│   └── powerups-and-embedding.md
│
├── implementation/              # Plans and PRDs
│   ├── plan.md                  # This file
│   └── prds/
│       ├── 01-api-test-suite.md     # ✅ Complete
│       ├── 02-api-client.md         # ✅ Complete
│       ├── 03-sqlite-sync-engine.md # ✅ Complete
│       ├── 04-board-rule-schema.md
│       ├── 05-rbac.md
│       ├── 06-work-documentation.md
│       ├── 07-tauri-app-shell.md
│       └── 08-agentic-ux.md
│
├── src/
│   ├── api/                     # PRD 02: Trello API client
│   │   ├── client.ts            # TrelloApiClient class
│   │   ├── errors.ts            # Typed error hierarchy
│   │   ├── types.ts             # Normalized response types
│   │   └── index.ts
│   ├── db/                      # PRD 03: SQLite database
│   │   ├── schema.ts            # 12-table schema definition
│   │   ├── connection.ts        # Per-user DB connection manager
│   │   ├── repository.ts        # Upserts, queries, soft-delete
│   │   └── index.ts
│   └── sync/                    # PRD 03: Sync engine
│       ├── engine.ts            # State reconciliation sync
│       ├── poller.ts            # Configurable interval polling
│       └── index.ts
│
├── tests/
│   ├── helpers/
│   │   ├── client.ts            # Shared TrelloClient for tests
│   │   ├── setup.ts             # Test board lifecycle
│   │   └── validators.ts        # Shape assertion helpers
│   └── unit_tests/
│       ├── boards.test.ts       # 9 tests
│       ├── lists.test.ts        # 7 tests
│       ├── cards.test.ts        # 13 tests
│       ├── labels.test.ts       # 5 tests
│       ├── members.test.ts      # 4 tests
│       ├── checklists.test.ts   # 8 tests
│       ├── api-client.test.ts   # 22 tests
│       ├── db-schema.test.ts    # 20 tests
│       └── sync-engine.test.ts  # 6 tests
│
├── scripts/
│   └── create-mock-db.ts        # Sync live account → fixture DB
│
└── fixtures/                    # Local mock DBs (gitignored)
    └── {memberId}/trello.db
```

## Research Artifacts

All research documents are in `/research/`:
- `authentication.md` — Auth methods, SSO, token lifecycle, secure storage
- `rest-api-endpoints.md` — 80+ endpoints, rate limits, webhook vs polling analysis
- `data-models.md` — 13 entities, proposed SQLite schema, sync strategy
- `sdks-and-libraries.md` — Library comparison, recommendation for trello.js
- `powerups-and-embedding.md` — Embedding not viable, UI must be rebuilt

## Next Up: PRD 04 — Board Rule Schema

The next phase defines a local rules engine that validates mutations against per-board rulesets before committing to Trello. Key design points already established:
- Butler rules have no API access — rules are defined locally
- Rule types: required fields, allowed transitions, label constraints, member constraints, naming conventions
- Rules stored as JSON per-board in SQLite
- Engine validates outgoing mutations only (not incoming sync data)
- Evaluation must be < 10ms per mutation (no network calls)
