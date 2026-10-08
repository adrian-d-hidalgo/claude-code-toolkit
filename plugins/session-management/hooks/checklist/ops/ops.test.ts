import { expect, test } from 'claude-code/testing'

import type { ChecklistItem, Question } from '../../../types'
import { briefChecklist, byPriority, describe, moveInLevel, moved, withDetail, withStatus, withText, without } from './ops.hook'

const task = (id: string, text: string, status: ChecklistItem['status'] = 'todo', detail?: string): ChecklistItem => ({
  id,
  text,
  status,
  ...(detail ? { detail } : {}),
})

const list = [task('a', 'First'), task('b', 'Second', 'doing'), task('c', 'Third', 'done'), task('d', 'Fourth', 'cancelled')]

test('status, text and removal touch only their task', () => {
  expect(withStatus('a', 'done')(list)[0]?.status).toBe('done')
  expect(withText('a', '  Renamed \n task ')(list)[0]?.text).toBe('Renamed task')
  expect(without('b')(list).map(one => one.id)).toEqual(['a', 'c', 'd'])
})

test('descriptions are trimmed and an empty one removes the field', () => {
  const withDescription = withDetail('a', '  only the api  ')(list)

  expect(withDescription[0]?.detail).toBe('only the api')
  expect('detail' in (withDetail('a', '   ')(withDescription)[0] as ChecklistItem)).toBe(false)
})

test('a move reorders, and an out of range move changes nothing', () => {
  expect(moved(0, 2)(list).map(one => one.id)).toEqual(['b', 'c', 'a', 'd'])
  expect(moved(3, 0)(list).map(one => one.id)).toEqual(['d', 'a', 'b', 'c'])
  expect(moved(0, 9)(list)).toBe(list)
  expect(moved(-1, 1)(list)).toBe(list)
})

test('the tool answer lists everything; the prompt brief lists open tasks and counts the done', () => {
  expect(describe([])).toBe('The checklist is empty.')
  expect(describe([task('a', 'First', 'todo', 'a description')])).toBe('1. [a] (todo) First\n   detail: a description')
  expect(describe([task('a', 'First', 'todo', 'one\ntwo')])).toBe('1. [a] (todo) First\n   detail: one\n   two')
  expect(briefChecklist(list)).toBe(
    ['1. [a] (todo) First\n2. [b] (doing) Second', 'Cancelled by the user (do not work on these):\n4. [d] (cancelled) Fourth', '(+1 done)'].join('\n'),
  )
})

test('a blocked task says what it waits for, in the tool answer and in the prompt brief', () => {
  const question: Question = { id: 'q1', texts: ['Which database?'], session: 's', project: '/p', source: 'text', at: 1, asks: 1, isOpen: true }
  const blocked: ChecklistItem[] = [task('a', 'First'), { ...task('b', 'Second'), blockedBy: [{ kind: 'task', id: 'a' }, { kind: 'question', id: 'q1' }] }]
  const clause = ' — blocked by task [a] First; question [q1] Which database?'

  expect(describe(blocked, [question])).toBe(`1. [a] (todo) First\n2. [b] (todo) Second${clause}`)
  expect(briefChecklist(blocked, [question])).toBe(`1. [a] (todo) First\n2. [b] (todo) Second${clause}`)
  expect(briefChecklist(blocked, [{ ...question, isOpen: false }])).toContain('Second — blocked by task [a] First')
  expect(briefChecklist(blocked, [{ ...question, isOpen: false }])).not.toContain('question [q1]')
  expect(briefChecklist([{ ...(blocked[0] as ChecklistItem), status: 'done' }, blocked[1] as ChecklistItem], [])).toBe('2. [b] (todo) Second\n(+1 done)')
})

test('a priority other than normal is shown in the tool answer and in the prompt brief', () => {
  const ranked: ChecklistItem[] = [{ ...task('a', 'Urgent'), priority: 'high' }, task('b', 'Plain'), { ...task('c', 'Later'), priority: 'low' }]

  expect(describe(ranked)).toBe('1. [a] (todo) !high Urgent\n2. [b] (todo) Plain\n3. [c] (todo) !low Later')
  expect(briefChecklist(ranked)).toBe('1. [a] (todo) !high Urgent\n2. [b] (todo) Plain\n3. [c] (todo) !low Later')
  expect(byPriority([ranked[2] as ChecklistItem, ranked[1] as ChecklistItem, ranked[0] as ChecklistItem]).map(one => one.id)).toEqual(['a', 'b', 'c'])
})

test('a blank title changes nothing', () => {
  expect(withText('a', '  \n ')(list)).toBe(list)
})

test('moveInLevel clamps a move inside the priority level of the task', () => {
  const ranked: ChecklistItem[] = [{ ...task('a', 'Urgent'), priority: 'high' }, task('b', 'One'), task('c', 'Two'), { ...task('d', 'Later'), priority: 'low' }]

  expect(moveInLevel(ranked, 2, 0).at).toBe(1)
  expect(moveInLevel(ranked, 2, 0).list.map(one => one.id)).toEqual(['a', 'c', 'b', 'd'])
  expect(moveInLevel(ranked, 1, 9).at).toBe(2)
  expect(moveInLevel(ranked, 0, 3).at).toBe(0)
})
