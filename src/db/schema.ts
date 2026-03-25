/**
 * SQLite schema for the local Trello cache.
 * All entity tables include `deleted_at` for soft-delete support.
 * Schema version is tracked in `schema_version` for migrations.
 */

export const SCHEMA_VERSION = 1

export const SCHEMA_SQL = `
-- Schema versioning
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);

-- Sync metadata per board
CREATE TABLE IF NOT EXISTS sync_meta (
  board_id TEXT PRIMARY KEY,
  last_synced TEXT,           -- ISO 8601 timestamp of last successful sync
  last_activity TEXT,         -- dateLastActivity from Trello at time of last sync
  sync_status TEXT DEFAULT 'idle'  -- idle | syncing | error
);

-- Boards
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  desc TEXT DEFAULT '',
  closed INTEGER DEFAULT 0,
  id_organization TEXT,
  id_member_creator TEXT,
  url TEXT,
  short_url TEXT,
  short_link TEXT,
  date_last_activity TEXT,
  date_last_view TEXT,
  prefs TEXT,                 -- JSON blob for board preferences
  label_names TEXT,           -- JSON blob for label name mapping
  deleted_at TEXT
);

-- Lists
CREATE TABLE IF NOT EXISTS lists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  closed INTEGER DEFAULT 0,
  id_board TEXT NOT NULL,
  pos REAL NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (id_board) REFERENCES boards(id)
);

-- Cards
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  desc TEXT DEFAULT '',
  closed INTEGER DEFAULT 0,
  id_board TEXT NOT NULL,
  id_list TEXT NOT NULL,
  pos REAL NOT NULL,
  due TEXT,
  due_complete INTEGER DEFAULT 0,
  date_last_activity TEXT,
  url TEXT,
  short_url TEXT,
  short_link TEXT,
  id_short INTEGER,
  start TEXT,
  id_attachment_cover TEXT,
  cover TEXT,                 -- JSON blob
  badges TEXT,                -- JSON blob
  deleted_at TEXT,
  FOREIGN KEY (id_board) REFERENCES boards(id),
  FOREIGN KEY (id_list) REFERENCES lists(id)
);

-- Members
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  username TEXT,
  full_name TEXT,
  avatar_hash TEXT,
  avatar_url TEXT,
  initials TEXT,
  member_type TEXT,
  url TEXT,
  deleted_at TEXT
);

-- Labels
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  color TEXT,
  id_board TEXT NOT NULL,
  deleted_at TEXT,
  FOREIGN KEY (id_board) REFERENCES boards(id)
);

-- Checklists
CREATE TABLE IF NOT EXISTS checklists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  id_board TEXT NOT NULL,
  id_card TEXT NOT NULL,
  pos REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  FOREIGN KEY (id_board) REFERENCES boards(id),
  FOREIGN KEY (id_card) REFERENCES cards(id)
);

-- Check items
CREATE TABLE IF NOT EXISTS check_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT DEFAULT 'incomplete',
  id_checklist TEXT NOT NULL,
  pos REAL NOT NULL DEFAULT 0,
  deleted_at TEXT,
  FOREIGN KEY (id_checklist) REFERENCES checklists(id)
);

-- Join: card <-> member (M:N)
CREATE TABLE IF NOT EXISTS card_members (
  card_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  PRIMARY KEY (card_id, member_id),
  FOREIGN KEY (card_id) REFERENCES cards(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Join: card <-> label (M:N)
CREATE TABLE IF NOT EXISTS card_labels (
  card_id TEXT NOT NULL,
  label_id TEXT NOT NULL,
  PRIMARY KEY (card_id, label_id),
  FOREIGN KEY (card_id) REFERENCES cards(id),
  FOREIGN KEY (label_id) REFERENCES labels(id)
);

-- Join: board <-> member (M:N)
CREATE TABLE IF NOT EXISTS board_members (
  board_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  member_type TEXT,           -- admin, normal, observer
  PRIMARY KEY (board_id, member_id),
  FOREIGN KEY (board_id) REFERENCES boards(id),
  FOREIGN KEY (member_id) REFERENCES members(id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lists_board ON lists(id_board);
CREATE INDEX IF NOT EXISTS idx_cards_board ON cards(id_board);
CREATE INDEX IF NOT EXISTS idx_cards_list ON cards(id_list);
CREATE INDEX IF NOT EXISTS idx_cards_activity ON cards(date_last_activity);
CREATE INDEX IF NOT EXISTS idx_labels_board ON labels(id_board);
CREATE INDEX IF NOT EXISTS idx_checklists_card ON checklists(id_card);
CREATE INDEX IF NOT EXISTS idx_check_items_checklist ON check_items(id_checklist);
`
