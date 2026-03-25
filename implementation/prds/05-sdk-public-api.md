# PRD 05: TrelloSDK Class & Public API

**Status:** Complete
**Depends on:** PRD 04 (event system)

## Problem Description

The repository needs a single concrete entry point — `TrelloSDK` — that external developers instantiate to interact with Trello data. The SDK encapsulates the API client, database, and sync engine internally. Clients never touch these internals directly. Instead, they call mutation methods on the SDK (which emit events on successful API ack) and subscribe to events for state change notifications. The sync poller interval must be configurable, and a manual sync trigger must be available.

This PRD also removes the redundant `src/clients/` directory and establishes the SDK's public barrel exports.

## Current State

- `src/api/client.ts` — `TrelloApiClient` with full CRUD (437 lines), error normalization, pagination
- `src/db/` — SQLite schema, connection manager, repository with upsert/query/soft-delete
- `src/sync/engine.ts` — `syncBoard()`/`syncAllBoards()` fetch-and-upsert reconciliation
- `src/sync/poller.ts` — `SyncPoller` with configurable interval, `onSync`/`onError` callbacks
- `src/clients/account-client.ts` — redundant `AccountClient` wrapping `TrelloClient` directly
- `src/clients/board-client.ts` — redundant `BoardClient` wrapping `TrelloClient` directly
- `src/events/` — event types, subscriber interfaces, and `EventDispatcher` (from PRD 04)
- `package.json` — named `"trello-api"`, no `main`/`exports` fields

### Key signatures (from codebase)

```typescript
// src/api/client.ts
class TrelloApiClient {
  constructor(config: { key: string; token: string })
  async createBoard(params: { name: string; desc?: string; defaultLists?: boolean; idOrganization?: string }): Promise<Board>
  async updateBoard(id: string, params: { name?: string; desc?: string; closed?: boolean }): Promise<Board>
  async deleteBoard(id: string): Promise<void>
  async createCard(params: { name: string; idList: string; desc?: string; pos?: ...; due?: string; idMembers?: string[]; idLabels?: string[] }): Promise<Card>
  async updateCard(id: string, params: { ... }): Promise<Card>
  async moveCard(id: string, idList: string, pos?: ...): Promise<Card>
  async archiveCard(id: string): Promise<Card>
  async deleteCard(id: string): Promise<void>
  // ... full CRUD for lists, labels, members, checklists, comments, attachments
}

// src/sync/poller.ts
class SyncPoller {
  constructor(db: Database, api: TrelloApiClient, config?: { intervalMs?: number; onSync?: ...; onError?: ... })
  async start(): Promise<void>
  stop(): void
  get isRunning(): boolean
}

// src/db/connection.ts (assumed — provides DB instance)
```

## Requirements

### Functional

1. **`TrelloSDK` concrete class** (`src/sdk.ts`):
   - Factory-style constructor via static method:
     ```typescript
     interface TrelloSDKConfig {
       key: string
       token: string
       dbPath?: string           // defaults to in-memory or temp file
       syncIntervalMs?: number   // defaults to 60000, pass 0 to disable auto-sync
     }
     static async create(config: TrelloSDKConfig): Promise<TrelloSDK>
     ```
   - Internally instantiates `TrelloApiClient`, opens SQLite DB, creates `EventDispatcher`
   - Private constructor — consumers must use `TrelloSDK.create()`

2. **Mutation methods** that proxy to `TrelloApiClient` and emit events on 200 ack:
   - Board lifecycle (emit account events):
     - `createBoard(params): Promise<Board>` → emits `BoardCreatedEvent`
     - `updateBoard(id, params): Promise<Board>` → emits `BoardUpdatedEvent`
     - `closeBoard(id): Promise<Board>` → emits `BoardClosedEvent`
     - `deleteBoard(id): Promise<void>` → emits `BoardDeletedEvent`
   - Card mutations (emit board events to the card's board):
     - `createCard(params): Promise<Card>` → emits `CardCreatedEvent`
     - `updateCard(id, params): Promise<Card>` → emits `CardUpdatedEvent`
     - `moveCard(id, idList, pos?): Promise<Card>` → emits `CardMovedEvent`
     - `archiveCard(id): Promise<Card>` → emits `CardArchivedEvent`
     - `deleteCard(id): Promise<void>` → emits `CardDeletedEvent`
   - Additional CRUD (lists, labels, checklists, comments, attachments) — proxy through to `TrelloApiClient` without event emission for now (events can be added incrementally)
   - On API error: throw the normalized error, do NOT emit an event

3. **Subscription methods**:
   - `subscribe(subscriber: AccountEventSubscriber): void`
   - `unsubscribe(subscriber: AccountEventSubscriber): void`
   - `subscribeToBoard(boardId: string, subscriber: BoardEventSubscriber): void`
   - `unsubscribeFromBoard(boardId: string, subscriber: BoardEventSubscriber): void`

4. **Sync control**:
   - `startSync(): Promise<void>` — starts the `SyncPoller` at the configured interval (runs immediate sync first)
   - `stopSync(): void` — stops the poller
   - `sync(): Promise<void>` — manual one-shot sync (works whether poller is running or not)
   - `get isSyncing(): boolean`

5. **Cleanup**:
   - `destroy(): void` — stops sync, closes DB connection, clears subscribers

6. **Delete `src/clients/`**:
   - Remove `src/clients/account-client.ts` and `src/clients/board-client.ts` entirely
   - Remove the `src/clients/` directory
   - Update any imports in `scripts/` that reference these files (or remove broken scripts)

7. **Public barrel exports** (`src/index.ts`):
   - Export: `TrelloSDK`, `TrelloSDKConfig`
   - Export: `AccountEventSubscriber`, `BoardEventSubscriber` (from `src/events/`)
   - Export: all event types (from `src/events/`)
   - Export: entity types `Board`, `Card`, `List`, `Label`, `Member`, `Checklist`, `Action`, `Attachment`, `Organization`, `CheckItem` (from `src/api/types.ts`)
   - Export: error types `TrelloApiError`, `TrelloAuthError`, `TrelloNotFoundError`, `TrelloRateLimitError` (from `src/api/errors.ts`)
   - Do NOT export: `TrelloApiClient`, `EventDispatcher`, `SyncPoller`, `Database`, or any `db/*`/`sync/*` internals

8. **Package identity**:
   - Rename `package.json` `name` from `"trello-api"` to `"trello-sdk"`
   - Add `"main": "dist/index.js"` and `"types": "dist/index.d.ts"`

### Non-Functional

1. SDK must be usable without subscribing to any events (fire-and-forget mutations work)
2. SDK must be usable without starting sync (API-only usage)
3. `destroy()` must be safe to call multiple times

## Impacted Files

| File / Module | Change Type | Notes |
|---|---|---|
| `src/sdk.ts` | **create** | TrelloSDK concrete class |
| `src/index.ts` | **create** | Public barrel exports |
| `src/clients/account-client.ts` | **delete** | Redundant |
| `src/clients/board-client.ts` | **delete** | Redundant |
| `package.json` | **modify** | Rename, add main/types |
| `scripts/demo-flow.ts` | **modify or delete** | May import from src/clients/ |
| `scripts/fetch-boards.ts` | **modify or delete** | May import from src/clients/ |
| `scripts/fetch-board-cards.ts` | **modify or delete** | May import from src/clients/ |
| `scripts/close-board.ts` | **modify or delete** | May import from src/clients/ |
| `src/sync/poller.ts` | no change | Used internally by SDK |
| `src/api/client.ts` | no change | Used internally by SDK |
| `src/events/dispatcher.ts` | no change | Used internally by SDK |

## Constraints

- Do not modify `src/api/client.ts`, `src/api/types.ts`, or `src/api/errors.ts`
- Do not modify `src/db/*` or `src/sync/*` (those are changed in PRD 06)
- Sync-triggered event emission is NOT part of this PRD — only mutation-ack events are wired here
- The SDK class must not expose its internal `TrelloApiClient`, `Database`, or `SyncPoller` instances

## Success Criteria

1. `src/clients/` directory no longer exists
2. `import { TrelloSDK } from './src'` resolves and `TrelloSDK.create({ key, token })` returns a usable instance
3. `sdk.subscribe(accountSub)` and `sdk.subscribeToBoard(boardId, boardSub)` register subscribers
4. `sdk.createBoard(...)` (with mocked 200) triggers `accountSub.onBoardCreated()` exactly once
5. `sdk.createCard(...)` (with mocked 200) triggers the correct board's subscriber `onCardCreated()` exactly once
6. Two boards with different subscribers receive events independently — board A's subscriber does not receive board B's events
7. `sdk.startSync()` starts the poller; `sdk.stopSync()` stops it; `sdk.sync()` triggers a one-shot sync
8. `sdk.destroy()` stops sync and clears all state
9. `tsc --noEmit` passes
10. No public export exposes `TrelloApiClient`, `Database`, `EventDispatcher`, or `SyncPoller`

## Out of Scope

- Sync-triggered event emission (PRD 06)
- Event emission for list/label/checklist/comment/attachment mutations (incremental addition later)
- Tests against live Trello API (unit tests with mocks are sufficient)
- Build tooling or npm publish configuration
