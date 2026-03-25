import { config } from 'dotenv'
import { AccountClient } from '../src/clients/account-client.js'

config()

const key = process.env.TRELLO_API_KEY
const token = process.env.TRELLO_TOKEN

if (!key || !token) {
  console.error('TRELLO_API_KEY and TRELLO_TOKEN must be set in .env file. See .env.example.')
  process.exit(1)
}

async function run() {
  // 1. Init AccountClient (fetches open boards)
  console.log('Initializing AccountClient...')
  const account = await AccountClient.create({ key: key!, token: token! })
  console.log(`Found ${account.boards.size} open board(s)`)

  // 2. Create a new board
  const boardName = `Demo Board - ${Date.now()}`
  console.log(`\nCreating board: "${boardName}"`)
  const board = await account.createBoard(boardName)
  console.log(`Board created: ${board.id}`)

  // 3. Create a list
  console.log('\nCreating list: "To-Do\'s"')
  const list = await board.createList("To-Do's")
  console.log(`List created: ${(list as any).id}`)

  // 4. Create a card
  console.log('\nCreating card: "Buy vegetables"')
  const card = await board.createCard((list as any).id, 'Buy vegetables', {
    desc: 'Get fresh vegetables from the farmers market',
  })
  console.log(`Card created: ${card.id}`)

  // 5. Create a checklist with items
  console.log('\nCreating checklist: "Shopping List"')
  const checklist = await board.createChecklist(card.id, 'Shopping List')
  console.log(`Checklist created: ${(checklist as any).id}`)

  const items = ['Carrots', 'Broccoli', 'Spinach']
  for (const item of items) {
    await board.addChecklistItem((checklist as any).id, item)
    console.log(`  Added item: ${item}`)
  }

  // Done
  console.log('\n--- Demo Complete ---')
  console.log(`Board URL: ${board.metadata.url}`)
  console.log(`Board ID (for cleanup): ${board.id}`)
  console.log(`\nTo close this board, run:`)
  console.log(`  npx tsx scripts/close-board.ts ${board.id}`)
}

run().catch((err) => {
  console.error('Demo failed:', err.message)
  process.exit(1)
})
