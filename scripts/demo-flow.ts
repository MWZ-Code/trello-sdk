import { config } from 'dotenv'
import { TrelloSDK } from '../src/index.js'

config()

const key = process.env.TRELLO_API_KEY
const token = process.env.TRELLO_TOKEN

if (!key || !token) {
  console.error('TRELLO_API_KEY and TRELLO_TOKEN must be set in .env file. See .env.example.')
  process.exit(1)
}

async function run() {
  const sdk = await TrelloSDK.create({ key: key!, token: token! })

  // Subscribe to account events for demo
  sdk.subscribe({
    onBoardCreated(event) {
      console.log(`[event] Board created: ${event.board.name}`)
    },
  })

  // 1. Create a new board
  const boardName = `Demo Board - ${Date.now()}`
  console.log(`\nCreating board: "${boardName}"`)
  const board = await sdk.createBoard({ name: boardName })
  console.log(`Board created: ${board.id}`)

  // 2. Subscribe to board events
  sdk.subscribeToBoard(board.id, {
    onCardCreated(event) {
      console.log(`[event] Card created: ${event.card.name}`)
    },
  })

  // 3. Create a list
  console.log('\nCreating list: "To-Do\'s"')
  const list = await sdk.createList({ name: "To-Do's", idBoard: board.id })
  console.log(`List created: ${(list as any).id}`)

  // 4. Create a card
  console.log('\nCreating card: "Buy vegetables"')
  const card = await sdk.createCard({
    name: 'Buy vegetables',
    idList: (list as any).id,
    desc: 'Get fresh vegetables from the farmers market',
  })
  console.log(`Card created: ${card.id}`)

  // 5. Create a checklist with items
  console.log('\nCreating checklist: "Shopping List"')
  const checklist = await sdk.createChecklist({ idCard: card.id, name: 'Shopping List' })
  console.log(`Checklist created: ${(checklist as any).id}`)

  const items = ['Carrots', 'Broccoli', 'Spinach']
  for (const item of items) {
    await sdk.createCheckItem((checklist as any).id, { name: item })
    console.log(`  Added item: ${item}`)
  }

  // Done
  console.log('\n--- Demo Complete ---')
  console.log(`Board URL: ${(board as any).url}`)
  console.log(`Board ID (for cleanup): ${board.id}`)
  console.log(`\nTo close this board, run:`)
  console.log(`  npx tsx scripts/close-board.ts ${board.id}`)

  sdk.destroy()
}

run().catch((err) => {
  console.error('Demo failed:', err.message)
  process.exit(1)
})
