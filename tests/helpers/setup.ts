import { client, TEST_BOARD_NAME } from './client.js'

// Shared state across all test files (works because singleFork: true)
export let testBoardId: string
export let testListId: string
export let existingBoardId: string

beforeAll(async () => {
  // 1. Find the user's pre-existing test board by name
  const boards = await client.members.getMemberBoards({ id: 'me' })
  const existing = boards.find((b: any) => b.name === TEST_BOARD_NAME)
  if (!existing) {
    throw new Error(
      `Could not find board named "${TEST_BOARD_NAME}". ` +
        'Create it in Trello or set TEST_BOARD_NAME in .env.',
    )
  }
  existingBoardId = existing.id

  // 2. Create a dedicated test board for write operations
  const newBoard = await client.boards.createBoard({
    name: `API Test Suite - ${Date.now()}`,
    defaultLists: false,
  })
  testBoardId = newBoard.id

  // 3. Create a default list on the test board
  const list = await client.lists.createList({
    name: 'Test List',
    idBoard: testBoardId,
    pos: 'top',
  })
  testListId = list.id
}, 60000)

afterAll(async () => {
  // Clean up the test board
  if (testBoardId) {
    try {
      await client.boards.deleteBoard({ id: testBoardId })
    } catch {
      console.warn(`Failed to clean up test board ${testBoardId}`)
    }
  }
}, 30000)
