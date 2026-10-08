import { expect, test } from 'claude-code/testing'

import type { ChecklistItem } from '../../../types'
import { diffChecklist } from './changes.hook'

const task = (id: string, text: string, status: ChecklistItem['status'] = 'todo', detail?: string): ChecklistItem => ({
  id,
  text,
  status,
  ...(detail ? { detail } : {}),
})

test('nothing changed, nothing to report (a new conversation on an untouched project)', () => {
  const list = [task('a', 'Write tests'), task('b', 'Ship it')]

  expect(diffChecklist(list, list)).toEqual([])
})

test('the user adds, renames, cancels and removes tasks between prompts', () => {
  const seen = [task('a', 'Write tests'), task('b', 'Ship it'), task('c', 'Old chore')]
  const now = [task('a', 'Write the tests', 'cancelled'), task('b', 'Ship it'), task('d', 'Call legal')]

  expect(diffChecklist(seen, now)).toEqual([
    '"Write the tests": todo -> cancelled',
    'renamed "Write tests" to "Write the tests"',
    'added "Call legal" (todo)',
    'removed "Old chore"',
  ])
})

test('a reorder is reported once, as a priority change', () => {
  const seen = [task('a', 'First'), task('b', 'Second'), task('c', 'Third')]
  const now = [task('c', 'Third'), task('a', 'First'), task('b', 'Second')]

  expect(diffChecklist(seen, now)).toEqual(['the order (priority) changed: see the list'])
})

test('description edited from the detail view are reported', () => {
  expect(diffChecklist([task('a', 'Fix lint')], [task('a', 'Fix lint', 'todo', 'only in src/cloud')])).toEqual([
    '"Fix lint": description changed',
  ])
})

test('priority and blocker edits are reported, and a re-sort they explain is not reported again', () => {
  const seen = [task('a', 'First'), task('b', 'Second')]
  const now: ChecklistItem[] = [{ ...task('b', 'Second'), priority: 'high' }, { ...task('a', 'First'), blockedBy: [{ kind: 'task', id: 'b' }] }]

  expect(diffChecklist(seen, now)).toEqual(['"Second": priority normal -> high', '"First": what it waits for changed'])
})
