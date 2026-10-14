import type { Learning } from '../../../types'
import type { Port } from '../../shared/port/port.hook'
import { effectOf } from '../effect/effect.hook'
import { needsReview } from '../kinds/kinds.hook'
import { fileOfId, knownOf } from '../memory/memory.hook'
import { byStatus, withStatus, without } from '../ops/ops.hook'
import { excerpt, lintLearning } from '../rules/rules.hook'

// The user's verdicts. The mod never writes Claude's memory: accepting asks Claude to save or correct
// it, following its own memory instructions, and opens the guard for that write.

const find = async (port: Port, id: string): Promise<Learning | undefined> => (await port.learnings.all()).find(item => item.id === id)

// While an approval is open, the guard lets Claude's memory writes through: they carry what the user
// accepted. It closes when the turn that answers the request completes, or after APPROVAL_MS.
export const APPROVAL_KEY = 'approval:learnings'
export const APPROVAL_MS = 30 * 60_000

const approvalKey = async (port: Port): Promise<string> => `${APPROVAL_KEY}:${await port.sessionId()}`

export const openApproval = async (port: Port): Promise<void> => port.store.set(await approvalKey(port), await port.now())

export const approvalAt = async (port: Port): Promise<number | null> => {
  const at = await port.store.get(await approvalKey(port))

  return typeof at === 'number' && (await port.now()) - at < APPROVAL_MS ? at : null
}

export const closeApproval = async (port: Port): Promise<void> => port.store.delete(await approvalKey(port))

// The proposals accepted lately, so the next prompt can tell Claude they are in its memory now.
export const ACCEPTED_KEY = 'accepted:learnings'
const ACCEPTED_KEPT = 50

const noteAccepted = async (port: Port, ids: readonly string[]): Promise<void> => {
  const key = `${ACCEPTED_KEY}:${await port.sessionId()}`
  const before = ((await port.store.get(key)) as string[] | undefined) ?? []

  await port.store.set(key, [...before, ...ids].slice(-ACCEPTED_KEPT))
}

export const acceptedIds = async (port: Port): Promise<Set<string>> => new Set(((await port.store.get(`${ACCEPTED_KEY}:${await port.sessionId()}`)) as string[] | undefined) ?? [])

// One accepted proposal as Claude is asked to apply it.
export type Approved = { one: Learning; replaced: Learning[]; isContradiction: boolean }

const body = (one: Pick<Learning, 'kind' | 'text' | 'why' | 'how'>): string[] => [`   ${one.kind}: ${one.text}`, `   Why: ${one.why}`, ...(one.how ? [`   How to apply: ${one.how}`] : [])]

// What Claude is asked to do with what the user accepted, all of it in one message.
export const saveMessage = (items: readonly Approved[]): string =>
  [
    `I approved ${items.length === 1 ? 'this learning' : 'these learnings'} for your memory. Save ${items.length === 1 ? 'it' : 'them'} following your own memory instructions: one memory per file, ${'MEMORY.md'} only as the index, and update a memory that already covers the same thing instead of adding a duplicate. Change nothing else, then tell me in one line what you saved.`,
    '',
    ...items.flatMap(({ one, replaced, isContradiction }, index) => {
      const files = replaced.flatMap(old => (old.file ? [old.file] : []))

      if (files.length === 0) {
        return [`${index + 1}. Save as a new memory:`, ...body(one)]
      }

      return isContradiction
        ? [`${index + 1}. Retire ${files.join(', ')} (it says the opposite) and save instead:`, ...body(one)]
        : [`${index + 1}. Update ${files.join(', ')} so it says:`, ...body(one)]
    }),
  ].join('\n')

// Accepting a proposal asks Claude to save it (`batch` collects it for one message instead); it leaves
// the queue. A proposal it updates or contradicts in the queue goes too: a contradicted one stays as a
// refusal. One that breaks the rules is refused with them, so it is fixed first. A refusal accepted
// after all is saved the same way.
export const acceptLearning = async (port: Port, id: string, batch?: Approved[]): Promise<string> => {
  const one = await find(port, id)

  if (!one) {
    return 'No such learning.'
  }

  const problems = lintLearning(one)

  if (problems.length > 0) {
    return `Not accepted, it breaks the rules: ${problems.join(', ')}. Edit it first.`
  }

  const known = await knownOf(port)
  const replaced = known.filter(item => (one.replaces ?? []).includes(item.id))
  const isContradiction = (one.conflicts ?? []).length > 0
  const item: Approved = { one, replaced, isContradiction }

  for (const old of replaced.filter(other => fileOfId(other.id) === null)) {
    await port.learnings.write(isContradiction ? withStatus(old.id, 'rejected', `contradicted by: ${excerpt(one.text, 150)}`) : without(old.id))
  }

  await port.learnings.write(without(id))
  await noteAccepted(port, [id])
  await openApproval(port)

  if (batch) {
    batch.push(item)
  } else {
    await port.say(saveMessage([item]))
  }

  return `Accepted: ${one.text} (Claude saves it to its memory)`
}

// Rejecting keeps the proposal as a refusal with its reason, so the same proposal is answered with it.
export const rejectLearning = async (port: Port, id: string, reason = ''): Promise<string> => {
  const one = await find(port, id)

  if (!one) {
    return 'No such learning.'
  }

  if (one.status === 'rejected') {
    return 'Already rejected.'
  }

  await port.learnings.write(withStatus(id, 'rejected', reason))

  return `Rejected: ${one.text}`
}

// A refusal back to the review queue.
export const reopenLearning = async (port: Port, id: string): Promise<string> => {
  const one = await find(port, id)

  if (!one) {
    return 'No such learning.'
  }

  if (one.status === 'proposed') {
    return 'Already waiting for review.'
  }

  await port.learnings.write(withStatus(id, 'proposed'))

  return `Reopened: ${one.text}`
}

// Removing forgets a proposal or a refusal entirely: unlike a rejection it leaves no trace, so the same
// proposal can come back.
export const removeLearning = async (port: Port, id: string): Promise<string> => {
  const one = await find(port, id)

  if (!one) {
    return 'No such learning.'
  }

  await port.learnings.write(without(id))

  return `Removed: ${one.text}`
}

// An edit of a proposal's wording or kind; memory is not touched until it is accepted.
export const reviseLearning = async (port: Port, change: (list: Learning[]) => Learning[]): Promise<void> => {
  await port.learnings.write(change)
}

export type AcceptedAll = { done: number; refused: string[] }

// Accepts everything waiting, in the pane's order, and asks Claude to save all of it in one message.
// What breaks the rules stays in the queue, named.
export const acceptAll = async (port: Port): Promise<AcceptedAll> => {
  const waiting = byStatus(await port.learnings.all()).filter(needsReview)
  const result: AcceptedAll = { done: 0, refused: [] }
  const batch: Approved[] = []

  for (const one of waiting) {
    const now = await find(port, one.id)

    if (!now || !needsReview(now)) {
      continue
    }

    const answer = await acceptLearning(port, one.id, batch)

    if (answer.startsWith('Not accepted')) {
      result.refused.push(`${excerpt(one.text, 60)}: ${answer.replace(/^Not accepted, it breaks the rules: /, '').replace(/\. Edit it first\.$/, '')}`)
    } else {
      result.done += 1
    }
  }

  if (batch.length > 0) {
    await port.say(saveMessage(batch))
  }

  return result
}

// The person's comment on a proposal goes to Claude, which revises it with the learnings tool; it keeps
// waiting, since only the person accepts.
export const commentOn = async (port: Port, id: string, comment: string, tool = 'learnings'): Promise<string> => {
  const list = byStatus(await port.learnings.all())
  const one = list.find(item => item.id === id)

  if (!one || !needsReview(one)) {
    return 'No such learning waiting for review.'
  }

  if (comment.trim() === '') {
    return 'A comment needs a text.'
  }

  const effect = effectOf(one, await knownOf(port))

  await port.say(
    [
      `My comment on learning #${list.indexOf(one) + 1} [${one.id}], waiting for my review${effect ? ` (${effect.tag}: if I ${effect.yes}, ${effect.onYes.charAt(0).toLowerCase()}${effect.onYes.slice(1)})` : ''}:`,
      `Text: ${one.text}`,
      `Why: ${one.why}`,
      ...(one.how ? [`How to apply: ${one.how}`] : []),
      '',
      `Comment: ${comment.trim()}`,
      '',
      `Revise it following the comment and the rules, with the ${tool} tool (action revise, id ${one.id}, and the text, why or how that change). If the comment means it should not be remembered, say so and I will reject it. Do not accept it, and do not write your memory: I decide.`,
    ].join('\n'),
  )

  return 'Comment sent to Claude; the learning keeps waiting for your answer.'
}
