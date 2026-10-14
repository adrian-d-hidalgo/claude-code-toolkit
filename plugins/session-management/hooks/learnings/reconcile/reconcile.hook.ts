import type { Learning } from '../../../types'
import { oneLine } from '../../shared/format/format.hook'
import type { Port } from '../../shared/port/port.hook'
import { sameTask } from '../../shared/similarity/similarity.hook'
import type { Candidate, LearningVerdict } from '../judge/judge.hook'
import { buildLearningsReconcilePrompt, buildMergePrompt, parseLearningVerdicts, parseMerged } from '../judge/judge.hook'
import { LEARNING_CAP, seenAgain } from '../ops/ops.hook'
import { knownOf } from '../memory/memory.hook'
import { MAX_HOW, MAX_WHY, doorProblems, excerpt } from '../rules/rules.hook'

export type Proposed = {
  /** The id each candidate ended up under, in the candidates' order; null where it was not added. */
  ids: (string | null)[]
  /** Proposed as new learnings. */
  added: number
  /** Folded into a learning it updates: a proposal holding both waits for the user. */
  updated: number
  /** Proposed as replacing a learning it contradicts. */
  contradicting: number
  /** A known learning already says it (its count went up). */
  repeated: number
  /** The user had rejected it before. */
  refused: number
  /** Not proposed: it breaks the rules, or it belongs in CLAUDE.md. */
  turnedAway: number
  capped: number
  notes: string[]
}

// One line for a tool or a command to answer with: the counts that are not zero, then what to know.
export const proposedText = (done: Proposed): string =>
  [
    [
      done.added > 0 ? `${done.added} proposed` : '',
      done.updated > 0 ? `${done.updated} folded into a learning they update` : '',
      done.contradicting > 0 ? `${done.contradicting} contradicting a learning` : '',
      done.repeated > 0 ? `${done.repeated} already known` : '',
      done.refused > 0 ? `${done.refused} rejected before` : '',
      done.turnedAway > 0 ? `${done.turnedAway} not proposed` : '',
      done.capped > 0 ? `${done.capped} not added (a project holds at most ${LEARNING_CAP} learnings)` : '',
    ]
      .filter(Boolean)
      .join(', ') || 'nothing proposed',
    ...done.notes,
  ].join('; ')

const clean = (one: Candidate): Candidate => ({
  kind: one.kind,
  text: oneLine(one.text),
  why: one.why.trim().slice(0, MAX_WHY),
  ...(one.how && one.how.trim() !== '' ? { how: one.how.trim().slice(0, MAX_HOW) } : {}),
})

const emptyResult = (): Proposed => ({ ids: [], added: 0, updated: 0, contradicting: 0, repeated: 0, refused: 0, turnedAway: 0, capped: 0, notes: [] })

// The door: every candidate is compared with the queue and with what is in memory, so the queue only
// ever holds learnings that follow the rules and say something new:
// - a candidate that breaks the rules or says too much is turned away with what to fix;
// - what memory or the queue already says is not proposed (a repeat of a proposal is one more
//   sighting; one the user rejected is answered with the reason);
// - what updates a learning becomes one proposal holding both, which replaces it once accepted (a
//   pending proposal is updated in place);
// - what contradicts a learning is proposed as replacing it: accepting retires the other;
// - a convention, a decision or general knowledge is turned away with where it belongs;
// - the rest is proposed as new.
// The cheap word match goes first; the model (when allowed) decides the rest. Nothing here touches
// the memory folder: the user accepts from the pane.
// Where what is not a learning goes instead, as the proposer is told.
const ELSEWHERE: Record<string, string> = {
  convention: 'a convention of the code or the process, not a learning; suggest it to the user as a change to CLAUDE.md instead',
  decision: "a product or architecture decision, not a learning; it belongs in the project's docs",
  general: 'general engineering knowledge, true for any project; nothing to remember',
}

export const proposeLearnings = async (port: Port, incoming: readonly Candidate[], options: { judge?: string; isRecount?: boolean } = {}): Promise<Proposed> => {
  // A scan re-reads turns already seen: what it finds again is not a new sighting.
  const isCounted = options.isRecount !== false
  const known = await knownOf(port)
  const session = await port.sessionId()
  const project = await port.project()
  const at = await port.now()
  const result = emptyResult()
  const candidates = incoming.map(clean).filter(one => one.text !== '')
  const fresh: Candidate[] = []
  const freshAt: number[] = []

  for (const [index, one] of candidates.entries()) {
    const twin = known.find(other => sameTask(other.text, one.text))
    const problems = doorProblems(one)
    result.ids[index] = null

    if (twin) {
      await noteRepeat(port, twin, result, isCounted)
      result.ids[index] = twin.id
    } else if (problems.length > 0) {
      result.turnedAway += 1
      result.notes.push(`"${excerpt(one.text, 60)}": ${problems.join(', ')}; fix it and propose it again`)
    } else if (fresh.some(other => sameTask(other.text, one.text))) {
      result.repeated += 1
    } else {
      fresh.push(one)
      freshAt.push(index)
    }
  }

  if (fresh.length === 0) {
    return result
  }

  let verdicts: LearningVerdict[] = fresh.map(() => ({ verdict: 'new' }))
  const isJudged = options.judge !== 'heuristic'

  // Always judged, an empty project too: whether it belongs in memory at all does not depend on what is known.
  if (isJudged) {
    try {
      const reply = await port.complete({ prompt: buildLearningsReconcilePrompt(known, fresh), maxTokens: 1200 })
      verdicts = (reply.isAnswered ? parseLearningVerdicts(reply.text, fresh.length) : null) ?? verdicts
    } catch {
      // The words already ruled out the plain repeats.
    }
  }

  for (const [position, candidate] of fresh.entries()) {
    const verdict = verdicts[position] as LearningVerdict
    const index = freshAt[position] as number
    const target = verdict.of ? known.find(other => other.id === verdict.of) : undefined
    const isLive = target !== undefined && target.status !== 'rejected'

    if (verdict.verdict === 'duplicate' && target) {
      await noteRepeat(port, target, result, isCounted)
      result.ids[index] = target.id
      continue
    }

    if (verdict.verdict in ELSEWHERE) {
      result.turnedAway += 1
      result.notes.push(`"${excerpt(candidate.text, 60)}": ${ELSEWHERE[verdict.verdict]}`)
      continue
    }

    let one: Candidate = candidate
    let link: Partial<Learning> = {}

    if (verdict.verdict === 'updates' && isLive) {
      let merged: Candidate | null = null

      try {
        const source = target.file ? ((await port.memory.read(target.file)) ?? undefined) : undefined
        const reply = await port.complete({ prompt: buildMergePrompt(target, candidate, source), maxTokens: 3000 })
        merged = reply.isAnswered ? parseMerged(reply.text) : null
      } catch {
        merged = null
      }

      one = merged && doorProblems(merged).length === 0 ? clean(merged) : candidate

      // A pending proposal takes the update in place: the user has one thing to decide, not two.
      if (target.status === 'proposed' && merged) {
        await port.learnings.write(list => list.map(item => (item.id === target.id ? { ...item, ...one, seen: item.seen + 1 } : item)))
        result.updated += 1
        result.ids[index] = target.id
        result.notes.push(`folded into the pending [${target.id}]`)
        continue
      }

      link = { replaces: [target.id] }
    } else if (verdict.verdict === 'contradicts' && isLive) {
      link = { replaces: [target.id], conflicts: [target.id] }
    }

    if ((await port.learnings.all()).length >= LEARNING_CAP) {
      result.capped += 1
      continue
    }

    const id = await port.newId()
    await port.learnings.write(list => [...list, { id, ...one, status: 'proposed', project, session, at, seen: 1, ...link }])
    result.ids[index] = id

    if (link.conflicts) {
      result.contradicting += 1
      result.notes.push(`[${id}] contradicts ${nameOf(target)}: accepting it retires it`)
    } else if (link.replaces) {
      result.updated += 1
      result.notes.push(`[${id}] updates ${nameOf(target)}: accepting it replaces it`)
    } else {
      result.added += 1
    }
  }

  return result
}

const nameOf = (one: Learning | undefined): string => (one?.file ? `the memory file ${one.file}` : `[${one?.id ?? ''}]`)

// A candidate memory or the queue already says: one more sighting of a proposal; a rejected one is
// answered with its reason; what memory holds is only named.
const noteRepeat = async (port: Port, twin: Learning, result: Proposed, isCounted: boolean): Promise<void> => {
  if (isCounted && twin.status !== 'accepted') {
    await port.learnings.write(seenAgain(twin.id))
  }

  if (twin.status === 'rejected') {
    result.refused += 1
    result.notes.push(`"${excerpt(twin.text, 60)}" was rejected by the user${twin.reason ? `: ${twin.reason}` : ''}`)
  } else {
    result.repeated += 1
    result.notes.push(twin.status === 'accepted' ? `already in memory (${twin.file})` : `already waiting as [${twin.id}]`)
  }
}
