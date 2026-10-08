import type { Priority } from '../../../types'
import { isHelp } from '../../shared/help/help.hook'
import { PRIORITIES } from '../ops/ops.hook'

// deep: the session's own model over the whole conversation; quick: a small model over
// an excerpt; fast: local rules only.
export type ScanMode = 'deep' | 'quick' | 'fast'

export type ChecklistCommand =
  | { kind: 'open' }
  | { kind: 'add'; text: string }
  | { kind: 'edit'; position: number; text: string }
  | { kind: 'detail'; position: number; text: string }
  | { kind: 'status'; position: number; status: 'todo' | 'doing' | 'done' }
  | { kind: 'remove'; position: number }
  | { kind: 'run'; position: number }
  | { kind: 'cancel'; position: number }
  | { kind: 'move'; from: number; to: number }
  | { kind: 'priority'; position: number; priority: Priority }
  | { kind: 'block'; position: number; by: BlockerRef }
  | { kind: 'unblock'; position: number; by: BlockerRef | null }
  | { kind: 'scan'; mode: ScanMode }
  | { kind: 'clear'; isAll: boolean }
  | { kind: 'undo' }
  | { kind: 'help' }
  | { kind: 'doctor'; isHistory: boolean }
  | { kind: 'fix'; isHistory: boolean }
  | { kind: 'rebuild' }
  | { kind: 'invalid'; reason: string }

// A blocker as typed: a task's number, or `q` and the number of an open question in its pane.
export type BlockerRef = { kind: 'task' | 'question'; position: number }

// The verbs that act on a task by its number.
const NUMBERED = ['edit', 'detail', 'mv', 'priority', 'pri', 'block', 'unblock', 'run', 'cancel', 'rm', 'todo', 'doing', 'done']
const POSITION = /^\d+$/
const BLOCKER = /^(q?)(\d+)$/i

const blockerRef = (text: string): BlockerRef | null => {
  const match = BLOCKER.exec(text)

  return match ? { kind: match[1] ? 'question' : 'task', position: Number(match[2]) } : null
}

// `/checklist` arguments as typed: positions are the 1-based numbers the pane shows.
export const parseChecklistArgs = (args: string): ChecklistCommand => {
  const [typed = '', first = '', ...rest] = args.trim().split(/\s+/)
  // The verb and its keyword arguments are not case-sensitive; the text after them is kept as typed.
  const verb = typed.toLowerCase()
  // Newlines and runs of spaces survive (descriptions are multi-line): only the ends are trimmed.
  const text = args.trim().replace(/^\S+\s*\S*\s*/, '')

  if (verb === '') {
    return { kind: 'open' }
  }

  if (isHelp(verb)) {
    return { kind: 'help' }
  }

  if (verb === 'clear') {
    return { kind: 'clear', isAll: first.toLowerCase() === 'all' }
  }

  if (verb === 'doctor' || verb === 'fix') {
    const flags = [first, ...rest]

    return { kind: verb, isHistory: flags.some(flag => flag.toLowerCase() === '--history') }
  }

  if (verb === 'rebuild') {
    return { kind: 'rebuild' }
  }

  if (verb === 'undo') {
    return { kind: 'undo' }
  }

  if (verb === 'scan') {
    return { kind: 'scan', mode: first.toLowerCase() === 'fast' ? 'fast' : first.toLowerCase() === 'quick' ? 'quick' : 'deep' }
  }

  if (verb === 'add') {
    const full = [first, ...rest].join(' ').trim()
    return full === '' ? { kind: 'invalid', reason: 'add needs a text' } : { kind: 'add', text: full }
  }

  // A word that is no verb (a bare number included) is unknown, not a verb missing its number.
  if (!NUMBERED.includes(verb)) {
    return { kind: 'invalid', reason: `unknown subcommand ${typed}` }
  }

  if (!POSITION.test(first)) {
    return { kind: 'invalid', reason: `${verb} needs the task number` }
  }

  const position = Number(first)

  if (verb === 'edit') {
    // `title` or `description` right after the number names the section; any other first word starts the title.
    const section = rest[0]?.toLowerCase() === 'title' ? 'title' : ['description', 'notes'].includes(rest[0]?.toLowerCase() ?? '') ? 'description' : null
    const body = section ? text.replace(/^\S+\s*/, '') : text

    if (section === 'description') {
      return { kind: 'detail', position, text: body }
    }

    if (body === '') {
      return { kind: 'invalid', reason: section ? 'edit title needs a text' : 'edit needs title or description and a text' }
    }

    return { kind: 'edit', position, text: body }
  }

  // The alias of `edit <n> description <text>`; an empty text clears the description.
  if (verb === 'detail') {
    return { kind: 'detail', position, text }
  }

  if (verb === 'mv') {
    return POSITION.test(rest[0] ?? '')
      ? { kind: 'move', from: position, to: Number(rest[0]) }
      : { kind: 'invalid', reason: 'mv needs two task numbers' }
  }

  if (verb === 'priority' || verb === 'pri') {
    const level = PRIORITIES.find(one => one === (rest[0] ?? '').toLowerCase())

    return level ? { kind: 'priority', position, priority: level } : { kind: 'invalid', reason: `${verb} needs high, normal or low` }
  }

  if (verb === 'block' || verb === 'unblock') {
    const token = rest[0]?.toLowerCase() === 'by' ? rest[1] : rest[0]
    const by = blockerRef(token ?? '')

    if (verb === 'block') {
      return by ? { kind: 'block', position, by } : { kind: 'invalid', reason: 'block needs a task number or q<number> of an open question' }
    }

    // A token that names no blocker must not fall through to "drop them all".
    return rest.length > 0 && !by ? { kind: 'invalid', reason: 'unblock takes a task number or q<number>, or nothing to drop every blocker' } : { kind: 'unblock', position, by }
  }

  if (verb === 'run' || verb === 'cancel') {
    return { kind: verb, position }
  }

  if (verb === 'rm') {
    return { kind: 'remove', position }
  }

  if (verb === 'todo' || verb === 'doing' || verb === 'done') {
    return { kind: 'status', position, status: verb }
  }

  return { kind: 'invalid', reason: `unknown subcommand ${verb}` }
}
