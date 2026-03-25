# PRD 04: Event System Foundation

**Status:** Complete
**Depends on:** PRD 02 (API types), PRD 03 (sync engine exists)

## Problem Description

The SDK needs a publisher-subscriber event system as its public interface. Clients subscribe to events and receive callbacks when Trello state changes — either from direct API mutations or from sync-detected overwrites. This PRD establishes the event types, subscriber interfaces, and internal dispatcher that the SDK class (PRD 05) and sync integration (PRD 06) will wire into.

## Current State

- `src/api/types.ts` defines normalized entity types: `Board`, `Card`, `List`, `Label`, `Member`, `Checklist`, `Action`, `Attachment`, `Organization`
- `src/sync/poller.ts` has proto-pub-sub via `onSync`/`onError` callbacks, but not event-typed
- `src/clients/` exists but is scheduled for deletion (PRD 05)
- No event system, subscriber interfaces, or dispatcher exist

## Requirements

### Functional

1. **Event types** (`src/events/types.ts`):
   - Every event carries a `source` discriminator: `'mutation'` (from API ack) or `'sync'` (from sync overwrite detection)
   - Every event carries a `timestamp: string` (ISO 8601)
   - **Account-level events** (board lifecycle):
     - `BoardCreatedEvent` — carries the created `Board`
     - `BoardClosedEvent` — carries the closed `Board`
     - `BoardUpdatedEvent` — carries the updated `Board`
     - `BoardDeletedEvent` — carries the `boardId: string`
   - **Board-level events** (card mutations):
     - `CardCreatedEvent` — carries the created `Card`
     - `CardUpdatedEvent` — carries the updated `Card`
     - `CardMovedEvent` — carries the `Card` + `previousListId: string` + `newListId: string`
     - `CardArchivedEvent` — carries the archived `Card`
     - `CardDeletedEvent` — carries the `cardId: string` + `boardId: string`
     - `CardDueDateEvent` — carries the `Card` (due date was set, changed, or hit)
     - `ChecklistChangedEvent` — carries `cardId: string`, `boardId: string`, `checklistId: string`, and a `changeType: 'item_added' | 'item_removed' | 'item_completed' | 'item_uncompleted' | 'checklist_created' | 'checklist_deleted'`
   - Union types: `AccountEvent` (union of all board lifecycle events), `BoardEvent` (union of all card mutation events)

2. **Subscriber interfaces** (`src/events/subscribers.ts`):
   - `AccountEventSubscriber` — interface with optional callback methods, one per account event type:
     - `onBoardCreated?(event: BoardCreatedEvent): void`
     - `onBoardClosed?(event: BoardClosedEvent): void`
     - `onBoardUpdated?(event: BoardUpdatedEvent): void`
     - `onBoardDeleted?(event: BoardDeletedEvent): void`
   - `BoardEventSubscriber` — interface with optional callback methods, one per board event type:
     - `onCardCreated?(event: CardCreatedEvent): void`
     - `onCardUpdated?(event: CardUpdatedEvent): void`
     - `onCardMoved?(event: CardMovedEvent): void`
     - `onCardArchived?(event: CardArchivedEvent): void`
     - `onCardDeleted?(event: CardDeletedEvent): void`
     - `onCardDueDate?(event: CardDueDateEvent): void`
     - `onChecklistChanged?(event: ChecklistChangedEvent): void`
   - All methods are optional — consumers implement only what they care about

3. **Event dispatcher** (`src/events/dispatcher.ts`):
   - Internal class (not exported from SDK public API)
   - `addAccountSubscriber(subscriber: AccountEventSubscriber): void`
   - `removeAccountSubscriber(subscriber: AccountEventSubscriber): void`
   - `addBoardSubscriber(boardId: string, subscriber: BoardEventSubscriber): void`
   - `removeBoardSubscriber(boardId: string, subscriber: BoardEventSubscriber): void`
   - `dispatchAccountEvent(event: AccountEvent): void` — iterates all account subscribers, calls the matching `on*` method if defined
   - `dispatchBoardEvent(boardId: string, event: BoardEvent): void` — iterates only that board's subscribers, calls the matching `on*` method if defined
   - Synchronous invocation — callbacks are called inline, not queued
   - A subscriber callback throwing must NOT prevent other subscribers from being notified (catch and continue)

4. **Barrel export** (`src/events/index.ts`):
   - Export all event types and subscriber interfaces (public)
   - Export `EventDispatcher` (internal — re-exported only from `src/events/index.ts`, NOT from the SDK's top-level barrel)

### Non-Functional

1. Dispatcher must handle 0 subscribers without error
2. Dispatcher must handle a subscriber that only implements 1 of N methods without error
3. A throwing subscriber must not block other subscribers

## Impacted Files

| File / Module | Change Type | Notes |
|---|---|---|
| `src/events/types.ts` | **create** | All event type definitions |
| `src/events/subscribers.ts` | **create** | AccountEventSubscriber and BoardEventSubscriber interfaces |
| `src/events/dispatcher.ts` | **create** | Internal EventDispatcher class |
| `src/events/index.ts` | **create** | Barrel export |
| `src/api/types.ts` | no change | Entity types imported by event types |

## Constraints

- Event types must import entity types from `src/api/types.ts` — no duplication
- Dispatcher is synchronous — no async, no queuing, no retry
- Subscriber interfaces use optional methods, not a base class with empty defaults
- Dispatcher is an internal module — not part of the SDK's public API surface

## Success Criteria

1. All 11 event types compile and carry the specified fields
2. `AccountEventSubscriber` and `BoardEventSubscriber` interfaces accept partial implementations (only some methods defined)
3. `EventDispatcher` correctly routes account events to all account subscribers
4. `EventDispatcher` correctly routes board events only to that board's subscribers (not other boards)
5. A subscriber implementing only `onCardMoved` does not throw when `onCardCreated` fires
6. A throwing subscriber does not prevent subsequent subscribers from receiving the event
7. `tsc --noEmit` passes

## Out of Scope

- Wiring events into the SDK class (PRD 05)
- Wiring events into the sync engine (PRD 06)
- Async event delivery, queuing, or retry
- Event persistence or replay
