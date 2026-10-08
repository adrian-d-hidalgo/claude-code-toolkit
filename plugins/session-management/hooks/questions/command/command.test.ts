import { expect, test } from 'claude-code/testing'

import type { Question } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { runQuestionsCommand } from './command.hook'

const question = (id: string, session = 's1', isOpen = true): Question => ({
  id,
  session,
  texts: [`Question ${id} that makes sense alone?`],
  source: 'text',
  project: '/p',
  at: 1000,
  isOpen,
  asks: 1,
})

const setup = () => memoryPort({ store: { questions: [question('a'), question('b'), question('c', 's2')] } })

test('help, an unknown subcommand and the pane', async () => {
  const { port } = setup()

  expect((await runQuestionsCommand(port, 'help', {})).text).toContain('/questions scan')
  expect((await runQuestionsCommand(port, 'frobnicate', {})).text).toContain('Unknown subcommand "frobnicate"')
  expect(await runQuestionsCommand(port, '', {})).toEqual({ text: 'Open questions pane opened.', opens: true })
  expect((await runQuestionsCommand(port, 'all', {})).text).toContain('Unknown subcommand "all"')
  expect((await runQuestionsCommand(port, '-g', {})).text).toContain('Unknown subcommand "-g"')
})

test('done closes the numbered open question; dismiss closes this session only', async () => {
  const { port } = setup()

  expect((await runQuestionsCommand(port, 'done 2', {})).text).toBe('Marked as answered.')
  expect((await port.questions.own(true)).map(one => one.id)).toEqual(['a'])
  expect((await runQuestionsCommand(port, 'done 9', {})).text).toBe('No open question 9.')

  await runQuestionsCommand(port, 'dismiss', {})

  expect((await port.questions.own(true))).toEqual([])
  expect((await port.questions.all()).find(one => one.id === 'c')?.isOpen).toBe(true)
})

test('clear drops closed ones, clear all and undo round-trip', async () => {
  const { port } = memoryPort({ store: { questions: [question('a'), question('b', 's1', false)] } })

  await runQuestionsCommand(port, 'clear', {})
  expect((await port.questions.all()).map(one => one.id)).toEqual(['a'])
  expect((await runQuestionsCommand(port, 'clear all', {})).text).toContain('Removed 1 question.')
  expect((await runQuestionsCommand(port, 'undo', {})).text).toContain('Restored 1 question ')
  expect((await port.questions.all()).map(one => one.id)).toEqual(['a'])
})

test('doctor and fix look at this session only', async () => {
  const { port } = setup()

  expect((await runQuestionsCommand(port, 'doctor', {})).text).toContain('Questions doctor · this session')
  expect((await runQuestionsCommand(port, 'doctor --history', {})).text).toContain('--history')
})

test('done numbers the parts the pane shows and closes only that part', async () => {
  const { port } = memoryPort({
    store: {
      questions: [
        { ...question('a'), texts: ['First question of the group here?', 'Second question of the group here?'] },
        question('b'),
      ],
    },
  })

  await runQuestionsCommand(port, 'done 2', {})

  expect((await port.questions.all())[0]).toMatchObject({ texts: ['First question of the group here?'], isOpen: true })

  await runQuestionsCommand(port, 'done 2', {})

  expect((await port.questions.all()).map(one => one.isOpen)).toEqual([true, false, false].slice(0, 2))
  expect((await runQuestionsCommand(port, 'done 9', {})).text).toBe('No open question 9.')
})

test('clearing closed questions remembers their wording for later scans', async () => {
  const { port, data } = memoryPort({ store: { questions: [question('a', 's1', false)] } })

  await runQuestionsCommand(port, 'clear', {})

  expect(data['closed:questions:s1']).toEqual(['Question a that makes sense alone?'])
})

test('clear all and undo report the questions, never the entries holding them', async () => {
  const four = { ...question('a'), texts: ['Which region should the staging stack use?', 'Should the plan also cover the database?', 'What size should the cache be?', 'Who reviews the rollout plan?'] }
  const { port } = memoryPort({ store: { questions: [four, question('b')] } })

  expect((await runQuestionsCommand(port, 'clear all', {})).text).toContain('Removed 5 questions.')
  expect((await runQuestionsCommand(port, 'undo', {})).text).toContain('Restored 5 questions from')
})
