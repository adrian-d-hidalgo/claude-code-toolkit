import { expect, test } from 'claude-code/testing'

import type { Question } from '../../../types'
import { answeredDialog, closing, withoutText } from './ops.hook'

const question = (id: string, texts: string[], isOpen = true): Question => ({
  id,
  session: 's1',
  texts,
  source: 'text',
  project: '/p',
  at: 1,
  isOpen,
  asks: 1,
})

const list = [question('a', ['First question here?', 'Second question here?']), question('b', ['Another question here?'])]

test('closing marks only the named entries', () => {
  expect(closing(['b'])(list).map(one => one.isOpen)).toEqual([true, false])
})

test('an answered dialog question leaves its group, and the group closes with the last one', () => {
  const partial = answeredDialog(['First question here?'], 's1')(list)

  expect(partial[0]).toMatchObject({ texts: ['Second question here?'], isOpen: true })
  expect(answeredDialog(['Another question here?'], 's1')(list)[1]?.isOpen).toBe(false)
})

test('answering one question of a group removes just that one', () => {
  expect(withoutText('a', 'Second question here?')(list)[0]).toMatchObject({ texts: ['First question here?'], isOpen: true })
  expect(withoutText('b', 'Another question here?')(list)[1]?.isOpen).toBe(false)
})

test('an answered dialog only closes the questions of its own session, matched by meaning when the judge reworded them', () => {
  const dialog = (id: string, session: string, text: string): Question => ({ ...question(id, [text]), session, source: 'dialog' })
  const both = [dialog('a', 's1', 'Which environment should the plan use?'), dialog('b', 's2', 'Which environment should the plan use?')]

  expect(answeredDialog(['Which environment should the plan use?'], 's1')(both).map(one => one.isOpen)).toEqual([false, true])

  const reworded = [dialog('c', 's1', 'Which environment should the deployment plan use, staging or production?')]

  expect(answeredDialog(['Which environment should the plan use?'], 's1')(reworded)[0]?.isOpen).toBe(false)
})

test('a duplicated text is removed once, and the options of a removed text go with it', () => {
  const choices = { 'First question here?': { kind: 'single' as const, options: ['x', 'y'] } }
  const twice = [{ ...question('a', ['First question here?', 'First question here?', 'Second question here?']), choices }]
  const next = withoutText('a', 'First question here?')(twice)[0]

  expect(next?.texts).toEqual(['First question here?', 'Second question here?'])
  expect(next?.choices).toBeDefined()
  expect(withoutText('a', 'First question here?')(withoutText('a', 'First question here?')(twice))[0]?.choices).toBeUndefined()
})
