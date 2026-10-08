import { expect, test } from 'claude-code/testing'

import { scanMessages, dialogChoices } from './scan.hook'
import type { ScanMessage } from '../../shared/transcript/transcript.hook'

const ask = (text: string): ScanMessage => ({ role: 'assistant', text, toolUses: [] })
const reply = (text: string): ScanMessage => ({ role: 'user', text, toolUses: [] })

test('keeps only prose questions nobody replied to', () => {
  const messages = [ask('Do you want A?'), reply('yes'), ask('And B too?')]

  expect(scanMessages(messages, false)).toEqual([{ texts: ['And B too?'], source: 'text' }])
  expect(scanMessages(messages, true).map(one => one.texts)).toEqual([['Do you want A?'], ['And B too?']])
})

test('a dialog question is open unless its result answered it', () => {
  const dialog = (answers: Record<string, string>): ScanMessage => ({
    role: 'assistant',
    text: '',
    toolUses: [
      {
        tool: 'AskUserQuestion',
        input: { questions: [{ question: 'Which name?' }, { question: 'Which color?' }] },
        result: { answers },
      },
    ],
  })

  expect(scanMessages([dialog({ 'Which name?': 'a' })], false)).toEqual([{ texts: ['Which color?'], source: 'dialog' }])
  expect(scanMessages([dialog({})], false)).toEqual([{ texts: ['Which name?', 'Which color?'], source: 'dialog' }])
})

test('tool results carrying no text do not count as a reply', () => {
  expect(scanMessages([ask('Ready to continue?'), reply('')], false)).toHaveLength(1)
})

test('several questions of one message stay one group', () => {
  const [group] = scanMessages([ask('What now? Which one do you prefer? Keep both?')], false)

  expect(scanMessages([ask('What now? Which one do you prefer? Keep both?')], false)).toHaveLength(1)
  expect(group?.texts).toHaveLength(3)
})

test('a dialog keeps its options and whether several can be picked', () => {
  expect(
    dialogChoices({
      questions: [
        { question: 'Which environment?', options: [{ label: 'staging' }, { label: 'production' }] },
        { question: 'Which checks?', multiSelect: true, options: ['lint', 'typecheck'] },
        { question: 'Anything else to add?' },
      ],
    }),
  ).toEqual({
    'Which environment?': { kind: 'single', options: ['staging', 'production'] },
    'Which checks?': { kind: 'multi', options: ['lint', 'typecheck'] },
  })
})
