import { expect, test } from 'claude-code/testing'

import { memoryPort } from '../../shared/port/port.hook'
import type { ScanMessage } from '../../shared/transcript/transcript.hook'
import { backfillQuestions } from './backfill.hook'

const full = '¿Cuál clase de RDS eliges, t4g.large o m7g.large?'
const messages: ScanMessage[] = [{ role: 'assistant', text: `Todo listo. ${full}`, toolUses: [] }]

test('a fast scan uses the local rules only', async () => {
  const { port } = memoryPort({ messages })

  expect(await backfillQuestions(port, false, 'fast', {})).toBe(1)
  expect((await port.questions.all())[0]?.texts).toEqual([full])
})

test('a deep scan takes what the session model lists, and a second scan adds nothing', async () => {
  const reply = JSON.stringify({ groups: [{ texts: [full], choices: [{ kind: 'single', options: ['t4g.large', 'm7g.large'] }], repeatOf: null }] })
  const { port } = memoryPort({ messages, fork: () => reply })

  expect(await backfillQuestions(port, false, 'deep', {})).toBe(1)
  expect((await port.questions.all())[0]?.choices?.[full]?.kind).toBe('single')
  expect(await backfillQuestions(port, false, 'deep', {})).toBe(0)
})

test('a deep scan falls back to the small model when the session model cannot answer', async () => {
  const reply = JSON.stringify({ groups: [{ texts: [full], repeatOf: null }] })
  const { port } = memoryPort({ messages, fork: () => null, complete: () => reply })

  expect(await backfillQuestions(port, false, 'deep', {})).toBe(1)
})

test('a scan does not bring back a question the session dismissed before it was parked', async () => {
  const { port } = memoryPort({ messages, store: { 'closed:questions:s1': [full] } })

  expect(await backfillQuestions(port, false, 'fast', {})).toBe(0)
  expect(await port.questions.all()).toHaveLength(0)
})

test('a scan of what is already tracked changes nothing: no extra ask, no new age', async () => {
  const { port } = memoryPort({ messages })
  await backfillQuestions(port, false, 'fast', {})
  await backfillQuestions(port, false, 'fast', {})
  await backfillQuestions(port, false, 'quick', {})

  expect((await port.questions.all()).map(one => [one.asks, one.at])).toEqual([[1, 1000]])
})

test('a deep scan drops a vague question the session model returned', async () => {
  const reply = JSON.stringify({ groups: [{ texts: ['¿Cuál eliges?'], repeatOf: null }] })
  const { port } = memoryPort({ messages: [{ role: 'assistant', text: 'Hola.', toolUses: [] }], fork: () => reply })

  expect(await backfillQuestions(port, false, 'deep', {})).toBe(0)
})
