import { expect, test } from 'claude-code/testing'

import { buildForkTasksPrompt, buildTaskPrompt, parseTasks } from './judge.hook'

test('the task prompt carries the tracked tasks and the recent conversation', () => {
  const prompt = buildTaskPrompt(
    [
      { role: 'user', text: 'Fix the lint errors in src/cloud', toolUses: [] },
      { role: 'assistant', text: 'On it.', toolUses: [{ tool: 'Agent', input: { description: 'lint fixer' } }] },
    ],
    ['Write the tests'],
  )

  expect(prompt).toContain('- Write the tests')
  expect(prompt).toContain('user: Fix the lint errors in src/cloud')
  expect(prompt).toContain('(started subagent: lint fixer)')
})

test('the model reply becomes tasks: long ones split into a title and description, unknown statuses default to todo', () => {
  const long = 'Replace the in-memory rate limiter with the Valkey-backed one and update every caller that imports the old module'
  const tasks = parseTasks(
    JSON.stringify({
      tasks: [
        { text: 'Write the tests', status: 'doing' },
        { text: long, status: 'weird' },
        { text: 'Short title', detail: 'files: a.ts, b.ts', status: 'todo' },
        { text: '   ' },
      ],
    }),
  )

  expect(tasks).toHaveLength(3)
  expect(tasks?.[0]).toMatchObject({ text: 'Write the tests', status: 'doing' })
  expect(tasks?.[1]).toMatchObject({ status: 'todo', detail: long })
  expect(tasks?.[2]).toMatchObject({ text: 'Short title', detail: 'files: a.ts, b.ts' })
  expect(parseTasks('not json')).toBeNull()
})

test('the fork prompt lists the tracked tasks so they are not repeated', () => {
  expect(buildForkTasksPrompt(['Ship it'])).toContain('- Ship it')
})

test('the prompts ask for an optional priority and the parser keeps only high and low', () => {
  expect(buildTaskPrompt([], [])).toContain('"priority"')
  expect(buildForkTasksPrompt([])).toContain('"priority"')
  expect(parseTasks('{"tasks":[{"text":"A","priority":"high"},{"text":"B","priority":"Low"},{"text":"C","priority":"normal"},{"text":"D","priority":"urgent"},{"text":"E"}]}')).toEqual([
    { text: 'A', status: 'todo', priority: 'high' },
    { text: 'B', status: 'todo', priority: 'low' },
    { text: 'C', status: 'todo' },
    { text: 'D', status: 'todo' },
    { text: 'E', status: 'todo' },
  ])
})
