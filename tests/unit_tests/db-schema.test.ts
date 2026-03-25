import type Database from 'better-sqlite3'
import {
  openMemoryDatabase,
  upsertBoard,
  upsertList,
  upsertCard,
  upsertMember,
  upsertLabel,
  upsertChecklist,
  upsertCheckItem,
  syncBoardMembers,
  softDeleteMissing,
  upsertSyncMeta,
  getSyncMeta,
  getBoard,
  getListsForBoard,
  getCardsForBoard,
  getCardsForList,
  getLabelsForBoard,
  getMembersForBoard,
  getChecklistsForCard,
  getCheckItemsForChecklist,
} from '../../src/db/index.js'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockBoard = {
  id: 'board1',
  name: 'Test',
  desc: '',
  closed: false,
  url: 'https://trello.com/b/x',
  shortUrl: 'https://trello.com/b/x',
  dateLastActivity: '2025-06-01T00:00:00.000Z',
}

const mockList = {
  id: 'list1',
  name: 'To Do',
  closed: false,
  idBoard: 'board1',
  pos: 1024,
}

const mockCard = {
  id: 'card1',
  name: 'Task 1',
  desc: 'desc',
  closed: false,
  idBoard: 'board1',
  idList: 'list1',
  pos: 1024,
  dateLastActivity: '2025-06-01T00:00:00.000Z',
  url: 'https://trello.com/c/x',
  shortUrl: 'https://trello.com/c/x',
  idMembers: ['m1'],
  idLabels: ['l1'],
}

const mockMember = {
  id: 'm1',
  username: 'testuser',
  fullName: 'Test User',
  avatarHash: 'abc123',
  avatarUrl: 'https://trello.com/avatar',
  initials: 'TU',
  memberType: 'normal',
  url: 'https://trello.com/testuser',
}

const mockLabel = {
  id: 'l1',
  name: 'Bug',
  color: 'red',
  idBoard: 'board1',
}

const mockChecklist = {
  id: 'cl1',
  name: 'Steps',
  idBoard: 'board1',
  idCard: 'card1',
  pos: 1024,
  checkItems: [
    { id: 'ci1', name: 'Step 1', state: 'incomplete', pos: 1024 },
    { id: 'ci2', name: 'Step 2', state: 'complete', pos: 2048 },
  ],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Insert all parent entities so FK constraints are satisfied */
function seedParents(db: Database.Database) {
  upsertBoard(db, mockBoard)
  upsertList(db, mockList)
  upsertMember(db, mockMember)
  upsertLabel(db, mockLabel)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Schema', () => {
  let db: Database.Database

  beforeAll(() => {
    db = openMemoryDatabase()
  })
  afterAll(() => db.close())

  test('Creates all tables', () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all()
      .map((r: any) => r.name)

    const expected = [
      'board_members',
      'boards',
      'card_labels',
      'card_members',
      'cards',
      'check_items',
      'checklists',
      'labels',
      'lists',
      'members',
      'schema_version',
      'sync_meta',
    ]
    for (const t of expected) {
      expect(tables).toContain(t)
    }
  })

  test('Schema version is set', () => {
    const row = db.prepare('SELECT version FROM schema_version LIMIT 1').get() as any
    expect(row).toBeDefined()
    expect(row.version).toBe(1)
  })
})

describe('Board upsert', () => {
  let db: Database.Database

  beforeEach(() => {
    db = openMemoryDatabase()
  })
  afterEach(() => db.close())

  test('Insert new board', () => {
    upsertBoard(db, mockBoard)
    const board = getBoard(db, 'board1')
    expect(board).toBeDefined()
    expect(board.name).toBe('Test')
    expect(board.url).toBe('https://trello.com/b/x')
  })

  test('Update existing board', () => {
    upsertBoard(db, mockBoard)
    upsertBoard(db, { ...mockBoard, name: 'Updated' })
    const board = getBoard(db, 'board1')
    expect(board.name).toBe('Updated')
  })

  test('Version resolution — skip stale update', () => {
    upsertBoard(db, { ...mockBoard, dateLastActivity: '2025-01-01T00:00:00.000Z' })
    upsertBoard(db, { ...mockBoard, name: 'Stale', dateLastActivity: '2024-01-01T00:00:00.000Z' })
    const board = getBoard(db, 'board1')
    expect(board.name).toBe('Test')
  })

  test('Version resolution — accept newer update', () => {
    upsertBoard(db, { ...mockBoard, dateLastActivity: '2024-01-01T00:00:00.000Z' })
    upsertBoard(db, { ...mockBoard, name: 'Newer', dateLastActivity: '2025-01-01T00:00:00.000Z' })
    const board = getBoard(db, 'board1')
    expect(board.name).toBe('Newer')
  })
})

describe('List upsert', () => {
  let db: Database.Database

  beforeEach(() => {
    db = openMemoryDatabase()
    upsertBoard(db, mockBoard)
  })
  afterEach(() => db.close())

  test('Insert and retrieve', () => {
    upsertList(db, mockList)
    const lists = getListsForBoard(db, 'board1')
    expect(lists).toHaveLength(1)
    expect(lists[0].name).toBe('To Do')
    expect(lists[0].pos).toBe(1024)
  })

  test('Authoritative overwrite', () => {
    upsertList(db, mockList)
    upsertList(db, { ...mockList, name: 'Done' })
    const lists = getListsForBoard(db, 'board1')
    expect(lists).toHaveLength(1)
    expect(lists[0].name).toBe('Done')
  })
})

describe('Card upsert', () => {
  let db: Database.Database

  beforeEach(() => {
    db = openMemoryDatabase()
    seedParents(db)
  })
  afterEach(() => db.close())

  test('Insert and retrieve', () => {
    upsertCard(db, mockCard)
    const cards = getCardsForBoard(db, 'board1')
    expect(cards).toHaveLength(1)
    expect(cards[0].name).toBe('Task 1')
    expect(cards[0].desc).toBe('desc')

    const listCards = getCardsForList(db, 'list1')
    expect(listCards).toHaveLength(1)
  })

  test('Version resolution', () => {
    upsertCard(db, { ...mockCard, dateLastActivity: '2025-01-01T00:00:00.000Z' })
    // Stale update should be skipped
    upsertCard(db, { ...mockCard, name: 'Stale', dateLastActivity: '2024-01-01T00:00:00.000Z' })
    let card = getCardsForBoard(db, 'board1')[0]
    expect(card.name).toBe('Task 1')

    // Newer update should be accepted
    upsertCard(db, { ...mockCard, name: 'Newer', dateLastActivity: '2026-01-01T00:00:00.000Z' })
    card = getCardsForBoard(db, 'board1')[0]
    expect(card.name).toBe('Newer')
  })

  test('Card members sync', () => {
    upsertCard(db, mockCard)
    const rows = db
      .prepare('SELECT * FROM card_members WHERE card_id = ?')
      .all('card1') as any[]
    expect(rows).toHaveLength(1)
    expect(rows[0].member_id).toBe('m1')
  })

  test('Card labels sync', () => {
    upsertCard(db, mockCard)
    const rows = db
      .prepare('SELECT * FROM card_labels WHERE card_id = ?')
      .all('card1') as any[]
    expect(rows).toHaveLength(1)
    expect(rows[0].label_id).toBe('l1')
  })
})

describe('Members', () => {
  let db: Database.Database

  beforeEach(() => {
    db = openMemoryDatabase()
    upsertBoard(db, mockBoard)
  })
  afterEach(() => db.close())

  test('Upsert member', () => {
    upsertMember(db, mockMember)
    const row = db.prepare('SELECT * FROM members WHERE id = ?').get('m1') as any
    expect(row).toBeDefined()
    expect(row.username).toBe('testuser')
    expect(row.full_name).toBe('Test User')
  })

  test('Board members sync', () => {
    upsertMember(db, mockMember)
    const m2 = { ...mockMember, id: 'm2', username: 'admin', memberType: 'admin' }
    upsertMember(db, m2)
    syncBoardMembers(db, 'board1', [mockMember, m2])

    const members = getMembersForBoard(db, 'board1')
    expect(members).toHaveLength(2)
    const usernames = members.map((m: any) => m.username).sort()
    expect(usernames).toEqual(['admin', 'testuser'])
  })
})

describe('Labels', () => {
  let db: Database.Database

  beforeEach(() => {
    db = openMemoryDatabase()
    upsertBoard(db, mockBoard)
  })
  afterEach(() => db.close())

  test('Upsert and retrieve', () => {
    upsertLabel(db, mockLabel)
    const labels = getLabelsForBoard(db, 'board1')
    expect(labels).toHaveLength(1)
    expect(labels[0].name).toBe('Bug')
    expect(labels[0].color).toBe('red')
  })
})

describe('Checklists', () => {
  let db: Database.Database

  beforeEach(() => {
    db = openMemoryDatabase()
    seedParents(db)
    upsertCard(db, mockCard)
  })
  afterEach(() => db.close())

  test('Upsert checklist with check items', () => {
    upsertChecklist(db, mockChecklist)

    const checklists = getChecklistsForCard(db, 'card1')
    expect(checklists).toHaveLength(1)
    expect(checklists[0].name).toBe('Steps')

    const items = getCheckItemsForChecklist(db, 'cl1')
    expect(items).toHaveLength(2)
    expect(items[0].name).toBe('Step 1')
    expect(items[0].state).toBe('incomplete')
    expect(items[1].name).toBe('Step 2')
    expect(items[1].state).toBe('complete')
  })
})

describe('Soft delete', () => {
  let db: Database.Database

  beforeEach(() => {
    db = openMemoryDatabase()
    upsertBoard(db, mockBoard)
    upsertList(db, { id: 'list1', name: 'A', closed: false, idBoard: 'board1', pos: 1 })
    upsertList(db, { id: 'list2', name: 'B', closed: false, idBoard: 'board1', pos: 2 })
    upsertList(db, { id: 'list3', name: 'C', closed: false, idBoard: 'board1', pos: 3 })
  })
  afterEach(() => db.close())

  test('softDeleteMissing marks absent entities', () => {
    softDeleteMissing(db, 'lists', 'id_board', 'board1', ['list1', 'list2'])

    const row = db.prepare('SELECT deleted_at FROM lists WHERE id = ?').get('list3') as any
    expect(row.deleted_at).not.toBeNull()

    // The kept ones should still have null deleted_at
    const kept1 = db.prepare('SELECT deleted_at FROM lists WHERE id = ?').get('list1') as any
    expect(kept1.deleted_at).toBeNull()
    const kept2 = db.prepare('SELECT deleted_at FROM lists WHERE id = ?').get('list2') as any
    expect(kept2.deleted_at).toBeNull()
  })

  test('Soft-deleted entities excluded from queries', () => {
    softDeleteMissing(db, 'lists', 'id_board', 'board1', ['list1', 'list2'])
    const lists = getListsForBoard(db, 'board1')
    expect(lists).toHaveLength(2)
    const ids = lists.map((l: any) => l.id)
    expect(ids).not.toContain('list3')
  })
})

describe('Sync metadata', () => {
  let db: Database.Database

  beforeEach(() => {
    db = openMemoryDatabase()
  })
  afterEach(() => db.close())

  test('upsertSyncMeta and getSyncMeta', () => {
    upsertSyncMeta(db, 'board1', '2025-06-01T00:00:00.000Z')
    const meta = getSyncMeta(db, 'board1')
    expect(meta).toBeDefined()
    expect(meta!.last_activity).toBe('2025-06-01T00:00:00.000Z')
    expect(meta!.sync_status).toBe('idle')
    expect(meta!.last_synced).toBeDefined()
  })
})

describe('Idempotency', () => {
  let db: Database.Database

  beforeEach(() => {
    db = openMemoryDatabase()
  })
  afterEach(() => db.close())

  test('Double upsert produces identical state', () => {
    // First pass
    seedParents(db)
    upsertList(db, mockList)
    upsertCard(db, mockCard)
    upsertChecklist(db, mockChecklist)
    syncBoardMembers(db, 'board1', [mockMember])
    upsertSyncMeta(db, 'board1', '2025-06-01T00:00:00.000Z')

    // Snapshot after first pass
    const snapshot = () => ({
      boards: db.prepare('SELECT id, name, desc, closed, url FROM boards').all(),
      lists: db.prepare('SELECT id, name, pos FROM lists').all(),
      cards: db.prepare('SELECT id, name, desc, pos FROM cards').all(),
      members: db.prepare('SELECT id, username FROM members').all(),
      labels: db.prepare('SELECT id, name, color FROM labels').all(),
      checklists: db.prepare('SELECT id, name FROM checklists').all(),
      checkItems: db.prepare('SELECT id, name, state FROM check_items').all(),
      cardMembers: db.prepare('SELECT * FROM card_members').all(),
      cardLabels: db.prepare('SELECT * FROM card_labels').all(),
      boardMembers: db.prepare('SELECT board_id, member_id FROM board_members').all(),
    })

    const before = snapshot()

    // Second pass (identical data)
    seedParents(db)
    upsertList(db, mockList)
    upsertCard(db, mockCard)
    upsertChecklist(db, mockChecklist)
    syncBoardMembers(db, 'board1', [mockMember])

    const after = snapshot()

    expect(after).toEqual(before)
  })
})
