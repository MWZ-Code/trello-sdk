# Trello SDK — Implementation Plan

## Overview

This is the top-level implementation plan for the Trello SDK. The project produces a TypeScript SDK that abstracts Trello data management behind a publisher-subscriber event interface. External developers instantiate the SDK, subscribe to events, and receive callbacks — the internal data model (API client, SQLite cache, sync engine) is fully encapsulated.

## Architectural Pivot (2026-03-25)

The project shifted from a mono-repo desktop application to a publishable SDK. Key changes:
- **Product form:** SDK library, not a Tauri desktop app
- **Public interface:** Publisher-subscriber event pattern, not direct CRUD calls
- **Consumer model:** Developers build their own applications on top of this SDK
- **Data model:** Fully abstracted — consumers never touch SQLite, the API client, or sync internals
- **Former PRDs 04–08** (board rules, RBAC, evidence linking, Tauri shell, agentic UX) are **deferred** — these are potential consumer applications or future SDK extensions, not core SDK concerns

## Status

| Phase | Description | Status | PRD |
|-------|-------------|--------|-----|
| 1A | Trello API Research | **Complete** | — |
| 1B | API Endpoint Validation (Test Suite) | **Complete** | [prds/01-api-test-suite.md](prds/01-api-test-suite.md) |
| 2 | Trello REST API Client | **Complete** | [prds/02-api-client.md](prds/02-api-client.md) |
| 3 | Local SQLite Database & Sync Engine | **Complete** | [prds/03-sqlite-sync-engine.md](prds/03-sqlite-sync-engine.md) |
| 4 | Event System Foundation | **Complete** | [prds/04-event-system.md](prds/04-event-system.md) |
| 5 | TrelloSDK Class & Public API | **Complete** | [prds/05-sdk-public-api.md](prds/05-sdk-public-api.md) |
| 6 | Sync-Triggered Event Emission | **Complete** | [prds/06-sync-events.md](prds/06-sync-events.md) |

### Deferred (post-SDK)

These PRDs were designed for the desktop application vision. They remain on file as potential future work — either as SDK extensions or as consumer applications built on top of the SDK.

| Phase | Description | Status | PRD |
|-------|-------------|--------|-----|
| — | Board Rule Schema & Enforcement | Deferred | [prds/04-board-rule-schema.md](prds/04-board-rule-schema.md) |
| — | Role-Based Access Control | Deferred | [prds/05-rbac.md](prds/05-rbac.md) |
| — | Work Documentation & Evidence Linking | Deferred | [prds/06-work-documentation.md](prds/06-work-documentation.md) |
| — | Tauri Desktop Application Shell | Deferred | [prds/07-tauri-app-shell.md](prds/07-tauri-app-shell.md) |
| — | Agentic UX | Deferred | [prds/08-agentic-ux.md](prds/08-agentic-ux.md) |

## Architecture (target)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Consumer Application                         │
│                                                                     │
│  const sdk = await TrelloSDK.create({ key, token, syncIntervalMs }) │
│  sdk.subscribe(myAccountSubscriber)                                 │
│  sdk.subscribeToBoard('board-123', myBoardSubscriber)               │
│  sdk.startSync()                                                    │
│  await sdk.createCard({ name: '...', idList: '...' })               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────────┐
│                          TrelloSDK (public)                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │  Mutation     │  │  Subscription    │  │  Sync Control         │ │
│  │  Methods      │  │  Management      │  │                       │ │
│  │              │  │                  │  │  startSync()          │ │
│  │  createBoard │  │  subscribe()     │  │  stopSync()           │ │
│  │  createCard  │  │  unsubscribe()   │  │  sync()               │ │
│  │  moveCard    │  │  subscribeToBoard│  │                       │ │
│  │  ...         │  │  unsubscribe...  │  │                       │ │
│  └──────┬───────┘  └────────┬─────────┘  └───────────┬───────────┘ │
│         │                   │                         │             │
│  ┌──────┴───────────────────┴─────────────────────────┴───────────┐ │
│  │  EventDispatcher (internal)                                    │ │
│  │  • Account subscribers: Set<AccountEventSubscriber>            │ │
│  │  • Board subscribers: Map<boardId, Set<BoardEventSubscriber>>  │ │
│  │  • Synchronous dispatch, catch-and-continue                    │ │
│  └──────┬─────────────────────────────────────────────┬───────────┘ │
│         │                                             │             │
│  ┌──────┴───────────┐                   ┌─────────────┴───────────┐ │
│  │  TrelloApiClient  │                   │  Sync Engine + Poller   │ │
│  │  (internal)       │                   │  (internal)             │ │
│  │                   │                   │                         │ │
│  │  Mutation → 200   │                   │  Fetch → Diff → Upsert │ │
│  │  → emit event     │                   │  → emit sync events    │ │
│  └──────┬────────────┘                   └────────────┬────────────┘ │
│         │                                             │             │
│  ┌──────┴─────────────────────────────────────────────┴───────────┐ │
│  │  SQLite Database (internal)                                    │ │
│  │  12 tables, WAL mode, soft-deletes, version resolution         │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
                      Trello REST API
```

## Event Flow

### Mutation-ack events (PRD 05)

```
Consumer calls sdk.createCard(...)
  → TrelloApiClient.createCard() → Trello API → 200 OK
  → EventDispatcher.dispatchBoardEvent(boardId, CardCreatedEvent { source: 'mutation' })
  → Board subscribers' onCardCreated() called synchronously
```

### Sync-triggered events (PRD 06)

```
SyncPoller tick (or manual sdk.sync())
  → syncBoard() fetches current Trello state
  → Upsert with change detection: was this card moved? archived? new?
  → Build SyncChangeSet
  → Transaction commits
  → Map changes to events with source: 'sync'
  → EventDispatcher dispatches to appropriate subscribers
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Product form | SDK (TypeScript library) | Enables ecosystem of consumer apps, not coupled to desktop |
| Public interface | Publisher-subscriber events | Decouples consumers from data model; per-board subscribers enable differentiated handling (silent vs. toast) |
| Event delivery | Synchronous (EventEmitter-style) | Simple, predictable, no queuing complexity |
| Event sources | Mutation ack + sync overwrite | Covers all state changes regardless of origin |
| Sync control | Configurable interval + manual trigger | `syncIntervalMs` in config; `startSync()`/`stopSync()`/`sync()` methods |
| Internal modules | Not exported | `TrelloApiClient`, `Database`, `SyncPoller`, `EventDispatcher` are implementation details |
| `src/clients/` | Deleted (PRD 05) | Redundant with `TrelloApiClient`; wrong abstraction for SDK pattern |
| Package name | `trello-sdk` | Matches repo name and product intent |

## Current Codebase Structure

```
trello-sdk/
├── CLAUDE.md                    # Project scope
├── package.json                 # Dependencies: trello.js, better-sqlite3, vitest
├── tsconfig.json
├── vitest.config.ts
├── .env.example
│
├── research/                    # Phase 1A research artifacts
│
├── implementation/              # Plans and PRDs
│   ├── plan.md                  # This file
│   └── prds/
│       ├── 01-api-test-suite.md         # ✅ Complete
│       ├── 02-api-client.md             # ✅ Complete
│       ├── 03-sqlite-sync-engine.md     # ✅ Complete
│       ├── 04-event-system.md           # 🔜 Next
│       ├── 05-sdk-public-api.md         # 🔜 Planned
│       ├── 06-sync-events.md            # 🔜 Planned
│       ├── 04-board-rule-schema.md      # ⏸ Deferred
│       ├── 05-rbac.md                   # ⏸ Deferred
│       ├── 06-work-documentation.md     # ⏸ Deferred
│       ├── 07-tauri-app-shell.md        # ⏸ Deferred
│       └── 08-agentic-ux.md             # ⏸ Deferred
│
├── src/
│   ├── api/                     # PRD 02: Trello API client (internal)
│   │   ├── client.ts
│   │   ├── errors.ts
│   │   ├── types.ts
│   │   └── index.ts
│   ├── db/                      # PRD 03: SQLite database (internal)
│   │   ├── schema.ts
│   │   ├── connection.ts
│   │   ├── repository.ts        # Modified: upserts return change indicators
│   │   └── index.ts
│   ├── sync/                    # PRD 03+06: Sync engine (internal)
│   │   ├── engine.ts            # Modified: builds SyncChangeSet
│   │   ├── poller.ts
│   │   ├── types.ts             # PRD 06: SyncChangeSet, UpsertResult types
│   │   └── index.ts
│   ├── events/                  # PRD 04: Event system
│   │   ├── types.ts             # 11 event types with source discriminator
│   │   ├── subscribers.ts       # AccountEventSubscriber, BoardEventSubscriber
│   │   ├── dispatcher.ts        # Internal EventDispatcher
│   │   └── index.ts
│   ├── sdk.ts                   # PRD 05: TrelloSDK class
│   └── index.ts                 # PRD 05: Public barrel exports
│
├── tests/
│   ├── helpers/
│   └── unit_tests/
│
├── scripts/
│   └── create-mock-db.ts
│
└── fixtures/
```

## Research Artifacts

All research documents are in `/research/`:
- `authentication.md` — Auth methods, SSO, token lifecycle, secure storage
- `rest-api-endpoints.md` — 80+ endpoints, rate limits, webhook vs polling analysis
- `data-models.md` — 13 entities, proposed SQLite schema, sync strategy
- `sdks-and-libraries.md` — Library comparison, recommendation for trello.js
- `powerups-and-embedding.md` — Embedding not viable, UI must be rebuilt

## Completed: PRDs 04–06

All three SDK core PRDs have been implemented:
- **PRD 04** — Event types (11 events), subscriber interfaces, and internal dispatcher
- **PRD 05** — `TrelloSDK` concrete class, public barrel exports, `src/clients/` deleted, package renamed
- **PRD 06** — Upsert change detection, `SyncChangeSet`, sync-triggered event dispatch
