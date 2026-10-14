import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { effectOf } from './effect.hook'

const one = (id: string, extra: Partial<Learning> = {}): Learning => ({ id, kind: 'feedback', text: `Learning ${id}`, why: 'w', status: 'proposed', project: '/p', session: 's', at: 1, seen: 1, ...extra })

test('every proposal says what accepting and rejecting do: memory is named by its words, the queue by its numbers', () => {
  const memory = one('file:feedback_o.md', { status: 'accepted', file: 'feedback_o.md', text: 'Learning o' })
  const list = [one('n'), one('u', { replaces: ['file:feedback_o.md'] }), one('c', { replaces: ['file:feedback_o.md'], conflicts: ['file:feedback_o.md'] }), one('q', { replaces: ['n'] }), one('r', { status: 'rejected' }), memory]
  const tags = list.map(item => effectOf(item, list)?.tag ?? null)

  expect(tags).toEqual(['new', 'updates memory', 'contradicts memory', 'updates #1', 'rejected', null])
  expect(effectOf(list[0] as Learning, list)?.onYes).toBe('Asks Claude to save it to its memory as a new learning.')
  expect(effectOf(list[1] as Learning, list)?.onYes).toBe('Asks Claude to update the memory "Learning o" (feedback_o.md) in its memory with this version.')
  expect(effectOf(list[2] as Learning, list)?.onYes).toContain('to retire the memory "Learning o" (feedback_o.md), which it contradicts')
  expect(effectOf(list[3] as Learning, list)?.onNo).toBe('Keeps #1 "Learning n" as it is and keeps this one as a refusal.')
})
