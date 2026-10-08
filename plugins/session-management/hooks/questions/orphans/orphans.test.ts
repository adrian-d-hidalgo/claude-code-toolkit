import { expect, test } from 'claude-code/testing'

import type { Question } from '../../../types'
import { park, restore, sweep } from './orphans.hook'

const day = 86_400_000
const question = (id: string, session: string, at: number, isOpen = true): Question => ({
  id,
  session,
  texts: [`Question ${id} that makes sense alone?`],
  source: 'text',
  project: '/p',
  at,
  isOpen,
  asks: 1,
})

test('ending a session parks its open questions and drops its closed ones', () => {
  const all = [question('a', 's1', 1), question('b', 's1', 1, false), question('c', 's2', 1)]
  const { kept, parked } = park(all, {}, 's1')

  expect(kept.map(one => one.id)).toEqual(['c'])
  expect(parked['s1']?.map(one => one.id)).toEqual(['a'])
})

test('ending a session with nothing open and nothing parked leaves nothing parked', () => {
  expect(park([question('b', 's1', 1, false)], {}, 's1').parked).toEqual({})
})

test('a session that ends keeps what a sweep parked for it while it was alive', () => {
  const parked = park([question('b', 's1', 1)], { s1: [question('swept', 's1', 1)] }, 's1').parked

  expect(parked['s1']?.map(one => one.id)).toEqual(['swept', 'b'])
  expect(park([question('c', 's1', 1, false)], { s1: [question('swept', 's1', 1)] }, 's1').parked['s1']?.map(one => one.id)).toEqual(['swept'])
})

test('resuming gives the parked questions back once', () => {
  const parked = { s1: [question('a', 's1', 1)] }
  const first = restore([], parked, 's1')

  expect(first.list.map(one => one.id)).toEqual(['a'])
  expect(first.parked).toEqual({})
  expect(restore(first.list, parked, 's1').list.map(one => one.id)).toEqual(['a'])
})

test('a new session sweeps what other sessions left behind, nothing of its own or of live ones', () => {
  const now = 40 * day
  const all = [
    question('mine', 's1', 1),
    question('live', 's2', now - day),
    question('gone', 's3', now - 10 * day),
    question('closed', 's3', now - 10 * day, false),
    { ...question('legacy', '', now - 10 * day), session: '' },
  ]
  const parked = { s9: [question('old', 's9', now - 31 * day), question('fresh', 's9', now - 5 * day)] }
  const result = sweep(all, parked, 's1', now)

  expect(result.list.map(one => one.id)).toEqual(['mine', 'live'])
  expect(result.parked['s3']?.map(one => one.id)).toEqual(['gone'])
  expect(result.parked['s9']?.map(one => one.id)).toEqual(['fresh'])
  expect(result).toMatchObject({ moved: 1, dropped: 3 })
})
