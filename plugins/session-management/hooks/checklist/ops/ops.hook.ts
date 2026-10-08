import type { ChecklistItem, ChecklistStatus, Priority, Question } from '../../../types'
import { activeBlockers } from '../blockers/blockers.hook'
import { oneLine } from '../../shared/format/format.hook'
import { isOpenStatus } from '../status/status.hook'

export const MAX_DETAIL = 2000

// The most tasks a checklist holds; every way of adding stops here instead of dropping tasks later.
export const CHECKLIST_CAP = 200

export const hasRoom = (list: readonly ChecklistItem[]): boolean => list.length < CHECKLIST_CAP

export const PRIORITIES: Priority[] = ['high', 'normal', 'low']
const RANK: Record<Priority, number> = { high: 0, normal: 1, low: 2 }

// The checklist is shown by priority: high first, then normal, then low; within one level the
// stored order stands (it is a stable sort, so sorting twice changes nothing).
export const byPriority = (list: readonly ChecklistItem[]): ChecklistItem[] =>
  list.map((one, index) => ({ one, index })).sort((a, b) => RANK[a.one.priority ?? 'normal'] - RANK[b.one.priority ?? 'normal'] || a.index - b.index).map(({ one }) => one)

// Normal is the default, so it is stored as no field at all.
export const withPriority = (id: string, priority: Priority) => (list: ChecklistItem[]): ChecklistItem[] =>
  byPriority(
    list.map(one => {
      if (one.id !== id) {
        return one
      }

      const { priority: _old, ...rest } = one

      return priority === 'normal' ? rest : { ...rest, priority }
    }),
  )

export const withStatus = (id: string, status: ChecklistStatus) => (list: ChecklistItem[]) =>
  list.map(one => (one.id === id ? { ...one, status } : one))

// A blank title changes nothing: a task always has a text.
export const withText = (id: string, text: string) => (list: ChecklistItem[]) => {
  const title = oneLine(text)

  return title === '' ? list : list.map(one => (one.id === id ? { ...one, text: title } : one))
}

// An empty description removes the field.
export const withDetail = (id: string, detail: string) => (list: ChecklistItem[]): ChecklistItem[] =>
  list.map(one => {
    if (one.id !== id) {
      return one
    }

    const { detail: _old, ...rest } = one
    const text = detail.trim().slice(0, MAX_DETAIL)

    return text === '' ? rest : { ...rest, detail: text }
  })

// A removed task stops blocking the ones that waited for it.
export const without = (id: string) => (list: ChecklistItem[]): ChecklistItem[] =>
  list
    .filter(one => one.id !== id)
    .map(one => {
      if (!one.blockedBy?.some(blocker => blocker.kind === 'task' && blocker.id === id)) {
        return one
      }

      const { blockedBy, ...rest } = one
      const left = blockedBy.filter(blocker => !(blocker.kind === 'task' && blocker.id === id))

      return left.length === 0 ? rest : { ...rest, blockedBy: left }
    })

// Reorders within a priority level (the list is sorted by priority): a position out of range leaves the list as it was.
export const moved = (from: number, to: number) => (list: ChecklistItem[]) => {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) {
    return list
  }

  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as ChecklistItem)

  return next
}

// Moves a task to a position, kept inside its own priority level (the list is sorted by level, so a
// move across levels would be undone by the sort). Returns the list and where the task ended up.
export const moveInLevel = (list: ChecklistItem[], from: number, to: number): { list: ChecklistItem[]; at: number } => {
  const level = list[from]?.priority ?? 'normal'
  const same = list.flatMap((one, index) => ((one.priority ?? 'normal') === level ? [index] : []))
  const at = Math.min(Math.max(to, same[0] ?? from), same[same.length - 1] ?? from)

  return { list: moved(from, at)(list), at }
}

// Only a level other than normal is worth the model's attention.
const marker = (one: ChecklistItem): string => (one.priority && one.priority !== 'normal' ? ` !${one.priority}` : '')

// What the checklist tool answers.
export const describe = (list: ChecklistItem[], questions: Question[] = []): string =>
  list.length === 0
    ? 'The checklist is empty.'
    : list
        .map((one, index) => `${index + 1}. [${one.id}] (${one.status})${marker(one)} ${one.text}${waiting(one, list, questions)}${one.detail ? `\n   detail: ${one.detail.replace(/\n/g, '\n   ')}` : ''}`)
        .join('\n')

// What a task still waits for, as one clause; nothing when nothing blocks it.
const waiting = (one: ChecklistItem, list: ChecklistItem[], questions: Question[]): string => {
  const blockers = activeBlockers(one, list, questions)

  return blockers.length === 0 ? '' : ` — blocked by ${blockers.map(blocker => `${blocker.kind} [${blocker.id}] ${blocker.label}`).join('; ')}`
}

// What the model reads each prompt: every open task, the last cancelled ones (so it stops
// working on them), and only a count of done ones.
export const briefChecklist = (list: ChecklistItem[], questions: Question[] = []): string => {
  const line = (one: ChecklistItem, index: number) => `${index + 1}. [${one.id}] (${one.status})${marker(one)} ${one.text}${waiting(one, list, questions)}`
  const open = list.flatMap((one, index) => (isOpenStatus(one.status) ? [line(one, index)] : []))
  const cancelled = list.flatMap((one, index) => (one.status === 'cancelled' ? [line(one, index)] : [])).slice(-5)
  const done = list.filter(one => one.status === 'done').length

  return [
    open.join('\n'),
    cancelled.length > 0 ? `Cancelled by the user (do not work on these):\n${cancelled.join('\n')}` : '',
    done > 0 ? `(+${done} done)` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
