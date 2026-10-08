import type { Blocker, ChecklistItem, Question } from '../../../types'
import { isOpenStatus } from '../status/status.hook'

/** `more` is how many further things a question entry asked besides its first (the label). */
export type ActiveBlocker = Blocker & { label: string; more?: number }

// What a task still waits for: the open tasks and the unanswered questions it names. A blocker that
// finished, was answered, or no longer exists stops blocking by itself; nothing has to clear it.
export const activeBlockers = (task: ChecklistItem, list: readonly ChecklistItem[], questions: readonly Question[]): ActiveBlocker[] =>
  (task.blockedBy ?? []).flatMap(blocker => {
    if (blocker.kind === 'task') {
      const target = list.find(one => one.id === blocker.id)

      return target && isOpenStatus(target.status) ? [{ ...blocker, label: target.text }] : []
    }

    const target = questions.find(one => one.id === blocker.id)

    return target?.isOpen ? [{ ...blocker, label: target.texts[0] as string, more: target.texts.length - 1 }] : []
  })

// A task id or an open question id, as the model and the commands name them.
export const resolveBlocker = (id: string, list: readonly ChecklistItem[], questions: readonly Question[]): Blocker | null =>
  list.some(one => one.id === id) ? { kind: 'task', id } : questions.some(one => one.id === id && one.isOpen) ? { kind: 'question', id } : null

// True when making `id` wait for task `by` would close a loop (A waits for B waits for A).
const closesLoop = (list: readonly ChecklistItem[], id: string, by: string): boolean => {
  const seen = new Set<string>()
  const stack = [by]

  while (stack.length > 0) {
    const current = stack.pop() as string

    if (current === id) {
      return true
    }

    if (!seen.has(current)) {
      seen.add(current)
      stack.push(...(list.find(one => one.id === current)?.blockedBy ?? []).filter(blocker => blocker.kind === 'task').map(blocker => blocker.id))
    }
  }

  return false
}

// Adds a blocker; a task cannot wait for itself or for one that waits for it, and a repeat is ignored.
export const withBlocker = (id: string, blocker: Blocker) => (list: ChecklistItem[]): ChecklistItem[] =>
  list.map(one => {
    if (one.id !== id || one.blockedBy?.some(held => held.kind === blocker.kind && held.id === blocker.id)) {
      return one
    }

    if (blocker.kind === 'task' && closesLoop(list, id, blocker.id)) {
      return one
    }

    return { ...one, blockedBy: [...(one.blockedBy ?? []), blocker] }
  })

// Drops one blocker, or every blocker when none is named.
export const withoutBlocker = (id: string, blocker?: Blocker) => (list: ChecklistItem[]): ChecklistItem[] =>
  list.map(one => {
    if (one.id !== id || !one.blockedBy) {
      return one
    }

    const { blockedBy, ...rest } = one
    const left = blocker ? blockedBy.filter(held => !(held.kind === blocker.kind && held.id === blocker.id)) : []

    return left.length === 0 ? rest : { ...rest, blockedBy: left }
  })
