import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { diffLearnings } from './changes.hook'

const one = (id: string, extra: Partial<Learning> = {}): Learning => ({ id, kind: 'feedback', text: `Rule ${id}`, why: 'seen', status: 'proposed', project: '/p', session: 's1', at: 1, seen: 1, ...extra })

test('what the user answered, edited or took out is news; a new proposal is not', () => {
  const seen = [one('a'), one('b'), one('c'), one('e'), one('g', { status: 'rejected' })]
  const now = [one('b', { status: 'rejected', reason: 'not here' }), one('c', { text: 'Rule c, reworded' }), one('f'), one('g')]

  expect(diffLearnings(seen, now, new Set(['a']))).toEqual([
    'learning rejected (not here): "Rule b"',
    'learning reworded: "Rule c" -> "Rule c, reworded"',
    'learning reopened (waiting for review again): "Rule g"',
    'learning accepted (you were asked to save it to memory): "Rule a"',
    'proposal taken out of the review queue: "Rule e"',
  ])
})
