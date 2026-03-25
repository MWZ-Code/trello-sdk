import { TrelloClient } from 'trello.js'
import { config } from 'dotenv'

config()

const key = process.env.TRELLO_API_KEY
const token = process.env.TRELLO_TOKEN

if (!key || !token) {
  throw new Error(
    'TRELLO_API_KEY and TRELLO_TOKEN must be set in .env file. See .env.example.',
  )
}

export const client = new TrelloClient({ key, token })

export const TEST_BOARD_NAME = process.env.TEST_BOARD_NAME || 'Test Board'
