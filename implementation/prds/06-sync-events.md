# PRD 06: Sync-Triggered Event Emission

**Status:** Complete
**Depends on:** PRD 05 (TrelloSDK with event dispatcher wired in)

## Problem Description

The sync engine currently fetches Trello state and upserts into SQLite silently — consumers have no way to know what changed. This PRD modifies the sync pipeline to detect overwrites (remote state differs from local) and emit the appropriate events through the SDK's event dispatcher. Combined with the mutation-ack events from PRD 05, this completes the event coverage: consumers are notified of all state changes regardless of origin.

## Current State

### Repository upsert functions (`src/db/repository.ts`)

```typescript
// Boards — version resolution: skip if local dateLastActivity is newer
export function upsertBoard(db, board): void { ... }

// Cards — same version resolution
export function upsertCard(db, card): void { ... }

// Lists, Members, Labels, Checklists — incoming sync is authoritative, always overwrite
export function upsertList(db, list): void { ... }
export function upsertMember(db, member): void { ... }
export function upsertLabel(db, label): void { ... }
export function upsertChecklist(db, checklist): void { ... }

// Soft-delete entities missing from Trello response
export function softDeleteMissing(db, table, boardIdColumn, boardId, activeIds): void { ... }
```

All upsert functions return `void` — no indication of whether an overwrite occurred or what changed.

### Sync engine (`src/sync/engine.ts`)

```typescript
export async function syncBoard(db, api, boardId): Promise<SyncResult> { ... }
// SyncResult only has counts: { lists: number, cards: number, ... }
// No change tracking
```

### Sync poller (`src/sync/poller.ts`)

```typescript
class SyncPoller {
  // onSync callback receives SyncResult[] — counts only, no change details
}
```

## Requirements

### Functional

1. **Modify upsert functions to return change indicators** (`src/db/repository.ts`):
   - `upsertBoard()` → returns `{ changed: boolean; isNew: boolean; previous?: BoardRow }`
   - `upsertCard()` → returns `{ changed: boolean; isNew: boolean; previous?: CardRow }` where `previous` captures the pre-upsert state (needed to detect list changes for `CardMovedEvent`)
   - `upsertList()` → returns `{ changed: boolean; isNew: boolean }`
   - Other upserts: return `{ changed: boolean; isNew: boolean }` (checklist changes are detected at the card level)
   - `softDeleteMissing()` → returns `string[]` (IDs of entities that were soft-deleted)

2. **Define a `SyncChangeSet` type** (`src/sync/engine.ts` or `src/sync/types.ts`):
   ```typescript
   interface SyncChangeSet {
     boardId: string
     boards: {
       created: Board[]
       updated: Board[]
       closed: Board[]     // board.closed went from false to true
       deleted: string[]   // soft-deleted board IDs
     }
     cards: {
       created: Card[]
       updated: Card[]
       moved: Array<{ card: Card; previousListId: string; newListId: string }>
       archived: Card[]    // card.closed went from false to true
       deleted: string[]   // soft-deleted card IDs
       dueDateChanged: Card[]  // due date field changed
       checklistChanged: Array<{
         cardId: string
         checklistId: string
         changeType: 'item_added' | 'item_removed' | 'item_completed' | 'item_uncompleted' | 'checklist_created' | 'checklist_deleted'
       }>
     }
   }
   ```

3. **Modify `syncBoard()`** to build a `SyncChangeSet`:
   - Use upsert return values to categorize each entity change
   - For cards: compare `previous.id_list` with current `idList` to detect moves; compare `previous.closed` to detect archival; compare `previous.due` to detect due date changes
   - For soft-deleted entities: categorize as deleted events
   - Return `SyncChangeSet` alongside the existing `SyncResult`

4. **Map `SyncChangeSet` to events and dispatch**:
   - After `syncBoard()` returns, the SDK (or a new integration point) maps each change to the appropriate event type with `source: 'sync'`
   - Board-level changes → dispatch as account events (all account subscribers)
   - Card-level changes → dispatch as board events (only that board's subscribers)
   - New boards appearing in sync → `BoardCreatedEvent` with `source: 'sync'`
   - Boards soft-deleted in sync → `BoardDeletedEvent` with `source: 'sync'`
   - New cards appearing in sync → `CardCreatedEvent` with `source: 'sync'`
   - Card list changed → `CardMovedEvent` with `source: 'sync'`
   - Card closed → `CardArchivedEvent` with `source: 'sync'`
   - Cards soft-deleted → `CardDeletedEvent` with `source: 'sync'`

5. **Wire into `TrelloSDK`**:
   - The SDK's `sync()` and poller's `onSync` callback must invoke the change-to-event mapping
   - Ensure events are dispatched AFTER the transaction commits (not during)

### Non-Functional

1. Sync performance must not regress significantly — the additional SELECT before each upsert (to capture previous state) adds overhead, but within the same transaction it should be fast on SQLite
2. If no subscribers are registered for a board, skip change tracking for that board's cards (optimization, not required in v1)

## Impacted Files

| File / Module | Change Type | Notes |
|---|---|---|
| `src/db/repository.ts` | **modify** | All upsert functions return change indicators instead of void |
| `src/sync/engine.ts` | **modify** | Build SyncChangeSet from upsert results |
| `src/sync/types.ts` | **create** | SyncChangeSet type definition |
| `src/sync/index.ts` | **modify** | Re-export new types |
| `src/sdk.ts` | **modify** | Wire sync results to event dispatcher |
| `src/sync/poller.ts` | **modify** | Pass SyncChangeSet through onSync callback |

## Constraints

- Upsert return values must be derived from the database state, not inferred — always SELECT before UPDATE to get the previous row
- Events are dispatched after the sync transaction commits, not during
- Do not change the sync engine's overall strategy (state reconciliation, single transaction per board)
- `SyncChangeSet` is an internal type — not exported from the SDK's public barrel

## Success Criteria

1. `upsertBoard()` returns `{ changed: true, isNew: false }` when overwriting a board with newer `dateLastActivity`
2. `upsertCard()` returns `{ changed: true, isNew: false, previous: { id_list: 'old-list' } }` when a card's list changed
3. `softDeleteMissing()` returns the IDs of deleted entities
4. After a sync where a card moved from list A to list B, the board's `BoardEventSubscriber.onCardMoved()` is called with `previousListId` and `newListId`
5. After a sync where a new card appears, `onCardCreated()` is called with `source: 'sync'`
6. After a sync where a card is soft-deleted, `onCardDeleted()` is called with `source: 'sync'`
7. Account-level subscribers receive `onBoardUpdated()` when a board's state changes during sync
8. Events are dispatched after the transaction commits — a subscriber reading the DB sees consistent state
9. A board with no subscribers does not cause errors during sync
10. `tsc --noEmit` passes
11. Existing sync tests continue to pass (SyncResult shape is a superset of the old shape)

## Out of Scope

- Checklist-level granular change detection (item added/removed/completed) — defer to a future enhancement unless straightforward to implement alongside card upserts
- List-level events (list created, archived, reordered) — not part of the current subscriber interfaces
- Webhook-based real-time sync (future phase)
- Optimizing away change tracking when no subscribers exist
