import { expect, test } from 'claude-code/testing'

import { QUESTIONS_HELP, QUESTIONS_VERBS } from './help.hook'

test('every subcommand is documented in the help', () => {
  for (const verb of QUESTIONS_VERBS.filter(Boolean)) {
    expect(QUESTIONS_HELP).toContain(verb)
  }
})
