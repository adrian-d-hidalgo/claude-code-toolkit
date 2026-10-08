import { expect, test } from 'claude-code/testing'

import type { Question } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { callCloseQuestion, callQuestionsTool } from './tool.hook'

const question = (id: string, texts: string[], session = 's1', isOpen = true, asks = 1): Question => ({ id, session, texts, source: 'text', project: '/p', at: 1000, isOpen, asks })

const setup = () =>
  memoryPort({
    store: {
      questions: [
        question('a', ['¿Qué clase de RDS eliges, t4g.large o m7g.large?', 'Which region should the staging stack use?']),
        question('b', ['¿Qué clase de RDS eliges?'], 's1', true, 2),
        question('x', ['A question of another session that is fine?'], 's2'),
      ],
    },
  })

test('list shows this session only; all includes the closed ones', async () => {
  const { port } = setup()
  await port.questions.write(list => [...list, question('z', ['A closed question that was answered?'], 's1', false)])

  expect(await callQuestionsTool(port, { action: 'list' })).not.toContain('[z]')
  expect(await callQuestionsTool(port, { action: 'list', all: true })).toContain('[z] (closed)')
  expect(await callQuestionsTool(port, { action: 'list' })).not.toContain('[x]')
})

test('add needs questions that make sense alone; update rewords one the same way', async () => {
  const { port } = setup()

  expect(await callQuestionsTool(port, { action: 'add', texts: ['¿Cuál eliges?'] })).toContain('Not added')
  expect(await callQuestionsTool(port, { action: 'add', texts: ['Should the plan target staging or production?'] })).toContain('Should the plan target')
  expect(await callQuestionsTool(port, { action: 'update', id: 'b', texts: ['Which one?'] })).toContain('Not updated')
  expect(await callQuestionsTool(port, { action: 'update', id: 'b', texts: ['¿Qué clase de RDS usamos en producción?'] })).toContain('usamos en producción')
})

test('close can be partial, merge folds a duplicate, reopen undoes a close', async () => {
  const { port } = setup()

  await callQuestionsTool(port, { action: 'close', id: 'a', parts: [1] })
  expect((await port.questions.all())[0]).toMatchObject({ texts: ['Which region should the staging stack use?'], isOpen: true })

  await callQuestionsTool(port, { action: 'merge', id: 'b', into: 'a' })
  expect((await port.questions.all()).find(one => one.id === 'a')?.asks).toBe(3)
  expect((await port.questions.all()).find(one => one.id === 'b')?.isOpen).toBe(false)

  await callQuestionsTool(port, { action: 'close', id: 'a' })
  await callQuestionsTool(port, { action: 'reopen', id: 'a' })
  expect((await port.questions.all()).find(one => one.id === 'a')?.isOpen).toBe(true)
})

test('another session\'s question and bad calls are refused', async () => {
  const { port } = setup()

  expect(await callQuestionsTool(port, { action: 'close', id: 'x' })).toContain('No question x in this session')
  expect(await callQuestionsTool(port, { action: 'merge', id: 'a', into: 'nope' })).toContain('to merge into')
  expect(await callQuestionsTool(port, { action: 'frobnicate', id: 'a' })).toContain('Invalid questions call')
  expect(await callCloseQuestion(port, ['a', 'x'])).toBe('Closed 2 questions.')
})

const choices = { 'Which region should the staging stack use?': { kind: 'single' as const, options: ['us-east-1', 'eu-west-1'] } }
const withOptions = () =>
  memoryPort({ store: { questions: [{ ...question('a', ['Which region should the staging stack use?', 'Should the plan also cover the database?']), choices }] } })

test('rewording a question keeps its options under the new wording', async () => {
  const { port } = withOptions()
  await callQuestionsTool(port, { action: 'update', id: 'a', texts: ['Which region should the staging stack use, us-east-1 or eu-west-1?', 'Should the plan also cover the database?'] })

  const [one] = await port.questions.all()

  expect(Object.keys(one?.choices ?? {})).toEqual(['Which region should the staging stack use, us-east-1 or eu-west-1?'])
})

test('closing parts drops the options of the closed ones, and bad parts say so', async () => {
  const { port } = withOptions()

  expect(await callQuestionsTool(port, { action: 'close', id: 'a', parts: [0] })).toContain('no part 0')
  expect(await callQuestionsTool(port, { action: 'close', id: 'a', parts: [3] })).toContain('has 2 part(s)')
  expect((await port.questions.all())[0]?.texts).toHaveLength(2)

  await callQuestionsTool(port, { action: 'close', id: 'a', parts: [1] })

  expect((await port.questions.all())[0]).toMatchObject({ texts: ['Should the plan also cover the database?'], isOpen: true })
  expect((await port.questions.all())[0]?.choices).toBeUndefined()
})

test('texts or parts that are not arrays are an answer, not a crash', async () => {
  const { port } = withOptions()

  expect(await callQuestionsTool(port, { action: 'add', texts: 'Which region should the staging stack use?' as never })).toContain('texts must be an array')
  expect(await callQuestionsTool(port, { action: 'close', id: 'a', parts: 1 as never })).toContain('parts must be an array')
})

test('the same text twice counts once, and an update with a vague part is refused whole', async () => {
  const { port } = withOptions()
  await callQuestionsTool(port, { action: 'add', texts: ['Should the build also run the evals?', 'Should the build also run the evals?'] })

  expect((await port.questions.all()).find(one => one.id !== 'a')?.texts).toHaveLength(1)
  expect(await callQuestionsTool(port, { action: 'update', id: 'a', texts: ['Which region should the staging stack use, us-east-1 or eu-west-1?', 'Which one?'] })).toContain('Too short')
  expect((await port.questions.all())[0]?.texts).toHaveLength(2)
})

test('merging carries what the merged question still asks, with its options, into the keeper', async () => {
  const { port } = withOptions()
  await port.questions.write(list => [...list, question('k', ['Should the build also run the evals?'])])
  await callQuestionsTool(port, { action: 'merge', id: 'a', into: 'k' })

  const keeper = (await port.questions.all()).find(one => one.id === 'k')

  expect(keeper?.texts).toHaveLength(3)
  expect(keeper?.choices?.['Which region should the staging stack use?']?.kind).toBe('single')
})

test('the list numbers the parts the way the tool\'s parts count them', async () => {
  const { port } = withOptions()

  expect(await callQuestionsTool(port, { action: 'list' })).toContain('1) Which region should the staging stack use? | 2) Should the plan also cover the database?')
})

test('close_question reports the things asked in the entries it closed', async () => {
  const { port } = setup()

  expect(await callCloseQuestion(port, ['a', 'b'])).toBe('Closed 3 questions.')
})
