// SDK entry point
export { TrelloSDK } from './sdk.js'
export type { TrelloSDKConfig } from './sdk.js'

// Subscriber interfaces
export type {
  AccountEventSubscriber,
  BoardEventSubscriber,
} from './events/subscribers.js'

// Event types
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
} from './events/types.js'

// Entity types (from API layer — public for consumers to type their data)
export type {
  Board,
  Card,
  List,
  Label,
  Action,
  Attachment,
  CheckItem,
} from './api/types.js'
export type { Member, Checklist, Organization } from './api/types.js'

// Error types
export {
  TrelloApiError,
  TrelloAuthError,
  TrelloNotFoundError,
  TrelloRateLimitError,
} from './api/errors.js'
