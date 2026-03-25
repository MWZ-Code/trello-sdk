/**
 * Types for sync change detection.
 */

import type { Board, Card } from '../api/types.js'

export interface UpsertResult {
  changed: boolean
  isNew: boolean
}

export interface BoardUpsertResult extends UpsertResult {
  previousClosed?: boolean
}

export interface CardUpsertResult extends UpsertResult {
  previousListId?: string
  previousClosed?: boolean
  previousDue?: string | null
}

export interface SyncChangeSet {
  boardId: string
  boards: {
    created: Board[]
    updated: Board[]
    closed: Board[]
    deleted: string[]
  }
  cards: {
    created: Card[]
    updated: Card[]
    moved: Array<{ card: Card; previousListId: string; newListId: string }>
    archived: Card[]
    deleted: string[]
    dueDateChanged: Card[]
  }
}
