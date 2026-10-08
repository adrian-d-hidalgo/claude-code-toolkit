import type { ChecklistItem } from '../../../types'
import { quoted } from '../../shared/format/format.hook'
import { byPriority } from '../ops/ops.hook'

const blockerKeys = (one: ChecklistItem): string => (one.blockedBy ?? []).map(blocker => `${blocker.kind}:${blocker.id}`).sort().join()

// What changed in the checklist since the assistant last saw it (its own tool results or its
// last prompt context): edits made from the pane, the commands or another session.
export const diffChecklist = (seen: readonly ChecklistItem[], now: readonly ChecklistItem[]): string[] => {
  const before = new Map(seen.map(one => [one.id, one]))
  const after = new Map(now.map(one => [one.id, one]))
  const lines: string[] = []

  for (const one of now) {
    const old = before.get(one.id)

    if (!old) {
      lines.push(`added ${quoted(one.text)} (${one.status})`)
      continue
    }

    if (old.status !== one.status) {
      lines.push(`${quoted(one.text)}: ${old.status} -> ${one.status}`)
    }

    if (old.text !== one.text) {
      lines.push(`renamed ${quoted(old.text)} to ${quoted(one.text)}`)
    }

    if ((old.priority ?? 'normal') !== (one.priority ?? 'normal')) {
      lines.push(`${quoted(one.text)}: priority ${old.priority ?? 'normal'} -> ${one.priority ?? 'normal'}`)
    }

    if (blockerKeys(old) !== blockerKeys(one)) {
      lines.push(`${quoted(one.text)}: what it waits for changed`)
    }

    if ((old.detail ?? '') !== (one.detail ?? '')) {
      lines.push(`${quoted(one.text)}: description changed`)
    }
  }

  for (const one of seen) {
    if (!after.has(one.id)) {
      lines.push(`removed ${quoted(one.text)}`)
    }
  }

  const kept = seen.filter(one => after.has(one.id)).map(one => one.id)
  const order = now.filter(one => before.has(one.id)).map(one => one.id)

  // A priority change re-sorts the list on its own; only an order the new levels do not explain is news.
  const explained = byPriority(seen.flatMap(one => after.get(one.id) ?? [])).map(one => one.id)

  if (kept.join() !== order.join() && explained.join() !== order.join()) {
    lines.push('the order (priority) changed: see the list')
  }

  return lines
}
