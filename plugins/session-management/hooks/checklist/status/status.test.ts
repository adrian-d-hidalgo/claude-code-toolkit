import { expect, test } from 'claude-code/testing'

import { GLYPH, STATUSES, isOpenStatus } from './status.hook'

test('only todo and doing are open; every status has a glyph', () => {
  expect(STATUSES.filter(isOpenStatus)).toEqual(['todo', 'doing'])
  expect(STATUSES.every(status => GLYPH[status] !== undefined)).toBe(true)
})
