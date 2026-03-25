/**
 * Sync engine — orchestrates state reconciliation between Trello and local SQLite.
 *
 * Strategy (Approach B):
 * - Fetch current entity state from Trello
 * - Upsert into local DB with version resolution
 * - Soft-delete entities missing from Trello response
 * - Same code path for initial sync and incremental sync
 */

import type Database from 'better-sqlite3'
import type { TrelloApiClient } from '../api/client.js'
import {
  upsertBoard,
  upsertList,
  upsertCard,
  upsertMember,
  upsertLabel,
  upsertChecklist,
  syncBoardMembers,
  softDeleteMissing,
  upsertSyncMeta,
} from '../db/repository.js'

export interface SyncResult {
  boardId: string
  boardName: string
  lists: number
  cards: number
  members: number
  labels: number
  checklists: number
  syncedAt: string
}

/**
 * Sync a single board: fetch full state from Trello and reconcile with local DB.
 * This is idempotent — running it twice produces the same local state.
 */
export async function syncBoard(
  db: Database.Database,
  api: TrelloApiClient,
  boardId: string,
): Promise<SyncResult> {
  // Fetch all data for this board from Trello
  const [board, lists, cards, members, labels, checklists] = await Promise.all([
    api.getBoard(boardId),
    api.getBoardLists(boardId),
    api.getAllBoardCards(boardId),
    api.getBoardMembers(boardId),
    api.getBoardLabels(boardId),
    api.getBoardChecklists(boardId),
  ])

  // Disable FK checks during sync — Trello data can have cross-board references
  // and reference archived/closed entities not in our local cache.
  db.pragma('foreign_keys = OFF')

  // Apply everything in a single transaction for consistency
  const syncInTransaction = db.transaction(() => {
    // Upsert board
    upsertBoard(db, board)

    // Upsert members first (referenced by cards and board_members)
    for (const member of members) {
      upsertMember(db, member)
    }
    syncBoardMembers(db, boardId, members)

    // Upsert labels before cards (cards reference labels via card_labels join)
    for (const label of labels) {
      upsertLabel(db, label)
    }
    softDeleteMissing(db, 'labels', 'id_board', boardId, labels.map((l: any) => l.id))

    // Upsert lists before cards (cards reference lists via FK)
    for (const list of lists) {
      upsertList(db, list)
    }
    softDeleteMissing(db, 'lists', 'id_board', boardId, lists.map((l: any) => l.id))

    // Upsert cards (depends on lists, labels, members)
    for (const card of cards) {
      upsertCard(db, card)
    }
    softDeleteMissing(db, 'cards', 'id_board', boardId, cards.map((c: any) => c.id))

    // Upsert checklists and soft-delete removed ones
    for (const checklist of checklists) {
      upsertChecklist(db, checklist)
    }
    softDeleteMissing(db, 'checklists', 'id_board', boardId, checklists.map((c: any) => c.id))

    // Update sync metadata
    upsertSyncMeta(db, boardId, board.dateLastActivity ?? null)
  })

  syncInTransaction()

  // Re-enable FK checks after sync
  db.pragma('foreign_keys = ON')

  return {
    boardId,
    boardName: board.name ?? '',
    lists: lists.length,
    cards: cards.length,
    members: members.length,
    labels: labels.length,
    checklists: checklists.length,
    syncedAt: new Date().toISOString(),
  }
}

/**
 * Sync all non-closed boards for the current user.
 * Returns results for each board synced.
 */
export async function syncAllBoards(
  db: Database.Database,
  api: TrelloApiClient,
): Promise<SyncResult[]> {
  const boards = await api.getMyBoards()
  const activeBoards = boards.filter((b: any) => !b.closed)

  const results: SyncResult[] = []
  for (const board of activeBoards) {
    const result = await syncBoard(db, api, board.id)
    results.push(result)
  }

  return results
}
