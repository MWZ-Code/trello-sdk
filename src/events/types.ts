/**
 * Event types for the Trello SDK publisher-subscriber system.
 *
 * Every event carries a `source` discriminator indicating whether it originated
 * from a direct API mutation ack or from sync overwrite detection.
 */

import type { Board, Card } from '../api/types.js'

// ---------------------------------------------------------------------------
// Event source
// ---------------------------------------------------------------------------

export type EventSource = 'mutation' | 'sync'

// ---------------------------------------------------------------------------
// Account-level events (board lifecycle)
// ---------------------------------------------------------------------------

export interface BoardCreatedEvent {
  type: 'board:created'
  source: EventSource
  timestamp: string
  board: Board
}

export interface BoardClosedEvent {
  type: 'board:closed'
  source: EventSource
  timestamp: string
  board: Board
}

export interface BoardUpdatedEvent {
  type: 'board:updated'
  source: EventSource
  timestamp: string
  board: Board
}

export interface BoardDeletedEvent {
  type: 'board:deleted'
  source: EventSource
  timestamp: string
  boardId: string
}

export type AccountEvent =
  | BoardCreatedEvent
  | BoardClosedEvent
  | BoardUpdatedEvent
  | BoardDeletedEvent

// ---------------------------------------------------------------------------
// Board-level events (card mutations)
// ---------------------------------------------------------------------------

export interface CardCreatedEvent {
  type: 'card:created'
  source: EventSource
  timestamp: string
  card: Card
}

export interface CardUpdatedEvent {
  type: 'card:updated'
  source: EventSource
  timestamp: string
  card: Card
}

export interface CardMovedEvent {
  type: 'card:moved'
  source: EventSource
  timestamp: string
  card: Card
  previousListId: string
  newListId: string
}

export interface CardArchivedEvent {
  type: 'card:archived'
  source: EventSource
  timestamp: string
  card: Card
}

export interface CardDeletedEvent {
  type: 'card:deleted'
  source: EventSource
  timestamp: string
  cardId: string
  boardId: string
}

export interface CardDueDateEvent {
  type: 'card:due_date'
  source: EventSource
  timestamp: string
  card: Card
}

export type ChecklistChangeType =
  | 'item_added'
  | 'item_removed'
  | 'item_completed'
  | 'item_uncompleted'
  | 'checklist_created'
  | 'checklist_deleted'

export interface ChecklistChangedEvent {
  type: 'card:checklist_changed'
  source: EventSource
  timestamp: string
  cardId: string
  boardId: string
  checklistId: string
  changeType: ChecklistChangeType
}

export type BoardEvent =
  | CardCreatedEvent
  | CardUpdatedEvent
  | CardMovedEvent
  | CardArchivedEvent
  | CardDeletedEvent
  | CardDueDateEvent
  | ChecklistChangedEvent
