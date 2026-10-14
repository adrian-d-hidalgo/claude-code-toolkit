import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { approvalAt } from '../review/review.hook'
import { diagnoseLearnings, findFindings, fixMessage, joinOverlaps, planRepairs, runLearningsDoctor, stalePaths, undoLearnings } from './doctor.hook'
import type { Housekeeping } from './doctor.hook'

// What is in memory, as the doctor reads it from a file.
const mem = (id: string, extra: Partial<Learning> = {}): Learning => ({ id: `file:feedback_${id}.md`, kind: 'feedback', text: `Use ${id}${id}${id} tooling for ${id}${id}${id} builds`, why: `asked on 2026-10-13 (${id})`, status: 'accepted', project: '/p', session: '', at: 0, seen: 1, file: `feedback_${id}.md`, ...extra })

const proposal = (id: string, extra: Partial<Learning> = {}): Learning => ({ id, kind: 'feedback', text: `Always do ${id} first`, why: 'the user asked on 2026-10-13', status: 'proposed', project: '/p', session: 's1', at: 1, seen: 1, ...extra })

const fileOf = (one: Learning): string => `---\nmetadata:\n  type: ${one.kind}\n---\n\n${one.text}\n\n**Why:** ${one.why}\n${one.how ? `\n**How to apply:** ${one.how}\n` : ''}`

const clean: Housekeeping = { fixed: [], lines: [], toUnindex: [], copies: [], unindexed: [] }

test('the bookkeeping: the ledger keeps only what is in transit, links to what is gone go, the index and the copies are named', () => {
  const memory = [mem('a'), mem('b'), mem('c', { text: 'Use aaa tooling for aaa builds', why: 'asked on 2026-10-13 (a)' })]
  const list = [proposal('p', { replaces: ['file:feedback_gone.md', 'file:feedback_a.md'] }), { ...proposal('old'), status: 'accepted' as const }, proposal('p'), { ...proposal('k'), kind: 'weird' as never }]
  const result = diagnoseLearnings(list, memory, '- [A](feedback_a.md) — x\n- [Z](feedback_z.md) — z\n', ['feedback_a.md', 'feedback_b.md', 'feedback_c.md', 'MEMORY.md'])

  expect(result.fixed.map(item => [item.id, item.kind, item.replaces])).toEqual([['p', 'feedback', ['file:feedback_a.md']], ['p-2', 'feedback', undefined], ['k', 'project', undefined]])
  expect(result.toUnindex).toEqual(['feedback_z.md'])
  expect(result.copies).toEqual([['feedback_c.md', 'feedback_a.md']])
  expect(result.unindexed).toEqual(['feedback_b.md'])
  expect(result.lines.join('\n')).toContain('kept for what is in memory (dropped from the ledger; the files stay)')
  expect(diagnoseLearnings([proposal('p')], [mem('a')], '- [A](feedback_a.md) — x\n', ['feedback_a.md', 'MEMORY.md']).lines).toEqual([])
})

test('a relative path is only judged when its first folder is in the project root', async () => {
  const { port } = memoryPort({ paths: ['/p/scripts', '/p/scripts/run.py', '/p/docs'] })

  expect(await stalePaths(port, mem('a', { text: 'Run scripts/run.py, see docs/old.md and nodes/main.node.ts' }))).toEqual(['docs/old.md'])
  expect(await stalePaths(port, mem('b', { text: 'Use /debug and /report, read /etc/gone/file.txt' }))).toEqual(['/etc/gone/file.txt'])
})

test('findings cover what is not a learning, broken rules, stale paths, length, wording, superseded, groups, contradictions and the index', async () => {
  const memory = [mem('a', { how: 'x'.repeat(700) }), mem('b', { why: '' }), mem('c', { text: '[SUPERADO] Use ccc tooling' }), mem('d', { text: 'Run docs/old.md first' }), mem('e'), mem('f'), mem('g'), mem('w'), mem('n')]
  const { port } = memoryPort({
    paths: ['/p/docs'],
    complete: prompt =>
      prompt.includes('Candidates:')
        ? JSON.stringify({ items: [{ index: 8, verdict: 'decision' }, { index: 9, verdict: 'convention' }] })
        : prompt.includes('should be one')
          ? JSON.stringify({ groups: [['file:feedback_e.md', 'file:feedback_f.md']] })
          : prompt.includes('List every pair')
            ? JSON.stringify({ pairs: [['file:feedback_e.md', 'file:feedback_g.md'], ['file:feedback_f.md', 'file:feedback_w.md']] })
            : prompt.includes('wording should be rewritten')
              ? JSON.stringify({ items: [{ id: 'file:feedback_w.md', reason: 'buried rule' }] })
              : null,
  })
  const findings = await findFindings(port, memory, [proposal('q')], ['feedback_e.md'])
  const kinds = findings.map(finding => `${finding.kind}:${finding.ids.map(id => id.replace(/^file:feedback_|\.md$/g, '')).join('+')}`)

  // The contradictions and the group share learnings, so they are one finding to settle together.
  expect(kinds).toEqual(['misplaced:n', 'misplaced:q', 'long:a', 'rules:b', 'superseded:c', 'stale:d', 'conflict:e+f+g+w', 'wording:w', 'unindexed:e'])
})

test('fix plans a step per finding: moves and retirements without the model, rewrites with one retry, and the bookkeeping', async () => {
  const memory = [mem('a', { why: '' }), mem('e'), mem('f'), mem('s', { text: 'Use sss and also ttt' }), mem('m'), mem('x'), mem('k'), mem('g')]
  let calls = 0
  const { port } = memoryPort({
    store: { 'learnings:s1': [proposal('q')] },
    files: { 'MEMORY.md': '# Memory\n\n## Builds\n- [Z](z.md) — z\n' },
    complete: prompt => {
      calls += 1

      if (prompt.includes('heading its line belongs') || prompt.includes('under which heading')) {
        return JSON.stringify({ items: [{ id: 'file:feedback_x.md', section: 'Builds' }] })
      }

      if (prompt.includes('the last repair still had')) {
        return JSON.stringify({ repairs: [{ index: 0, action: 'rewrite', learnings: [{ kind: 'feedback', text: 'Use aaa tooling', why: 'asked on 2026-10-13' }], reason: 'it had no why' }] })
      }

      return JSON.stringify({
        repairs: [
          { index: 0, action: 'merge', learnings: [{ kind: 'feedback', text: 'Use eee/fff tooling', why: 'both said so' }], reason: 'they say the same' },
          { index: 1, action: 'rewrite', learnings: [{ kind: 'feedback', text: 'Use aaa tooling', why: '' }], reason: 'no why' },
          { index: 2, action: 'split', learnings: [{ kind: 'feedback', text: 'Use sss', why: 'one' }, { kind: 'feedback', text: 'Use ttt', why: 'two' }], reason: 'two facts' },
        ],
      })
    },
  })
  const plan = await planRepairs(
    port,
    [
      { kind: 'misplaced', ids: ['file:feedback_k.md'], problems: ['a convention'], place: 'convention' },
      { kind: 'misplaced', ids: ['file:feedback_g.md'], problems: ['a decision'], place: 'decision' },
      { kind: 'misplaced', ids: ['q'], problems: ['general'], place: 'general' },
      { kind: 'rules', ids: ['file:feedback_a.md'], problems: ['no why'] },
      { kind: 'cluster', ids: ['file:feedback_e.md', 'file:feedback_f.md'], problems: ['same'] },
      { kind: 'rules', ids: ['file:feedback_s.md'], problems: ['two facts'] },
      { kind: 'superseded', ids: ['file:feedback_m.md'], problems: ['superseded'] },
      { kind: 'unindexed', ids: ['file:feedback_x.md'], problems: ['not in MEMORY.md'] },
    ],
    memory,
    { ...clean, toUnindex: ['feedback_z.md'], copies: [['feedback_c2.md', 'feedback_c.md']] },
  )

  expect(calls).toBe(3)
  expect(plan.dropped).toBe(1)
  expect(await port.learnings.all()).toEqual([])
  expect(plan.steps.map(step => `${step.action}:${step.files.join('+')}`)).toEqual([
    'move:feedback_k.md',
    'move:feedback_g.md',
    'retire:feedback_m.md',
    'merge:feedback_e.md+feedback_f.md',
    'rewrite:feedback_a.md',
    'split:feedback_s.md',
    'index:feedback_x.md',
    'unindex:feedback_z.md',
    'uncopy:feedback_c2.md',
  ])
  expect(plan.steps[1]).toMatchObject({ to: 'docs' })
  expect(plan.steps[4]).toMatchObject({ learnings: [{ text: 'Use aaa tooling', why: 'asked on 2026-10-13' }] })
  expect(plan.steps[6]).toMatchObject({ section: 'Builds' })

  const message = fixMessage(plan.steps)

  expect(message).toContain('Apply exactly these 9 changes and nothing else')
  expect(message).toContain("2. Move feedback_g.md to the project's docs")
  expect(message).toContain('4. Merge feedback_e.md, feedback_f.md into one memory')
  expect(message).toContain('7. Add feedback_x.md to MEMORY.md under "Builds".')
  expect(message).toContain('9. Delete feedback_c2.md and its index line: it says word for word what feedback_c.md says.')
})

test('without a model, what needs one is reported as needing it', async () => {
  const { port } = memoryPort()
  const plan = await planRepairs(port, [{ kind: 'rules', ids: ['file:feedback_a.md'], problems: ['no why'] }, { kind: 'superseded', ids: ['file:feedback_m.md'], problems: ['superseded'] }], [mem('a', { why: '' }), mem('m')], clean, { judge: 'heuristic' })

  expect(plan.steps.map(step => step.action)).toEqual(['retire'])
  expect(plan.unrepaired).toBe(1)
})

test('a repair is written from the whole memory file', async () => {
  const prompts: string[] = []
  const { port } = memoryPort({
    files: { 'feedback_a.md': '---\ntype: feedback\n---\n\nUse aaa tooling.\n\nSpecifically:\n\n- step one\n- step two\n' },
    complete: prompt => {
      prompts.push(prompt)

      return null
    },
  })

  await planRepairs(port, [{ kind: 'rules', ids: ['file:feedback_a.md'], problems: ['no why'] }], [mem('a', { why: '' })], clean)
  expect(prompts[0]).toContain('[file:feedback_a.md] feedback, its whole memory file:')
  expect(prompts[0]).toContain('    | - step two')
})

test('groups and contradictions that share a learning become one finding', () => {
  const joined = joinOverlaps([
    { kind: 'conflict', ids: ['a', 'b'], problems: ['they contradict each other'] },
    { kind: 'rules', ids: ['x'], problems: ['no why'] },
    { kind: 'cluster', ids: ['c', 'b', 'd'], problems: ['they say the same thing'] },
    { kind: 'cluster', ids: ['e', 'f'], problems: ['they say the same thing'] },
  ])

  expect(joined).toEqual([
    { kind: 'conflict', ids: ['a', 'b', 'c', 'd'], problems: ['they contradict each other', 'they say the same thing'] },
    { kind: 'rules', ids: ['x'], problems: ['no why'] },
    { kind: 'cluster', ids: ['e', 'f'], problems: ['they say the same thing'] },
  ])
})

test('doctor only reports; fix asks Claude in one message, opens the guard, and undo puts the folder back word for word', async () => {
  const a = mem('a', { why: '' })
  const b = mem('b', { text: '[SUPERADO] Use bbb tooling' })
  const { port, files, said } = memoryPort({ store: { 'learnings:s1': [proposal('q'), { ...proposal('old'), status: 'accepted' }] }, files: { 'feedback_a.md': fileOf(a), 'feedback_b.md': fileOf(b), 'MEMORY.md': '- [A](feedback_a.md) — x\n- [B](feedback_b.md) — y\n' } })
  const report = await runLearningsDoctor(port, false, { judge: 'heuristic' })

  expect(report).toContain('2 memory files · 1 waiting for your review in /learnings')
  expect(report).toContain('✗ 1 learning breaking the rules (fix rewrites or splits them)\n  - Use aaa tooling for aaa builds: no why')
  expect(report).toContain('✗ 1 learning that says it is superseded (fix retires it)')
  expect(report).toContain('`/learnings fix` repairs all of it')
  expect(said).toEqual([])

  const fixed = await runLearningsDoctor(port, true, { judge: 'heuristic' })

  expect(fixed).toContain('Asked Claude to repair your memory in one message: 1 retirement.')
  expect(fixed).toContain('- 1 finding with no repair: they need the model (judge: model)')
  expect(said).toHaveLength(1)
  expect(said[0]).toContain('1. Retire feedback_b.md: delete the file and its index line (its text says it is superseded).')
  expect(await approvalAt(port)).not.toBeNull()
  expect((await port.learnings.all()).map(item => item.id)).toEqual(['q'])

  // Claude applies it; undo brings the folder and the ledger back.
  delete files['feedback_b.md']
  files['feedback_new.md'] = 'x'
  files['MEMORY.md'] = '- [A](feedback_a.md) — x\n'

  expect(await undoLearnings(port)).toEqual({ ledger: 2, files: 2 })
  expect(files['feedback_b.md']).toBe(fileOf(b))
  expect(files['feedback_new.md']).toBeUndefined()
  expect(files['MEMORY.md']).toBe('- [A](feedback_a.md) — x\n- [B](feedback_b.md) — y\n')
  expect(await undoLearnings(port)).toEqual({ ledger: 0, files: 0 })
})
