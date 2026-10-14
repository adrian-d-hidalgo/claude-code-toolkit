import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { buildConflictPrompt, buildLearningsReconcilePrompt, buildRepairPrompt, parseClusters, parseConflicts, parseLearningVerdicts, parseRepairs, parseSections, parseWording } from './judge.hook'

const known: Learning[] = [{ id: 'k1', kind: 'feedback', text: 'Use pnpm', why: 'lockfile', status: 'rejected', reason: 'we moved to bun', project: '/p', session: 's', at: 1, seen: 1 }]

test('the reconcile prompt carries the rules, the known learnings with their verdicts, and the candidates', () => {
  const prompt = buildLearningsReconcilePrompt(known, [{ kind: 'project', text: 'Deploys are on Tuesdays', why: 'the runbook' }])

  expect(prompt).toContain('- One fact per learning')
  expect(prompt).toContain('- [k1] (rejected) feedback: Use pnpm — why: lockfile — rejected: we moved to bun')
  expect(prompt).toContain('0. project: Deploys are on Tuesdays — why: the runbook')
})

test('verdicts parse by index; a skipped candidate is new; nonsense is null', () => {
  expect(parseLearningVerdicts('{"items":[{"index":1,"verdict":"refines","of":"k1"},{"index":5,"verdict":"new"},{"index":0,"verdict":"maybe"}]}', 2)).toEqual([{ verdict: 'new' }, { verdict: 'updates', of: 'k1' }])
  expect(parseLearningVerdicts('no json', 1)).toBeNull()
  expect(parseLearningVerdicts('{"items":"x"}', 1)).toBeNull()
})

test('conflict pairs parse only among the ids given', () => {
  expect(buildConflictPrompt(known)).toContain('- [k1] feedback: Use pnpm')
  expect(parseConflicts('{"pairs":[["a","b"],["a","a"],["a","zz"],"x"]}', new Set(['a', 'b']))).toEqual([['a', 'b']])
  expect(parseConflicts('{}', new Set())).toBeNull()
})

test('clusters, repairs, sections and wording parse only what they may', () => {
  const a = { ...(known[0] as Learning), id: 'a', status: 'accepted' as const }
  const b = { ...a, id: 'b' }

  expect(parseClusters('{"groups":[["a","b","zz"],["b","c"],["a"]]}', new Set(['a', 'b', 'c']))).toEqual([['a', 'b']])
  expect(buildRepairPrompt([{ learnings: [a], problems: ['no why'] }])).toContain('0. problems: no why\n  [a] feedback: Use pnpm')

  const items = [{ learnings: [a], problems: [] }, { learnings: [a, b], problems: [] }, { learnings: [a], problems: [] }, { learnings: [a], problems: [] }]

  expect(
    parseRepairs(
      JSON.stringify({
        repairs: [
          { index: 0, action: 'split', learnings: [{ text: 'one', why: 'w' }] },
          { index: 1, action: 'retire', id: 'b', reason: 'gone' },
          { index: 2, action: 'rewrite', learnings: [{ kind: 'user', text: 'x', why: 'y', how: ' ' }] },
          { index: 3, action: 'move' },
        ],
      }),
      items,
    ),
  ).toEqual([null, { action: 'retire', id: 'b', reason: 'gone', learnings: [] }, { action: 'rewrite', id: 'a', reason: 'the doctor found a problem', learnings: [{ kind: 'user', text: 'x', why: 'y' }] }, { action: 'move', id: 'a', reason: 'the doctor found a problem', learnings: [] }])
  expect(parseSections('{"items":[{"id":"a","section":"## Style"},{"id":"zz","section":"x"}]}', new Set(['a']))).toEqual(new Map([['a', 'Style']]))
  expect(parseWording('{"items":[{"id":"a"},{"id":"q","reason":"x"}]}', new Set(['a']))).toEqual(new Map([['a', 'hard to read']]))
})
