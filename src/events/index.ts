// Event types (public)
export type {
  EventSource,
  BoardCreatedEvent,
  BoardClosedEvent,
  BoardUpdatedEvent,
  BoardDeletedEvent,
  AccountEvent,
  CardCreatedEvent,
  CardUpdatedEvent,
  CardMovedEvent,
  CardArchivedEvent,
  CardDeletedEvent,
  CardDueDateEvent,
  ChecklistChangeType,
  ChecklistChangedEvent,
  BoardEvent,
} from './types.js'

// Subscriber interfaces (public)
export type {
  AccountEventSubscriber,
  BoardEventSubscriber,
} from './subscribers.js'

// Dispatcher (internal — re-exported here but NOT from the SDK's top-level barrel)
export { EventDispatcher } from './dispatcher.js'
