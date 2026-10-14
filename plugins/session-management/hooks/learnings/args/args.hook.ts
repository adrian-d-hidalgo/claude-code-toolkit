import type { LearningKind } from '../../../types'
import type { ScanMode } from '../../checklist/args/args.hook'
import { isHelp } from '../../shared/help/help.hook'
import { KINDS } from '../kinds/kinds.hook'

export type LearningsCommand =
  | { kind: 'open' }
  | { kind: 'accept'; position: number }
  | { kind: 'acceptAll' }
  | { kind: 'reject'; position: number; reason: string }
  | { kind: 'comment'; position: number; text: string }
  | { kind: 'reopen'; position: number }
  | { kind: 'edit'; position: number; field: 'text' | 'why' | 'how'; text: string }
  | { kind: 'kind'; position: number; value: LearningKind }
  | { kind: 'remove'; position: number }
  | { kind: 'rules' }
  | { kind: 'doctor' }
  | { kind: 'fix' }
  | { kind: 'undo' }
  | { kind: 'clear'; isAll: boolean }
  | { kind: 'scan'; mode: ScanMode }
  | { kind: 'rebuild' }
  | { kind: 'list' }
  | { kind: 'help' }
  | { kind: 'invalid'; reason: string }

const NUMBERED = ['accept', 'reject', 'comment', 'reopen', 'edit', 'kind', 'rm']
const POSITION = /^\d+$/
const FIELDS = ['text', 'why', 'how'] as const

// `/learnings` arguments as typed: positions are the 1-based numbers the pane shows.
export const parseLearningsArgs = (args: string): LearningsCommand => {
  const [typed = '', first = '', ...rest] = args.trim().split(/\s+/)
  const verb = typed.toLowerCase()
  // The text after the verb, the number and the field keeps its spacing; only the ends are trimmed.
  const afterNumber = args.trim().replace(/^\S+\s*\S*\s*/, '')

  if (verb === '') {
    return { kind: 'open' }
  }

  if (isHelp(verb)) {
    return { kind: 'help' }
  }

  if (verb === 'clear') {
    return first === '' || first.toLowerCase() === 'all' ? { kind: 'clear', isAll: first.toLowerCase() === 'all' } : { kind: 'invalid', reason: 'clear takes nothing, or all' }
  }

  if (verb === 'scan') {
    const mode = first.toLowerCase()

    return mode === '' || mode === 'quick' || mode === 'fast' ? { kind: 'scan', mode: mode === '' ? 'deep' : mode } : { kind: 'invalid', reason: 'scan takes nothing, quick or fast' }
  }

  if (['list', 'rules', 'doctor', 'fix', 'undo', 'rebuild'].includes(verb)) {
    return { kind: verb as 'list' | 'rules' | 'doctor' | 'fix' | 'undo' | 'rebuild' }
  }

  if (!NUMBERED.includes(verb)) {
    return { kind: 'invalid', reason: `unknown subcommand ${typed}` }
  }

  if (verb === 'accept' && first.toLowerCase() === 'all') {
    return rest.length === 0 ? { kind: 'acceptAll' } : { kind: 'invalid', reason: 'accept all takes nothing more' }
  }

  if (!POSITION.test(first)) {
    return { kind: 'invalid', reason: `${verb} needs the learning number` }
  }

  const position = Number(first)

  if (verb === 'accept' || verb === 'reopen') {
    return { kind: verb, position }
  }

  if (verb === 'reject') {
    return { kind: 'reject', position, reason: afterNumber }
  }

  if (verb === 'comment') {
    return afterNumber === '' ? { kind: 'invalid', reason: 'comment needs the text for Claude' } : { kind: 'comment', position, text: afterNumber }
  }

  if (verb === 'rm') {
    return { kind: 'remove', position }
  }

  if (verb === 'kind') {
    const value = KINDS.find(one => one === (rest[0] ?? '').toLowerCase())

    return value ? { kind: 'kind', position, value } : { kind: 'invalid', reason: `kind needs ${KINDS.join(', ')}` }
  }

  const field = FIELDS.find(one => one === (rest[0] ?? '').toLowerCase())
  const text = afterNumber.replace(/^\S+\s*/, '')

  if (!field) {
    return { kind: 'invalid', reason: 'edit needs text, why or how and the new text' }
  }

  if (text === '' && field !== 'how') {
    return { kind: 'invalid', reason: `edit ${field} needs a text` }
  }

  return { kind: 'edit', position, field, text }
}
