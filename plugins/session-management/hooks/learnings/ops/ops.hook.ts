import type { Learning, LearningKind, LearningStatus } from '../../../types'
import { oneLine } from '../../shared/format/format.hook'
import { effectOf } from '../effect/effect.hook'
import { needsReview } from '../kinds/kinds.hook'
import { MAX_HOW, MAX_WHY } from '../rules/rules.hook'

// The most a session's ledger keeps: proposals and refusals.
export const LEARNING_CAP = 500

export const hasRoom = (list: readonly Learning[]): boolean => list.length < LEARNING_CAP

// The pane and the commands number the ledger in this order: what waits for the user first, then what
// was refused. Within a group the stored order stands.
const rankOf = (one: Learning): number => (needsReview(one) ? 0 : 1)

export const byStatus = (list: readonly Learning[]): Learning[] =>
  list.map((one, index) => ({ one, index })).sort((a, b) => rankOf(a.one) - rankOf(b.one) || a.index - b.index).map(({ one }) => one)

export const withStatus = (id: string, status: LearningStatus, reason?: string) => (list: Learning[]): Learning[] =>
  list.map(one => {
    if (one.id !== id) {
      return one
    }

    const { reason: _old, ...rest } = one
    const text = status === 'rejected' ? oneLine(reason ?? '', 500) : ''

    return text === '' ? { ...rest, status } : { ...rest, status, reason: text }
  })

export const withKind = (id: string, kind: LearningKind) => (list: Learning[]): Learning[] => list.map(one => (one.id === id ? { ...one, kind } : one))

// A blank text or why changes nothing: a learning always has both. A blank how removes it.
export const withField = (id: string, field: 'text' | 'why' | 'how', value: string) => (list: Learning[]): Learning[] =>
  list.map(one => {
    if (one.id !== id) {
      return one
    }

    if (field === 'how') {
      const { how: _old, ...rest } = one
      const how = value.trim().slice(0, MAX_HOW)

      return how === '' ? rest : { ...rest, how }
    }

    const text = field === 'text' ? oneLine(value) : value.trim().slice(0, MAX_WHY)

    return text === '' ? one : { ...one, [field]: text }
  })

// One more time it was proposed.
export const seenAgain = (id: string) => (list: Learning[]): Learning[] => list.map(one => (one.id === id ? { ...one, seen: one.seen + 1 } : one))

// A removed learning stops being replaced or contradicted by the others; a proposal left replacing
// nothing becomes a plain proposal.
export const without = (id: string) => (list: Learning[]): Learning[] =>
  list
    .filter(one => one.id !== id)
    .map(one => {
      const { replaces, conflicts, ...rest } = one
      const left = (replaces ?? []).filter(other => other !== id)
      const clashes = (conflicts ?? []).filter(other => other !== id)

      return { ...rest, ...(left.length > 0 ? { replaces: left } : {}), ...(clashes.length > 0 ? { conflicts: clashes } : {}) }
    })

// How often it came up, and for what waits, what accepting it does (the pane's words), when it matters.
const marks = (one: Learning, list: readonly Learning[]): string => {
  const effect = needsReview(one) ? effectOf(one, list) : null

  return [one.seen > 1 ? `seen ${one.seen}×` : '', effect && effect.tag !== 'new' ? `${effect.tag}: ${effect.onYes}` : '', one.status === 'rejected' && one.reason ? `rejected: ${one.reason}` : ''].filter(Boolean).join('; ')
}

// What the learnings tool answers: the proposals waiting and the refusals, numbered as the pane does.
export const describe = (list: readonly Learning[]): string =>
  list.length === 0
    ? 'No learnings yet.'
    : list
        .map((one, index) => {
          const extra = marks(one, list)

          return `${index + 1}. [${one.id}] (${one.status}) ${one.kind}: ${one.text}\n   why: ${one.why}${one.how ? `\n   how: ${one.how}` : ''}${extra ? `\n   ${extra}` : ''}`
        })
        .join('\n')

// What the model reads each prompt: the proposals waiting (so it does not propose them again), and
// the last refusals (so it neither proposes nor applies them). What is in memory it loads on its own.
export const briefLearnings = (list: readonly Learning[]): string => {
  const pending = list.filter(one => one.status === 'proposed')
  const rejected = list.filter(one => one.status === 'rejected').slice(-15)

  return [
    pending.length > 0 ? `Waiting for the user's review (do not propose again):\n${pending.map(one => `- [${one.id}] ${one.kind}: ${one.text}`).join('\n')}` : '',
    rejected.length > 0 ? `Rejected by the user (never propose or apply these):\n${rejected.map(one => `- [${one.id}] ${one.text}${one.reason ? ` — ${one.reason}` : ''}`).join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
