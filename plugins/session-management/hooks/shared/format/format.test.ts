import { expect, test } from 'claude-code/testing'

import { ago, baseName, oneLine, progressBar, brief, quoted } from './format.hook'

test('progress bar fills proportionally', () => {
  expect(progressBar(0, 0, 4)).toBe('░░░░')
  expect(progressBar(1, 2, 4)).toBe('██░░')
  expect(progressBar(4, 4, 4)).toBe('████')
})

test('age picks the shortest unit', () => {
  expect(ago(0, 30_000)).toBe('now')
  expect(ago(0, 5 * 60_000)).toBe('5m')
  expect(ago(0, 3 * 3_600_000)).toBe('3h')
  expect(ago(0, 2 * 86_400_000)).toBe('2d')
})

test('single line text is collapsed and capped', () => {
  expect(oneLine('a\n  b\tc')).toBe('a b c')
  expect(oneLine('x'.repeat(10), 5)).toBe('xxxx…')
})

test('a long task is split into a cut title and the rest as its detail, without repeating the title', () => {
  const long = 'Replace the in-memory rate limiter with the Valkey-backed one and update every caller that imports the old module, then document the migration path in the runbook, add a feature flag for the rollout and remove the old module once every service has switched over'
  const fits = 'Replace the in-memory rate limiter with the Valkey-backed one and update every caller that still imports the old module'
  const split = brief(long)

  expect(brief('Short task')).toEqual({ text: 'Short task' })
  expect(brief(fits)).toEqual({ text: fits })
  expect(split.text.length).toBeLessThanOrEqual(201)
  expect(split.text.endsWith('…')).toBe(true)
  expect(long.startsWith(split.text.slice(0, -1))).toBe(true)
  expect(split.detail?.startsWith('…')).toBe(true)
  expect(long.endsWith(split.detail?.slice(1) ?? '')).toBe(true)
  expect(split.detail?.includes(split.text.slice(0, -1))).toBe(false)
})

test('baseName is the last folder of a path', () => {
  expect(baseName('/Users/me/Projects/Loci')).toBe('Loci')
  expect(baseName('/')).toBe('/')
})

test('quoted cuts a long text for a one-line report', () => {
  expect(quoted('Short')).toBe('"Short"')
  expect(quoted('x'.repeat(100))).toBe(`"${'x'.repeat(79)}…"`)
})
