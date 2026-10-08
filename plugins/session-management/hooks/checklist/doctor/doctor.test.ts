import { expect, test } from 'claude-code/testing'

import type { ChecklistItem } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { diagnoseChecklist, runChecklistDoctor } from './doctor.hook'

const task = (id: string, text: string, status: ChecklistItem['status'] = 'todo', detail?: string): ChecklistItem => ({
  id,
  text,
  status,
  ...(detail ? { detail } : {}),
})

test('a healthy checklist reports nothing and stays as is', () => {
  const list = [task('a', 'Write the tests'), task('b', 'Ship it', 'done')]
  const result = diagnoseChecklist(list, false)

  expect(result.lines).toEqual([])
  expect(result.fixed).toEqual(list)
})

test('checklist repairs: ids, statuses, long titles, duplicates, stuck tasks', () => {
  const long = 'Replace the in-memory rate limiter with the Valkey-backed one and update every caller that imports the old module'
  const list = [
    task('a', 'Write the tests'),
    task('a', 'Deploy the staging stack'),
    { id: 'c', text: 'Review the pull request', status: 'weird' as ChecklistItem['status'] },
    task('d', long),
    task('e', 'Write the tests', 'todo', 'only the api package'),
    task('f', 'Fix the lint errors', 'doing'),
    task('g', '   '),
  ]
  const { lines, fixed } = diagnoseChecklist(list, false)

  expect(lines).toHaveLength(6)
  expect(new Set(fixed.map(one => one.id)).size).toBe(fixed.length)
  expect(fixed.find(one => one.text === 'Write the tests')?.detail).toBe('only the api package')
  expect(fixed.find(one => one.id === 'c')?.status).toBe('todo')
  expect(fixed.find(one => one.detail === long)?.text.endsWith('…')).toBe(true)
  expect(fixed.find(one => one.text === 'Fix the lint errors')?.status).toBe('todo')
  expect(fixed.some(one => one.text.trim() === '')).toBe(false)
})

test('a task in progress is left alone while a turn is running', () => {
  expect(diagnoseChecklist([task('a', 'Fix the lint errors', 'doing')], true).fixed[0]?.status).toBe('doing')
})

test('finished and cancelled tasks are history: never reworded, never folded, unless asked', () => {
  const long = 'Replace the in-memory rate limiter with the Valkey-backed one and update every caller that imports the old module'
  const list = [task('a', long, 'done'), task('b', 'Write the tests', 'done'), task('c', 'Write the tests'), task('d', 'Fix the lint errors', 'cancelled')]
  const { lines, fixed } = diagnoseChecklist(list, false)

  expect(lines).toEqual([])
  expect(fixed).toEqual(list)

  const withHistory = diagnoseChecklist(list, false, true)

  expect(withHistory.lines.length).toBeGreaterThan(0)
  expect(withHistory.fixed.find(one => one.id === 'a')?.detail).toBe(long)
})

test('doctor reports, fix repairs and keeps a copy for undo', async () => {
  const long = 'Replace the in-memory rate limiter with the Valkey-backed one and update every caller that imports the old module'
  const { port, data } = memoryPort({ store: { 'checklist:s1': [task('a', long), task('b', 'Fix the lint errors', 'doing')] } })

  expect(await runChecklistDoctor(port, false, false)).toContain('2 tasks: 1 doing, 1 todo')
  expect((await port.checklist.all())[0]?.text).toBe(long)

  const report = await runChecklistDoctor(port, true, false)

  expect(report).toContain('Fixed:')
  expect((await port.checklist.all())[1]?.status).toBe('todo')
  expect((await port.checklist.all())[0]?.detail).toBe(long)
  expect((data['backup:checklist:s1'] as ChecklistItem[])[0]?.text).toBe(long)
})

test('the older folder checklist is reported, and fix brings it into this session once', async () => {
  const { port, data } = memoryPort({ root: '/work/app', store: { 'checklist:/work/app': [task('old', 'An older shared task')], 'checklist:s1': [task('a', 'Write the tests')] } })

  expect(await runChecklistDoctor(port, false, false)).toContain("1 task in this folder's older shared checklist (`fix` brings them into this session)")
  expect(await port.checklist.all()).toHaveLength(1)

  await runChecklistDoctor(port, true, false)

  expect((await port.checklist.all()).map(one => one.id)).toEqual(['a', 'old'])
  expect('checklist:/work/app' in data).toBe(false)
  expect(await runChecklistDoctor(port, false, false)).toContain('Everything checks out.')
})

test('stale blockers are dropped: a missing task, an unknown question, and the later blocker of a loop', () => {
  const blocked = (id: string, text: string, blockedBy: NonNullable<ChecklistItem['blockedBy']>): ChecklistItem => ({ ...task(id, text), blockedBy })
  const list = [
    blocked('a', 'Write the migration', [{ kind: 'task', id: 'gone' }, { kind: 'question', id: 'q1' }, { kind: 'question', id: 'q9' }]),
    blocked('b', 'Deploy the staging stack', [{ kind: 'task', id: 'c' }]),
    blocked('c', 'Fix the lint errors', [{ kind: 'task', id: 'b' }]),
  ]
  const { lines, fixed } = diagnoseChecklist(list, false, false, new Set(['q1']))

  expect(lines).toEqual(['2 stale blockers (dropped)', '1 blocker in a loop or repeated (dropped)'])
  expect(fixed.find(one => one.id === 'a')?.blockedBy).toEqual([{ kind: 'question', id: 'q1' }])
  expect(fixed.find(one => one.id === 'b')?.blockedBy).toEqual([{ kind: 'task', id: 'c' }])
  expect(fixed.find(one => one.id === 'c')?.blockedBy).toBeUndefined()
})

test('without the known question ids, question blockers are left alone', () => {
  const list = [{ ...task('a', 'Run the migration'), blockedBy: [{ kind: 'question' as const, id: 'q9' }] }]

  expect(diagnoseChecklist(list, false)).toMatchObject({ lines: [], fixed: list })
})

test('doctor reads the question store and fix drops the blockers that point nowhere', async () => {
  const question = { id: 'q1', texts: ['Which database?'], session: 'other', project: '/p', source: 'text', at: 1, asks: 1, isOpen: false }
  const list = [{ ...task('a', 'Run the migration'), blockedBy: [{ kind: 'question' as const, id: 'q1' }, { kind: 'question' as const, id: 'q2' }] }]
  const { port } = memoryPort({ store: { 'checklist:s1': list, questions: [question] } })

  expect(await runChecklistDoctor(port, false, false)).toContain('1 stale blocker (dropped)')

  await runChecklistDoctor(port, true, false)

  expect((await port.checklist.all())[0]?.blockedBy).toEqual([{ kind: 'question', id: 'q1' }])
})

test('an unknown priority is dropped and the repaired list is sorted by priority', () => {
  const list = [
    { ...task('a', 'Later'), priority: 'low' as const },
    { ...task('b', 'Odd'), priority: 'urgent' as unknown as 'high' },
    { ...task('c', 'Urgent'), priority: 'high' as const },
  ]
  const result = diagnoseChecklist(list, false)

  expect(result.lines).toEqual(['1 task with an unknown priority (set to normal)'])
  expect(result.fixed).toEqual([{ ...task('c', 'Urgent'), priority: 'high' }, task('b', 'Odd'), { ...task('a', 'Later'), priority: 'low' }])
})

test('fix on a list that changes nothing, or an empty one, keeps the copy undo restores', async () => {
  const kept = [task('z', 'An earlier task')]
  const { port, data } = memoryPort({ store: { 'backup:checklist:s1': kept, 'checklist:s1': [task('a', 'Write the tests')] } })

  await runChecklistDoctor(port, true, false)
  expect(data['backup:checklist:s1']).toEqual(kept)

  await port.checklist.write(() => [])
  await runChecklistDoctor(port, true, false)
  expect(data['backup:checklist:s1']).toEqual(kept)
})

test('folding a duplicate keeps what waited for it and what it waited for', () => {
  const list: ChecklistItem[] = [
    task('a', 'Write the tests'),
    { ...task('b', 'Write the tests'), blockedBy: [{ kind: 'question', id: 'q1' }, { kind: 'task', id: 'a' }] },
    { ...task('c', 'Deploy the staging stack'), blockedBy: [{ kind: 'task', id: 'b' }] },
  ]
  const { fixed } = diagnoseChecklist(list, false, false, new Set(['q1']))

  expect(fixed.map(one => one.id)).toEqual(['a', 'c'])
  expect(fixed.find(one => one.id === 'a')?.blockedBy).toEqual([{ kind: 'question', id: 'q1' }])
  expect(fixed.find(one => one.id === 'c')?.blockedBy).toEqual([{ kind: 'task', id: 'a' }])
})

test('tasks that differ in one meaningful word are not duplicates', () => {
  const list = [task('a', 'Migrate users table to postgres'), task('b', 'Migrate orders table to postgres'), task('c', 'Add tests for auth login'), task('d', 'Add tests for auth logout')]

  expect(diagnoseChecklist(list, false)).toMatchObject({ lines: [], fixed: list })
})

const clean = ['✓ ids and statuses are valid', '✓ no long titles, duplicates or stuck tasks', '✓ dependencies are fine (none stale, none in a loop)', '✓ priorities are valid']

test('a clean checklist reports every check and the tasks by status', async () => {
  const list = [task('a', 'Fix the lint errors', 'doing'), task('b', 'Write the tests'), task('c', 'Deploy the staging stack'), task('d', 'Ship it', 'done'), task('e', 'Drop the beta flag', 'cancelled')]
  const { port } = memoryPort({ turn: 'running', store: { 'checklist:s1': list } })

  expect(await runChecklistDoctor(port, false, false)).toBe(['Checklist doctor · this session', '5 tasks: 1 doing, 2 todo, 1 done, 1 cancelled', ...clean, 'Everything checks out.'].join('\n'))
})

test('a checklist with a duplicate and a stuck task marks those checks and offers fix', async () => {
  const list = [task('a', 'Write the tests'), task('b', 'Write the tests'), task('c', 'Fix the lint errors', 'doing')]
  const { port } = memoryPort({ store: { 'checklist:s1': list } })

  expect(await runChecklistDoctor(port, false, false)).toBe(
    [
      'Checklist doctor · this session',
      '3 tasks: 1 doing, 2 todo',
      '✓ ids and statuses are valid',
      '✗ 1 duplicate task (folded into the first)',
      '✗ 1 task in progress with no turn running (back to todo)',
      '✓ dependencies are fine (none stale, none in a loop)',
      '✓ priorities are valid',
      'Run `/checklist fix` to repair what can be repaired.',
    ].join('\n'),
  )
})

test('the history variant says so in the header', async () => {
  const { port } = memoryPort({ store: { 'checklist:s1': [task('a', 'Ship it', 'done')] } })

  expect((await runChecklistDoctor(port, false, true)).split('\n').slice(0, 2)).toEqual(['Checklist doctor · this session · with finished and cancelled tasks (--history)', '1 task: 1 done'])
})
