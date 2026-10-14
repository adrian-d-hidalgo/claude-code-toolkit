import { expect, test } from 'claude-code/testing'

import { parseLearningsArgs } from './args.hook'

test('the verbs parse with their numbers and texts', () => {
  expect(parseLearningsArgs('')).toEqual({ kind: 'open' })
  expect(parseLearningsArgs('help')).toEqual({ kind: 'help' })
  expect(parseLearningsArgs('accept 2')).toEqual({ kind: 'accept', position: 2 })
  expect(parseLearningsArgs('accept ALL')).toEqual({ kind: 'acceptAll' })
  expect(parseLearningsArgs('accept all now')).toEqual({ kind: 'invalid', reason: 'accept all takes nothing more' })
  expect(parseLearningsArgs('reject 3 we use spaces')).toEqual({ kind: 'reject', position: 3, reason: 'we use spaces' })
  expect(parseLearningsArgs('reject 3')).toEqual({ kind: 'reject', position: 3, reason: '' })
  expect(parseLearningsArgs('reopen 1')).toEqual({ kind: 'reopen', position: 1 })
  expect(parseLearningsArgs('edit 1 why  the hook  failed')).toEqual({ kind: 'edit', position: 1, field: 'why', text: 'the hook  failed' })
  expect(parseLearningsArgs('edit 1 how')).toEqual({ kind: 'edit', position: 1, field: 'how', text: '' })
  expect(parseLearningsArgs('kind 4 Reference')).toEqual({ kind: 'kind', position: 4, value: 'reference' })
  expect(parseLearningsArgs('rm 5')).toEqual({ kind: 'remove', position: 5 })
  expect(parseLearningsArgs('clear all')).toEqual({ kind: 'clear', isAll: true })
  expect(parseLearningsArgs('fix')).toEqual({ kind: 'fix' })
})

test('what cannot be understood says why', () => {
  expect(parseLearningsArgs('bogus')).toEqual({ kind: 'invalid', reason: 'unknown subcommand bogus' })
  expect(parseLearningsArgs('import')).toEqual({ kind: 'invalid', reason: 'unknown subcommand import' })
  expect(parseLearningsArgs('accept x')).toEqual({ kind: 'invalid', reason: 'accept needs the learning number' })
  expect(parseLearningsArgs('edit 1 title x')).toEqual({ kind: 'invalid', reason: 'edit needs text, why or how and the new text' })
  expect(parseLearningsArgs('edit 1 text')).toEqual({ kind: 'invalid', reason: 'edit text needs a text' })
  expect(parseLearningsArgs('kind 1 urgent')).toEqual({ kind: 'invalid', reason: 'kind needs user, feedback, project, reference' })
})
