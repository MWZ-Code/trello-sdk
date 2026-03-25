/**
 * Repository — CRUD operations on the local SQLite cache.
 * All upserts follow the version resolution rules:
 * - Cards/Boards: only upsert if incoming dateLastActivity >= local
 * - Everything else: incoming sync is authoritative
 *
 * Upsert functions return change indicators for event emission.
 */

import type Database from 'better-sqlite3'
import type { BoardUpsertResult, CardUpsertResult, UpsertResult } from '../sync/types.js'

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------

export function upsertBoard(db: Database.Database, board: any): BoardUpsertResult {
  const existing = db
    .prepare('SELECT date_last_activity, closed FROM boards WHERE id = ? AND deleted_at IS NULL')
    .get(board.id) as { date_last_activity: string | null; closed: number } | undefined

  // Version resolution: skip if local is newer
  if (existing?.date_last_activity && board.dateLastActivity) {
    if (new Date(existing.date_last_activity) > new Date(board.dateLastActivity)) {
      return { changed: false, isNew: false }
    }
  }

  const isNew = !existing

  db.prepare(`
    INSERT INTO boards (id, name, desc, closed, id_organization, id_member_creator, url, short_url, short_link, date_last_activity, date_last_view, prefs, label_names, deleted_at)
    VALUES (@id, @name, @desc, @closed, @idOrganization, @idMemberCreator, @url, @shortUrl, @shortLink, @dateLastActivity, @dateLastView, @prefs, @labelNames, NULL)
    ON CONFLICT(id) DO UPDATE SET
      name = @name,
      desc = @desc,
      closed = @closed,
      id_organization = @idOrganization,
      id_member_creator = @idMemberCreator,
      url = @url,
      short_url = @shortUrl,
      short_link = @shortLink,
      date_last_activity = @dateLastActivity,
      date_last_view = @dateLastView,
      prefs = @prefs,
      label_names = @labelNames,
      deleted_at = NULL
  `).run({
    id: board.id,
    name: board.name ?? '',
    desc: board.desc ?? '',
    closed: board.closed ? 1 : 0,
    idOrganization: board.idOrganization ?? null,
    idMemberCreator: board.idMemberCreator ?? null,
    url: board.url ?? null,
    shortUrl: board.shortUrl ?? null,
    shortLink: board.shortLink ?? null,
    dateLastActivity: board.dateLastActivity ?? null,
    dateLastView: board.dateLastView ?? null,
    prefs: board.prefs ? JSON.stringify(board.prefs) : null,
    labelNames: board.labelNames ? JSON.stringify(board.labelNames) : null,
  })

  return {
    changed: true,
    isNew,
    previousClosed: existing ? existing.closed === 1 : undefined,
  }
}

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

export function upsertList(db: Database.Database, list: any): UpsertResult {
  const existing = db
    .prepare('SELECT id FROM lists WHERE id = ? AND deleted_at IS NULL')
    .get(list.id)

  db.prepare(`
    INSERT INTO lists (id, name, closed, id_board, pos, deleted_at)
    VALUES (@id, @name, @closed, @idBoard, @pos, NULL)
    ON CONFLICT(id) DO UPDATE SET
      name = @name,
      closed = @closed,
      id_board = @idBoard,
      pos = @pos,
      deleted_at = NULL
  `).run({
    id: list.id,
    name: list.name ?? '',
    closed: list.closed ? 1 : 0,
    idBoard: list.idBoard,
    pos: list.pos ?? 0,
  })

  return { changed: true, isNew: !existing }
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export function upsertCard(db: Database.Database, card: any): CardUpsertResult {
  const existing = db
    .prepare('SELECT date_last_activity, id_list, closed, due FROM cards WHERE id = ? AND deleted_at IS NULL')
    .get(card.id) as { date_last_activity: string | null; id_list: string; closed: number; due: string | null } | undefined

  // Version resolution: skip if local is newer
  if (existing?.date_last_activity && card.dateLastActivity) {
    if (new Date(existing.date_last_activity) > new Date(card.dateLastActivity)) {
      return { changed: false, isNew: false }
    }
  }

  const isNew = !existing

  db.prepare(`
    INSERT INTO cards (id, name, desc, closed, id_board, id_list, pos, due, due_complete, date_last_activity, url, short_url, short_link, id_short, start, id_attachment_cover, cover, badges, deleted_at)
    VALUES (@id, @name, @desc, @closed, @idBoard, @idList, @pos, @due, @dueComplete, @dateLastActivity, @url, @shortUrl, @shortLink, @idShort, @start, @idAttachmentCover, @cover, @badges, NULL)
    ON CONFLICT(id) DO UPDATE SET
      name = @name,
      desc = @desc,
      closed = @closed,
      id_board = @idBoard,
      id_list = @idList,
      pos = @pos,
      due = @due,
      due_complete = @dueComplete,
      date_last_activity = @dateLastActivity,
      url = @url,
      short_url = @shortUrl,
      short_link = @shortLink,
      id_short = @idShort,
      start = @start,
      id_attachment_cover = @idAttachmentCover,
      cover = @cover,
      badges = @badges,
      deleted_at = NULL
  `).run({
    id: card.id,
    name: card.name ?? '',
    desc: card.desc ?? '',
    closed: card.closed ? 1 : 0,
    idBoard: card.idBoard,
    idList: card.idList,
    pos: card.pos ?? 0,
    due: card.due ?? null,
    dueComplete: card.dueComplete ? 1 : 0,
    dateLastActivity: card.dateLastActivity ?? null,
    url: card.url ?? null,
    shortUrl: card.shortUrl ?? null,
    shortLink: card.shortLink ?? null,
    idShort: card.idShort ?? null,
    start: card.start ?? null,
    idAttachmentCover: card.idAttachmentCover ?? null,
    cover: card.cover ? JSON.stringify(card.cover) : null,
    badges: card.badges ? JSON.stringify(card.badges) : null,
  })

  // Sync card<->member join table
  if (Array.isArray(card.idMembers)) {
    syncCardMembers(db, card.id, card.idMembers)
  }

  // Sync card<->label join table
  if (Array.isArray(card.idLabels)) {
    syncCardLabels(db, card.id, card.idLabels)
  }

  return {
    changed: true,
    isNew,
    previousListId: existing?.id_list,
    previousClosed: existing ? existing.closed === 1 : undefined,
    previousDue: existing ? existing.due : undefined,
  }
}

function syncCardMembers(db: Database.Database, cardId: string, memberIds: string[]): void {
  db.prepare('DELETE FROM card_members WHERE card_id = ?').run(cardId)
  const insert = db.prepare('INSERT OR IGNORE INTO card_members (card_id, member_id) VALUES (?, ?)')
  for (const memberId of memberIds) {
    insert.run(cardId, memberId)
  }
}

function syncCardLabels(db: Database.Database, cardId: string, labelIds: string[]): void {
  db.prepare('DELETE FROM card_labels WHERE card_id = ?').run(cardId)
  const insert = db.prepare('INSERT OR IGNORE INTO card_labels (card_id, label_id) VALUES (?, ?)')
  for (const labelId of labelIds) {
    insert.run(cardId, labelId)
  }
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function upsertMember(db: Database.Database, member: any): UpsertResult {
  const existing = db
    .prepare('SELECT id FROM members WHERE id = ? AND deleted_at IS NULL')
    .get(member.id)

  db.prepare(`
    INSERT INTO members (id, username, full_name, avatar_hash, avatar_url, initials, member_type, url, deleted_at)
    VALUES (@id, @username, @fullName, @avatarHash, @avatarUrl, @initials, @memberType, @url, NULL)
    ON CONFLICT(id) DO UPDATE SET
      username = @username,
      full_name = @fullName,
      avatar_hash = @avatarHash,
      avatar_url = @avatarUrl,
      initials = @initials,
      member_type = @memberType,
      url = @url,
      deleted_at = NULL
  `).run({
    id: member.id,
    username: member.username ?? null,
    fullName: member.fullName ?? null,
    avatarHash: member.avatarHash ?? null,
    avatarUrl: member.avatarUrl ?? null,
    initials: member.initials ?? null,
    memberType: member.memberType ?? null,
    url: member.url ?? null,
  })

  return { changed: true, isNew: !existing }
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export function upsertLabel(db: Database.Database, label: any): UpsertResult {
  const existing = db
    .prepare('SELECT id FROM labels WHERE id = ? AND deleted_at IS NULL')
    .get(label.id)

  db.prepare(`
    INSERT INTO labels (id, name, color, id_board, deleted_at)
    VALUES (@id, @name, @color, @idBoard, NULL)
    ON CONFLICT(id) DO UPDATE SET
      name = @name,
      color = @color,
      id_board = @idBoard,
      deleted_at = NULL
  `).run({
    id: label.id,
    name: label.name ?? '',
    color: label.color ?? null,
    idBoard: label.idBoard,
  })

  return { changed: true, isNew: !existing }
}

// ---------------------------------------------------------------------------
// Checklists
// ---------------------------------------------------------------------------

export function upsertChecklist(db: Database.Database, checklist: any): UpsertResult {
  const existing = db
    .prepare('SELECT id FROM checklists WHERE id = ? AND deleted_at IS NULL')
    .get(checklist.id)

  db.prepare(`
    INSERT INTO checklists (id, name, id_board, id_card, pos, deleted_at)
    VALUES (@id, @name, @idBoard, @idCard, @pos, NULL)
    ON CONFLICT(id) DO UPDATE SET
      name = @name,
      id_board = @idBoard,
      id_card = @idCard,
      pos = @pos,
      deleted_at = NULL
  `).run({
    id: checklist.id,
    name: checklist.name ?? '',
    idBoard: checklist.idBoard,
    idCard: checklist.idCard,
    pos: checklist.pos ?? 0,
  })

  // Sync check items if present
  if (Array.isArray(checklist.checkItems)) {
    for (const item of checklist.checkItems) {
      upsertCheckItem(db, { ...item, idChecklist: checklist.id })
    }
  }

  return { changed: true, isNew: !existing }
}

export function upsertCheckItem(db: Database.Database, item: any): UpsertResult {
  const existing = db
    .prepare('SELECT id FROM check_items WHERE id = ? AND deleted_at IS NULL')
    .get(item.id)

  db.prepare(`
    INSERT INTO check_items (id, name, state, id_checklist, pos, deleted_at)
    VALUES (@id, @name, @state, @idChecklist, @pos, NULL)
    ON CONFLICT(id) DO UPDATE SET
      name = @name,
      state = @state,
      id_checklist = @idChecklist,
      pos = @pos,
      deleted_at = NULL
  `).run({
    id: item.id,
    name: item.name ?? '',
    state: item.state ?? 'incomplete',
    idChecklist: item.idChecklist,
    pos: typeof item.pos === 'number' ? item.pos : parseFloat(item.pos) || 0,
  })

  return { changed: true, isNew: !existing }
}

// ---------------------------------------------------------------------------
// Board members join table
// ---------------------------------------------------------------------------

export function syncBoardMembers(
  db: Database.Database,
  boardId: string,
  members: any[],
): void {
  db.prepare('DELETE FROM board_members WHERE board_id = ?').run(boardId)
  const insert = db.prepare(
    'INSERT OR IGNORE INTO board_members (board_id, member_id, member_type) VALUES (?, ?, ?)',
  )
  for (const m of members) {
    insert.run(boardId, m.id, m.memberType ?? null)
  }
}

// ---------------------------------------------------------------------------
// Soft-delete: mark entities missing from Trello as deleted
// ---------------------------------------------------------------------------

export function softDeleteMissing(
  db: Database.Database,
  table: string,
  boardIdColumn: string,
  boardId: string,
  activeIds: string[],
): string[] {
  const now = new Date().toISOString()

  // Find IDs that will be soft-deleted before we update them
  let deletedIds: string[]
  if (activeIds.length === 0) {
    deletedIds = (db.prepare(
      `SELECT id FROM ${table} WHERE ${boardIdColumn} = ? AND deleted_at IS NULL`,
    ).all(boardId) as { id: string }[]).map(r => r.id)

    if (deletedIds.length > 0) {
      db.prepare(
        `UPDATE ${table} SET deleted_at = ? WHERE ${boardIdColumn} = ? AND deleted_at IS NULL`,
      ).run(now, boardId)
    }
  } else {
    const placeholders = activeIds.map(() => '?').join(',')
    deletedIds = (db.prepare(
      `SELECT id FROM ${table} WHERE ${boardIdColumn} = ? AND id NOT IN (${placeholders}) AND deleted_at IS NULL`,
    ).all(boardId, ...activeIds) as { id: string }[]).map(r => r.id)

    if (deletedIds.length > 0) {
      db.prepare(
        `UPDATE ${table} SET deleted_at = ? WHERE ${boardIdColumn} = ? AND id NOT IN (${placeholders}) AND deleted_at IS NULL`,
      ).run(now, boardId, ...activeIds)
    }
  }

  return deletedIds
}

// ---------------------------------------------------------------------------
// Sync metadata
// ---------------------------------------------------------------------------

export function getSyncMeta(
  db: Database.Database,
  boardId: string,
): { last_synced: string | null; last_activity: string | null; sync_status: string } | undefined {
  return db.prepare('SELECT * FROM sync_meta WHERE board_id = ?').get(boardId) as any
}

export function upsertSyncMeta(
  db: Database.Database,
  boardId: string,
  lastActivity: string | null,
): void {
  db.prepare(`
    INSERT INTO sync_meta (board_id, last_synced, last_activity, sync_status)
    VALUES (?, ?, ?, 'idle')
    ON CONFLICT(board_id) DO UPDATE SET
      last_synced = ?,
      last_activity = ?,
      sync_status = 'idle'
  `).run(boardId, new Date().toISOString(), lastActivity, new Date().toISOString(), lastActivity)
}

// ---------------------------------------------------------------------------
// Query helpers (filter out soft-deleted by default)
// ---------------------------------------------------------------------------

export function getBoard(db: Database.Database, id: string): any {
  return db.prepare('SELECT * FROM boards WHERE id = ? AND deleted_at IS NULL').get(id)
}

export function getListsForBoard(db: Database.Database, boardId: string): any[] {
  return db.prepare('SELECT * FROM lists WHERE id_board = ? AND deleted_at IS NULL ORDER BY pos').all(boardId)
}

export function getCardsForBoard(db: Database.Database, boardId: string): any[] {
  return db.prepare('SELECT * FROM cards WHERE id_board = ? AND deleted_at IS NULL ORDER BY pos').all(boardId)
}

export function getCardsForList(db: Database.Database, listId: string): any[] {
  return db.prepare('SELECT * FROM cards WHERE id_list = ? AND deleted_at IS NULL ORDER BY pos').all(listId)
}

export function getLabelsForBoard(db: Database.Database, boardId: string): any[] {
  return db.prepare('SELECT * FROM labels WHERE id_board = ? AND deleted_at IS NULL').all(boardId)
}

export function getMembersForBoard(db: Database.Database, boardId: string): any[] {
  return db
    .prepare(
      `SELECT m.* FROM members m
       JOIN board_members bm ON m.id = bm.member_id
       WHERE bm.board_id = ? AND m.deleted_at IS NULL`,
    )
    .all(boardId)
}

export function getChecklistsForCard(db: Database.Database, cardId: string): any[] {
  return db.prepare('SELECT * FROM checklists WHERE id_card = ? AND deleted_at IS NULL ORDER BY pos').all(cardId)
}

export function getCheckItemsForChecklist(db: Database.Database, checklistId: string): any[] {
  return db.prepare('SELECT * FROM check_items WHERE id_checklist = ? AND deleted_at IS NULL ORDER BY pos').all(checklistId)
}
