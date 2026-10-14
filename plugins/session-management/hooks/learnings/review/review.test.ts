import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { acceptAll, acceptLearning, acceptedIds, approvalAt, closeApproval, rejectLearning, removeLearning, reopenLearning } from './review.hook'

const one = (id: string, extra: Partial<Learning> = {}): Learning => ({ id, kind: 'feedback', text: `Always do ${id} before a release`, why: `the user asked on 2026-10-13 (${id})`, status: 'proposed', project: '/p', session: 's1', at: 1, seen: 1, ...extra })

const memoryFile = (text: string) => `---\nmetadata:\n  type: feedback\n---\n\n${text}\n\n**Why:** seen on 2026-10-01\n`

test('accepting asks Claude to save it, opens the guard for that write and leaves the queue; the memory folder is not written', async () => {
  const { port, files, said } = memoryPort({ store: { 'learnings:s1': [one('a'), one('b', { why: '' })] } })

  expect(await acceptLearning(port, 'a')).toBe('Accepted: Always do a before a release (Claude saves it to its memory)')
  expect(said[0]).toContain('Save it following your own memory instructions')
  expect(said[0]).toContain('1. Save as a new memory:\n   feedback: Always do a before a release')
  expect(files).toEqual({})
  expect((await port.learnings.all()).map(item => item.id)).toEqual(['b'])
  expect(await approvalAt(port)).not.toBeNull()
  expect(await acceptedIds(port)).toEqual(new Set(['a']))
  expect(await acceptLearning(port, 'b')).toBe('Not accepted, it breaks the rules: no why. Edit it first.')

  await closeApproval(port)
  expect(await approvalAt(port)).toBeNull()
})

test('an update names the memory file to change; a contradiction names the one to retire', async () => {
  const { port, said } = memoryPort({
    files: { 'feedback_old.md': memoryFile('Always do old before a release') },
    store: { 'learnings:s1': [one('u', { replaces: ['file:feedback_old.md'] }), one('c', { replaces: ['file:feedback_old.md'], conflicts: ['file:feedback_old.md'] })] },
  })

  await acceptLearning(port, 'u')
  await acceptLearning(port, 'c')

  expect(said[0]).toContain('1. Update feedback_old.md so it says:')
  expect(said[1]).toContain('1. Retire feedback_old.md (it says the opposite) and save instead:')
})

test('a proposal the accepted one contradicts in the queue stays as a refusal; one it updates goes', async () => {
  const { port } = memoryPort({ store: { 'learnings:s1': [one('x'), one('y'), one('c', { replaces: ['x'], conflicts: ['x'] }), one('u', { replaces: ['y'] })] } })

  await acceptLearning(port, 'c')
  await acceptLearning(port, 'u')

  expect(await port.learnings.all()).toEqual([expect.objectContaining({ id: 'x', status: 'rejected', reason: 'contradicted by: Always do c before a release' })])
})

test('rejecting keeps the reason; reopening and removing undo it both ways', async () => {
  const { port } = memoryPort({ store: { 'learnings:s1': [one('a')] } })

  expect(await rejectLearning(port, 'a', 'not here')).toBe('Rejected: Always do a before a release')
  expect((await port.learnings.all())[0]).toMatchObject({ status: 'rejected', reason: 'not here' })
  expect(await rejectLearning(port, 'a')).toBe('Already rejected.')
  expect(await reopenLearning(port, 'a')).toBe('Reopened: Always do a before a release')
  expect(await reopenLearning(port, 'a')).toBe('Already waiting for review.')
  expect(await removeLearning(port, 'a')).toBe('Removed: Always do a before a release')
  expect(await port.learnings.all()).toEqual([])
})

test('accept all asks Claude to save everything in one message and names what still breaks the rules', async () => {
  const { port, said } = memoryPort({ store: { 'learnings:s1': [one('a'), one('b', { why: '' }), one('c'), one('r', { status: 'rejected' })] } })
  const done = await acceptAll(port)

  expect(done.done).toBe(2)
  expect(done.refused).toEqual(['Always do b before a release: no why'])
  expect(said).toHaveLength(1)
  expect(said[0]).toContain('I approved these learnings for your memory')
  expect(said[0]).toContain('2. Save as a new memory:\n   feedback: Always do c before a release')
  expect((await port.learnings.all()).map(item => item.id)).toEqual(['b', 'r'])
})
