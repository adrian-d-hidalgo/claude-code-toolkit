import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { proposeLearnings, proposedText } from './reconcile.hook'

// What is in memory is a file, read as it is; the ledger holds the refusal and the proposal.
const pnpm = '---\nmetadata:\n  type: feedback\n---\n\nUse pnpm, never npm\n\n**Why:** the lockfile broke on 2026-09-01\n'
const K1 = 'file:feedback_use_pnpm.md'

const known: Learning[] = [
  { id: 'k2', kind: 'feedback', text: 'Do not add comments that restate the code', why: 'flagged twice', status: 'rejected', reason: 'already in CLAUDE.md', project: '/p', session: 's0', at: 1, seen: 1 },
  { id: 'k3', kind: 'user', text: 'The user reviews plans before any code is written', why: 'asked on 2026-10-02', status: 'proposed', project: '/p', session: 's0', at: 1, seen: 1 },
]

// A fake small model: the reconcile verdicts, then the merges, by what the prompt asks.
const judge = (verdicts: unknown[], merged?: Record<string, string>) => (prompt: string) =>
  prompt.includes('merge two learnings') ? JSON.stringify({ learning: merged ?? null }) : JSON.stringify({ items: verdicts })

test('new: a learning with nothing like it in the project is proposed as it is', async () => {
  const { port } = memoryPort({ files: { 'feedback_use_pnpm.md': pnpm }, store: { 'learnings:s1': known }, complete: judge([{ index: 0, verdict: 'new' }]) })
  const done = await proposeLearnings(port, [{ kind: 'project', text: 'Deploys happen on Tuesdays only', why: 'the release calendar of 2026-10' }])

  expect(done).toMatchObject({ added: 1, ids: ['id1'] })
  expect((await port.learnings.all()).find(one => one.id === 'id1')).toMatchObject({ status: 'proposed', project: '/p', session: 's1', seen: 1 })
  expect((await port.learnings.all()).find(one => one.id === 'id1')?.replaces).toBeUndefined()
  expect(proposedText(done)).toBe('1 proposed')
})

test('duplicate: the same fact is one more sighting, and a rejected one is answered with the reason', async () => {
  const { port } = memoryPort({ files: { 'feedback_use_pnpm.md': pnpm }, store: { 'learnings:s1': known }, complete: judge([{ index: 0, verdict: 'duplicate', of: K1 }]) })
  const words = await proposeLearnings(port, [{ kind: 'feedback', text: 'Use pnpm never npm', why: 'x' }, { kind: 'feedback', text: 'Do not add comments that restate the code', why: 'y' }])

  expect(words).toMatchObject({ added: 0, repeated: 1, refused: 1, ids: [K1, 'k2'] })
  expect(words.notes).toEqual(['already in memory (feedback_use_pnpm.md)', '"Do not add comments that restate the code" was rejected by the user: already in CLAUDE.md'])

  const model = await proposeLearnings(port, [{ kind: 'feedback', text: 'Install packages with the pnpm client', why: 'z' }])

  expect(model).toMatchObject({ repeated: 1, ids: [K1] })
  expect((await port.learnings.all()).find(one => one.id === 'k2')?.seen).toBe(2)
  expect(await port.learnings.all()).toHaveLength(2)
})

test('updates what is in memory: one proposal holds both and replaces it once accepted', async () => {
  const { port } = memoryPort({
    files: { 'feedback_use_pnpm.md': pnpm },
    store: { 'learnings:s1': known },
    complete: judge([{ index: 0, verdict: 'updates', of: K1 }], { kind: 'feedback', text: 'Use pnpm, never npm, with --frozen-lockfile in CI', why: 'the lockfile broke on 2026-09-01; CI drifted on 2026-10-10' }),
  })
  const done = await proposeLearnings(port, [{ kind: 'feedback', text: 'Run pnpm with --frozen-lockfile in CI', why: 'CI drifted on 2026-10-10' }])

  expect(done).toMatchObject({ updated: 1, added: 0, ids: ['id1'] })
  expect(done.notes).toEqual(['[id1] updates the memory file feedback_use_pnpm.md: accepting it replaces it'])
  expect((await port.learnings.all()).find(one => one.id === 'id1')).toMatchObject({ text: 'Use pnpm, never npm, with --frozen-lockfile in CI', replaces: [K1], status: 'proposed' })
})

test('updates a pending proposal: it is updated in place, so there is one thing to decide', async () => {
  const { port } = memoryPort({
    files: { 'feedback_use_pnpm.md': pnpm },
    store: { 'learnings:s1': known },
    complete: judge([{ index: 0, verdict: 'updates', of: 'k3' }], { kind: 'user', text: 'The user reviews plans and the test list before any code is written', why: 'asked on 2026-10-02 and 2026-10-13' }),
  })
  const done = await proposeLearnings(port, [{ kind: 'user', text: 'The user wants the test list before coding', why: 'asked on 2026-10-13' }])

  expect(done).toMatchObject({ updated: 1, ids: ['k3'] })
  expect(await port.learnings.all()).toHaveLength(2)
  expect((await port.learnings.all()).find(one => one.id === 'k3')).toMatchObject({ text: 'The user reviews plans and the test list before any code is written', seen: 2 })
})

test('contradicts: proposed as replacing the learning it contradicts, linked both ways', async () => {
  const { port } = memoryPort({ files: { 'feedback_use_pnpm.md': pnpm }, store: { 'learnings:s1': known }, complete: judge([{ index: 0, verdict: 'contradicts', of: K1 }]) })
  const done = await proposeLearnings(port, [{ kind: 'feedback', text: 'Yarn is the package manager here', why: 'the team moved on 2026-10-12' }])

  expect(done).toMatchObject({ contradicting: 1, ids: ['id1'] })
  expect(done.notes).toEqual(['[id1] contradicts the memory file feedback_use_pnpm.md: accepting it retires it'])
  expect((await port.learnings.all()).find(one => one.id === 'id1')).toMatchObject({ replaces: [K1], conflicts: [K1] })
})

test('convention: a rule for every contributor is sent to CLAUDE.md, not proposed', async () => {
  const { port } = memoryPort({ files: { 'feedback_use_pnpm.md': pnpm }, store: { 'learnings:s1': known }, complete: judge([{ index: 0, verdict: 'convention' }]) })
  const done = await proposeLearnings(port, [{ kind: 'project', text: 'Every module has its test file next to it', why: 'the repository layout' }])

  expect(done).toMatchObject({ turnedAway: 1, added: 0, ids: [null] })
  expect(proposedText(done)).toContain('suggest it to the user as a change to CLAUDE.md instead')
  expect(await port.learnings.all()).toHaveLength(2)
})

test('the door turns away what breaks the rules or says too much, with what to fix', async () => {
  const { port } = memoryPort({ store: { 'learnings:s1': known } })
  const wordy = { kind: 'project' as const, text: 'The staging database is reset nightly', why: 'w'.repeat(500), how: 'h'.repeat(200) }
  const done = await proposeLearnings(port, [{ kind: 'project', text: 'Deploys happen on Tuesdays', why: '' }, wordy, { kind: 'project', text: 'Run the migrations and also seed the data', why: 'asked' }], { judge: 'heuristic' })

  expect(done).toMatchObject({ turnedAway: 3, added: 0 })
  expect(done.notes[0]).toBe('"Deploys happen on Tuesdays": no why; fix it and propose it again')
  expect(done.notes[1]).toContain('says too much (700 characters of why and how, keep it under 600)')
  expect(done.notes[2]).toContain('two facts in one')

})

test('without a model nothing is merged or linked, and two candidates saying the same count once', async () => {
  const { port } = memoryPort({ store: { 'learnings:s1': known } })
  const done = await proposeLearnings(port, [{ kind: 'project', text: '  ', why: 'x' }, { kind: 'project', text: 'Deploys happen on Tuesdays', why: 'the calendar' }, { kind: 'project', text: 'Deploys happen on Tuesdays', why: 'again' }], { judge: 'heuristic' })

  expect(done).toMatchObject({ added: 1, repeated: 1 })
  expect(await port.learnings.all()).toHaveLength(3)
})

test('a convention, a decision or general knowledge is turned away with where it belongs, even in an empty project', async () => {
  const { port } = memoryPort({ complete: judge([{ index: 0, verdict: 'convention' }, { index: 1, verdict: 'decision' }, { index: 2, verdict: 'general' }]) })
  const done = await proposeLearnings(port, [
    { kind: 'feedback', text: 'Every file carries a suffix that declares its type', why: 'agreed on 2026-10-13' },
    { kind: 'project', text: 'Threads are private today but the model stays open to sharing them', why: 'decided on 2026-10-13' },
    { kind: 'project', text: 'Reasoning tokens count against max_completion_tokens', why: 'seen on 2026-10-13' },
  ])

  expect(done.turnedAway).toBe(3)
  expect(done.notes.join('\n')).toContain('change to CLAUDE.md')
  expect(done.notes.join('\n')).toContain("belongs in the project's docs")
  expect(done.notes.join('\n')).toContain('nothing to remember')
  expect(await port.learnings.all()).toEqual([])
})
