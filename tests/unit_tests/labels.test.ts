import { client } from '../helpers/client.js'
import { testBoardId } from '../helpers/setup.js'
import {
  assertShape,
  assertArrayOfShapeAllowEmpty,
  LABEL_FIELDS,
} from '../helpers/validators.js'

describe('Label CRUD', () => {
  let labelId: string

  test('CREATE label', async () => {
    const label = await client.labels.createLabel({
      name: 'Test Label',
      color: 'blue',
      idBoard: testBoardId,
    })
    assertShape(label, LABEL_FIELDS, 'created label')
    expect(label.name).toBe('Test Label')
    expect(label.color).toBe('blue')
    labelId = label.id
  })

  test('GET label', async () => {
    const label = await client.labels.getLabel({ id: labelId })
    assertShape(label, LABEL_FIELDS, 'fetched label')
    expect(label.name).toBe('Test Label')
    expect(label.color).toBe('blue')
  })

  test('UPDATE label', async () => {
    const updated = await client.labels.updateLabel({
      id: labelId,
      name: 'Updated Label',
      color: 'red',
    })
    expect(updated.name).toBe('Updated Label')
    expect(updated.color).toBe('red')
  })

  test('GET board labels', async () => {
    const labels = await client.boards.getBoardLabels({ id: testBoardId })
    assertArrayOfShapeAllowEmpty(labels, LABEL_FIELDS, 'board labels')
    const found = labels.find((l: any) => l.id === labelId)
    expect(found).toBeDefined()
    expect(found.name).toBe('Updated Label')
    expect(found.color).toBe('red')
  })

  test('DELETE label', async () => {
    await client.labels.deleteLabel({ id: labelId })
    await expect(
      client.labels.getLabel({ id: labelId }),
    ).rejects.toThrow()
  })
})
