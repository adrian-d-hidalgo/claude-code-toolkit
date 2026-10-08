import { brief } from '../../shared/format/format.hook'
import type { ScanMessage } from '../../shared/transcript/transcript.hook'
import type { Priority } from '../../../types'
import type { FoundTask } from '../scan/scan.hook'

const STATUSES = ['todo', 'doing', 'done']
const EXCERPT_CHARS = 6000
const LEVELS: string[] = ['high', 'normal', 'low']

// Normal is the default, so the model is told to leave it out.
const PRIORITY_RULE =
  'Optionally set "priority": "high" only for urgent, blocking or promised-first work, "low" for later or nice-to-have items; omit it for everything else.'

// What makes a scan's list usable, shared by both prompts: one entry per deliverable, no
// repeats in other words, and the order the work should happen in (the list is a priority).
const SHAPE =
  'One task per distinct deliverable: never list the same work twice in other words, never split the steps of one deliverable into several tasks, and fold overlapping items into one. Return them in the order the work should happen: blockers and prerequisites before what depends on them, items in progress first, follow-ups and "later" items last, related items next to each other.'

// Subagents a message started: in-flight work is often only visible there.
const started = (message: ScanMessage): string =>
  message.toolUses
    .filter(use => use.tool === 'Agent' && typeof use.input.description === 'string')
    .map(use => `\n(started subagent: ${use.input.description as string})`)
    .join('')

// English prompt, any conversation language: tasks come back in the conversation's own.
export const buildTaskPrompt = (messages: readonly ScanMessage[], known: readonly string[]): string => {
  const transcript = messages
    .filter(message => message.text.trim() !== '' || message.toolUses.length > 0)
    .map(message => `${message.role}: ${message.text.trim()}${started(message)}`)
    .join('\n\n')
    .slice(-EXCERPT_CHARS)

  return [
    'You extract the work items of a conversation between a user and an AI coding assistant. Reply with JSON only, no prose.',
    '',
    'Checklist items already tracked (a task that says the same, in any words, is already there):',
    known.length === 0 ? '(none)' : known.map(text => `- ${text}`).join('\n'),
    '',
    'Conversation excerpt:',
    '<<<',
    transcript,
    '>>>',
    '',
    'List the concrete tasks that were agreed or planned, or that remain open: next steps, pending fixes, follow-ups. Skip hypothetical options nobody chose, questions, and anything already tracked (even in other words). Write each task as a short imperative title (under 70 characters) in the conversation\'s own language, and put anything longer that someone needs to do it (files, constraints, why) in "detail" (the task description). Set "status" to todo, doing or done from what the conversation shows.',
    SHAPE,
    PRIORITY_RULE,
    'Format: {"tasks":[{"text":"...","detail":"optional","status":"todo|doing|done","priority":"high|low"}]}',
  ].join('\n')
}

// Only high and low are kept: an unknown value or normal means no field.
export const levelOf = (value: unknown): { priority?: Priority } => {
  const level = typeof value === 'string' ? value.trim().toLowerCase() : ''

  return LEVELS.includes(level) && level !== 'normal' ? { priority: level as Priority } : {}
}

export const parseTasks = (reply: string): FoundTask[] | null => {
  const match = /\{[\s\S]*\}/.exec(reply)

  if (!match) {
    return null
  }

  try {
    const value = JSON.parse(match[0]) as { tasks?: unknown }

    if (!Array.isArray(value.tasks)) {
      return null
    }

    return (value.tasks as Array<{ text?: unknown; detail?: unknown; status?: unknown; priority?: unknown }>).flatMap(task =>
      typeof task.text === 'string' && task.text.trim() !== ''
        ? [{ ...brief(task.text), ...(typeof task.detail === 'string' && task.detail.trim() !== '' ? { detail: task.detail.trim() } : {}), status: STATUSES.includes(String(task.status)) ? (task.status as FoundTask['status']) : 'todo', ...levelOf(task.priority) }]
        : [],
    )
  } catch {
    return null
  }
}

// Sent to the session's own model through a fork, which already holds the whole
// conversation, running subagents included.
export const buildForkTasksPrompt = (known: readonly string[]): string =>
  [
    'Do not use tools. List every task still pending or in progress in this session: work you started, subagents still running, steps the user asked for, follow-ups you promised, items waiting on the user. Write each as a short imperative title (under 70 characters) in the conversation\'s own language, with anything longer in "detail" (its description); status is "doing" for work in flight, otherwise "todo" ("done" only for finished items of an active plan).',
    SHAPE,
    PRIORITY_RULE,
    'Skip tasks already tracked in the checklist (even in other words):',
    known.length === 0 ? '(none)' : known.map(text => `- ${text}`).join('\n'),
    'Reply with JSON only: {"tasks":[{"text":"...","detail":"optional","status":"todo|doing|done","priority":"high|low"}]}',
  ].join('\n')
