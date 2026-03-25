import { client } from '../helpers/client.js'
import { testBoardId, testListId } from '../helpers/setup.js'
import {
  assertShape,
  assertArrayOfShape,
  CARD_FIELDS,
  ATTACHMENT_FIELDS,
  COMMENT_ACTION_FIELDS,
} from '../helpers/validators.js'

let cardId: string

beforeAll(async () => {
  const card = await client.cards.createCard({
    name: 'Shared Test Card',
    idList: testListId,
    desc: 'Card created in beforeAll for card tests',
  })
  cardId = card.id
}, 30000)

afterAll(async () => {
  if (cardId) {
    try {
      await client.cards.deleteCard({ id: cardId })
    } catch {
      // Card may already be deleted by tests
    }
  }
}, 30000)

describe('Card CRUD', () => {
  test('CREATE card', async () => {
    const card = await client.cards.createCard({
      name: 'Test Card',
      idList: testListId,
      desc: 'Test description',
    })
    assertShape(card, CARD_FIELDS, 'created card')
    expect(card.name).toBe('Test Card')
    expect(card.desc).toBe('Test description')

    // Clean up this extra card
    await client.cards.deleteCard({ id: card.id })
  })

  test('GET card', async () => {
    const card = await client.cards.getCard({ id: cardId })
    assertShape(card, CARD_FIELDS, 'fetched card')
    expect(card.id).toBe(cardId)
  })

  test('UPDATE card', async () => {
    const updated = await client.cards.updateCard({
      id: cardId,
      name: 'Updated Card',
      desc: 'Updated desc',
    })
    expect(updated.name).toBe('Updated Card')
    expect(updated.desc).toBe('Updated desc')
  })

  test('ARCHIVE card', async () => {
    const archived = await client.cards.updateCard({
      id: cardId,
      closed: true,
    })
    expect(archived.closed).toBe(true)
  })

  test('UNARCHIVE card', async () => {
    const unarchived = await client.cards.updateCard({
      id: cardId,
      closed: false,
    })
    expect(unarchived.closed).toBe(false)
  })

  test('MOVE card to another list and back', async () => {
    // Create a second list on the test board
    const newList = await client.lists.createList({
      name: 'Move Target List',
      idBoard: testBoardId,
    })

    try {
      // Move card to the new list
      const moved = await client.cards.updateCard({
        id: cardId,
        idList: newList.id,
      })
      expect(moved.idList).toBe(newList.id)

      // Move card back to the original list
      const movedBack = await client.cards.updateCard({
        id: cardId,
        idList: testListId,
      })
      expect(movedBack.idList).toBe(testListId)
    } finally {
      // Clean up the temporary list by archiving it
      await client.lists.updateList({ id: newList.id, closed: true })
    }
  })
})

describe('Card Comments', () => {
  let commentActionId: string

  test('ADD comment', async () => {
    const comment = await client.cards.addCardComment({
      id: cardId,
      text: 'Test comment',
    })
    assertShape(comment, COMMENT_ACTION_FIELDS, 'comment action')
    expect(comment.type).toBe('commentCard')
    commentActionId = comment.id
  })

  test('UPDATE comment', async () => {
    const updated = await client.cards.updateCardComment({
      id: cardId,
      idAction: commentActionId,
      text: 'Updated comment',
    })
    expect(updated).toBeDefined()
  })

  test('DELETE comment', async () => {
    await client.cards.deleteCardComment({
      id: cardId,
      idAction: commentActionId,
    })
  })
})

describe('Card Attachments', () => {
  let attachmentId: string

  test('ADD URL attachment', async () => {
    const attachment = await client.cards.createCardAttachment({
      id: cardId,
      url: 'https://example.com',
      name: 'Example',
    })
    assertShape(attachment, ATTACHMENT_FIELDS, 'attachment')
    attachmentId = attachment.id
  })

  test('GET attachments', async () => {
    const attachments = await client.cards.getCardAttachments({ id: cardId })
    assertArrayOfShape(attachments, ATTACHMENT_FIELDS, 'attachments')
  })

  test('DELETE attachment', async () => {
    await client.cards.deleteCardAttachment({
      id: cardId,
      idAttachment: attachmentId,
    })
  })
})

describe('Card Deletion', () => {
  test('DELETE card', async () => {
    // Create a throwaway card
    const throwaway = await client.cards.createCard({
      name: 'Throwaway Card',
      idList: testListId,
    })

    await client.cards.deleteCard({ id: throwaway.id })

    await expect(
      client.cards.getCard({ id: throwaway.id }),
    ).rejects.toThrow()
  })
})
