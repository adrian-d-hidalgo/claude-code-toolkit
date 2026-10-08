import { expect, test } from 'claude-code/testing'

import { memoryPort } from './port.hook'

test('the memory port keeps this session apart from the others', async () => {
  const { port } = memoryPort({ session: 's1' })
  const question = (id: string, session: string, isOpen: boolean) => ({ id, session, texts: ['A question that makes sense alone?'], source: 'text' as const, project: '/p', at: 1, asks: 1, isOpen })

  await port.questions.write(() => [question('a', 's1', true), question('b', 's2', true), question('c', 's1', false)])

  expect((await port.questions.own(false)).map(one => one.id)).toEqual(['a', 'c'])
  expect((await port.questions.own(true)).map(one => one.id)).toEqual(['a'])
  expect(await port.questions.all()).toHaveLength(3)
})

test('the checklist lives under its session key, and the fake model answers or declines', async () => {
  const { port, data } = memoryPort({ session: 's7', complete: prompt => (prompt.includes('yes') ? 'ok' : null) })

  await port.checklist.write(() => [{ id: 'a', text: 'Write the tests', status: 'todo' }])

  expect(Object.keys(data)).toEqual(['checklist:s7'])
  expect(await port.complete({ prompt: 'say yes', maxTokens: 1 })).toEqual({ isAnswered: true, text: 'ok' })
  expect(await port.complete({ prompt: 'say no', maxTokens: 1 })).toEqual({ isAnswered: false, text: '' })
})

test('the checklist is always listed by priority: a high task added last comes first, a normal one goes before a low one', async () => {
  const { port } = memoryPort({ session: 's1' })

  await port.checklist.write(() => [{ id: 'l', text: 'Later', status: 'todo', priority: 'low' }, { id: 'n', text: 'Normal', status: 'todo' }])
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['n', 'l'])

  await port.checklist.write(list => [...list, { id: 'h', text: 'Urgent', status: 'todo', priority: 'high' }])
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['h', 'n', 'l'])

  await port.checklist.write(list => [...list, { id: 'm', text: 'Another normal', status: 'todo' }])
  expect((await port.checklist.all()).map(one => one.id)).toEqual(['h', 'n', 'm', 'l'])
})
