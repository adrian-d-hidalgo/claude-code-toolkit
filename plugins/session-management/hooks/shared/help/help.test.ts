import { expect, test } from 'claude-code/testing'

import { isHelp } from './help.hook'

test('help is recognised in its usual spellings', () => {
  expect(['help', '-h', '--help'].every(isHelp)).toBe(true)
  expect(isHelp('doctor')).toBe(false)
})
