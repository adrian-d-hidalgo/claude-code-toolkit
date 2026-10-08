import { expect, test } from 'claude-code/testing'

import type { Question } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { diagnoseQuestions, runQuestionsDoctor } from './doctor.hook'

const question = (id: string, texts: string[], at = 1, isOpen = true, asks = 1): Question => ({
  id,
  session: 's1',
  texts,
  source: 'text',
  project: '/p',
  at,
  isOpen,
  asks,
})

test('question repairs: vague ones are flagged for rewording, duplicates fold keeping the fuller wording and the count', () => {
  const day = 86_400_000
  const list = [
    question('a', ['¿Cuál eliges?']),
    question('b', ['¿Qué clase de RDS eliges, t4g.large o m7g.large?'], 5 * day, true, 2),
    question('c', ['¿Qué clase de RDS eliges?'], 9 * day),
    question('d', ['Which region should the staging stack use?'], 1),
    question('e', ['Old closed question that was dismissed'], 1, false),
  ]
  const { lines, fixed, vague } = diagnoseQuestions(list, 20 * day)

  expect(vague).toEqual(['a'])
  expect(fixed.map(one => one.id)).toEqual(['a', 'b', 'd', 'e'])
  expect(fixed[1]).toMatchObject({ asks: 3, at: 9 * day, texts: ['¿Qué clase de RDS eliges, t4g.large o m7g.large?'] })
  expect(lines).toEqual([
    "1 vague question (too short to make sense alone; `fix` rewrites them with the conversation's context)",
    '1 duplicate question (folded into the first, fullest wording kept)',
    '2 open questions older than 14 days (kept; dismiss them if they no longer matter)',
  ])
})

const own = (id: string, texts: string[], session = 's1', at = 1000): Question => ({ ...question(id, texts, at), session })

test('doctor reports and fix repairs this session only, rewording vague questions with the conversation model', async () => {
  const reply = '{"rewrites":[{"ref":"a#1","text":"¿Cuál clase de RDS eliges, t4g.large o m7g.large?"}]}'
  const { port } = memoryPort({ fork: () => reply, store: { questions: [own('a', ['¿Cuál eliges?']), own('x', ['¿Cuál eliges?'], 's2')] } })

  expect(await runQuestionsDoctor(port, false, false, {})).toContain('1 vague question')
  expect((await port.questions.all())[0]?.texts).toEqual(['¿Cuál eliges?'])

  const report = await runQuestionsDoctor(port, true, false, {})
  const all = await port.questions.all()

  expect(report).toContain('1 wording(s) rewritten')
  expect(all.find(one => one.id === 'a')?.texts).toEqual(['¿Cuál clase de RDS eliges, t4g.large o m7g.large?'])
  expect(all.find(one => one.id === 'x')?.texts).toEqual(['¿Cuál eliges?'])
})

test('fix keeps the options of a rewritten wording and the changes made while the model worked', async () => {
  const vague = '¿Cuál eliges?'
  const choices = { [vague]: { kind: 'single' as const, options: ['t4g.large', 'm7g.large'] } }
  const { port } = memoryPort({
    store: { questions: [{ ...question('a', [vague]), choices }, question('b', ['Which region should the staging stack use?']), question('c', ['Should the plan also cover the database?'])] },
    fork: () => {
      // While the model rewrites: the user closes b and Claude adds d.
      void port.questions.write(list => [...list.map(one => (one.id === 'b' ? { ...one, isOpen: false } : one)), question('d', ['A question added meanwhile that is fine?'])])

      return JSON.stringify({ rewrites: [{ ref: 'a#1', text: '¿Cuál clase de RDS eliges, t4g.large o m7g.large?' }] })
    },
  })

  await runQuestionsDoctor(port, true, false, {})
  const all = await port.questions.all()

  expect(all.find(one => one.id === 'a')?.texts).toEqual(['¿Cuál clase de RDS eliges, t4g.large o m7g.large?'])
  expect(Object.keys(all.find(one => one.id === 'a')?.choices ?? {})).toEqual(['¿Cuál clase de RDS eliges, t4g.large o m7g.large?'])
  expect(all.find(one => one.id === 'b')?.isOpen).toBe(false)
  expect(all.map(one => one.id).sort()).toEqual(['a', 'b', 'c', 'd'])
})

test('fix never replaces a backup that holds something with an empty one', async () => {
  const { port, data } = memoryPort({ store: { questions: [question('a', ['¿Cuál eliges?'])], 'backup:questions:s1': [question('old', ['An older question worth restoring?'])] } })

  await port.questions.write(() => [])
  await runQuestionsDoctor(port, true, false, {})

  expect((data['backup:questions:s1'] as Question[]).map(one => one.id)).toEqual(['old'])
})

const four = ['Which region should the staging stack use?', 'Should the plan also cover the database?', 'What size should the cache be?', 'Who reviews the rollout plan?']
const clean = ['✓ every open question makes sense on its own', '✓ no duplicates', '✓ none open for more than 14 days', '✓ none left over from another session id']

test('a clean question set reports every check; the count line has questions only, never messages', async () => {
  const { port } = memoryPort({
    store: { questions: [own('a', four), own('b', ['Which backup policy do we want?']), { ...own('c', ['Is the old endpoint still needed?']), isOpen: false }, { ...own('d', ['Who owns the pager rotation?']), isOpen: false }] },
    now: 1000,
  })
  const report = await runQuestionsDoctor(port, false, false, {})

  expect(report).toBe(['Questions doctor · this session', '7 questions: 5 open, 2 closed', ...clean, 'Everything checks out.'].join('\n'))
  expect(report).not.toContain('message')
})

test('a plain count when every entry asked one thing', async () => {
  const { port } = memoryPort({ store: { questions: [own('a', ['Which region should the staging stack use?'])] } })

  expect((await runQuestionsDoctor(port, false, false, {})).split('\n')[1]).toBe('1 question: 1 open, 0 closed')
})

test('a vague question and one older than 14 days mark their checks and offer fix', async () => {
  const day = 86_400_000
  const { port } = memoryPort({
    now: 30 * day,
    store: { questions: [own('a', ['¿Cuál eliges?'], 's1', 29 * day), own('b', ['Which region should the staging stack use?'], 's1', 1 * day)] },
  })

  expect(await runQuestionsDoctor(port, false, false, {})).toBe(
    [
      'Questions doctor · this session',
      '2 questions: 2 open, 0 closed',
      "✗ 1 vague question (too short to make sense alone; `fix` rewrites them with the conversation's context)",
      '✓ no duplicates',
      '✗ 1 open question older than 14 days (kept; dismiss them if they no longer matter)',
      '✓ none left over from another session id',
      'Run `/questions fix` to repair what can be repaired.',
    ].join('\n'),
  )
})

test('the history variant says so in the header and also checks closed questions', async () => {
  const { port } = memoryPort({ store: { questions: [{ ...own('a', ['¿Cuál eliges?']), isOpen: false }] } })
  const lines = (await runQuestionsDoctor(port, false, true, {})).split('\n')

  expect(lines.slice(0, 3)).toEqual(['Questions doctor · this session · with closed questions (--history)', '1 question: 0 open, 1 closed', expect.stringContaining('✗ 1 vague question')])
})
