import { expect, test } from 'claude-code/testing'

import type { ScanMessage } from '../../shared/transcript/transcript.hook'
import { buildTaskPrompt, parseTasks } from '../judge/judge.hook'
import { addNew, scanTasks } from './scan.hook'

const assistant = (text: string, toolUses: ScanMessage['toolUses'] = []): ScanMessage => ({ role: 'assistant', text, toolUses })

test('reads the last TodoWrite with its statuses', () => {
  const write = (todos: unknown) => assistant('', [{ tool: 'TodoWrite', input: { todos } }])
  const found = scanTasks([
    write([{ content: 'old', status: 'pending' }]),
    write([
      { content: 'Write tests', status: 'completed' },
      { content: 'Fix the pane', status: 'in_progress' },
      { content: 'Update README', status: 'pending' },
    ]),
  ])

  expect(found).toEqual([
    { text: 'Write tests', status: 'done' },
    { text: 'Fix the pane', status: 'doing' },
    { text: 'Update README', status: 'todo' },
  ])
})

test('reads plan bullets and markdown checkboxes without repeating a task', () => {
  const plan = assistant('', [{ tool: 'ExitPlanMode', input: { plan: '# Plan\n1. Add the scan command\n- Update the README' } }])
  const boxes = assistant('Next:\n- [ ] Add the scan command\n- [x] Run the validator')

  expect(scanTasks([plan, boxes])).toEqual([
    { text: 'Add the scan command', status: 'todo' },
    { text: 'Update the README', status: 'todo' },
    { text: 'Run the validator', status: 'done' },
  ])
})

test('addNew skips tasks the checklist already says in other words', () => {
  const known = [{ text: 'Update the README file', status: 'todo' as const }]

  expect(addNew(known, [{ text: 'Update README', status: 'todo' }, { text: 'Run evals', status: 'todo' }]).map(t => t.text)).toEqual([
    'Update the README file',
    'Run evals',
  ])
})

test('parses the model reply and defaults unknown statuses', () => {
  expect(parseTasks('{"tasks":[{"text":"Do X","status":"doing"},{"text":"Do Y","status":"?"}]}')).toEqual([
    { text: 'Do X', status: 'doing' },
    { text: 'Do Y', status: 'todo' },
  ])
  expect(parseTasks('nope')).toBeNull()
  expect(buildTaskPrompt([assistant('We still need to fix Z')], ['Do X'])).toContain('- Do X')
})

test('FoundTask carries an optional priority through addNew', () => {
  expect(addNew([], [{ text: 'Fix the outage', status: 'todo', priority: 'high' }])).toEqual([{ text: 'Fix the outage', status: 'todo', priority: 'high' }])
})

test('addNew keeps genuinely different tasks, and a finished task does not block the same work again', () => {
  const known = [
    { text: 'Migrate users table to postgres', status: 'todo' as const },
    { text: 'Run the test suite', status: 'done' as const },
  ]
  const added = addNew(known, [
    { text: 'Migrate orders table to postgres', status: 'todo' },
    { text: 'Run the test suite', status: 'todo' },
    { text: 'Run the test suite', status: 'done' },
  ])

  expect(added.map(t => `${t.text} (${t.status})`)).toEqual([
    'Migrate users table to postgres (todo)',
    'Run the test suite (done)',
    'Migrate orders table to postgres (todo)',
    'Run the test suite (todo)',
  ])
})
