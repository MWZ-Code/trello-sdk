import { client } from '../helpers/client.js'
import { testBoardId, testListId } from '../helpers/setup.js'
import {
  assertShape,
  assertArrayOfShape,
  assertArrayOfShapeAllowEmpty,
  LIST_FIELDS,
  CARD_FIELDS,
} from '../helpers/validators.js'

describe('List CRUD', () => {
  let createdListId: string

  test('CREATE list', async () => {
    const list = await client.lists.createList({
      name: 'Test Create List',
      idBoard: testBoardId,
      pos: 'bottom',
    })
    assertShape(list, LIST_FIELDS, 'created list')
    createdListId = list.id
  })

  test('GET list', async () => {
    const list = await client.lists.getList({ id: createdListId })
    assertShape(list, LIST_FIELDS, 'fetched list')
    expect(list.id).toBe(createdListId)
  })

  test('UPDATE list name', async () => {
    const updated = await client.lists.updateList({
      id: createdListId,
      name: 'Renamed List',
    })
    expect(updated.name).toBe('Renamed List')
  })

  test('ARCHIVE list', async () => {
    const archived = await client.lists.updateList({
      id: createdListId,
      closed: true,
    })
    expect(archived.closed).toBe(true)
  })

  test('UNARCHIVE list', async () => {
    const unarchived = await client.lists.updateList({
      id: createdListId,
      closed: false,
    })
    expect(unarchived.closed).toBe(false)
  })
})

describe('List Cards', () => {
  test('GET list cards (empty)', async () => {
    const cards = await client.lists.getListCards({ id: testListId })
    expect(Array.isArray(cards)).toBe(true)
    assertArrayOfShapeAllowEmpty(cards, CARD_FIELDS, 'list cards')
  })

  test('GET list cards after adding card', async () => {
    // Create a card on the test list
    const card = await client.cards.createCard({
      name: 'List Card Test',
      idList: testListId,
    })

    try {
      const cards = await client.lists.getListCards({ id: testListId })
      assertArrayOfShape(cards, CARD_FIELDS, 'list cards with card')
      expect(cards.some((c: any) => c.id === card.id)).toBe(true)
    } finally {
      // Clean up the card
      await client.cards.deleteCard({ id: card.id })
    }
  })
})
