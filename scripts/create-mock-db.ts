/**
 * Script to sync the current Trello account into a local SQLite fixture DB.
 * Usage: npx tsx scripts/create-mock-db.ts
 */

import { config } from 'dotenv'
import { TrelloApiClient } from '../src/api/index.js'
import { openDatabase } from '../src/db/connection.js'
import { syncAllBoards } from '../src/sync/engine.js'
import { getMember } from '../src/db/repository.js'

config()

const key = process.env.TRELLO_API_KEY
const token = process.env.TRELLO_TOKEN

if (!key || !token) {
  console.error('TRELLO_API_KEY and TRELLO_TOKEN must be set in .env')
  process.exit(1)
}

async function main() {
  const api = new TrelloApiClient({ key, token })

  // Get the current user's member ID
  const me = await api.getMe()
  console.log(`Authenticated as: ${me.username} (${me.id})`)

  // Open a DB in the fixtures directory keyed by member ID
  const db = openDatabase(me.id, { dataDir: './fixtures' })

  console.log('Syncing all active boards...')
  const results = await syncAllBoards(db, api)

  console.log('\nSync complete:')
  for (const r of results) {
    console.log(`  ${r.boardName}: ${r.lists} lists, ${r.cards} cards, ${r.members} members, ${r.labels} labels, ${r.checklists} checklists`)
  }

  // Print summary
  const boardCount = db.prepare('SELECT COUNT(*) as c FROM boards WHERE deleted_at IS NULL').get() as any
  const cardCount = db.prepare('SELECT COUNT(*) as c FROM cards WHERE deleted_at IS NULL').get() as any
  const listCount = db.prepare('SELECT COUNT(*) as c FROM lists WHERE deleted_at IS NULL').get() as any
  const memberCount = db.prepare('SELECT COUNT(*) as c FROM members WHERE deleted_at IS NULL').get() as any
  const labelCount = db.prepare('SELECT COUNT(*) as c FROM labels WHERE deleted_at IS NULL').get() as any

  console.log(`\nDatabase summary:`)
  console.log(`  Boards: ${boardCount.c}`)
  console.log(`  Lists: ${listCount.c}`)
  console.log(`  Cards: ${cardCount.c}`)
  console.log(`  Members: ${memberCount.c}`)
  console.log(`  Labels: ${labelCount.c}`)
  console.log(`\nDB file: fixtures/${me.id}/trello.db`)

  db.close()
}

main().catch((err) => {
  console.error('Failed:', err)
  process.exit(1)
})
