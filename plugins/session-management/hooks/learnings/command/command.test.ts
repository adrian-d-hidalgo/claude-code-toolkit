import { expect, test } from 'claude-code/testing'

import type { Learning } from '../../../types'
import { memoryPort } from '../../shared/port/port.hook'
import { runLearningsCommand } from './command.hook'

const one = (id: string, extra: Partial<Learning> = {}): Learning => ({ id, kind: 'feedback', text: `Use ${id}${id}${id} tooling for ${id}${id}${id} builds`, why: `asked on 2026-10-13 (${id})`, status: 'proposed', project: '/p', session: 's1', at: 1, seen: 1, ...extra })

test('the commands act on the learning by its number in the pane\'s order; accepting asks Claude and writes nothing', async () => {
  const { port, files, said } = memoryPort({ store: { 'learnings:s1': [one('r', { status: 'rejected' }), one('a'), one('b')] } })
  const options = { judge: 'heuristic' }

  expect((await runLearningsCommand(port, '', options)).opens).toBe(true)
  expect((await runLearningsCommand(port, 'edit 1 why a better reason', options)).text).toBe('Learning updated.')
  expect((await runLearningsCommand(port, 'kind 1 project', options)).text).toBe('Learning updated.')
  expect((await port.learnings.all()).find(item => item.id === 'a')).toMatchObject({ kind: 'project', why: 'a better reason' })
  expect((await runLearningsCommand(port, 'accept 1', options)).text).toBe('Accepted: Use aaa tooling for aaa builds (Claude saves it to its memory)')
  expect(said[0]).toContain('project: Use aaa tooling for aaa builds\n   Why: a better reason')
  expect(files).toEqual({})
  expect((await runLearningsCommand(port, 'reject 1 not here', options)).text).toBe('Rejected: Use bbb tooling for bbb builds')
  expect((await port.learnings.all()).find(item => item.id === 'b')?.reason).toBe('not here')
  expect((await runLearningsCommand(port, 'reopen 2', options)).text).toBe('Reopened: Use bbb tooling for bbb builds')
  expect((await runLearningsCommand(port, 'rm 9', options)).text).toBe('No learning 9.')
  expect((await runLearningsCommand(port, 'rules', options)).text).toContain('One fact per learning')
  expect((await runLearningsCommand(port, 'nope', options)).text).toContain('unknown subcommand nope')
  expect((await runLearningsCommand(port, 'import', options)).text).toContain('unknown subcommand import')
  expect((await runLearningsCommand(port, 'undo', options)).text).toBe('Nothing to restore.')
})

test('list shows only what waits; clear empties the queue without touching memory, and undo brings it back', async () => {
  const { port, files } = memoryPort({ store: { 'learnings:s1': [one('a'), one('r', { status: 'rejected' }), one('f')] }, files: { 'feedback_k.md': 'kept' } })

  expect((await runLearningsCommand(port, 'list', {})).text).toBe(
    [
      'Waiting for review: 2',
      '',
      '1. ? Use aaa tooling for aaa builds (feedback)',
      '   why: asked on 2026-10-13 (a)',
      '2. ? Use fff tooling for fff builds (feedback)',
      '   why: asked on 2026-10-13 (f)',
      '',
      'Answer with `/learnings accept <n>`, `reject <n> [reason]` or `accept all`.',
    ].join('\n'),
  )
  expect((await runLearningsCommand(port, 'clear', {})).text).toBe('Review queue emptied (2); memory is untouched. `/learnings undo` brings them back.')
  expect((await port.learnings.all()).map(item => item.id)).toEqual(['r'])
  expect(files['feedback_k.md']).toBe('kept')
  expect((await runLearningsCommand(port, 'clear', {})).text).toBe('Nothing waits for review.')
  expect((await runLearningsCommand(port, 'list', {})).text).toBe('Nothing waits for review.')
  expect((await runLearningsCommand(port, 'undo', {})).text).toBe('Restored what the last fix, clear or rebuild changed: the queue (3).')
  expect((await runLearningsCommand(port, 'clear all', {})).text).toBe('Review queue and refusals emptied (3); memory is untouched. `/learnings undo` brings them back.')
  expect(await port.learnings.all()).toEqual([])
  expect((await runLearningsCommand(port, 'clear some', {})).text).toContain('clear takes nothing, or all')
})

test('scan needs the model; with it, it reads the conversation and proposes what it found', async () => {
  const messages = [
    { role: 'user' as const, text: 'nunca uses voseo', toolUses: [] },
    { role: 'assistant' as const, text: 'Entendido', toolUses: [] },
  ]
  const { port } = memoryPort({ messages, complete: prompt => (prompt.includes('Conversation:') ? JSON.stringify({ learnings: [{ kind: 'feedback', text: 'Never use voseo in Spanish replies', why: 'the user said so on 2026-10-13' }] }) : null) })

  expect((await runLearningsCommand(port, 'scan fast', {})).text).toContain('A scan needs the model')
  expect((await runLearningsCommand(port, 'scan quick', {})).text).toContain('Scan (quick): 1 proposed')
  expect((await port.learnings.all())[0]).toMatchObject({ status: 'proposed', text: 'Never use voseo in Spanish replies' })
})

test('comment sends the learning and the comment to Claude, and the learning keeps waiting', async () => {
  const { port, said } = memoryPort({ store: { 'learnings:s1': [one('a')] } })

  expect((await runLearningsCommand(port, 'comment 1', {})).text).toContain('comment needs the text for Claude')
  expect((await runLearningsCommand(port, 'comment 1 only for the release builds', {})).text).toBe('Comment sent to Claude; the learning keeps waiting for your answer.')
  expect(said[0]).toContain('My comment on learning #1 [a]')
  expect(said[0]).toContain('Comment: only for the release builds')
  expect(said[0]).toContain('action revise, id a')
  expect((await port.learnings.all())[0]?.status).toBe('proposed')
})
