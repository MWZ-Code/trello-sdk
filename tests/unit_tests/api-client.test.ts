import { config } from 'dotenv'
import { TrelloApiClient, TrelloNotFoundError, TrelloApiError } from '../../src/api/index.js'
import { testBoardId, testListId, existingBoardId } from '../helpers/setup.js'

config()

const apiClient = new TrelloApiClient({
  key: process.env.TRELLO_API_KEY!,
  token: process.env.TRELLO_TOKEN!,
})

// ---------------------------------------------------------------------------
// Boards
// ---------------------------------------------------------------------------

describe('TrelloApiClient - Boards', () => {
  test('getBoard — get existing board, verify has id, name, url', async () => {
    const board = await apiClient.getBoard(existingBoardId)
    expect(board).toHaveProperty('id')
    expect(board).toHaveProperty('name')
    expect(board).toHaveProperty('url')
  })

  test('updateBoard — update test board desc, verify it changed', async () => {
    const desc = `Updated via api-client test at ${Date.now()}`
    const updated = await apiClient.updateBoard(testBoardId, { desc })
    expect(updated.desc).toBe(desc)
  })

  test('getBoardLists — verify array with id, name', async () => {
    const lists = await apiClient.getBoardLists(existingBoardId)
    expect(Array.isArray(lists)).toBe(true)
    expect(lists.length).toBeGreaterThan(0)
    expect(lists[0]).toHaveProperty('id')
    expect(lists[0]).toHaveProperty('name')
  })

  test('getBoardCards — verify array with id, name, idList', async () => {
    const cards = await apiClient.getBoardCards(existingBoardId)
    expect(Array.isArray(cards)).toBe(true)
    expect(cards.length).toBeGreaterThan(0)
    expect(cards[0]).toHaveProperty('id')
    expect(cards[0]).toHaveProperty('name')
    expect(cards[0]).toHaveProperty('idList')
  })

  test('getBoardMembers — verify array with id, username', async () => {
    const members = await apiClient.getBoardMembers(existingBoardId)
    expect(Array.isArray(members)).toBe(true)
    expect(members.length).toBeGreaterThan(0)
    expect(members[0]).toHaveProperty('id')
    expect(members[0]).toHaveProperty('username')
  })

  test('getBoardLabels — verify array', async () => {
    const labels = await apiClient.getBoardLabels(existingBoardId)
    expect(Array.isArray(labels)).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Lists
// ---------------------------------------------------------------------------

describe('TrelloApiClient - Lists', () => {
  let createdListId: string

  test('createList and getList — roundtrip', async () => {
    const list = await apiClient.createList({
      name: 'ApiClient Test List',
      idBoard: testBoardId,
    })
    expect(list).toHaveProperty('id')
    expect(list.name).toBe('ApiClient Test List')
    createdListId = list.id

    const fetched = await apiClient.getList(createdListId)
    expect(fetched.id).toBe(createdListId)
    expect(fetched.name).toBe('ApiClient Test List')
  })

  test('updateList — rename, verify', async () => {
    const updated = await apiClient.updateList(createdListId, {
      name: 'Renamed List',
    })
    expect(updated.name).toBe('Renamed List')
  })

  test('archiveList / unarchiveList — verify closed flag toggles', async () => {
    const archived = await apiClient.archiveList(createdListId)
    expect(archived.closed).toBe(true)

    const unarchived = await apiClient.unarchiveList(createdListId)
    expect(unarchived.closed).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

describe('TrelloApiClient - Cards', () => {
  let cardId: string

  test('createCard and getCard — roundtrip', async () => {
    const card = await apiClient.createCard({
      name: 'ApiClient Test Card',
      idList: testListId,
    })
    expect(card).toHaveProperty('id')
    expect(card.name).toBe('ApiClient Test Card')
    cardId = card.id

    const fetched = await apiClient.getCard(cardId)
    expect(fetched.id).toBe(cardId)
    expect(fetched.name).toBe('ApiClient Test Card')
  })

  test('updateCard — update name/desc, verify', async () => {
    const updated = await apiClient.updateCard(cardId, {
      name: 'Updated Card Name',
      desc: 'A description',
    })
    expect(updated.name).toBe('Updated Card Name')
    expect(updated.desc).toBe('A description')
  })

  test('moveCard — create second list, move card, verify idList changed, move back', async () => {
    const secondList = await apiClient.createList({
      name: 'Move Target List',
      idBoard: testBoardId,
    })

    const moved = await apiClient.moveCard(cardId, secondList.id)
    expect(moved.idList).toBe(secondList.id)

    const movedBack = await apiClient.moveCard(cardId, testListId)
    expect(movedBack.idList).toBe(testListId)

    // Clean up the second list by archiving it
    await apiClient.archiveList(secondList.id)
  })

  test('archiveCard / unarchiveCard — verify closed flag', async () => {
    const archived = await apiClient.archiveCard(cardId)
    expect(archived.closed).toBe(true)

    const unarchived = await apiClient.unarchiveCard(cardId)
    expect(unarchived.closed).toBe(false)
  })

  test('addComment — verify type === commentCard', async () => {
    const action = await apiClient.addComment(cardId, 'Test comment from api-client')
    expect(action).toHaveProperty('type')
    expect(action.type).toBe('commentCard')
  })

  test('addAttachment / getCardAttachments / deleteAttachment — full cycle', async () => {
    const attachment = await apiClient.addAttachment(cardId, {
      url: 'https://example.com/test-attachment',
      name: 'Test Attachment',
    })
    expect(attachment).toHaveProperty('id')
    expect(attachment.name).toBe('Test Attachment')

    const attachments = await apiClient.getCardAttachments(cardId)
    expect(Array.isArray(attachments)).toBe(true)
    const found = attachments.find((a: any) => a.id === attachment.id)
    expect(found).toBeDefined()

    await apiClient.deleteAttachment(cardId, attachment.id)

    const afterDelete = await apiClient.getCardAttachments(cardId)
    const notFound = afterDelete.find((a: any) => a.id === attachment.id)
    expect(notFound).toBeUndefined()
  })

  test('deleteCard — create throwaway, delete, verify getCard throws TrelloNotFoundError', async () => {
    const throwaway = await apiClient.createCard({
      name: 'Throwaway Card',
      idList: testListId,
    })
    const throwawayId = throwaway.id

    await apiClient.deleteCard(throwawayId)

    try {
      await apiClient.getCard(throwawayId)
      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(TrelloNotFoundError)
      expect((error as TrelloNotFoundError).status).toBe(404)
    }
  })

  // Clean up the main test card
  afterAll(async () => {
    if (cardId) {
      try {
        await apiClient.deleteCard(cardId)
      } catch {
        // May already be deleted
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

describe('TrelloApiClient - Labels', () => {
  test('createLabel, getLabel, updateLabel, deleteLabel — full CRUD', async () => {
    const label = await apiClient.createLabel({
      name: 'ApiClient Test Label',
      color: 'blue',
      idBoard: testBoardId,
    })
    expect(label).toHaveProperty('id')
    expect(label.name).toBe('ApiClient Test Label')
    expect(label.color).toBe('blue')

    const fetched = await apiClient.getLabel(label.id)
    expect(fetched.id).toBe(label.id)

    const updated = await apiClient.updateLabel(label.id, {
      name: 'Updated Label',
      color: 'red',
    })
    expect(updated.name).toBe('Updated Label')
    expect(updated.color).toBe('red')

    await apiClient.deleteLabel(label.id)

    try {
      await apiClient.getLabel(label.id)
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(TrelloNotFoundError)
    }
  })
})

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

describe('TrelloApiClient - Members', () => {
  test('getMe — verify has id, username', async () => {
    const me = await apiClient.getMe()
    expect(me).toHaveProperty('id')
    expect(me).toHaveProperty('username')
  })

  test('getMyBoards — verify returns array of boards', async () => {
    const boards = await apiClient.getMyBoards()
    expect(Array.isArray(boards)).toBe(true)
    expect(boards.length).toBeGreaterThan(0)
    expect(boards[0]).toHaveProperty('id')
    expect(boards[0]).toHaveProperty('name')
  })
})

// ---------------------------------------------------------------------------
// Checklists
// ---------------------------------------------------------------------------

describe('TrelloApiClient - Checklists', () => {
  test('Full checklist lifecycle', async () => {
    // Create a card to host the checklist
    const card = await apiClient.createCard({
      name: 'Checklist Lifecycle Card',
      idList: testListId,
    })

    // Create checklist
    const checklist = await apiClient.createChecklist({
      idCard: card.id,
      name: 'Test Checklist',
    })
    expect(checklist).toHaveProperty('id')
    expect(checklist.name).toBe('Test Checklist')

    // Get checklist
    const fetched = await apiClient.getChecklist(checklist.id)
    expect(fetched.id).toBe(checklist.id)

    // Update checklist
    const updated = await apiClient.updateChecklist(checklist.id, {
      name: 'Updated Checklist',
    })
    expect(updated.name).toBe('Updated Checklist')

    // Add check item
    const checkItem = await apiClient.createCheckItem(checklist.id, {
      name: 'Test Check Item',
    })
    expect(checkItem).toHaveProperty('id')
    expect(checkItem.name).toBe('Test Check Item')

    // Get check items
    const items = await apiClient.getCheckItems(checklist.id)
    expect(Array.isArray(items)).toBe(true)
    expect(items.length).toBeGreaterThan(0)

    // Update check item state
    const updatedItem = await apiClient.updateCheckItem(
      card.id,
      checkItem.id,
      { state: 'complete' },
    )
    expect(updatedItem.state).toBe('complete')

    // Delete check item
    await apiClient.deleteCheckItem(checklist.id, checkItem.id)

    const itemsAfterDelete = await apiClient.getCheckItems(checklist.id)
    const deletedItem = itemsAfterDelete.find((i: any) => i.id === checkItem.id)
    expect(deletedItem).toBeUndefined()

    // Delete checklist
    await apiClient.deleteChecklist(checklist.id)

    // Delete card
    await apiClient.deleteCard(card.id)
  })
})

// ---------------------------------------------------------------------------
// Error Normalization
// ---------------------------------------------------------------------------

describe('TrelloApiClient - Error Normalization', () => {
  test('TrelloNotFoundError — getCard with nonexistent id', async () => {
    // Use a valid 24-char hex ID format that doesn't exist to get a 404
    try {
      await apiClient.getCard('aaaaaaaaaaaaaaaaaaaaaaaa')
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(TrelloNotFoundError)
      expect((error as TrelloNotFoundError).status).toBe(404)
    }
  })
})

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------

describe('TrelloApiClient - Batch', () => {
  test('batch GET — verify returns array of 2 results', async () => {
    const results = await apiClient.batch([
      '/members/me',
      `/boards/${existingBoardId}`,
    ])
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(2)
  })
})
