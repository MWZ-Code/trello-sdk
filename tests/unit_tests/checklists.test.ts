import { client } from '../helpers/client.js'
import { testListId } from '../helpers/setup.js'
import {
  assertShape,
  assertArrayOfShape,
  CHECKLIST_FIELDS,
  CHECKITEM_FIELDS,
} from '../helpers/validators.js'

let testCardId: string
let checklistId: string
let checkItemId: string

beforeAll(async () => {
  const card = await client.cards.createCard({
    name: 'Checklist Test Card',
    idList: testListId,
  })
  testCardId = (card as any).id
}, 30000)

afterAll(async () => {
  if (testCardId) {
    try {
      await client.cards.deleteCard({ id: testCardId })
    } catch {
      console.warn(`Failed to clean up test card ${testCardId}`)
    }
  }
}, 30000)

describe('Checklist CRUD', () => {
  test('CREATE checklist', async () => {
    const checklist = await client.checklists.createChecklist({
      idCard: testCardId,
      name: 'Test Checklist',
    })
    assertShape(checklist, CHECKLIST_FIELDS, 'checklist')
    checklistId = (checklist as any).id
  })

  test('GET checklist', async () => {
    const checklist = await client.checklists.getChecklist({ id: checklistId })
    assertShape(checklist, CHECKLIST_FIELDS, 'checklist')
  })

  test('UPDATE checklist', async () => {
    const updated = await client.checklists.updateChecklist({
      id: checklistId,
      name: 'Updated Checklist',
    })
    expect((updated as any).name).toBe('Updated Checklist')
  })
})

describe('Check Items', () => {
  test('CREATE check item', async () => {
    const item = await client.checklists.createChecklistCheckItems({
      id: checklistId,
      name: 'Test Item',
    })
    assertShape(item, CHECKITEM_FIELDS, 'check item')
    checkItemId = (item as any).id
  })

  test('GET check items', async () => {
    const items = await client.checklists.getChecklistCheckItems({
      id: checklistId,
    })
    assertArrayOfShape(items, CHECKITEM_FIELDS, 'check items')
  })

  test('UPDATE check item state', async () => {
    const updated = await client.cards.updateCardCheckItem({
      id: testCardId,
      idCheckItem: checkItemId,
      state: 'complete',
    })
    expect((updated as any).state).toBe('complete')
  })

  test('DELETE check item', async () => {
    await client.checklists.deleteChecklistCheckItem({
      id: checklistId,
      idCheckItem: checkItemId,
    })
  })
})

describe('Checklist Deletion', () => {
  test('DELETE checklist', async () => {
    await client.checklists.deleteChecklist({ id: checklistId })

    await expect(
      client.checklists.getChecklist({ id: checklistId }),
    ).rejects.toThrow()
  })
})
