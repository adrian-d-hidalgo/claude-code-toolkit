import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { callLearningsTool } from './tool.hook'

const mine: Learning = { id: 'a', kind: 'feedback', text: 'Answer in Spanish', why: 'the user writes in Spanish', status: 'proposed', project: '/p', session: 's1', at: 1, seen: 1 }
const theirs: Learning = { ...mine, id: 'b', text: 'Keep commits small', session: 's2' }

test('propose needs a kind, a text and a why, and answers the id of the proposal', async () => {
  const { port } = memoryPort()

  expect(await callLearningsTool(port, { action: 'propose', text: 'x', why: 'y' })).toContain('Invalid kind')
  expect(await callLearningsTool(port, { action: 'propose', kind: 'user', text: 'x' })).toContain('needs a text (the fact or rule) and a why')

  const answer = await callLearningsTool(port, { action: 'propose', kind: 'user', text: 'The user prefers short answers', why: 'asked twice on 2026-10-13' }, { judge: 'heuristic' })

  expect(answer).toContain('Proposed [id1]; the user reviews it in the Learnings pane.')
  expect(answer).toContain('1. [id1] (proposed) user: The user prefers short answers')
})

test('withdraw only takes back a proposal of this session', async () => {
  const { port } = memoryPort({ store: { 'learnings:s1': [mine, theirs] } })

  expect(await callLearningsTool(port, { action: 'withdraw', id: 'b' })).toContain("Not withdrawn: [b] is another session's proposal")
  expect(await callLearningsTool(port, { action: 'withdraw', id: 'a' })).toContain('Withdrawn [a].')
  expect((await port.learnings.all()).map(one => one.id)).toEqual(['b'])
  expect(await callLearningsTool(port, { action: 'withdraw', id: 'zz' })).toContain('Unknown learning zz.')
})

test('revise rewords a proposal after the user\'s comment, through the same rules, and it keeps waiting', async () => {
  const kept: Learning = { ...mine, id: 'k', status: 'accepted' }
  const { port } = memoryPort({ store: { 'learnings:s1': [mine, kept] } })

  expect(await callLearningsTool(port, { action: 'revise', id: 'k', text: 'x' })).toContain('Not revised: [k] is accepted; propose the change instead')
  expect(await callLearningsTool(port, { action: 'revise', id: 'a', why: 'the user said so yesterday' })).toContain('Not revised, it breaks the rules')
  expect(await callLearningsTool(port, { action: 'revise', id: 'a', text: 'Answer in neutral Mexican Spanish', why: 'the user asked for it on 2026-10-13' })).toContain("Revised [a]; it keeps waiting for the user's review.")
  expect((await port.learnings.all())[0]).toMatchObject({ status: 'proposed', text: 'Answer in neutral Mexican Spanish', why: 'the user asked for it on 2026-10-13' })
})

test('list filters by status, rules answers the rules, anything else is refused', async () => {
  const { port } = memoryPort({ store: { 'learnings:s1': [mine, { ...theirs, status: 'accepted' }] } })

  expect(await callLearningsTool(port, { action: 'list', status: 'accepted' })).toBe('1. [b] (accepted) feedback: Keep commits small\n   why: the user writes in Spanish')
  expect(await callLearningsTool(port, { action: 'list' })).toContain('2. [b] (accepted)')
  expect(await callLearningsTool(port, { action: 'rules' })).toContain('One fact per learning')
  expect(await callLearningsTool(port, { action: 'accept', id: 'a' })).toContain('Invalid learnings call')
})
