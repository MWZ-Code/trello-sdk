import { config } from 'dotenv'
import { AccountClient } from '../src/clients/account-client.js'

config()

const key = process.env.TRELLO_API_KEY
const token = process.env.TRELLO_TOKEN

if (!key || !token) {
  console.error('TRELLO_API_KEY and TRELLO_TOKEN must be set in .env file. See .env.example.')
  process.exit(1)
}

const boardId = process.argv[2]

if (!boardId) {
  console.error('Usage: tsx scripts/close-board.ts <board-id>')
  process.exit(1)
}

async function run() {
  const account = await AccountClient.create({ key: key!, token: token! })
  console.log(`Closing board: ${boardId}`)
  await account.closeBoard(boardId)
  console.log('Board closed successfully.')
}

run().catch((err) => {
  console.error('Failed to close board:', err.message)
  process.exit(1)
})
