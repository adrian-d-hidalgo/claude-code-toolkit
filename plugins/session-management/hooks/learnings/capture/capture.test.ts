import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { captureLearnings, exchangesOf, scanLearnings } from './capture.hook'

const found = (learnings: unknown[]) => () => JSON.stringify({ learnings })
const rule = { kind: 'feedback', text: 'Answer in neutral Mexican Spanish, never voseo', why: 'the user corrected it on 2026-10-13' }

test('a turn that teaches something lands in the review queue, never in memory', async () => {
  const { port, files } = memoryPort({ complete: found([rule]) })
  const done = await captureLearnings(port, { user: 'no uses voseo, por favor', assistant: 'Entendido.' }, { judge: 'model' })

  expect(done?.added).toBe(1)
  expect((await port.learnings.all())[0]).toMatchObject({ status: 'proposed', text: rule.text })
  expect(Object.keys(files)).toEqual([])
})

test('a turn that teaches nothing, a heuristic judge or an empty message propose nothing', async () => {
  const { port } = memoryPort({ complete: found([]) })

  expect(await captureLearnings(port, { user: 'run the tests', assistant: 'Done.' }, {})).toBeNull()
  expect(await captureLearnings(port, { user: 'x', assistant: 'y' }, { judge: 'heuristic' })).toBeNull()
  expect(await captureLearnings(port, { user: ' ', assistant: 'y' }, {})).toBeNull()
  expect(await port.learnings.all()).toEqual([])
})

test('the exchanges pair each user message with what the assistant said until the next one', () => {
  expect(
    exchangesOf([
      { role: 'assistant', text: 'Hello', toolUses: [] },
      { role: 'user', text: 'one', toolUses: [] },
      { role: 'assistant', text: 'a', toolUses: [] },
      { role: 'assistant', text: 'b', toolUses: [] },
      { role: 'user', text: 'two', toolUses: [] },
    ]),
  ).toEqual([
    { user: 'one', assistant: 'a\nb' },
    { user: 'two', assistant: '' },
  ])
})

test('a scan reads the conversation again, falls back to the small model, and does not recount what is known', async () => {
  const known: Learning = { ...rule, kind: 'feedback', id: 'k', status: 'accepted', project: '/p', session: 's1', at: 1, seen: 1 }
  const messages = [
    { role: 'user' as const, text: 'no uses voseo', toolUses: [] },
    { role: 'assistant' as const, text: 'Ok', toolUses: [] },
  ]
  const { port } = memoryPort({ store: { 'learnings:s1': [known] }, messages, complete: found([rule]) })
  const done = await scanLearnings(port, 'deep', {})

  expect(done?.repeated).toBe(1)
  expect((await port.learnings.all())[0]?.seen).toBe(1)
  expect(await scanLearnings(port, 'fast', {})).toBeNull()
})
