# trello-sdk

A TypeScript SDK for Trello data management with a publisher-subscriber event interface. Abstracts the Trello REST API, local SQLite caching, and background sync behind a single entry point. Consumers subscribe to events and receive callbacks when state changes -- the internal data model is fully encapsulated.

## Design

```
Consumer Application
  |
  |  sdk.subscribe(accountSubscriber)
  |  sdk.subscribeToBoard('board-123', boardSubscriber)
  |  sdk.startSync()
  |  await sdk.createCard({ name: '...', idList: '...' })
  |
  v
TrelloSDK (public entry point)
  |
  |-- Mutation methods -----> TrelloApiClient -----> Trello REST API
  |       on 200 ack,                                     |
  |       emit event                                      |
  |                                                       |
  |-- Sync control --------> Sync Engine + Poller --------+
  |       on overwrite,          |
  |       emit event             v
  |                          SQLite (WAL, soft-deletes)
  |
  +-- EventDispatcher
        Account subscribers: Set<AccountEventSubscriber>
        Board subscribers:   Map<boardId, Set<BoardEventSubscriber>>
```

### Event sources

Events are emitted in two scenarios:

1. **Mutation ack** -- when the SDK calls the Trello API and receives a 200 response (e.g., `sdk.createBoard(...)` succeeds), the corresponding event fires immediately with `source: 'mutation'`.
2. **Sync overwrite** -- when the background poller (or a manual `sdk.sync()`) detects that remote state differs from local state, events fire after the sync transaction commits with `source: 'sync'`.

### Per-board subscriber registration

Board-level subscribers are registered per board. This allows consumers to handle different boards differently -- for example, silencing a noisy board while displaying toast notifications for another:

```typescript
sdk.subscribeToBoard(noisyBoardId, { /* silent handler */ })
sdk.subscribeToBoard(importantBoardId, {
  onCardCreated(event) { showToast(`New card: ${event.card.name}`) },
  onCardMoved(event) { showToast(`Card moved to new list`) },
})
```

## Quick start

```typescript
import { TrelloSDK } from 'trello-sdk'

const sdk = await TrelloSDK.create({
  key: 'your-api-key',
  token: 'your-token',
  syncIntervalMs: 30000, // sync every 30s (default: 60s, 0 to disable)
})

// Subscribe to account-level events (board lifecycle)
sdk.subscribe({
  onBoardCreated(event) {
    console.log(`Board created: ${event.board.name} [${event.source}]`)
  },
  onBoardClosed(event) {
    console.log(`Board closed: ${event.board.name}`)
  },
})

// Subscribe to board-level events (card mutations)
sdk.subscribeToBoard('board-id', {
  onCardCreated(event) {
    console.log(`Card created: ${event.card.name}`)
  },
  onCardMoved(event) {
    console.log(`Card moved from ${event.previousListId} to ${event.newListId}`)
  },
  onCardDueDate(event) {
    console.log(`Due date changed on: ${event.card.name}`)
  },
  onChecklistChanged(event) {
    console.log(`Checklist ${event.changeType}: ${event.checklistId}`)
  },
})

// Start background sync
await sdk.startSync()

// Mutations emit events on success
const board = await sdk.createBoard({ name: 'My Board' })
const card = await sdk.createCard({ name: 'Task 1', idList: 'list-id' })

// Manual sync (works whether poller is running or not)
await sdk.sync()

// Cleanup
sdk.destroy()
```

## API

### Factory

| Method | Description |
|--------|-------------|
| `TrelloSDK.create(config)` | Create a new SDK instance. `config` accepts `key`, `token`, optional `dbPath`, and optional `syncIntervalMs`. |

### Subscription

| Method | Description |
|--------|-------------|
| `subscribe(subscriber)` | Register an account-level event subscriber. |
| `unsubscribe(subscriber)` | Remove an account-level subscriber. |
| `subscribeToBoard(boardId, subscriber)` | Register a board-level event subscriber. |
| `unsubscribeFromBoard(boardId, subscriber)` | Remove a board-level subscriber. |

### Sync control

| Method | Description |
|--------|-------------|
| `startSync()` | Start the background sync poller. Runs an immediate sync first. |
| `stopSync()` | Stop the background sync poller. |
| `sync()` | Run a one-shot sync. Works whether the poller is running or not. |
| `isSyncing` | Whether the sync poller is active. |

### Mutations (emit events on success)

| Method | Event emitted |
|--------|---------------|
| `createBoard(params)` | `BoardCreatedEvent` |
| `updateBoard(id, params)` | `BoardUpdatedEvent` |
| `closeBoard(id)` | `BoardClosedEvent` |
| `deleteBoard(id)` | `BoardDeletedEvent` |
| `createCard(params)` | `CardCreatedEvent` |
| `updateCard(id, params)` | `CardUpdatedEvent` |
| `moveCard(id, idList, pos?)` | `CardMovedEvent` |
| `archiveCard(id)` | `CardArchivedEvent` |
| `deleteCard(id)` | `CardDeletedEvent` |

### Read-only methods (no events)

`getBoard`, `getMyBoards`, `getBoardLists`, `getBoardCards`, `getBoardMembers`, `getBoardLabels`, `getCard`, `getMe`

### Additional operations (no events, future extension)

`createList`, `updateList`, `createLabel`, `updateLabel`, `deleteLabel`, `createChecklist`, `createCheckItem`, `updateCheckItem`, `addComment`, `getCardAttachments`, `addAttachment`

### Cleanup

| Method | Description |
|--------|-------------|
| `destroy()` | Stop sync, close DB, clear all subscribers. Safe to call multiple times. |

## Event types

### Account events

| Event | Fields |
|-------|--------|
| `BoardCreatedEvent` | `board`, `source`, `timestamp` |
| `BoardClosedEvent` | `board`, `source`, `timestamp` |
| `BoardUpdatedEvent` | `board`, `source`, `timestamp` |
| `BoardDeletedEvent` | `boardId`, `source`, `timestamp` |

### Board events

| Event | Fields |
|-------|--------|
| `CardCreatedEvent` | `card`, `source`, `timestamp` |
| `CardUpdatedEvent` | `card`, `source`, `timestamp` |
| `CardMovedEvent` | `card`, `previousListId`, `newListId`, `source`, `timestamp` |
| `CardArchivedEvent` | `card`, `source`, `timestamp` |
| `CardDeletedEvent` | `cardId`, `boardId`, `source`, `timestamp` |
| `CardDueDateEvent` | `card`, `source`, `timestamp` |
| `ChecklistChangedEvent` | `cardId`, `boardId`, `checklistId`, `changeType`, `source`, `timestamp` |

All subscriber methods are optional -- implement only the events you care about.

## Subscriber interfaces

```typescript
interface AccountEventSubscriber {
  onBoardCreated?(event: BoardCreatedEvent): void
  onBoardClosed?(event: BoardClosedEvent): void
  onBoardUpdated?(event: BoardUpdatedEvent): void
  onBoardDeleted?(event: BoardDeletedEvent): void
}

interface BoardEventSubscriber {
  onCardCreated?(event: CardCreatedEvent): void
  onCardUpdated?(event: CardUpdatedEvent): void
  onCardMoved?(event: CardMovedEvent): void
  onCardArchived?(event: CardArchivedEvent): void
  onCardDeleted?(event: CardDeletedEvent): void
  onCardDueDate?(event: CardDueDateEvent): void
  onChecklistChanged?(event: ChecklistChangedEvent): void
}
```

## Internals (not exported)

The SDK encapsulates these components -- consumers never interact with them directly:

- **TrelloApiClient** -- typed wrapper around `trello.js` with error normalization and transparent pagination
- **SQLite database** -- 12-table schema with WAL mode, soft-deletes, and version resolution
- **Sync engine** -- state reconciliation (fetch current Trello state, upsert with change detection, soft-delete missing entities)
- **EventDispatcher** -- synchronous dispatch with catch-and-continue (a throwing subscriber does not block others)

## Setup

```bash
npm install
cp .env.example .env
# Add your Trello API key and token to .env
```

Get your API credentials from [trello.com/power-ups/admin](https://trello.com/power-ups/admin).

## License

ISC
