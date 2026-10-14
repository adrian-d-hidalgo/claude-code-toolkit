import { expect, test } from 'claude-code/testing'

import { memoryPort } from '../../shared/port/port.hook'
import { closeApproval, openApproval } from '../review/review.hook'
import { guardMemoryWrite, guardModeOf, writeOf } from './guard.hook'

const file = '---\nmetadata:\n  type: feedback\n---\n\nRun the linters before committing\n\n**Why:** a hook failed on 2026-10-13\n'

test('the tools\' inputs become one write each; other tools and other files are not watched', () => {
  expect(writeOf('Write', { file_path: '/m/a.md', content: 'hello' })).toEqual({ tool: 'Write', path: '/m/a.md', text: 'hello' })
  expect(writeOf('Edit', { file_path: '/m/a.md', old_string: 'a', new_string: 'b' })).toEqual({ tool: 'Edit', path: '/m/a.md', text: 'b' })
  expect(writeOf('MultiEdit', { file_path: '/m/a.md', edits: [{ new_string: 'b' }, { new_string: 'c' }] })).toEqual({ tool: 'MultiEdit', path: '/m/a.md', text: 'b\nc' })
  expect(writeOf('Bash', { command: 'echo' })).toBeNull()
  expect(guardModeOf(undefined)).toBe('guard')
  expect(guardModeOf('observe')).toBe('observe')
})

test('under guard a memory write the user did not approve is refused and becomes a proposal; the index too', async () => {
  const { port, files } = memoryPort()

  expect(await guardMemoryWrite(port, { tool: 'Write', path: '/src/a.ts', text: 'code' }, 'guard')).toBeNull()

  const refused = await guardMemoryWrite(port, { tool: 'Write', path: '/m/feedback_linters.md', text: file }, 'guard', { judge: 'heuristic' })

  expect(refused?.deny).toContain('Not written: proposed as learning [id1] instead')
  expect(files['feedback_linters.md']).toBeUndefined()
  expect((await port.learnings.all())[0]).toMatchObject({ status: 'proposed', kind: 'feedback', text: 'Run the linters before committing', why: 'a hook failed on 2026-10-13' })
  expect((await guardMemoryWrite(port, { tool: 'Edit', path: '/m/MEMORY.md', text: '- [x](x.md)' }, 'guard'))?.deny).toContain('MEMORY.md changes only with what the user approved')
})

test('while an approval is open (an accepted learning, a fix) Claude writes its memory freely', async () => {
  const { port } = memoryPort()

  await openApproval(port)
  expect(await guardMemoryWrite(port, { tool: 'Write', path: '/m/feedback_linters.md', text: file }, 'guard')).toBeNull()
  expect(await guardMemoryWrite(port, { tool: 'Edit', path: '/m/MEMORY.md', text: '- [x](x.md)' }, 'guard')).toBeNull()
  expect(await port.learnings.all()).toEqual([])

  await closeApproval(port)
  expect((await guardMemoryWrite(port, { tool: 'Edit', path: '/m/MEMORY.md', text: '- [x](x.md)' }, 'guard'))?.deny).toBeDefined()
})

test('a write without a why is refused with the ask; what memory already says is refused as known', async () => {
  const { port } = memoryPort({ files: { 'project_api.md': '---\ntype: project\n---\n\nThe API lives in packages/api\n\n**Why:** the monorepo moved on 2026-10-01\n' } })
  const first = await guardMemoryWrite(port, { tool: 'Write', path: '/m/note.md', text: 'The deploys run on Fridays' }, 'guard', { judge: 'heuristic' })

  expect(first?.deny).toContain('"The deploys run on Fridays": no why; fix it and propose it again.')

  const again = await guardMemoryWrite(port, { tool: 'Write', path: '/m/note.md', text: '---\ntype: project\n---\n\nThe API lives in packages/api\n\n**Why:** said again\n' }, 'guard', { judge: 'heuristic' })

  expect(again?.deny).toContain('already in memory (project_api.md)')
  expect(await port.learnings.all()).toHaveLength(0)
})

test('observe and off let every write through', async () => {
  const { port } = memoryPort()

  expect(await guardMemoryWrite(port, { tool: 'Write', path: '/m/feedback_linters.md', text: file }, 'observe')).toBeNull()
  expect(await guardMemoryWrite(port, { tool: 'Write', path: '/m/feedback_linters.md', text: file }, 'off')).toBeNull()
  expect(await port.learnings.all()).toEqual([])
})
