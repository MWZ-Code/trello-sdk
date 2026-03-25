/**
 * Normalized response types for the Trello API client.
 *
 * These re-export or extend trello.js model types where they're already good,
 * and define our own where trello.js types are too loose.
 */

// Re-export well-typed models from trello.js directly
export type {
  Board,
  Card,
  Action,
  Attachment,
  CheckItem,
} from 'trello.js/out/api/models'

// trello.js List type is fine
export type { List } from 'trello.js/out/api/models'

// trello.js Member type has everything optional — we tighten the common fields
export interface Member {
  id: string
  username: string
  fullName?: string
  avatarHash?: string
  avatarUrl?: string
  initials?: string
  memberType?: string
  url?: string
  bio?: string
  idOrganizations?: string[]
  idBoards?: string[]
}

// trello.js Label type has everything optional — we tighten it
export interface Label {
  id: string
  idBoard: string
  name: string
  color: string | null
}

// trello.js Checklist is basically empty — define our own
export interface Checklist {
  id: string
  name: string
  idBoard: string
  idCard: string
  pos: number
  checkItems: CheckItem[]
}

// Organization/Workspace
export interface Organization {
  id: string
  name: string
  displayName?: string
  desc?: string
  url?: string
  website?: string | null
}

// Batch response shape
export interface BatchResponse<T = unknown> {
  statusCode: number
  body: T
}
