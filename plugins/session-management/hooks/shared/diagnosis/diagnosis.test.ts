import { expect, test } from 'claude-code/testing'

import { formatChecks, plural } from './diagnosis.hook'

test('plural counts and pluralises', () => {
  expect(plural(1, 'task')).toBe('1 task')
  expect(plural(3, 'task')).toBe('3 tasks')
  expect(plural(0, 'task')).toBe('0 tasks')
})

test('formatChecks marks passed checks, lists problems and closes a clean report', () => {
  const clean = formatChecks('Head', 'Sum', [{ label: 'one is fine', lines: [] }])

  expect(clean).toEqual(['Head', 'Sum', '✓ one is fine', 'Everything checks out.'])
  expect(formatChecks('Head', 'Sum', [{ label: 'one is fine', lines: ['2 bad things (dropped)'] }], ['1 odd thing'])).toEqual(['Head', 'Sum', '✗ 1 odd thing', '✗ 2 bad things (dropped)'])
})
