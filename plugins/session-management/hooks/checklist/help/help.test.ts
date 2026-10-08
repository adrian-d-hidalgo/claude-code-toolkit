import { expect, test } from 'claude-code/testing'

import { parseChecklistArgs } from '../args/args.hook'
import { CHECKLIST_HELP } from './help.hook'

test('help is parsed in its usual spellings', () => {
  expect(parseChecklistArgs('help')).toEqual({ kind: 'help' })
  expect(parseChecklistArgs('--help')).toEqual({ kind: 'help' })
})

test('every subcommand is documented in the help', () => {
  for (const verb of ['add', 'edit', 'detail', 'run', 'cancel', 'mv', 'priority', 'rm', 'scan', 'clear', 'undo', 'doctor', 'fix', 'rebuild']) {
    expect(CHECKLIST_HELP).toContain(verb)
  }
})
