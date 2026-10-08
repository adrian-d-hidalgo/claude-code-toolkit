import { expect, test } from 'claude-code/testing'

import { memoryPort } from '../../shared/port/port.hook'
import { CHECKLIST_INDEX, cleanChecklist, sweepChecklists, undoChecklist } from './lifecycle.hook'

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
