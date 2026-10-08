import { expect, test } from 'claude-code/testing'

import { memoryPort } from '../../shared/port/port.hook'
import type { ScanMessage } from '../../shared/transcript/transcript.hook'
import { backfillChecklist } from './backfill.hook'

const todos = (items: Array<[string, string]>): ScanMessage[] => [
  { role: 'assistant', text: '', toolUses: [{ tool: 'TodoWrite', input: { todos: items.map(([content, status]) => ({ content, status })) } }] },
]

test('a fast scan takes only the structured sources', async () => {
  const { port } = memoryPort({ messages: todos([['Write the tests', 'pending'], ['Ship it', 'completed']]) })

  expect(await backfillChecklist(port, 'fast', {})).toContain('2 structured, 0 from the model, 2 added')
  expect((await port.checklist.all()).map(one => one.status)).toEqual(['todo', 'done'])
  expect(await backfillChecklist(port, 'fast', {})).toContain('0 added')
})

test('a deep scan adds what the session model lists, with a description for the long ones', async () => {
  const reply = JSON.stringify({ tasks: [{ text: 'Fix the lint errors', detail: 'only src/cloud', status: 'doing' }] })
  const { port } = memoryPort({ messages: todos([['Write the tests', 'pending']]), fork: () => reply })

  expect(await backfillChecklist(port, 'deep', {})).toContain('(deep): 1 structured, 1 from the model, 2 added')
  expect((await port.checklist.all()).find(one => one.text === 'Fix the lint errors')).toMatchObject({ status: 'doing', detail: 'only src/cloud' })
})

test('a deep scan falls back to the small model, and says so when no model answers', async () => {
  const withSmall = memoryPort({ messages: [], fork: () => null, complete: () => '{"tasks":[{"text":"Ship it","status":"todo"}]}' })
  const none = memoryPort({ messages: [] })

  expect(await backfillChecklist(withSmall.port, 'deep', {})).toContain('deep failed, fell back to quick')
  expect(await backfillChecklist(none.port, 'deep', {})).toContain('model unavailable')
})

test('the model is told what the structured sources found and to return the work in order, without repeats', async () => {
  let asked = ''
  const { port } = memoryPort({
    messages: todos([['Write the tests', 'pending']]),
    fork: prompt => {
      asked = prompt

      return '{"tasks":[]}'
    },
  })

  await backfillChecklist(port, 'deep', {})
  expect(asked).toContain('- Write the tests')
  expect(asked).toContain('never list the same work twice')
  expect(asked).toContain('blockers and prerequisites before')
})

test('the summary reads how many were added, merged into existing tasks and already tracked', async () => {
  const { port } = memoryPort({ messages: todos([['Write the tests', 'pending'], ['Ship it', 'completed']]) })

  expect(await backfillChecklist(port, 'fast', {})).toBe('Scan (structured only): 2 structured, 0 from the model, 2 added, 0 merged into existing tasks, 0 already tracked.')
  expect(await backfillChecklist(port, 'fast', {})).toContain('0 added, 0 merged into existing tasks, 2 already tracked')
})

test('a scan links the tasks the model says wait for another', async () => {
  const reply = JSON.stringify({ tasks: [{ text: 'Run the schema migration', status: 'todo' }] })
  const verdicts = '{"items":[{"index":0,"verdict":"new","blockedBy":["#1"]},{"index":1,"verdict":"new"}]}'
  const { port } = memoryPort({ messages: todos([['Write the migration script', 'pending']]), fork: () => reply, complete: () => verdicts })

  expect(await backfillChecklist(port, 'deep', {})).toContain('1 dependencies set')
  expect((await port.checklist.all())[0]?.blockedBy).toEqual([{ kind: 'task', id: (await port.checklist.all())[1]?.id }])
})

test('a priority the model reads from the conversation reaches the stored task', async () => {
  const reply = JSON.stringify({ tasks: [{ text: 'Fix the outage', priority: 'high' }, { text: 'Tidy the docs', priority: 'low' }] })
  const { port } = memoryPort({ messages: todos([['Write the tests', 'pending']]), fork: () => reply })

  await backfillChecklist(port, 'deep', {})

  expect((await port.checklist.all()).map(one => [one.text, one.priority])).toEqual([
    ['Fix the outage', 'high'],
    ['Write the tests', undefined],
    ['Tidy the docs', 'low'],
  ])
})
