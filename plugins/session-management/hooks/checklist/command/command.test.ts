import { expect, test } from 'claude-code/testing'

import type { ChecklistItem } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { runChecklistCommand } from './command.hook'

const task = (id: string, status: ChecklistItem['status'] = 'todo'): ChecklistItem => ({ id, text: `Task ${id}`, status })

const setup = () => memoryPort({ store: { 'checklist:s1': [task('a'), task('b', 'doing'), task('c', 'done')] } })

test('the pane, help and a bad subcommand', async () => {
  const { port } = setup()

  expect(await runChecklistCommand(port, '', {})).toEqual({ text: 'Checklist pane opened.', opens: true })
  expect((await runChecklistCommand(port, 'help', {})).text).toContain('/checklist doctor')
  expect((await runChecklistCommand(port, 'frobnicate', {})).text).toContain('unknown subcommand frobnicate')
})

test('add, edit, description, status, move and remove address tasks by position', async () => {
  const { port } = setup()

  await runChecklistCommand(port, 'add Write the docs', {})
  await runChecklistCommand(port, 'edit 1 Write all the tests', {})
  await runChecklistCommand(port, 'detail 1 only the api', {})
  await runChecklistCommand(port, 'done 2', {})
  await runChecklistCommand(port, 'mv 4 1', {})

  const list = await port.checklist.all()

  expect(list.map(one => one.text)).toEqual(['Write the docs', 'Write all the tests', 'Task b', 'Task c'])
  expect(list[1]?.detail).toBe('only the api')
  expect(list[2]?.status).toBe('done')
  expect((await runChecklistCommand(port, 'rm 9', {})).text).toBe('No task 9.')

  await runChecklistCommand(port, 'rm 1', {})

  expect(await port.checklist.all()).toHaveLength(3)
})

test('detail keeps the description multi-line while edit collapses the title', async () => {
  const { port } = setup()

  await runChecklistCommand(port, 'detail 1 first line\n\n  - second  line', {})
  await runChecklistCommand(port, 'edit 1 a title\nover two lines', {})

  const first = (await port.checklist.all())[0]

  expect(first?.detail).toBe('first line\n\n  - second  line')
  expect(first?.text).toBe('a title over two lines')
})

test('edit names the section: title or description, multi-line, cleared with no text, detail as an alias', async () => {
  const { port } = setup()

  await runChecklistCommand(port, 'edit 1 title A new\ntitle', {})
  await runChecklistCommand(port, 'edit 1 description first line\n\n  - second  line', {})
  await runChecklistCommand(port, 'edit 2 description to be cleared', {})
  await runChecklistCommand(port, 'edit 2 description', {})
  await runChecklistCommand(port, 'detail 3 through the alias', {})

  const list = await port.checklist.all()

  expect(list[0]?.text).toBe('A new title')
  expect(list[0]?.detail).toBe('first line\n\n  - second  line')
  expect(list[1]?.detail).toBeUndefined()
  expect(list[2]?.detail).toBe('through the alias')
  expect((await runChecklistCommand(port, 'edit 1 title', {})).text).toContain('edit title needs a text')
  expect((await runChecklistCommand(port, 'edit 1', {})).text).toContain('edit needs')
})

test('run and cancel go through the task services', async () => {
  const { port, said } = setup()

  expect((await runChecklistCommand(port, 'run 1', {})).text).toBe('Running: Task a')
  expect((await runChecklistCommand(port, 'cancel 2', {})).text).toContain('signalled the model')
  expect(said).toHaveLength(2)
})

test('clear drops finished tasks; clear all and undo round-trip', async () => {
  const { port } = setup()

  await runChecklistCommand(port, 'clear', {})
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['a', 'b'])
  expect((await runChecklistCommand(port, 'clear all', {})).text).toContain('Removed 2 task(s)')
  expect((await runChecklistCommand(port, 'undo', {})).text).toContain('Restored 2 task(s)')
  expect((await runChecklistCommand(port, 'undo', {})).text).toBe('Nothing to restore.')
})

test('undo survives a second clear all and reports what it restored', async () => {
  const { port } = setup()

  await runChecklistCommand(port, 'clear all', {})
  await runChecklistCommand(port, 'clear all', {})
  expect((await runChecklistCommand(port, 'undo', {})).text).toContain('Restored 3 task(s)')
})

test('block and unblock address tasks and open questions by position', async () => {
  const question = { id: 'q1', texts: ['Which database?'], session: 's1', project: '/p', source: 'text', at: 1, asks: 1, isOpen: true }
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a'), task('b'), task('c')], questions: [question] } })

  expect((await runChecklistCommand(port, 'block 2 1', {})).text).toBe('Task blocked.')
  expect((await runChecklistCommand(port, 'block 2 by q1', {})).text).toBe('Task blocked.')
  expect((await port.checklist.all())[1]?.blockedBy).toEqual([{ kind: 'task', id: 'a' }, { kind: 'question', id: 'q1' }])
  expect((await runChecklistCommand(port, 'unblock 2 q1', {})).text).toBe('Task unblocked.')
  expect((await port.checklist.all())[1]?.blockedBy).toEqual([{ kind: 'task', id: 'a' }])
  await runChecklistCommand(port, 'unblock 2', {})
  expect((await port.checklist.all())[1]?.blockedBy).toBeUndefined()
})

test('block refuses an unknown position, itself and a loop', async () => {
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a'), task('b')] } })

  expect((await runChecklistCommand(port, 'block 1 7', {})).text).toBe('No task 7.')
  expect((await runChecklistCommand(port, 'block 1 q1', {})).text).toBe('No open question 1.')
  expect((await runChecklistCommand(port, 'block 9 1', {})).text).toBe('No task 9.')
  expect((await runChecklistCommand(port, 'block 1 1', {})).text).toBe('A task cannot wait for itself.')

  await runChecklistCommand(port, 'block 1 2', {})

  expect((await runChecklistCommand(port, 'block 2 1', {})).text).toBe('Not blocked: that would make a loop.')
  expect((await port.checklist.all())[1]?.blockedBy).toBeUndefined()
})

test('a refused loop is not reported as blocked even when the task has another blocker', async () => {
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a'), task('b'), task('c')] } })

  await runChecklistCommand(port, 'block 1 2', {})
  await runChecklistCommand(port, 'block 2 3', {})

  expect((await runChecklistCommand(port, 'block 2 1', {})).text).toBe('Not blocked: that would make a loop.')
  expect((await port.checklist.all())[1]?.blockedBy).toEqual([{ kind: 'task', id: 'c' }])
  expect((await runChecklistCommand(port, 'block 2 3', {})).text).toBe('Already blocked by that.')
})

test('blocking on a finished task says it blocks nothing; unblocking nothing says so', async () => {
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a'), task('b', 'done'), task('c', 'cancelled')] } })

  expect((await runChecklistCommand(port, 'block 1 2', {})).text).toBe('Not blocked: task 2 is already done, so it blocks nothing.')
  expect((await runChecklistCommand(port, 'block 1 3', {})).text).toContain('already cancelled')
  expect((await port.checklist.all())[0]?.blockedBy).toBeUndefined()
  expect((await runChecklistCommand(port, 'unblock 1', {})).text).toBe('Nothing to unblock.')
})

test('q<K> counts question parts like the /questions pane, and unblock with garbage changes nothing', async () => {
  const group = { id: 'q1', texts: ['Which database?', 'Which region?'], session: 's1', project: '/p', source: 'text', at: 1, asks: 1, isOpen: true }
  const other = { id: 'q2', texts: ['Which name?'], session: 's1', project: '/p', source: 'text', at: 2, asks: 1, isOpen: true }
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a'), task('b')], questions: [group, other] } })

  expect((await runChecklistCommand(port, 'block 1 q2', {})).text).toBe('Task blocked.')
  expect((await runChecklistCommand(port, 'block 2 q3', {})).text).toBe('Task blocked.')
  expect((await port.checklist.all()).map(one => one.blockedBy)).toEqual([[{ kind: 'question', id: 'q1' }], [{ kind: 'question', id: 'q2' }]])
  expect((await runChecklistCommand(port, 'block 1 q4', {})).text).toBe('No open question 4.')
  expect((await runChecklistCommand(port, 'unblock 1 nonsense', {})).text).toContain('unblock takes a task number')
  expect((await port.checklist.all())[0]?.blockedBy).toHaveLength(1)
})

test('mv tells the truth: bad positions, no-ops and the edge of a priority level', async () => {
  const { port } = memoryPort({ store: { 'checklist:s1': [{ ...task('h'), priority: 'high' as const }, task('a'), task('b'), task('c')] } })

  expect((await runChecklistCommand(port, 'mv 9 1', {})).text).toBe('No task 9.')
  expect((await runChecklistCommand(port, 'mv 2 9', {})).text).toBe('No task 9.')
  expect((await runChecklistCommand(port, 'mv 3 3', {})).text).toBe('Nothing moved: the task is already there.')
  // Position 1 is in the high level: the task stops at the top of its own level.
  expect((await runChecklistCommand(port, 'mv 4 1', {})).text).toBe('Task moved to position 2, the edge of its priority level.')
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['h', 'c', 'a', 'b'])
  expect((await runChecklistCommand(port, 'mv 1 3', {})).text).toBe('Nothing moved: a task only moves within its priority level.')
})

test('add refuses past the cap', async () => {
  const full = Array.from({ length: 200 }, (_, index) => task(`t${index}`))
  const { port } = memoryPort({ store: { 'checklist:s1': full } })

  expect((await runChecklistCommand(port, 'add One more', {})).text).toContain('The checklist is full')
  expect(await port.checklist.all()).toHaveLength(200)
})

test('priority sets the level of a task by position and sorts the list; mv stays within a level', async () => {
  const { port } = setup()

  expect((await runChecklistCommand(port, 'priority 3 high', {})).text).toBe('Checklist updated.')
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['c', 'a', 'b'])

  await runChecklistCommand(port, 'pri 1 low', {})
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['a', 'b', 'c'])
  expect((await port.checklist.all())[2]?.priority).toBe('low')

  await runChecklistCommand(port, 'pri 3 normal', {})
  expect((await port.checklist.all()).find(one => one.id === 'c')?.priority).toBeUndefined()

  const bad = await runChecklistCommand(port, 'priority 1 urgent', {})

  expect(bad.text).toContain('priority needs high, normal or low')
})
