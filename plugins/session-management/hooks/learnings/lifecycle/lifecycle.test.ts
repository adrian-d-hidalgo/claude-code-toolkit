import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { LEGACY_KEY, learningsKey, splitBySession } from './lifecycle.hook'

const one = (id: string, session: string, extra: Partial<Learning> = {}): Learning => ({ id, kind: 'project', text: `Fact ${id}`, why: 'seen', status: 'proposed', project: '/p', session, at: 1, seen: 1, ...extra })

test('what earlier versions kept per project or in one ledger moves to the session that proposed it, once', async () => {
  const { port, data } = memoryPort({
    store: {
      [LEGACY_KEY]: [one('a', 's1'), one('b', 's2', { status: 'accepted' })],
      'learnings:/p': [one('c', 's1'), one('d', 's2', { status: 'rejected' }), one('a', 's1')],
      [learningsKey('s1')]: [one('a', 's1')],
    },
  })

  expect(await splitBySession(port)).toBe(2)
  expect(data[LEGACY_KEY]).toBeUndefined()
  expect(data['learnings:/p']).toBeUndefined()
  expect((await port.learnings.all()).map(item => item.id)).toEqual(['a', 'c'])
  expect((data[learningsKey('s2')] as Learning[]).map(item => item.id)).toEqual(['d'])
  expect(await splitBySession(port)).toBe(0)
})
