import { client } from '../helpers/client.js'
import { testBoardId, existingBoardId } from '../helpers/setup.js'
import {
  assertShape,
  assertArrayOfShape,
  assertArrayOfShapeAllowEmpty,
  BOARD_FIELDS,
  LIST_FIELDS,
  CARD_FIELDS,
  MEMBER_FIELDS,
  LABEL_FIELDS,
} from '../helpers/validators.js'

describe('Board CRUD', () => {
  test('GET existing board', async () => {
    const board = await client.boards.getBoard({ id: existingBoardId })
    assertShape(board, BOARD_FIELDS, 'existing board')
  })

  test('GET test board', async () => {
    const board = await client.boards.getBoard({ id: testBoardId })
    assertShape(board, BOARD_FIELDS, 'test board')
  })

  test('CREATE and DELETE board', async () => {
    // Small delay to avoid hitting board creation limits when running full suite
    await new Promise((r) => setTimeout(r, 2000))

    const board = await client.boards.createBoard({
      name: 'Throwaway Board',
      defaultLists: false,
    })
    assertShape(board, BOARD_FIELDS, 'throwaway board')

    const throwawayId = board.id
    await client.boards.deleteBoard({ id: throwawayId })

    await expect(
      client.boards.getBoard({ id: throwawayId }),
    ).rejects.toThrow()
  })

  test('UPDATE board', async () => {
    const updated = await client.boards.updateBoard({
      id: testBoardId,
      desc: 'Updated description',
    })
    expect(updated.desc).toBe('Updated description')
  })
})

describe('Board Nested Resources', () => {
  test('GET board lists', async () => {
    const lists = await client.boards.getBoardLists({ id: existingBoardId })
    assertArrayOfShape(lists, LIST_FIELDS, 'board lists')
  })

  test('GET board cards', async () => {
    const cards = await client.boards.getBoardCards({ id: existingBoardId })
    assertArrayOfShape(cards, CARD_FIELDS, 'board cards')
  })

  test('GET board members', async () => {
    const members = await client.boards.getBoardMembers({ id: existingBoardId })
    assertArrayOfShape(members, MEMBER_FIELDS, 'board members')
  })

  test('GET board labels', async () => {
    const labels = await client.boards.getBoardLabels({ id: existingBoardId })
    assertArrayOfShapeAllowEmpty(labels, LABEL_FIELDS, 'board labels')
  })
})

describe('List My Boards', () => {
  test('GET member boards', async () => {
    const boards = await client.members.getMemberBoards({ id: 'me' })
    assertArrayOfShape(boards, BOARD_FIELDS, 'member boards')
  })
})
