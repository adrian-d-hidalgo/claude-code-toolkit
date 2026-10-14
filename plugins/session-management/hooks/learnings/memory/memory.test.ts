import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { fileOfId, indexHeadings, indexedFiles, knownOf, memoryDirOf, memoryIdOf, memoryLearnings, memoryNameOf, parseMemoryFile } from './memory.hook'

const learning: Learning = { id: 'a', kind: 'feedback', text: 'Never run the evals without an explicit request', why: 'On 2026-05-18 a billed eval ran after "do they pass?"', how: 'Offer the command; wait for a yes', status: 'proposed', project: '/p', session: 's1', at: 1, seen: 1 }

test('the memory folder is the config dir, the project path with dashes, memory', () => {
  expect(memoryDirOf('/Users/me', undefined, '/Users/me/Projects/app')).toBe('/Users/me/.claude/projects/-Users-me-Projects-app/memory')
  expect(memoryDirOf('/Users/me', '/Users/me/.claude-personal/', '/Users/me/.claude')).toBe('/Users/me/.claude-personal/projects/-Users-me--claude/memory')
  expect(memoryNameOf('/m/feedback_x.md', '/m')).toBe('feedback_x.md')
  expect(memoryNameOf('/m2/feedback_x.md', '/m')).toBeNull()
  expect(memoryNameOf('/m', '/m')).toBeNull()
})

test('the parser reads the older hand-written format too, and refuses an empty file', () => {
  const older = ['---', 'name: Never run tests without a request', 'description: Hard rule about billed runs', 'type: feedback', 'originSessionId: 123', '---', '', '**Hard rule, no exceptions**: do NOT run billed suites unless asked.', '', 'Specifically forbidden:', '', '- pytest', '', '**Why** — incident on 2026-05-18: the user asked "do they pass?".', '', '**How to apply**:', '', '1. Answer from evidence.'].join('\n')
  const parsed = parseMemoryFile(older)

  expect(parsed?.kind).toBe('feedback')
  expect(parsed?.text).toBe('Hard rule, no exceptions: do NOT run billed suites unless asked.')
  expect(parseMemoryFile('---\ndescription: Retry nothing, ever\n---\n\nTwo rules:\n\n- one\n')?.text).toBe('Retry nothing, ever')
  expect(parsed?.why).toContain('incident on 2026-05-18')
  expect(parsed?.how).toBe('1. Answer from evidence.')
  expect(parseMemoryFile(`---\ntype: user\n---\n\n${'x'.repeat(260)}\n`)?.text).toHaveLength(260)
  expect(parseMemoryFile('A.\n\n**Why:** one\n\n- with a list\n\n**How to apply:**\n\n1. first\n2. second\n')).toEqual({ kind: 'project', text: 'A.', why: 'one\n\n- with a list', how: '1. first\n2. second' })
  expect(parseMemoryFile('---\nname: x\n---\n')).toBeNull()
  expect(parseMemoryFile('Plain fact with no frontmatter')).toEqual({ kind: 'project', text: 'Plain fact with no frontmatter', why: '' })
})

test('the index lists its files and its headings', () => {
  const index = '# Memory Index\n\n## Style\n- [A](a.md) — x\n\n## Testing\n- [B](b.md) — y\n'

  expect(indexedFiles(index)).toEqual(['a.md', 'b.md'])
  expect(indexHeadings(index)).toEqual(['Style', 'Testing'])
})

test('what is in memory is read from the files as it is, never stored; the index is not a learning', async () => {
  const file = '---\nmetadata:\n  type: feedback\n---\n\nNever run the evals without an explicit request\n\n**Why:** a billed run on 2026-05-18\n'
  const { port, files } = memoryPort({ files: { 'feedback_evals.md': file, 'MEMORY.md': '- [Evals](feedback_evals.md) — x\n' }, store: { 'learnings:s1': [{ ...learning, id: 'p1' }] } })
  const memory = await memoryLearnings(port)

  expect(memory).toEqual([{ id: 'file:feedback_evals.md', kind: 'feedback', text: 'Never run the evals without an explicit request', why: 'a billed run on 2026-05-18', status: 'accepted', project: '/p', session: '', at: 0, seen: 1, file: 'feedback_evals.md' }])
  expect((await knownOf(port)).map(one => one.id)).toEqual(['p1', 'file:feedback_evals.md'])
  expect(fileOfId(memoryIdOf('x.md'))).toBe('x.md')
  expect(fileOfId('p1')).toBeNull()
  expect(await port.learnings.all()).toHaveLength(1)
  expect(Object.keys(files).sort()).toEqual(['MEMORY.md', 'feedback_evals.md'])
})
