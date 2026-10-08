import { expect, test } from 'claude-code/testing'

import type { ChecklistItem } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { cancelTask, runTask } from './tasks.hook'

const task = (id: string, status: ChecklistItem['status'], detail?: string): ChecklistItem => ({ id, text: `Task ${id}`, status, ...(detail ? { detail } : {}) })

test('running a task marks it in progress and asks the model, description included', async () => {
  const { port, said } = memoryPort({ store: { 'checklist:s1': [task('a', 'todo', 'only the api'), task('b', 'doing'), task('c', 'done')] } })

  expect(await runTask(port, 'a')).toBe('Running: Task a')
  expect((await port.checklist.all())[0]?.status).toBe('doing')
  expect(said[0]).toContain('Details: only the api')
  expect(await runTask(port, 'b')).toBe('Nothing to run.')
  expect(await runTask(port, 'c')).toBe('Nothing to run.')
  expect(said).toHaveLength(1)
})

test('cancelling a task not started only marks it', async () => {
  const { port, said, aborted } = memoryPort({ turn: 't1', store: { 'checklist:s1': [task('a', 'todo')] } })

  expect(await cancelTask(port, 'a')).toBe('Cancelled: Task a')
  expect(said).toEqual([])
  expect(aborted).toEqual([])
})

test('cancelling a task in progress also aborts the running turn and tells the model to stop', async () => {
  const { port, said, aborted } = memoryPort({ turn: 't1', store: { 'checklist:s1': [task('a', 'doing')] } })

  expect(await cancelTask(port, 'a')).toBe('Cancelled and signalled the model: Task a')
  expect(aborted).toEqual(['t1'])
  expect(said[0]).toContain('Stop any work on it')
  expect(await cancelTask(port, 'a')).toBe('Nothing to cancel.')
})

test('a blocked task is not run until its blocker is done', async () => {
  const blocked: ChecklistItem = { ...task('b', 'todo'), blockedBy: [{ kind: 'task', id: 'a' }] }
  const { port, said } = memoryPort({ store: { 'checklist:s1': [task('a', 'todo'), blocked] } })

  expect(await runTask(port, 'b')).toBe('Blocked: Task b waits for task "Task a". Finish or unblock it first.')
  expect((await port.checklist.all())[1]?.status).toBe('todo')
  expect(said).toEqual([])

  await port.checklist.write(list => list.map(one => (one.id === 'a' ? { ...one, status: 'done' as const } : one)))

  expect(await runTask(port, 'b')).toBe('Running: Task b')
  expect(said).toHaveLength(1)
})

test('a task waiting for an open question is blocked until it is answered', async () => {
  const question = { id: 'q1', texts: ['Which database?'], session: 's1', project: '/p', source: 'text', at: 1, asks: 1, isOpen: true }
  const { port } = memoryPort({ store: { 'checklist:s1': [{ ...task('a', 'todo'), blockedBy: [{ kind: 'question', id: 'q1' }] }], questions: [question] } })

  expect(await runTask(port, 'a')).toContain('waits for question "Which database?"')

  await port.questions.write(list => list.map(one => ({ ...one, isOpen: false })))

  expect(await runTask(port, 'a')).toBe('Running: Task a')
})
