import { expect, test } from 'claude-code/testing'

import type { ChecklistItem, Question } from '../../../types'
import { without } from '../ops/ops.hook'
import { activeBlockers, resolveBlocker, withBlocker, withoutBlocker } from './blockers.hook'

const list: ChecklistItem[] = [
  { id: 'a', text: 'Write the migration', status: 'todo' },
  { id: 'b', text: 'Run the migration', status: 'todo', blockedBy: [{ kind: 'task', id: 'a' }, { kind: 'question', id: 'q1' }] },
]
const asked = (isOpen: boolean): Question[] => [{ id: 'q1', texts: ['Which database?'], session: 's', project: '/p', source: 'text', at: 1, asks: 1, isOpen }]

test('a task is blocked while its blockers are open, and free once they finish or are answered', () => {
  expect(activeBlockers(list[1] as ChecklistItem, list, asked(true)).map(one => one.id)).toEqual(['a', 'q1'])
  expect(activeBlockers(list[1] as ChecklistItem, [{ ...(list[0] as ChecklistItem), status: 'done' }, list[1] as ChecklistItem], asked(false))).toEqual([])
  expect(activeBlockers(list[1] as ChecklistItem, [list[1] as ChecklistItem], [])).toEqual([])
})

test('ids resolve to a task or an open question, and anything else is nothing', () => {
  expect(resolveBlocker('a', list, asked(true))).toEqual({ kind: 'task', id: 'a' })
  expect(resolveBlocker('q1', list, asked(true))).toEqual({ kind: 'question', id: 'q1' })
  expect(resolveBlocker('q1', list, asked(false))).toBeNull()
  expect(resolveBlocker('zz', list, [])).toBeNull()
})

test('a blocker is added once, never makes a loop, and can be dropped one at a time or all', () => {
  const plain: ChecklistItem[] = [{ id: 'a', text: 'A', status: 'todo' }, { id: 'b', text: 'B', status: 'todo' }]
  const once = withBlocker('b', { kind: 'task', id: 'a' })(withBlocker('b', { kind: 'task', id: 'a' })(plain))

  expect(once[1]?.blockedBy).toEqual([{ kind: 'task', id: 'a' }])
  expect(withBlocker('a', { kind: 'task', id: 'b' })(once)[0]?.blockedBy).toBeUndefined()
  expect(withBlocker('a', { kind: 'task', id: 'a' })(plain)[0]?.blockedBy).toBeUndefined()
  expect(withoutBlocker('b', { kind: 'task', id: 'a' })(once)[1]?.blockedBy).toBeUndefined()
  expect(withoutBlocker('b')(list)[1]?.blockedBy).toBeUndefined()
})

test('removing a task frees the ones that waited for it', () => {
  expect(without('a')(list)[0]?.blockedBy).toEqual([{ kind: 'question', id: 'q1' }])
})
