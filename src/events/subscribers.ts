/**
 * Subscriber interfaces for the Trello SDK event system.
 *
 * All methods are optional — consumers implement only the events they care about.
 */

import type {
  BoardCreatedEvent,
  BoardClosedEvent,
  BoardUpdatedEvent,
  BoardDeletedEvent,
  CardCreatedEvent,
  CardUpdatedEvent,
  CardMovedEvent,
  CardArchivedEvent,
  CardDeletedEvent,
  CardDueDateEvent,
  ChecklistChangedEvent,
} from './types.js'

export interface AccountEventSubscriber {
  onBoardCreated?(event: BoardCreatedEvent): void
  onBoardClosed?(event: BoardClosedEvent): void
  onBoardUpdated?(event: BoardUpdatedEvent): void
  onBoardDeleted?(event: BoardDeletedEvent): void
}

export interface BoardEventSubscriber {
  onCardCreated?(event: CardCreatedEvent): void
  onCardUpdated?(event: CardUpdatedEvent): void
  onCardMoved?(event: CardMovedEvent): void
  onCardArchived?(event: CardArchivedEvent): void
  onCardDeleted?(event: CardDeletedEvent): void
  onCardDueDate?(event: CardDueDateEvent): void
  onChecklistChanged?(event: ChecklistChangedEvent): void
}
