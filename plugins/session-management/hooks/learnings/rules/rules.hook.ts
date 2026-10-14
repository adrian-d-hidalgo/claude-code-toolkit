import type { Learning } from '../../../types'
import { MAX_TITLE } from '../../shared/format/format.hook'
import { sameTask } from '../../shared/similarity/similarity.hook'

// How long a why or a how may be stored: a bound on what one edit keeps, not a rule.
export const MAX_WHY = 4000
export const MAX_HOW = 4000

// What a learning has to be to enter Claude's memory. One source for the tool's description, the
// judge's prompts, `/learnings rules` and the doctor's checks.
export const LEARNING_RULES: readonly string[] = [
  `One fact per learning: a sentence of at most ${MAX_TITLE} characters that says what to do or what is true. "And also" means two learnings.`,
  'Every learning says why it holds: the correction, the confirmation or the event it came from. Without a why it is not accepted.',
  'A learning is durable: it would still be true in the next session. Nothing that only matters to this conversation.',
  'A learning is a preference of the user about how the assistant works: how to do something, what never to do, where to find or get something, what they prefer. It comes from the user: a correction, a confirmation, a request.',
  'Not memory, even when it was agreed with the user: a convention of the code or the process (naming, folders, file suffixes, tests, gates, env files, how agents run or delegate) goes in CLAUDE.md; a product or architecture decision goes in the project\'s docs; general engineering knowledge or how a library or API behaves goes nowhere.',
  'A learning is not derivable from the repository: not its code structure, its git history, its CLAUDE.md or its README.',
  'Dates are absolute (2026-10-13), never relative (yesterday, last week).',
  "No secrets, credentials or tokens, and no private paths that are not the project's own.",
  'A file, function, flag or URL it names must exist when it is written.',
  'The why and the how add to the text; they never repeat it.',
]

// "Today" and "hoy" are left out on purpose: in a rule they mean "currently", not a date.
const RELATIVE_DATE = /\b(yesterday|tomorrow|last (?:week|month|year|night)|next (?:week|month|year)|ayer|anoche|la semana pasada|el mes pasado|el año pasado|la próxima semana|la semana que viene|hace \d+ (?:días|semanas|meses|años)|\d+ (?:days|weeks|months) ago)\b/i
// Real keys carry digits; a word ending in "sk-" or "token: <prose>" is no secret.
const SECRET = /((?<![A-Za-z0-9])sk-(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{20,}|(?<![A-Za-z0-9])AKIA[0-9A-Z]{16}|(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{30,}|(?<![A-Za-z0-9])xox[baprs]-[A-Za-z0-9-]{10,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:password|passwd|secret|token|api[_-]?key)\s*[:=]\s*['"]?(?=[A-Za-z0-9_\-/+]*\d)[A-Za-z0-9_\-/+]{16,})/i
const TWO_FACTS = /\b(and also|y además|además de eso|; also|; además)\b/i
const SESSION_ONLY = /\b(this (?:conversation|session|chat|thread)|esta (?:conversación|sesión|charla)|in the current session)\b/i
const SUPERSEDED = /^\W*(superado|superseded|obsolete|obsoleto|deprecated|deprecado|outdated|ya no aplica)\b/i

// The problems a learning has that need no file system or model: the shape of the text itself.
export const lintLearning = (one: Pick<Learning, 'text' | 'why' | 'how'>): string[] => {
  const problems: string[] = []
  const all = [one.text, one.why, one.how ?? ''].join('\n')

  if (one.text.trim() === '') problems.push('no text')
  if (one.text.length > MAX_TITLE) problems.push(`text over ${MAX_TITLE} characters`)
  if (/:\s*$/.test(one.text)) problems.push('the text is a lead-in, not the fact')
  if (one.why.trim() === '') problems.push('no why')
  if (one.why.trim() !== '' && sameTask(one.text, one.why)) problems.push('the why repeats the text')
  if (one.how && sameTask(one.text, one.how)) problems.push('the how repeats the text')
  if (TWO_FACTS.test(one.text)) problems.push('two facts in one ("and also")')
  if (RELATIVE_DATE.test(all)) problems.push('a relative date')
  if (SESSION_ONLY.test(all)) problems.push('tied to the conversation it came from')
  if (SECRET.test(all)) problems.push('looks like a secret')

  return problems
}

// Past this many characters of why and how together, a learning says more than it needs to: the door
// turns it away and the doctor proposes a compact version.
export const COMPACT_AT = 600

// What keeps a proposal out of the queue: the rules, and saying too much.
export const doorProblems = (one: Pick<Learning, 'text' | 'why' | 'how'>): string[] => {
  const size = one.why.length + (one.how ?? '').length

  return [...lintLearning(one), ...(size > COMPACT_AT ? [`says too much (${size} characters of why and how, keep it under ${COMPACT_AT})`] : [])]
}

// A learning its own text says is no longer true.
export const isSuperseded = (one: Pick<Learning, 'text'>): boolean => SUPERSEDED.test(one.text)

// Absolute paths need two segments or an extension (`/debug` is a command, `/etc/hosts` a path);
// relative ones a folder and an extension (`plugins/core/SKILL.md`). URLs are not paths.
const PATH = /(?:^|[\s(`'"])((?:~\/|\.{1,2}\/)[\w./@-]+|\/[\w.@-]+(?:\/[\w.@-]+)+|\/[\w@-]+\.[a-z]{1,6}|[\w@-]+(?:\/[\w.@-]+)+\.[a-z]{1,6})(?=[\s)`'",.;:]|$)/gi

export const pathsIn = (text: string): string[] => {
  const found = new Set<string>()

  for (const match of text.replace(/https?:\/\/\S+/g, ' ').matchAll(PATH)) {
    found.add((match[1] as string).replace(/[.,;:]+$/, ''))
  }

  return [...found]
}

// A short, plain piece of a text for a one-line report: no backticks or emphasis, which would
// swallow the report's line breaks once cut in the middle of a pair.
export const excerpt = (text: string, max = 70): string => {
  const flat = text.replace(/[`*_[\]]/g, '').replace(/\s+/g, ' ').trim()

  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat
}
