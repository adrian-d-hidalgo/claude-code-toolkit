import { expect, test } from 'claude-code/testing'

import { needsPreview } from './draft.hook'

test('a short single line fits the field; a long or multi-line text is previewed', () => {
  expect(needsPreview('te refieres a la pagina', 60)).toBe(false)
  expect(needsPreview('x'.repeat(80), 60)).toBe(true)
  expect(needsPreview('first line\nsecond line', 60)).toBe(true)
  expect(needsPreview('', 60)).toBe(false)
})
