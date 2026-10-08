import { expect, test } from 'claude-code/testing'

import { windowOf } from './window.hook'

const open = (count: number) => Array.from({ length: count }, () => ({ status: 'todo' as const }))

test('a list that fits shows everything', () => {
  const result = windowOf(open(4), 0, 0, 6)

  expect(result).toMatchObject({ shown: [0, 1, 2, 3], above: 0, below: 0, hidden: 0 })
})

test('a long list shows a window and counts what is above and below', () => {
  expect(windowOf(open(20), 0, 0, 5)).toMatchObject({ shown: [0, 1, 2, 3, 4], above: 0, below: 15 })
  expect(windowOf(open(20), 10, 8, 5)).toMatchObject({ shown: [8, 9, 10, 11, 12], above: 8, below: 7 })
})

test('the window follows a selection outside it, and never runs past the end', () => {
  expect(windowOf(open(20), 15, 0, 5).shown).toEqual([13, 14, 15, 16, 17])
  expect(windowOf(open(20), 19, 0, 5).shown).toEqual([15, 16, 17, 18, 19])
})

test('finished tasks hide first, unless one of them is selected', () => {
  const list = [{ status: 'done' as const }, { status: 'todo' as const }, { status: 'cancelled' as const }, { status: 'todo' as const }]

  expect(windowOf(list, 1, 0, 2)).toMatchObject({ shown: [1, 3], hidden: 2 })
  expect(windowOf(list, 0, 0, 2).shown).toEqual([0, 1])
})
