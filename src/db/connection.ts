/**
 * Database connection manager.
 * Creates per-user SQLite databases with WAL mode and auto-migration.
 */

import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema.js'

export interface ConnectionConfig {
  /** Base directory for storing DB files. Each user gets a subdirectory. */
  dataDir: string
}

/**
 * Open (or create) a SQLite database for the given user.
 * Path: {dataDir}/{memberId}/trello.db
 */
export function openDatabase(memberId: string, config: ConnectionConfig): Database.Database {
  const dbDir = join(config.dataDir, memberId)
  mkdirSync(dbDir, { recursive: true })

  const dbPath = join(dbDir, 'trello.db')
  const db = new Database(dbPath)

  // Enable WAL mode for concurrent reads
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Run migrations
  migrate(db)

  return db
}

/**
 * Open an in-memory database (for testing).
 */
export function openMemoryDatabase(): Database.Database {
  const db = new Database(':memory:')
  db.pragma('foreign_keys = ON')
  migrate(db)
  return db
}

function migrate(db: Database.Database): void {
  const currentVersion = getSchemaVersion(db)

  if (currentVersion < SCHEMA_VERSION) {
    db.exec(SCHEMA_SQL)
    setSchemaVersion(db, SCHEMA_VERSION)
  }
}

function getSchemaVersion(db: Database.Database): number {
  try {
    const row = db.prepare('SELECT version FROM schema_version LIMIT 1').get() as
      | { version: number }
      | undefined
    return row?.version ?? 0
  } catch {
    // Table doesn't exist yet
    return 0
  }
}

function setSchemaVersion(db: Database.Database, version: number): void {
  db.exec('DELETE FROM schema_version')
  db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version)
}
