import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { briefLearnings, byStatus, describe, seenAgain, withField, withStatus, without } from './ops.hook'

const one = (id: string, status: Learning['status'] = 'proposed', extra: Partial<Learning> = {}): Learning => ({ id, kind: 'feedback', text: `Learning ${id}`, why: `because ${id}`, status, project: '/p', session: 's1', at: 1, seen: 1, ...extra })

test('the ledger is ordered: what waits for review, then the refusals, keeping the stored order within a group', () => {
  expect(byStatus([one('a', 'rejected'), one('c'), one('d', 'rejected'), one('e')]).map(item => item.id)).toEqual(['c', 'e', 'a', 'd'])
})

test('a rejection keeps its reason, a reopening drops it, a sighting counts', () => {
  const list = withStatus('a', 'rejected', 'we use spaces')([one('a')])

  expect(list[0]).toMatchObject({ status: 'rejected', reason: 'we use spaces' })
  expect(withStatus('a', 'proposed')(list)[0]).toEqual(one('a'))
  expect(seenAgain('a')(list)[0]?.seen).toBe(2)
})

test('fields are edited one at a time; a blank text or why is ignored, a blank how is removed', () => {
  const list = [one('a', 'proposed', { how: 'carefully' })]

  expect(withField('a', 'text', '  New\nline  ')(list)[0]?.text).toBe('New line')
  expect(withField('a', 'text', '   ')(list)[0]?.text).toBe('Learning a')
  expect(withField('a', 'why', 'a new reason')(list)[0]?.why).toBe('a new reason')
  expect(withField('a', 'how', '')(list)[0]?.how).toBeUndefined()
})

test('removing a learning drops the links the others had to it', () => {
  const list = [one('a'), one('b', 'proposed', { replaces: ['a'], conflicts: ['a', 'c'] }), one('c')]
  const left = without('a')(list)

  expect(left.map(item => item.id)).toEqual(['b', 'c'])
  expect(left[0]?.replaces).toBeUndefined()
  expect(left[0]?.conflicts).toEqual(['c'])
})

test('describe numbers the list and shows the why, the how and the marks; the brief lists the pending and the rejected', () => {
  const list = [one('a', 'proposed', { how: 'like so', seen: 3 }), one('c', 'rejected', { reason: 'wrong' })]

  expect(describe(list)).toContain('1. [a] (proposed) feedback: Learning a\n   why: because a\n   how: like so\n   seen 3×')
  expect(describe([])).toBe('No learnings yet.')

  const brief = briefLearnings(list)

  expect(brief).toContain('Waiting for the user\'s review (do not propose again):\n- [a] feedback: Learning a')
  expect(brief).toContain('Rejected by the user (never propose or apply these):\n- [c] Learning c — wrong')
  expect(briefLearnings([])).toBe('')
})
