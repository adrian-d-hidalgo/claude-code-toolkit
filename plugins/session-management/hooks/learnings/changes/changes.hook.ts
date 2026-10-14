import type { Learning } from '../../../types'
import { quoted } from '../../shared/format/format.hook'

// The proposals the user answered, edited or took out since the assistant last looked: accepted (the
// assistant was asked to save them, `accepted` names them), rejected with the reason, reopened, a field
// reworded, one cleared. New proposals are not news: the prompt lists them.
export const diffLearnings = (seen: readonly Learning[], now: readonly Learning[], accepted: ReadonlySet<string> = new Set()): string[] => {
  const before = new Map(seen.map(one => [one.id, one]))
  const after = new Set(now.map(one => one.id))
  const lines: string[] = []

  for (const one of now) {
    const old = before.get(one.id)

    if (!old) {
      continue
    }

    if (old.status !== one.status) {
      lines.push(one.status === 'rejected' ? `learning rejected${one.reason ? ` (${one.reason})` : ''}: ${quoted(one.text)}` : `learning reopened (waiting for review again): ${quoted(one.text)}`)
    }

    if (old.text !== one.text) {
      lines.push(`learning reworded: ${quoted(old.text)} -> ${quoted(one.text)}`)
    } else if (old.why !== one.why || (old.how ?? '') !== (one.how ?? '') || old.kind !== one.kind) {
      lines.push(`learning edited (why, how or kind): ${quoted(one.text)}`)
    }
  }

  for (const old of seen) {
    if (!after.has(old.id) && old.status === 'proposed') {
      lines.push(accepted.has(old.id) ? `learning accepted (you were asked to save it to memory): ${quoted(old.text)}` : `proposal taken out of the review queue: ${quoted(old.text)}`)
    }
  }

  return lines
}
