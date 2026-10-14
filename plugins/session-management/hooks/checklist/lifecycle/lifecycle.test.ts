import { expect, test } from 'claude-code/testing'

import { memoryPort } from '../../shared/port/port.hook'
import { CHECKLIST_INDEX, adoptChecklist, cleanChecklist, migrateToId, sweepChecklists, undoChecklist } from './lifecycle.hook'

test('clear all keeps a copy; undo restores it and keeps what was added since', async () => {
  const { port } = memoryPort({ store: { 'checklist:s1': [{ id: 'a', text: 'Write the tests', status: 'todo' }] } })

  expect(await cleanChecklist(port)).toBe(1)
  expect(await port.checklist.all()).toEqual([])

  await port.checklist.write(() => [{ id: 'b', text: 'Ship it', status: 'todo' }])

  expect(await undoChecklist(port)).toBe(1)
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['a', 'b'])
  // The copy is spent: a second undo restores nothing, even after the task was removed again.
  await port.checklist.write(list => list.filter(one => one.id !== 'a'))
  expect(await undoChecklist(port)).toBe(0)
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['b'])
})

test('a second clear all on an empty list keeps the copy undo restores', async () => {
  const { port } = memoryPort({ store: { 'checklist:s1': [{ id: 'a', text: 'Write the tests', status: 'todo' }] } })

  await cleanChecklist(port)
  expect(await cleanChecklist(port)).toBe(0)
  expect(await undoChecklist(port)).toBe(1)
})

test('undo reports what it put back, not the size of the copy', async () => {
  const { port } = memoryPort({ store: { 'backup:checklist:s1': [{ id: 'a', text: 'One', status: 'todo' }, { id: 'b', text: 'Two', status: 'todo' }], 'checklist:s1': [{ id: 'a', text: 'One', status: 'todo' }] } })

  expect(await undoChecklist(port)).toBe(1)
})

test('a checklist nobody wrote to for a month goes, with its backup; this one and recent ones stay', async () => {
  const month = 31 * 86_400_000
  const { port, data } = memoryPort({
    now: month + 5000,
    store: {
      'checklist:s1': [{ id: 'a', text: 'Write the tests', status: 'todo' }],
      'checklist:old': [{ id: 'b', text: 'A forgotten task', status: 'todo' }],
      'backup:checklist:old': [],
      'checklist:recent': [{ id: 'c', text: 'A fresh task', status: 'todo' }],
      [CHECKLIST_INDEX]: { 'checklist:s1': 1000, 'checklist:old': 1000, 'checklist:recent': month },
    },
  })

  expect(await sweepChecklists(port)).toBe(1)
  expect(Object.keys(data).sort()).toEqual(['checklist:recent', 'checklist:s1', CHECKLIST_INDEX])
  expect(Object.keys(data[CHECKLIST_INDEX] as object).sort()).toEqual(['checklist:recent', 'checklist:s1'])
})

test('migration moves what was kept under the launch time to the session id; the live tasks win', async () => {
  const { port, data } = memoryPort({
    session: 'abc',
    store: {
      'checklist:900': [{ id: 'a', text: 'Old task', status: 'todo' }, { id: 'b', text: 'Old but changed', status: 'todo' }],
      'backup:checklist:900': [{ id: 'z', text: 'Kept copy', status: 'todo' }],
      'checklist:abc': [{ id: 'b', text: 'Live version', status: 'doing' }],
      questions: [
        { id: 'q1', session: '900', texts: ['Which one?'], source: 'text', project: '/p', at: 1, asks: 1, isOpen: true },
        { id: 'q2', session: 'other', texts: ['Another?'], source: 'text', project: '/p', at: 1, asks: 1, isOpen: true },
      ],
      'parked:questions': { '900': [{ id: 'q3' }] },
      'closed:questions:900': ['Done?'],
      [CHECKLIST_INDEX]: { 'checklist:900': 1000 },
    },
  })

  expect(await migrateToId(port, '900')).toBe(true)
  expect((await port.checklist.all()).map(one => `${one.id}:${one.status}`).sort()).toEqual(['a:todo', 'b:doing'])
  expect(data['checklist:900']).toBeUndefined()
  expect(data['backup:checklist:abc']).toEqual([{ id: 'z', text: 'Kept copy', status: 'todo' }])
  expect((data['questions'] as Array<{ id: string; session: string }>).map(one => `${one.id}:${one.session}`)).toEqual(['q1:abc', 'q2:other'])
  expect(Object.keys(data['parked:questions'] as object)).toEqual(['abc'])
  expect(data['closed:questions:abc']).toEqual(['Done?'])
  expect(data[CHECKLIST_INDEX]).toEqual({})
  // Nothing is left under the old key, so a second run does nothing.
  expect(await migrateToId(port, '900')).toBe(false)
})

test('migration leaves another conversation\'s data alone and does nothing when the key is already the id', async () => {
  const { port, data } = memoryPort({ session: 'abc', store: { 'checklist:other': [{ id: 'a', text: 'Not mine', status: 'todo' }] } })

  expect(await migrateToId(port, '900')).toBe(false)
  expect(await migrateToId(port, 'abc')).toBe(false)
  expect(data['checklist:other']).toHaveLength(1)
  expect(await port.checklist.all()).toEqual([])
})

test('a conversation keeps its own list when another session has the same text', async () => {
  const a = memoryPort({ session: 'a' })
  await a.port.checklist.write(() => [{ id: 'x', text: 'A task', status: 'todo' }])
  const b = memoryPort({ session: 'b', store: a.data })

  expect(await b.port.checklist.all()).toEqual([])
  expect((await a.port.checklist.all()).map(one => one.id)).toEqual(['x'])
})

test('a resumed conversation under a new id takes its checklist back whole, found by the task ids its transcript used', async () => {
  const old = [
    { id: 'mvaaa1', text: 'Write the tests', status: 'todo' },
    { id: 'mvaaa2', text: 'Ship it', status: 'done' },
  ]
  const other = [{ id: 'mvzzz1', text: 'Someone else\'s task', status: 'todo' }]
  const messages = [{ role: 'assistant' as const, text: 'On it.', toolUses: [{ tool: 'mcp__session-management__checklist', input: { action: 'status', id: 'mvaaa1', status: 'doing' }, result: 'Updated [mvaaa1].' }] }]
  const { port, data } = memoryPort({
    session: 'new',
    messages,
    store: { 'checklist:old': old, 'backup:checklist:old': [old[0]], 'checklist:x': other, 'checklist:new': [{ id: 'mvbbb1', text: 'Recreated by hand', status: 'todo' }], [CHECKLIST_INDEX]: { 'checklist:old': 1, 'checklist:x': 1 } },
  })

  expect(await adoptChecklist(port)).toEqual({ from: 'old', adopted: 2 })
  expect((await port.checklist.all()).map(one => one.id).sort()).toEqual(['mvaaa1', 'mvaaa2', 'mvbbb1'])
  expect(data['checklist:old']).toBeUndefined()
  expect(data['backup:checklist:new']).toEqual([old[0]])
  expect(data['checklist:x']).toEqual(other)
  expect(data[CHECKLIST_INDEX]).toEqual({ 'checklist:x': 1 })
  expect(await adoptChecklist(port)).toEqual({ from: null, adopted: 0 })
})

test('a conversation that never used the checklist tool takes nothing over', async () => {
  const { port } = memoryPort({ session: 'new', messages: [{ role: 'assistant', text: 'Hi', toolUses: [] }], store: { 'checklist:old': [{ id: 'mvaaa1', text: 'Write the tests', status: 'todo' }] } })

  expect(await adoptChecklist(port)).toEqual({ from: null, adopted: 0 })
})
