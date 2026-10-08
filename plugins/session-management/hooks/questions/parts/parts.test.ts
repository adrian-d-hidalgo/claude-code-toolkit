import { expect, test } from 'claude-code/testing'

import type { Question } from '../../../types'
import { countParts, partsOf, questionsIn, scopeCounts } from './parts.hook'

const asked = (id: string, texts: string[]): Question => ({ id, texts, source: 'text', session: 's', project: '/p', at: 1, asks: 1, isOpen: true })

test('every text of every entry is a part, numbered in order', () => {
  const parts = partsOf([asked('a', ['one', 'two', 'three']), asked('b', ['four'])])

  expect(parts.map(part => part.key)).toEqual(['a#0', 'a#1', 'a#2', 'b#0'])
  expect(parts.map(part => part.text)).toEqual(['one', 'two', 'three', 'four'])
  expect(parts[3]?.slot).toBe(0)
})

test('counts are in parts, and never name the entries', () => {
  const four = asked('a', ['one', 'two', 'three', 'four'])
  const single = asked('b', ['five'])

  expect(countParts([four, single])).toBe(5)
  expect(questionsIn([single])).toBe('1 question')
  expect(questionsIn([four, single])).toBe('5 questions')
  expect(scopeCounts([four], [single, asked('c', ['six'])])).toBe('4 open, 2 closed')
  expect(scopeCounts([single], [single])).toBe('1 open, 1 closed')
})
