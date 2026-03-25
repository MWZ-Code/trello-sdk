import { client } from '../helpers/client.js'
import {
  assertShape,
  assertArrayOfShape,
  assertArrayOfShapeAllowEmpty,
  MEMBER_FIELDS,
  BOARD_FIELDS,
  CARD_FIELDS,
} from '../helpers/validators.js'

describe('Member Endpoints', () => {
  test('GET me', async () => {
    const member = await client.members.getMember({ id: 'me' })
    assertShape(member, MEMBER_FIELDS, 'member')
    expect(typeof member.id).toBe('string')
    expect(member.id.length).toBeGreaterThan(0)
    expect(typeof member.username).toBe('string')
    expect(member.username.length).toBeGreaterThan(0)
  })

  test('GET my boards', async () => {
    const boards = await client.members.getMemberBoards({ id: 'me' })
    assertArrayOfShape(boards, BOARD_FIELDS, 'member boards')
  })

  test('GET my cards', async () => {
    const cards = await client.members.getMemberCards({ id: 'me' })
    assertArrayOfShapeAllowEmpty(cards, CARD_FIELDS, 'member cards')
  })

  test('GET my organizations', async () => {
    const orgs = await client.members.getMemberOrganizations({ id: 'me' })
    expect(Array.isArray(orgs)).toBe(true)
  })
})
