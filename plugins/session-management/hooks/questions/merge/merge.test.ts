import { expect, test } from 'claude-code/testing'

import type { Question } from '../../../types'
import { capSession, mergeGroup, refreshQuestion } from './merge.hook'

const question = (id: string, texts: string[], isOpen = true, at = 1, session = 's1'): Question => ({
  id,
  session,
  texts,
  source: 'text',
  project: '/p',
  at,
  isOpen,
  asks: 1,
})

test('a re-ask refreshes the open question instead of duplicating it', () => {
  const list = [question('a', ['¿Lo agrego como plugin separado?'], true, 1)]
  const next = mergeGroup(list, question('b', ['¿Agrego el plugin separado?'], true, 9), false)

  expect(next).toHaveLength(1)
  expect(next[0]).toMatchObject({ id: 'a', at: 9, asks: 2, texts: ['¿Agrego el plugin separado?'] })
})

test('an unrelated question is added', () => {
  const next = mergeGroup([question('a', ['¿Lo agrego como plugin separado?'])], question('b', ['¿Corro los evals ahora?']), false)

  expect(next.map(one => one.id)).toEqual(['a', 'b'])
})

test('a live re-ask of a dismissed question opens a new one, a scan does not', () => {
  const list = [question('a', ['¿Lo agrego como plugin separado?'], false)]
  const again = question('b', ['¿Lo agrego como plugin separado?'])

  expect(mergeGroup(list, again, false).map(one => one.id)).toEqual(['a', 'b'])
  expect(mergeGroup(list, again, true).map(one => one.id)).toEqual(['a'])
})

test('a judged repeat refreshes the named open question', () => {
  const list = [question('a', ['Old wording?'], true, 1), question('b', ['Other?'], false, 1)]

  expect(refreshQuestion(list, 'a', ['New wording?'], 7)[0]).toMatchObject({ texts: ['New wording?'], at: 7, asks: 2 })
  expect(refreshQuestion(list, 'b', ['x?'], 7)).toEqual(list)
})

test('another session asking the same thing keeps its own question', () => {
  const list = [question('a', ['¿Lo agrego como plugin separado?'], true, 1, 's1')]
  const next = mergeGroup(list, question('b', ['¿Lo agrego como plugin separado?'], true, 2, 's2'), false)

  expect(next.map(one => one.id)).toEqual(['a', 'b'])
})

test('a re-ask that lost its context keeps the fuller wording', () => {
  const full = '¿Qué clase de RDS eliges, t4g.large o m7g.large?'
  const list = [question('a', [full], true, 1)]
  const next = mergeGroup(list, question('b', ['¿Qué clase de RDS eliges?'], true, 9), false)

  expect(next[0]).toMatchObject({ id: 'a', asks: 2, texts: [full] })
  expect(refreshQuestion(list, 'a', ['¿Cuál eliges?'], 9)[0]).toMatchObject({ texts: [full], asks: 2 })
})

test('a re-ask in other words keeps the options of the question it repeats', () => {
  const choices = { 'Which region should the staging stack use?': { kind: 'single' as const, options: ['us-east-1', 'eu-west-1'] } }
  const list = [{ ...question('a', ['Which region should the staging stack use?'], true, 1), choices }]
  const next = mergeGroup(list, question('b', ['Which region should the staging stack use, please?'], true, 9), false)

  expect(next).toHaveLength(1)
  expect(Object.values(next[0]?.choices ?? {})[0]).toEqual({ kind: 'single', options: ['us-east-1', 'eu-west-1'] })
})

test('a judged repeat that names fewer parts keeps the others, and carries the options of the ones it names', () => {
  const choices = { 'Which region should the staging stack use?': { kind: 'single' as const, options: ['us-east-1', 'eu-west-1'] } }
  const list = [{ ...question('a', ['Which region should the staging stack use?', 'Should the plan also cover the database?', 'Which tag should the release carry?']), choices }]
  const next = refreshQuestion(list, 'a', ['Which region should the staging stack use, please?', 'Should the plan also cover the database?'], 9)[0]

  expect(next?.texts).toHaveLength(3)
  expect(next?.texts).toContain('Which tag should the release carry?')
  expect(Object.values(next?.choices ?? {})).toEqual([{ kind: 'single', options: ['us-east-1', 'eu-west-1'] }])
})

test('a scan neither re-counts nor re-words an open question it already tracks', () => {
  const list = [question('a', ['¿Lo agrego como plugin separado?'], true, 1)]
  const next = mergeGroup(list, question('b', ['¿Lo agrego como plugin separado?'], true, 9), true)

  expect(next).toEqual(list)
})

test('a session never has more than its cap, and another session is not evicted by it', () => {
  const mine = Array.from({ length: 5 }, (_, index) => question(`m${index}`, [`Question number ${index} that makes sense?`], index > 1, index, 's1'))
  const theirs = question('t', ['Another session open question that is fine?'], true, 0, 's2')
  const next = capSession([theirs, ...mine], 's1', 3)

  expect(next.map(one => one.id)).toEqual(['t', 'm2', 'm3', 'm4'])
  expect(capSession([theirs], 's1', 0)).toEqual([theirs])
})
