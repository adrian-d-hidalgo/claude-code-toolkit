import { expect, test } from 'claude-code/testing'

import type { Question } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { cleanQuestions, loadClosed, parkOwn, restoreAndSweep, undoQuestions } from './lifecycle.hook'

const question = (id: string, session: string, isOpen = true, at = 1000): Question => ({
  id,
  session,
  texts: [`Question ${id} that makes sense alone?`],
  source: 'text',
  project: '/p',
  at,
  isOpen,
  asks: 1,
})

test('clear all removes only this session, and undo brings it back without duplicating', async () => {
  const { port } = memoryPort({ store: { questions: [question('a', 's1'), question('b', 's2')] } })

  expect(await cleanQuestions(port)).toHaveLength(1)
  expect((await port.questions.all()).map(one => one.id)).toEqual(['b'])
  expect(await undoQuestions(port)).toHaveLength(1)
  expect((await port.questions.all()).map(one => one.id)).toEqual(['a', 'b'])
  await undoQuestions(port)
  expect(await port.questions.all()).toHaveLength(2)
})

test('ending a session parks its open questions and a resume gives them back', async () => {
  const { port, data } = memoryPort({ store: { questions: [question('a', 's1'), question('b', 's1', false), question('c', 's2')], 'backup:questions:s1': [] } })

  await parkOwn(port)

  expect((await port.questions.all()).map(one => one.id)).toEqual(['c'])
  expect('backup:questions:s1' in data).toBe(false)

  await restoreAndSweep(port)

  expect((await port.questions.all()).map(one => one.id)).toEqual(['c', 'a'])
  expect(data['parked:questions']).toEqual({})
})

test('starting a session sweeps what another session left quiet for a week', async () => {
  const week = 8 * 86_400_000
  const { port, data } = memoryPort({ now: week + 1000, store: { questions: [question('old', 's9', true, 1000), question('mine', 's1', true, 1000)] } })

  await restoreAndSweep(port)

  expect((await port.questions.all()).map(one => one.id)).toEqual(['mine'])
  expect(Object.keys(data['parked:questions'] as object)).toEqual(['s9'])
})

test('clear all twice keeps the first copy, and undo reports what really came back and uses the copy up', async () => {
  const { port, data } = memoryPort({ store: { questions: [question('a', 's1'), question('b', 's1')] } })

  await cleanQuestions(port)
  await cleanQuestions(port)

  expect((data['backup:questions:s1'] as Question[]).map(one => one.id)).toEqual(['a', 'b'])

  await port.questions.write(() => [question('a', 's1')])

  expect(await undoQuestions(port)).toHaveLength(1)
  expect('backup:questions:s1' in data).toBe(false)
  expect(await undoQuestions(port)).toHaveLength(0)
})

test('what a session closed is remembered when it is parked, so a resume does not ask it again', async () => {
  const { port, data } = memoryPort({ store: { questions: [question('a', 's1', false)] } })

  await parkOwn(port)

  expect(await loadClosed(port)).toEqual(['Question a that makes sense alone?'])
  expect(data['closed:questions:s1']).toBeDefined()
})

test('a sweep that parked a live session\'s quiet question is not lost when that session ends', async () => {
  const week = 8 * 86_400_000
  const { port } = memoryPort({ now: week + 1000, store: { questions: [question('old', 's1', true, 1000)] } })

  await restoreAndSweep(memoryPort({ now: week + 1000, store: { questions: [question('old', 's1', true, 1000)] }, session: 's2' }).port)
  const { port: other, data } = memoryPort({ now: week + 1000, session: 's1', store: { 'parked:questions': { s1: [question('swept', 's1')] }, questions: [question('mine', 's1')] } })
  await parkOwn(other)

  expect((data['parked:questions'] as Record<string, Question[]>)['s1']?.map(one => one.id)).toEqual(['swept', 'mine'])
  expect(port).toBeDefined()
})
