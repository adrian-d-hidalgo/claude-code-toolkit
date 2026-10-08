import { expect, test } from 'claude-code/testing'

import type { ChecklistItem, Question } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { buildReconcilePrompt, parseReconcile, reconcileTasks, reconciledText } from './reconcile.hook'

const task = (id: string, text: string, status: ChecklistItem['status'] = 'todo'): ChecklistItem => ({ id, text, status })
const found = (text: string) => ({ text, status: 'todo' as const })
const asked = (id: string, text: string): Question => ({ id, texts: [text], session: 's1', project: '/p', source: 'text', at: 1, asks: 1, isOpen: true })

// A model that answers the same reply every time and counts the calls.
const answering = (reply: string | null) => {
  const calls: string[] = []

  return {
    calls,
    complete: (prompt: string) => {
      calls.push(prompt)

      return reply
    },
  }
}

test('the prompt lists the tracked tasks, the open questions and the candidates', () => {
  const prompt = buildReconcilePrompt(
    [task('a', 'Deploy the staging stack'), task('b', 'Fix the lint errors', 'done')],
    [asked('q1', 'Which database should we use?')],
    [found('Run the schema migration')],
  )

  expect(prompt).toContain('- [a] (todo) Deploy the staging stack')
  expect(prompt).toContain('- [b] (done) Fix the lint errors')
  expect(prompt).toContain('- [q1] Which database should we use?')
  expect(prompt).toContain('0. Run the schema migration')
  expect(prompt).toContain('"#<n>"')
})

test('a partial answer leaves the rest new, and garbage is no answer', () => {
  expect(parseReconcile('{"items":[{"index":1,"verdict":"duplicate","of":"a","blockedBy":["q1",3]}]}', 2)).toEqual([
    { verdict: 'new', blockedBy: [] },
    { verdict: 'duplicate', of: 'a', blockedBy: ['q1'] },
  ])
  expect(parseReconcile('{"items":[{"index":9,"verdict":"duplicate"},{"index":0,"verdict":"maybe"}]}', 1)).toEqual([{ verdict: 'new', blockedBy: [] }])
  expect(parseReconcile('no json here', 1)).toBeNull()
  expect(parseReconcile('{"items":3}', 1)).toBeNull()
  expect(parseReconcile('{broken', 1)).toBeNull()
})

test('a repeat in the same words is skipped without asking the model', async () => {
  const model = answering('{"items":[]}')
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a', 'Write the tests')] }, complete: model.complete })
  const result = await reconcileTasks(port, [found('Write the tests')])

  expect(result).toEqual({ added: 0, merged: 0, skipped: 1, linked: 0, capped: 0, notes: [] })
  expect(model.calls).toHaveLength(0)
  expect(await port.checklist.all()).toHaveLength(1)
})

test('a duplicate verdict skips the task, a new one is added', async () => {
  const model = answering('{"items":[{"index":0,"verdict":"duplicate","of":"a"},{"index":1,"verdict":"new"}]}')
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a', 'Deploy the staging stack')] }, complete: model.complete })
  const result = await reconcileTasks(port, [found('Ship the staging environment'), found('Update the changelog')])

  expect(result).toMatchObject({ added: 1, merged: 0, skipped: 1 })
  expect((await port.checklist.all()).map(one => one.text)).toEqual(['Deploy the staging stack', 'Update the changelog'])
})

test('a complement is folded into the target description, and not twice', async () => {
  const reply = '{"items":[{"index":0,"verdict":"complements","of":"a","detail":"check the smoke tests"}]}'
  const { port } = memoryPort({ store: { 'checklist:s1': [{ ...task('a', 'Deploy the staging stack'), detail: 'use the blue slot' }] }, complete: answering(reply).complete })
  const first = await reconcileTasks(port, [found('Add rollout verification')])

  expect(first).toMatchObject({ added: 0, merged: 1, skipped: 0 })
  expect(first.notes).toEqual(['"Add rollout verification" folded into "Deploy the staging stack"'])
  expect((await port.checklist.all())[0]?.detail).toBe('use the blue slot\ncheck the smoke tests')

  const second = await reconcileTasks(port, [found('Add rollout verification')])

  expect(second).toMatchObject({ merged: 0, skipped: 1 })
  expect((await port.checklist.all())[0]?.detail).toBe('use the blue slot\ncheck the smoke tests')
  expect(await port.checklist.all()).toHaveLength(1)
})

test('a candidate can wait for another candidate with #n', async () => {
  const reply = '{"items":[{"index":0,"verdict":"new"},{"index":1,"verdict":"new","blockedBy":["#0"]}]}'
  const { port } = memoryPort({ complete: answering(reply).complete })
  const result = await reconcileTasks(port, [found('Write the migration script'), found('Run the migration against staging')])
  const list = await port.checklist.all()

  expect(result).toMatchObject({ added: 2, linked: 1 })
  expect(list[1]?.blockedBy).toEqual([{ kind: 'task', id: list[0]?.id }])
  expect(reconciledText(result)).toBe('2 added, 0 merged into existing tasks, 0 already tracked, 1 dependencies set')
})

test('a new task can wait for a tracked task and for an open question', async () => {
  const reply = '{"items":[{"index":0,"verdict":"new","blockedBy":["a","q1","nope"]}]}'
  const { port } = memoryPort({
    store: { 'checklist:s1': [task('a', 'Provision the database')], questions: [asked('q1', 'Which engine should the database use?')] },
    complete: answering(reply).complete,
  })
  const result = await reconcileTasks(port, [found('Run the schema migration')])

  expect(result.linked).toBe(2)
  expect((await port.checklist.all())[1]?.blockedBy).toEqual([{ kind: 'task', id: 'a' }, { kind: 'question', id: 'q1' }])
})

test('a loop between two candidates is refused', async () => {
  const reply = '{"items":[{"index":0,"verdict":"new","blockedBy":["#1"]},{"index":1,"verdict":"new","blockedBy":["#0"]}]}'
  const { port } = memoryPort({ complete: answering(reply).complete })
  const result = await reconcileTasks(port, [found('Write the migration script'), found('Run the migration against staging')])
  const list = await port.checklist.all()

  expect(result.linked).toBe(1)
  expect(list[0]?.blockedBy).toEqual([{ kind: 'task', id: list[1]?.id }])
  expect(list[1]?.blockedBy).toBeUndefined()
})

test('without a model, or with the heuristic judge, the new tasks are simply added', async () => {
  const silent = memoryPort({ store: { 'checklist:s1': [task('a', 'Deploy the staging stack')] } })
  const model = answering('{"items":[{"index":0,"verdict":"duplicate","of":"a"}]}')
  const heuristic = memoryPort({ store: { 'checklist:s1': [task('a', 'Deploy the staging stack')] }, complete: model.complete })

  expect(await reconcileTasks(silent.port, [found('Ship the staging environment')])).toMatchObject({ added: 1, skipped: 0 })
  expect(await reconcileTasks(heuristic.port, [found('Ship the staging environment')], { judge: 'heuristic' })).toMatchObject({ added: 1, skipped: 0 })
  expect(model.calls).toHaveLength(0)
})

test('a lone task with nothing to compare makes no model call', async () => {
  const model = answering('{"items":[]}')
  const { port } = memoryPort({ complete: model.complete })

  expect(await reconcileTasks(port, [found('Write the migration script')])).toMatchObject({ added: 1 })
  expect(model.calls).toHaveLength(0)
})

test('a new task takes the candidate priority, else the model one, and the list ends up sorted', async () => {
  const model = answering('{"items":[{"index":0,"verdict":"new","priority":"low"},{"index":1,"verdict":"new","priority":"low"},{"index":2,"verdict":"new","priority":"urgent"}]}')
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a', 'Deploy the staging stack')] }, complete: model.complete })

  expect(buildReconcilePrompt([], [], [found('X')])).toContain('"priority"')

  await reconcileTasks(port, [found('Write the docs'), { ...found('Fix the outage'), priority: 'high' as const }, found('Rotate the keys')])

  expect((await port.checklist.all()).map(one => [one.text, one.priority])).toEqual([
    ['Fix the outage', 'high'],
    ['Deploy the staging stack', undefined],
    ['Rotate the keys', undefined],
    ['Write the docs', 'low'],
  ])
})

test('a full checklist stops adding instead of dropping tasks, and says how many did not fit', async () => {
  const full = Array.from({ length: 199 }, (_, index) => task(`t${index}`, `Unrelated chore number ${index}`))
  const { port } = memoryPort({ store: { 'checklist:s1': full } })
  const result = await reconcileTasks(port, [found('Alpha deployment'), found('Bravo rollout'), found('Charlie audit')], { judge: 'heuristic' })

  expect(result).toMatchObject({ added: 1, capped: 2 })
  expect(await port.checklist.all()).toHaveLength(200)
  expect((await port.checklist.all()).slice(0, 199).map(one => one.id)).toEqual(full.map(one => one.id))
  expect(reconciledText(result)).toContain('2 not added')
})

test('work a finished task covered is new again, and a verdict naming a finished task adds it', async () => {
  const reply = '{"items":[{"index":0,"verdict":"duplicate","of":"a"}]}'
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a', 'Run the test suite', 'done')] }, complete: answering(reply).complete })
  const result = await reconcileTasks(port, [found('Run the test suite'), found('Ship the staging environment')])

  expect(result).toMatchObject({ added: 2, merged: 0 })
  expect((await port.checklist.all()).filter(one => one.status === 'todo')).toHaveLength(2)
})

test('a blocker on a finished task is not linked or counted', async () => {
  const reply = '{"items":[{"index":0,"verdict":"new","blockedBy":["a"]}]}'
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a', 'Provision the database', 'done')] }, complete: answering(reply).complete })
  const result = await reconcileTasks(port, [found('Run the schema migration')])

  expect(result.linked).toBe(0)
  expect((await port.checklist.all())[1]?.blockedBy).toBeUndefined()
})

test('descriptions that would overflow are not counted as merged', async () => {
  const reply = '{"items":[{"index":0,"verdict":"complements","of":"a","detail":"more and more"}]}'
  const { port } = memoryPort({ store: { 'checklist:s1': [{ ...task('a', 'Deploy the staging stack'), detail: 'x'.repeat(1995) }] }, complete: answering(reply).complete })
  const result = await reconcileTasks(port, [found('Add rollout verification')])

  expect(result).toMatchObject({ merged: 0, skipped: 1 })
  expect(result.notes[0]).toContain('description is full')
})

test('genuinely different tasks are not dropped by the word match', async () => {
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a', 'Migrate users table to postgres')] } })
  const result = await reconcileTasks(port, [found('Migrate orders table to postgres')], { judge: 'heuristic' })

  expect(result).toMatchObject({ added: 1, skipped: 0 })
})
