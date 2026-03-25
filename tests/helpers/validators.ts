/**
 * Shape validation helpers for Trello API responses.
 *
 * A FieldSpec maps field names to expected types. Use a string for a single
 * type (e.g. 'string') or an array for nullable/union types (e.g. ['string', 'null']).
 */

export type FieldSpec = Record<string, string | string[]>

/** Assert that `obj` has every key in `spec` with the expected type. */
export function assertShape(obj: unknown, spec: FieldSpec, label = 'object'): void {
  expect(obj).toBeDefined()
  expect(typeof obj).toBe('object')
  expect(obj).not.toBeNull()

  const record = obj as Record<string, unknown>

  for (const [field, expectedType] of Object.entries(spec)) {
    const value = record[field]
    const actualType = value === null ? 'null' : typeof value

    if (Array.isArray(expectedType)) {
      expect(expectedType).toContain(actualType)
    } else {
      expect(actualType).toBe(expectedType)
    }
  }
}

/** Assert that `arr` is a non-empty array where every element matches `spec`. */
export function assertArrayOfShape(arr: unknown, spec: FieldSpec, label = 'array'): void {
  expect(Array.isArray(arr)).toBe(true)
  const list = arr as unknown[]
  expect(list.length).toBeGreaterThan(0)
  for (const item of list) {
    assertShape(item, spec, label)
  }
}

/** Assert that `arr` is an array (may be empty) where every element matches `spec`. */
export function assertArrayOfShapeAllowEmpty(arr: unknown, spec: FieldSpec, label = 'array'): void {
  expect(Array.isArray(arr)).toBe(true)
  const list = arr as unknown[]
  for (const item of list) {
    assertShape(item, spec, label)
  }
}

// ---------------------------------------------------------------------------
// Pre-defined field specs for core Trello resources
// Only includes fields that are always returned by default.
// ---------------------------------------------------------------------------

export const BOARD_FIELDS: FieldSpec = {
  id: 'string',
  name: 'string',
  desc: 'string',
  closed: 'boolean',
  url: 'string',
  shortUrl: 'string',
}

export const LIST_FIELDS: FieldSpec = {
  id: 'string',
  name: 'string',
  closed: 'boolean',
  idBoard: 'string',
  pos: 'number',
}

export const CARD_FIELDS: FieldSpec = {
  id: 'string',
  name: 'string',
  desc: 'string',
  closed: 'boolean',
  idBoard: 'string',
  idList: 'string',
  pos: 'number',
  url: 'string',
  shortUrl: 'string',
}

export const LABEL_FIELDS: FieldSpec = {
  id: 'string',
  name: 'string',
  idBoard: 'string',
  color: ['string', 'null'],
}

export const MEMBER_FIELDS: FieldSpec = {
  id: 'string',
  username: 'string',
}

export const CHECKLIST_FIELDS: FieldSpec = {
  id: 'string',
  name: 'string',
  idBoard: 'string',
  idCard: 'string',
}

export const CHECKITEM_FIELDS: FieldSpec = {
  id: 'string',
  name: 'string',
  state: 'string',
}

export const ATTACHMENT_FIELDS: FieldSpec = {
  id: 'string',
  name: 'string',
  url: 'string',
}

export const COMMENT_ACTION_FIELDS: FieldSpec = {
  id: 'string',
  type: 'string',
  data: 'object',
}
