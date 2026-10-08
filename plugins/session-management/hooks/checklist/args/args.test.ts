import { expect, test } from 'claude-code/testing'

import { parseChecklistArgs } from './args.hook'

test('parses each /checklist subcommand', () => {
  expect(parseChecklistArgs('')).toEqual({ kind: 'open' })
  expect(parseChecklistArgs('add write the spec')).toEqual({ kind: 'add', text: 'write the spec' })
  expect(parseChecklistArgs('done 2')).toEqual({ kind: 'status', position: 2, status: 'done' })
  expect(parseChecklistArgs('edit 1 new text')).toEqual({ kind: 'edit', position: 1, text: 'new text' })
  expect(parseChecklistArgs('detail 2 the long description')).toEqual({ kind: 'detail', position: 2, text: 'the long description' })
  expect(parseChecklistArgs('doctor')).toEqual({ kind: 'doctor', isHistory: false })
  expect(parseChecklistArgs('fix --history')).toEqual({ kind: 'fix', isHistory: true })
  expect(parseChecklistArgs('rebuild')).toEqual({ kind: 'rebuild' })
  expect(parseChecklistArgs('priority 2 high')).toEqual({ kind: 'priority', position: 2, priority: 'high' })
  expect(parseChecklistArgs('pri 1 LOW')).toEqual({ kind: 'priority', position: 1, priority: 'low' })
  expect(parseChecklistArgs('rm 3')).toEqual({ kind: 'remove', position: 3 })
  expect(parseChecklistArgs('run 2')).toEqual({ kind: 'run', position: 2 })
  expect(parseChecklistArgs('cancel 4')).toEqual({ kind: 'cancel', position: 4 })
  expect(parseChecklistArgs('clear')).toEqual({ kind: 'clear', isAll: false })
  expect(parseChecklistArgs('clear all')).toEqual({ kind: 'clear', isAll: true })
  expect(parseChecklistArgs('undo')).toEqual({ kind: 'undo' })
  expect(parseChecklistArgs('all').kind).toBe('invalid')
  expect(parseChecklistArgs('scan')).toEqual({ kind: 'scan', mode: 'deep' })
  expect(parseChecklistArgs('scan quick')).toEqual({ kind: 'scan', mode: 'quick' })
  expect(parseChecklistArgs('scan fast')).toEqual({ kind: 'scan', mode: 'fast' })
  expect(parseChecklistArgs('mv 3 1')).toEqual({ kind: 'move', from: 3, to: 1 })
})

test('edit and detail keep the text as typed, newlines and spaces included', () => {
  expect(parseChecklistArgs('detail 2 line one\n\n  line  two\n')).toEqual({ kind: 'detail', position: 2, text: 'line one\n\n  line  two' })
  expect(parseChecklistArgs('detail 2\nstarts on the next line')).toEqual({ kind: 'detail', position: 2, text: 'starts on the next line' })
  expect(parseChecklistArgs('edit 1   spaced   title ')).toEqual({ kind: 'edit', position: 1, text: 'spaced   title' })
  expect(parseChecklistArgs('detail 3')).toEqual({ kind: 'detail', position: 3, text: '' })
})

test('edit names its section: title or description', () => {
  expect(parseChecklistArgs('edit 1 title new text')).toEqual({ kind: 'edit', position: 1, text: 'new text' })
  expect(parseChecklistArgs('edit 1 TITLE  Spaced   text ')).toEqual({ kind: 'edit', position: 1, text: 'Spaced   text' })
  expect(parseChecklistArgs('edit 2 description the long text')).toEqual({ kind: 'detail', position: 2, text: 'the long text' })
  expect(parseChecklistArgs('edit 2 Description line one\n\n  line  two\n')).toEqual({ kind: 'detail', position: 2, text: 'line one\n\n  line  two' })
  expect(parseChecklistArgs('edit 2 description\nstarts on the next line')).toEqual({ kind: 'detail', position: 2, text: 'starts on the next line' })
  expect(parseChecklistArgs('edit 2 description')).toEqual({ kind: 'detail', position: 2, text: '' })
})

test('notes is a silent legacy alias of description', () => {
  expect(parseChecklistArgs('edit 2 notes old habit')).toEqual({ kind: 'detail', position: 2, text: 'old habit' })
  expect(parseChecklistArgs('edit 2 NOTES')).toEqual({ kind: 'detail', position: 2, text: '' })
})

test('edit without a section keeps working as a title unless its first word is a section', () => {
  expect(parseChecklistArgs('edit 1 fix the titles')).toEqual({ kind: 'edit', position: 1, text: 'fix the titles' })
  expect(parseChecklistArgs('edit 1 titles are wrong')).toEqual({ kind: 'edit', position: 1, text: 'titles are wrong' })
  expect(parseChecklistArgs('edit 1 title title of the book')).toEqual({ kind: 'edit', position: 1, text: 'title of the book' })
})

test('edit with a section but no usable text is invalid with a reason', () => {
  expect(parseChecklistArgs('edit 3').kind).toBe('invalid')
  expect(parseChecklistArgs('edit 3 title')).toEqual({ kind: 'invalid', reason: 'edit title needs a text' })
  expect(parseChecklistArgs('edit 3 title   ')).toEqual({ kind: 'invalid', reason: 'edit title needs a text' })
  expect(parseChecklistArgs('edit x title a').kind).toBe('invalid')
})

test('rejects malformed input', () => {
  expect(parseChecklistArgs('add').kind).toBe('invalid')
  expect(parseChecklistArgs('done x').kind).toBe('invalid')
  expect(parseChecklistArgs('edit 1').kind).toBe('invalid')
  expect(parseChecklistArgs('fly 1').kind).toBe('invalid')
  expect(parseChecklistArgs('mv 3').kind).toBe('invalid')
  expect(parseChecklistArgs('run').kind).toBe('invalid')
  expect(parseChecklistArgs('priority 2 urgent')).toEqual({ kind: 'invalid', reason: 'priority needs high, normal or low' })
  expect(parseChecklistArgs('pri 2').kind).toBe('invalid')
  expect(parseChecklistArgs('priority high').kind).toBe('invalid')
})

test('block and unblock take a task number or q<number>, with an optional by', () => {
  expect(parseChecklistArgs('block 3 1')).toEqual({ kind: 'block', position: 3, by: { kind: 'task', position: 1 } })
  expect(parseChecklistArgs('block 3 by 2')).toEqual({ kind: 'block', position: 3, by: { kind: 'task', position: 2 } })
  expect(parseChecklistArgs('block 3 q2')).toEqual({ kind: 'block', position: 3, by: { kind: 'question', position: 2 } })
  expect(parseChecklistArgs('block 3 by Q1')).toEqual({ kind: 'block', position: 3, by: { kind: 'question', position: 1 } })
  expect(parseChecklistArgs('unblock 3 q2')).toEqual({ kind: 'unblock', position: 3, by: { kind: 'question', position: 2 } })
  expect(parseChecklistArgs('unblock 3')).toEqual({ kind: 'unblock', position: 3, by: null })
  expect(parseChecklistArgs('block 3').kind).toBe('invalid')
  expect(parseChecklistArgs('block 3 soon').kind).toBe('invalid')
  expect(parseChecklistArgs('block x 1').kind).toBe('invalid')
})

test('a bare number or an unknown word is an unknown subcommand, and verbs ignore case', () => {
  expect(parseChecklistArgs('3')).toEqual({ kind: 'invalid', reason: 'unknown subcommand 3' })
  expect(parseChecklistArgs('Fly 1')).toEqual({ kind: 'invalid', reason: 'unknown subcommand Fly' })
  expect(parseChecklistArgs('Add Write the Spec')).toEqual({ kind: 'add', text: 'Write the Spec' })
  expect(parseChecklistArgs('DONE 2')).toEqual({ kind: 'status', position: 2, status: 'done' })
  expect(parseChecklistArgs('Clear ALL')).toEqual({ kind: 'clear', isAll: true })
  expect(parseChecklistArgs('Scan FAST')).toEqual({ kind: 'scan', mode: 'fast' })
})

test('unblock with a token that is no blocker is invalid instead of dropping every blocker', () => {
  expect(parseChecklistArgs('unblock 3 garbage').kind).toBe('invalid')
  expect(parseChecklistArgs('unblock 3 by').kind).toBe('invalid')
  expect(parseChecklistArgs('unblock 3 by 2')).toEqual({ kind: 'unblock', position: 3, by: { kind: 'task', position: 2 } })
})
