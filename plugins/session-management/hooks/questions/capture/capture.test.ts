import { expect, test } from 'claude-code/testing'

import { memoryPort } from '../../shared/port/port.hook'
import { captureQuestions, resolveAnswered } from './capture.hook'

const vague = '¿Cuál eliges?'
const full = '¿Cuál clase de RDS eliges, t4g.large o m7g.large?'

test('without a model, a question that makes sense alone is tracked and a vague one is not', async () => {
  const { port } = memoryPort()

  await captureQuestions(port, '', [vague, full], 'text', { judge: 'heuristic' })

  expect((await port.questions.all()).map(one => one.texts)).toEqual([[full]])
})

test('the judge may reword and choose how a question is answered; a dialog keeps its own options', async () => {
  const reply = JSON.stringify({
    groups: [{ texts: [full], choices: [{ kind: 'single', options: ['t4g.large', 'm7g.large'] }], repeatOf: null }],
  })
  const { port } = memoryPort({ complete: () => reply })

  await captureQuestions(port, 'message', [vague], 'text', {})
  const [one] = await port.questions.all()

  expect(one).toMatchObject({ texts: [full], source: 'text', session: 's1', isOpen: true })
  expect(one?.choices?.[full]).toEqual({ kind: 'single', options: ['t4g.large', 'm7g.large'] })

  const dialog = memoryPort()
  await captureQuestions(dialog.port, '', ['Which environment should the plan use?'], 'dialog', { judge: 'heuristic' }, {
    'Which environment should the plan use?': { kind: 'multi', options: ['staging', 'production'] },
  })

  expect((await dialog.port.questions.all())[0]?.choices?.['Which environment should the plan use?']?.kind).toBe('multi')
})

test('a repeat of an open question refreshes it instead of duplicating it', async () => {
  const { port } = memoryPort()

  await captureQuestions(port, '', [full], 'text', { judge: 'heuristic' })
  await captureQuestions(port, '', ['¿Qué clase de RDS eliges?'], 'text', { judge: 'heuristic' })

  const all = await port.questions.all()

  expect(all).toHaveLength(1)
  expect(all[0]?.asks).toBe(2)
})

test('what the user settled is closed, partially for a group; nothing happens without a model', async () => {
  const { port } = memoryPort({ complete: () => '{"settled":["q1#1"]}' })
  const question = { id: 'q1', session: 's1', texts: [full, 'Which region should the staging stack use?'], source: 'text' as const, project: '/p', at: 1, asks: 1, isOpen: true }

  await port.questions.write(() => [question])
  await resolveAnswered(port, 'usa t4g.large', '', {})

  expect((await port.questions.all())[0]).toMatchObject({ texts: ['Which region should the staging stack use?'], isOpen: true })

  const none = memoryPort()
  await none.port.questions.write(() => [question])
  await resolveAnswered(none.port, 'usa t4g.large', '', {})
  await resolveAnswered(port, 'hi', '', { judge: 'heuristic' })

  expect((await none.port.questions.all())[0]?.texts).toHaveLength(2)
})

test('a part closes by wording even when the entry changed while the judge ran', async () => {
  const other = 'Which region should the staging stack use?'
  const { port } = memoryPort({
    complete: () => {
      // The user reorders the entry while the judge works: ref q1#1 now points at another part.
      void port.questions.write(list => list.map(one => ({ ...one, texts: [other, full] })))

      return '{"settled":["q1#1"]}'
    },
  })
  await port.questions.write(() => [{ id: 'q1', session: 's1', texts: [full, other], source: 'text', project: '/p', at: 1, asks: 1, isOpen: true }])
  await resolveAnswered(port, 'usa t4g.large', '', {})

  expect((await port.questions.all())[0]?.texts).toEqual([other])
})

test('a session over its cap loses its own oldest entries, never another session\'s open one', async () => {
  const { port } = memoryPort()
  const mine = Array.from({ length: 200 }, (_, index) => ({ id: `m${index}`, session: 's1', texts: [`Distinct matter ${index} needs a decision today?`], source: 'text' as const, project: '/p', at: 1, asks: 1, isOpen: false }))
  await port.questions.write(() => [{ id: 'theirs', session: 's2', texts: ['The other session asked this long ago?'], source: 'text', project: '/p', at: 1, asks: 1, isOpen: true }, ...mine])
  await captureQuestions(port, '', ['Is the brand new question tracked at all?'], 'text', { judge: 'heuristic' })
  const all = await port.questions.all()

  expect(all.some(one => one.id === 'theirs')).toBe(true)
  expect(all.filter(one => one.session === 's1')).toHaveLength(200)
  expect(all.some(one => one.texts[0] === 'Is the brand new question tracked at all?')).toBe(true)
})

test('a failing model never throws out of resolveAnswered, even when listing the questions fails', async () => {
  const { port } = memoryPort()
  port.questions.own = async () => {
    throw new Error('store down')
  }

  await expect(resolveAnswered(port, 'yes', '', {})).resolves.toBeUndefined()
})
