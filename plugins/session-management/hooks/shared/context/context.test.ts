import { expect, test } from 'claude-code/testing'

import type { Question } from '../../../types'
import { promptContext } from './context.hook'

const question = (id: string): Question => ({ id, session: 's1', texts: [`Question ${id} that makes sense alone?`], source: 'text', project: '/p', at: 1, isOpen: true, asks: 1 })
const base = { changes: [], open: [], list: [], questionsTool: 'QT', checklistTool: 'CT' }

test('nothing to say attaches nothing', () => {
  expect(promptContext(base)).toEqual([])
})

test('changes, the newest ten open questions and the open tasks each become a note', () => {
  const open = Array.from({ length: 12 }, (_, index) => question(`q${index}`))
  const notes = promptContext({ ...base, changes: ['added "Ship it" (todo)'], open, list: [{ id: 'a', text: 'Write the tests', status: 'todo' }] })

  expect(notes).toHaveLength(3)
  expect(notes[0]).toContain('- added "Ship it" (todo)')
  expect(notes[1]).toContain('[q11]')
  expect(notes[1]).not.toContain('[q1]')
  expect(notes[1]).toContain('with the QT tool')
  expect(notes[2]).toContain('1. [a] (todo) Write the tests')
  expect(notes[2]).toContain('with the CT tool')
})

test('the checklist note says what a blocked task waits for', () => {
  const list = [{ id: 'a', text: 'Choose the database', status: 'todo' as const }, { id: 'b', text: 'Run the migration', status: 'todo' as const, blockedBy: [{ kind: 'task' as const, id: 'a' }, { kind: 'question' as const, id: 'q1' }] }]
  const notes = promptContext({ ...base, open: [question('q1')], list })

  expect(notes[1]).toContain('2. [b] (todo) Run the migration — blocked by task [a] Choose the database; question [q1] Question q1 that makes sense alone?')
})
