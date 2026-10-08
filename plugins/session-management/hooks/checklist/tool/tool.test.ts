import { expect, test } from 'claude-code/testing'

import type { ChecklistItem } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { callChecklistTool } from './tool.hook'

const task = (id: string, status: ChecklistItem['status'] = 'todo'): ChecklistItem => ({ id, text: `Task ${id}`, status })

const setup = () => memoryPort({ store: { 'checklist:s1': [task('a'), task('b'), task('c')] } })

test('add keeps the title short and the description apart', async () => {
  const { port } = setup()
  const answer = await callChecklistTool(port, { action: 'add', text: 'Write\nthe docs', detail: 'only the api' })

  expect(answer).toContain('4. [id1] (todo) Write the docs\n   detail: only the api')
})

test('status, edit and remove change one task', async () => {
  const { port } = setup()

  await callChecklistTool(port, { action: 'status', id: 'a', status: 'done' })
  await callChecklistTool(port, { action: 'edit', id: 'b', text: 'Renamed', detail: 'a description' })
  await callChecklistTool(port, { action: 'remove', id: 'c' })

  expect(await port.checklist.all()).toEqual([
    { id: 'a', text: 'Task a', status: 'done' },
    { id: 'b', text: 'Renamed', status: 'todo', detail: 'a description' },
  ])
})

test('move takes a 1-based position, clamps past the end and refuses nonsense', async () => {
  const { port } = setup()

  await callChecklistTool(port, { action: 'move', id: 'c', position: 1 })
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['c', 'a', 'b'])
  await callChecklistTool(port, { action: 'move', id: 'c', position: 99 })
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['a', 'b', 'c'])
  expect(await callChecklistTool(port, { action: 'move', id: 'zzz', position: 1 })).toContain('Invalid move')
  expect(await callChecklistTool(port, { action: 'move', id: 'a', position: 0 })).toContain('Invalid move')
})

test('list answers the whole checklist; anything else is refused', async () => {
  const { port } = setup()

  expect(await callChecklistTool(port, { action: 'list' })).toContain('1. [a] (todo) Task a')
  expect(await callChecklistTool(port, { action: 'status', id: 'a', status: 'weird' })).toContain('Invalid checklist call')
  expect(await callChecklistTool(port, { action: 'add' })).toContain('Invalid checklist call')
  expect(await callChecklistTool(port, { action: 'add', text: 'X', priority: 'urgent' })).toContain('Invalid priority')
  expect(await callChecklistTool(port, { action: 'edit', id: 'a', priority: 'urgent' })).toContain('Invalid priority')
})

test('add goes through the reconcile: a repeat is folded instead of added twice', async () => {
  const { port } = setup()
  const answer = await callChecklistTool(port, { action: 'add', text: 'Task a' })

  expect(answer).toContain('0 added, 0 merged into existing tasks, 1 already tracked')
  expect(await port.checklist.all()).toHaveLength(3)
})

test('add can name what the new task waits for, and the answer shows it', async () => {
  const { port } = setup()
  const answer = await callChecklistTool(port, { action: 'add', text: 'Ship the release', blockedBy: ['a', 'nope'] }, { judge: 'heuristic' })

  expect(answer).toContain('Added [id1].')
  expect(answer).toContain('4. [id1] (todo) Ship the release — blocked by task [a] Task a')
  expect((await port.checklist.all())[3]?.blockedBy).toEqual([{ kind: 'task', id: 'a' }])
})

test('block and unblock take ids of tasks and open questions', async () => {
  const question = { id: 'q1', texts: ['Which database?'], session: 's1', project: '/p', source: 'text', at: 1, asks: 1, isOpen: true }
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a'), task('b'), task('c')], questions: [question] } })
  const blocked = await callChecklistTool(port, { action: 'block', id: 'c', blockedBy: ['a', 'q1', 'zz'] })

  expect(blocked).toContain('Unknown task or open question zz.')
  expect(blocked).toContain('3. [c] (todo) Task c — blocked by task [a] Task a; question [q1] Which database?')

  await callChecklistTool(port, { action: 'unblock', id: 'c', blockedBy: ['a'] })
  expect((await port.checklist.all())[2]?.blockedBy).toEqual([{ kind: 'question', id: 'q1' }])

  await callChecklistTool(port, { action: 'unblock', id: 'c' })
  expect((await port.checklist.all())[2]?.blockedBy).toBeUndefined()
})

test('add and edit set a priority and the list stays sorted by it', async () => {
  const { port } = setup()
  const added = await callChecklistTool(port, { action: 'add', text: 'Fix the outage', priority: 'high' }, { judge: 'heuristic' })

  expect(added).toContain('1. [id1] (todo) !high Fix the outage')
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['id1', 'a', 'b', 'c'])

  await callChecklistTool(port, { action: 'edit', id: 'a', priority: 'low' })
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['id1', 'b', 'c', 'a'])

  await callChecklistTool(port, { action: 'edit', id: 'a', priority: 'normal' })
  expect((await port.checklist.all()).find(one => one.id === 'a')).toEqual({ id: 'a', text: 'Task a', status: 'todo' })
})

test('a long title keeps its full text and the given description together', async () => {
  const { port } = setup()
  const long = 'Replace the in-memory rate limiter with the Valkey-backed one and update every caller that imports the old module'

  await callChecklistTool(port, { action: 'add', text: long, detail: 'only the api package' })

  const created = (await port.checklist.all()).find(one => one.id === 'id1')

  expect(created?.text.endsWith('…')).toBe(true)
  expect(created?.detail).toBe(`${long}\nonly the api package`)
})

test('blank text is refused on add and edit', async () => {
  const { port } = setup()

  expect(await callChecklistTool(port, { action: 'add', text: '   ' })).toContain('Invalid checklist call')
  expect(await port.checklist.all()).toHaveLength(3)
  expect(await callChecklistTool(port, { action: 'edit', id: 'a', text: '  ', detail: 'a description' })).toContain('cannot be blank')
  expect((await port.checklist.all())[0]).toEqual({ id: 'a', text: 'Task a', status: 'todo', detail: 'a description' })
})

test('bad input is answered with a note instead of silence', async () => {
  const question = { id: 'q1', texts: ['Which database?'], session: 's1', project: '/p', source: 'text', at: 1, asks: 1, isOpen: true }
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a'), task('b'), task('c', 'done')], questions: [question] } })

  for (const action of ['block', 'unblock', 'edit', 'status', 'remove']) {
    expect(await callChecklistTool(port, { action, id: 'zz', text: 'X', status: 'done', blockedBy: ['a'] })).toContain('Unknown task zz.')
  }

  await callChecklistTool(port, { action: 'block', id: 'a', blockedBy: ['b'] })

  expect(await callChecklistTool(port, { action: 'block', id: 'b', blockedBy: ['a'] })).toContain('Not blocked by a: it would make a loop.')
  expect(await callChecklistTool(port, { action: 'block', id: 'b', blockedBy: ['b'] })).toContain('cannot wait for itself')
  expect(await callChecklistTool(port, { action: 'block', id: 'b', blockedBy: ['c'] })).toContain('already done, so it blocks nothing')
  expect(await callChecklistTool(port, { action: 'block', id: 'b', blockedBy: [] })).toContain('Nothing blocked')
  expect(await callChecklistTool(port, { action: 'block', id: 'b', blockedBy: 'a' as unknown as string[] })).toContain('Nothing blocked')
  expect(await callChecklistTool(port, { action: 'unblock', id: 'a', blockedBy: [] })).toContain('Nothing unblocked')
  expect((await port.checklist.all())[0]?.blockedBy).toEqual([{ kind: 'task', id: 'b' }])
  expect((await port.checklist.all())[1]?.blockedBy).toBeUndefined()
})

test('move reports a no-op and the edge of a priority level', async () => {
  const { port } = memoryPort({ store: { 'checklist:s1': [{ ...task('h'), priority: 'high' as const }, task('a'), task('b')] } })

  expect(await callChecklistTool(port, { action: 'move', id: 'h', position: 3 })).toContain('Nothing moved')
  expect(await callChecklistTool(port, { action: 'move', id: 'b', position: 1 })).toContain('Moved to position 2, the edge of its priority level.')
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['h', 'b', 'a'])
})

test('add says the checklist is full instead of dropping a task', async () => {
  const full = Array.from({ length: 200 }, (_, index) => task(`t${index}`))
  const { port } = memoryPort({ store: { 'checklist:s1': full } })

  expect(await callChecklistTool(port, { action: 'add', text: 'One more thing' })).toContain('The checklist is full')
  expect(await port.checklist.all()).toHaveLength(200)
})
