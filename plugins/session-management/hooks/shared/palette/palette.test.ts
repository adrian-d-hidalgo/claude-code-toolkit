import { expect, test } from 'claude-code/testing'

import { COLORS } from './palette.hook'

test('every meaning has its own colour', () => {
  const values = Object.values(COLORS)

  expect(new Set(values).size).toBe(values.length)
})
