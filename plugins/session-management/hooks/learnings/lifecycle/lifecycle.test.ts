import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { LEGACY_KEY, adoptLearnings, learningsKey, splitBySession } from './lifecycle.hook'

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

test('a resumed conversation takes back the learnings its transcript names, with their backup', async () => {
  const messages = [{ role: 'assistant' as const, text: '', toolUses: [{ tool: 'mcp__session-management__learnings', input: { action: 'propose' }, result: 'Proposed [x1].' }] }]
  const { port, data } = memoryPort({ session: 's2', messages, store: { [learningsKey('s1')]: [one('x1', 's1'), one('x2', 's1')], 'backup:learnings:s1': [one('x0', 's1')], [learningsKey('s3')]: [one('y', 's3')] } })

  expect(await adoptLearnings(port)).toEqual({ from: 's1', adopted: 2 })
  expect((await port.learnings.all()).map(item => [item.id, item.session])).toEqual([['x1', 's2'], ['x2', 's2']])
  expect(data[learningsKey('s1')]).toBeUndefined()
  expect(data['backup:learnings:s2']).toEqual([one('x0', 's1')])
  expect(data[learningsKey('s3')]).toBeDefined()
  expect(await adoptLearnings(port)).toEqual({ from: null, adopted: 0 })
})

test("learnings a turn's reading proposed leave no call in the transcript: the old id the checklist came from is the fallback", async () => {
  const { port } = memoryPort({ session: 's2', store: { [learningsKey('s1')]: [one('c1', 's1')] } })

  expect(await adoptLearnings(port)).toEqual({ from: null, adopted: 0 })
  expect(await adoptLearnings(port, 's1')).toEqual({ from: 's1', adopted: 1 })
  expect((await port.learnings.all()).map(item => [item.id, item.session])).toEqual([['c1', 's2']])
})
