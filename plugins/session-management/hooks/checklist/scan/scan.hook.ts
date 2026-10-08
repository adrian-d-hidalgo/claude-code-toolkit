import { brief } from '../../shared/format/format.hook'
import { sameTask } from '../../shared/similarity/similarity.hook'
import type { ScanMessage } from '../../shared/transcript/transcript.hook'
import type { ChecklistStatus, Priority } from '../../../types'
import { isOpenStatus } from '../status/status.hook'

export type FoundTask = { text: string; status: ChecklistStatus; detail?: string; priority?: Priority }

const TODO_STATUS: Record<string, ChecklistStatus> = { pending: 'todo', in_progress: 'doing', completed: 'done' }
const BULLET = /^\s*(?:[-*]|\d+[.)])\s+(?:\[( |x|X)\]\s+)?(.+)$/
const CHECKBOX = /^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/
const MAX_TASKS = 40

const fromTodoWrite = (messages: readonly ScanMessage[]): FoundTask[] => {
  const calls = messages.flatMap(message => message.toolUses.filter(use => use.tool === 'TodoWrite'))
  const todos = calls[calls.length - 1]?.input.todos

  if (!Array.isArray(todos)) {
    return []
  }

  return todos.flatMap((todo: { content?: unknown; status?: unknown }) =>
    typeof todo.content === 'string' && todo.content.trim() !== ''
      ? [{ ...brief(todo.content), status: TODO_STATUS[String(todo.status)] ?? 'todo' }]
      : [],
  )
}

const fromPlan = (messages: readonly ScanMessage[]): FoundTask[] => {
  const plans = messages.flatMap(message => message.toolUses.filter(use => use.tool === 'ExitPlanMode'))
  const plan = plans[plans.length - 1]?.input.plan

  if (typeof plan !== 'string') {
    return []
  }

  return plan.split('\n').flatMap(line => {
    const match = BULLET.exec(line)

    return match ? [{ ...brief(match[2] as string), status: match[1]?.toLowerCase() === 'x' ? ('done' as const) : ('todo' as const) }] : []
  })
}

// Markdown checkboxes anywhere in what the assistant wrote.
const fromCheckboxes = (messages: readonly ScanMessage[]): FoundTask[] =>
  messages
    .filter(message => message.role === 'assistant')
    .flatMap(message => message.text.split('\n'))
    .flatMap(line => {
      const match = CHECKBOX.exec(line)

      return match ? [{ ...brief(match[2] as string), status: match[1] === ' ' ? ('todo' as const) : ('done' as const) }] : []
    })

// Tasks the transcript already holds in structured form: the last TodoWrite, the last
// plan, and checkboxes. Later sources fill in what earlier ones lack.
export const scanTasks = (messages: readonly ScanMessage[]): FoundTask[] =>
  addNew([], [...fromTodoWrite(messages), ...fromPlan(messages), ...fromCheckboxes(messages)]).slice(0, MAX_TASKS)

// Keeps the tasks `incoming` has that `known` does not already say, in nearly the same words. An
// open task is only held back by an open one (a finished task does not stop the same work being
// needed again); a finished one by any, so a rescan does not add it twice.
export const addNew = (known: readonly FoundTask[], incoming: readonly FoundTask[]): FoundTask[] =>
  incoming.reduce<FoundTask[]>(
    (all, task) => (all.some(one => (isOpenStatus(one.status) || !isOpenStatus(task.status)) && sameTask(one.text, task.text)) ? all : [...all, task]),
    [...known],
  )
