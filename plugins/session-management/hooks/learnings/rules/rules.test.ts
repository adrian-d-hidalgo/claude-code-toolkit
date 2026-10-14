import { expect, test } from 'claude-code/testing'

import { excerpt, isSuperseded, lintLearning, pathsIn } from './rules.hook'

test('a sound learning breaks no rule', () => {
  expect(lintLearning({ text: 'Run the validators before every commit', why: 'The user asked for it on 2026-10-13 after a broken manifest reached main' })).toEqual([])
})

test('the rules catch a missing why, a repeated why, two facts, relative dates, session-only facts and secrets', () => {
  expect(lintLearning({ text: 'Prefer tabs', why: '' })).toContain('no why')
  expect(lintLearning({ text: 'Prefer tabs over spaces in Go files', why: 'Prefer tabs over spaces in Go files' })).toContain('the why repeats the text')
  expect(lintLearning({ text: 'Use pnpm and also pin node to 22', why: 'said so' })).toContain('two facts in one ("and also")')
  expect(lintLearning({ text: 'The release is next week', why: 'planned yesterday' })).toContain('a relative date')
  expect(lintLearning({ text: 'In this conversation we skip tests', why: 'time' })).toContain('tied to the conversation it came from')
  expect(lintLearning({ text: 'The key is sk-live-abc123defghijklmnopq', why: 'given' })).toContain('looks like a secret')
  expect(lintLearning({ text: 'Regla dura, dos partes:', why: 'given' })).toContain('the text is a lead-in, not the fact')
  expect(lintLearning({ text: 'x'.repeat(201), why: 'y' })).toContain('text over 200 characters')
})

test('what reads like a date, a secret or a path in plain prose is not taken for one', () => {
  expect(lintLearning({ text: 'The onboarding as it runs today, not as planned', why: 'tal como corre hoy' })).toEqual([])
  expect(lintLearning({ text: 'Never assume, see task-never-assume', why: 'ask-user-tool-no-frontend-validation and a token: is required' })).toEqual([])
})

test('a learning that says it is superseded is recognised', () => {
  expect(isSuperseded({ text: '[SUPERADO — verificado 2026-09-15] Mismo caso que antes' })).toBe(true)
  expect(isSuperseded({ text: 'Deprecated: use the v2 runtime' })).toBe(true)
  expect(isSuperseded({ text: 'Mark superseded learnings' })).toBe(false)
})

test('excerpts drop backticks and emphasis so a cut never swallows the line breaks', () => {
  expect(excerpt('Use `pnpm` and **never** `npm', 20)).toBe('Use pnpm and never…')
})

test('the paths a learning names are found, URLs and commands are not', () => {
  expect(pathsIn('Run /debug then /report, and /Sentry is the tool')).toEqual([])
  expect(pathsIn('Read plugins/core/SKILL.md and /etc/hosts, not https://example.com/a/b.md.')).toEqual(['plugins/core/SKILL.md', '/etc/hosts'])
  expect(pathsIn('Run `scripts/run.py` first; ~/.claude/CLAUDE.md is global')).toEqual(['scripts/run.py', '~/.claude/CLAUDE.md'])
  expect(pathsIn('No path here, just words/and slashes')).toEqual([])
})
