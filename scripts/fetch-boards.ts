import { TrelloClient } from 'trello.js'
import { config } from 'dotenv'

config()

const key = process.env.TRELLO_API_KEY
const token = process.env.TRELLO_TOKEN

if (!key || !token) {
  console.error(
    'TRELLO_API_KEY and TRELLO_TOKEN must be set in .env file. See .env.example.',
  )
  process.exit(1)
}

const client = new TrelloClient({ key, token })

async function fetchBoards() {
  const boards = await client.members.getMemberBoards({ id: 'me' })
  console.log(JSON.stringify(boards, null, 2))
}

fetchBoards().catch((err) => {
  console.error('Failed to fetch boards:', err.message)
  process.exit(1)
})
