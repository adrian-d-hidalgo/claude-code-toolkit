import type { Blocker, ChecklistItem, Priority, Question } from '../../../types'
import type { Port } from '../../shared/port/port.hook'
import { resolveBlocker, withBlocker } from '../blockers/blockers.hook'
import { CHECKLIST_CAP, MAX_DETAIL, withDetail } from '../ops/ops.hook'
import { levelOf } from '../judge/judge.hook'
import { addNew } from '../scan/scan.hook'
import type { FoundTask } from '../scan/scan.hook'
import { isOpenStatus } from '../status/status.hook'

export type Verdict = { verdict: 'new' | 'duplicate' | 'complements'; of?: string; detail?: string; blockedBy: string[]; priority?: Priority }

export type Reconciled = { added: number; merged: number; skipped: number; linked: number; capped: number; notes: string[] }

const FINISHED_SHOWN = 15

// Asks which of the candidate tasks the checklist already has (duplicate), which only add to a task
// it has (complements) and which are new, and what each new one has to wait for.
export const buildReconcilePrompt = (existing: readonly ChecklistItem[], questions: readonly Question[], candidates: readonly FoundTask[]): string => {
  const open = existing.filter(one => isOpenStatus(one.status))
  const finished = existing.filter(one => !isOpenStatus(one.status)).slice(-FINISHED_SHOWN)

  return [
    'You keep a shared task checklist tidy. Reply with JSON only, no prose.',
    '',
    'Already tracked:',
    [...open, ...finished].length === 0 ? '(none)' : [...open, ...finished].map(one => `- [${one.id}] (${one.status}) ${one.text}${one.detail ? ` — ${one.detail.slice(0, 200)}` : ''}`).join('\n'),
    '',
    'Open questions waiting for an answer:',
    questions.length === 0 ? '(none)' : questions.map(one => `- [${one.id}] ${one.texts.join(' | ')}`).join('\n'),
    '',
    'Candidate tasks:',
    candidates.map((one, index) => `${index}. ${one.text}${one.detail ? ` — ${one.detail.slice(0, 200)}` : ''}`).join('\n'),
    '',
    'For each candidate decide a "verdict": "duplicate" when a tracked task already covers the same work, in any words or language (set "of" to its id); "complements" when it is part of, or adds information to, one tracked task (set "of" to its id and "detail" to only the new information); otherwise "new". Only a todo or doing task can be "of"; work a done or cancelled task covered is "new" when it is needed again.',
    'For a new candidate list "blockedBy": the prerequisites that must be finished or answered before the work can happen, as the id of a tracked task, the id of an open question, or "#<n>" for another candidate. Only real prerequisites; leave it empty when nothing blocks it.',
    'For a new candidate you may also set "priority": "high" only for urgent, blocking or promised-first work, "low" for later or nice-to-have work; omit it otherwise.',
    'Format: {"items":[{"index":0,"verdict":"new|duplicate|complements","of":"id","detail":"optional","blockedBy":["id","#1"],"priority":"high|low"}]}',
  ].join('\n')
}

export const parseReconcile = (reply: string, count: number): Verdict[] | null => {
  const match = /\{[\s\S]*\}/.exec(reply)

  if (!match) {
    return null
  }

  try {
    const value = JSON.parse(match[0]) as { items?: unknown }

    if (!Array.isArray(value.items)) {
      return null
    }

    const byIndex = new Map<number, Verdict>()

    for (const item of value.items as Array<{ index?: unknown; verdict?: unknown; of?: unknown; detail?: unknown; blockedBy?: unknown; priority?: unknown }>) {
      if (typeof item.index === 'number' && item.index >= 0 && item.index < count && ['new', 'duplicate', 'complements'].includes(String(item.verdict))) {
        byIndex.set(item.index, {
          verdict: item.verdict as Verdict['verdict'],
          ...(typeof item.of === 'string' ? { of: item.of } : {}),
          ...(typeof item.detail === 'string' && item.detail.trim() !== '' ? { detail: item.detail.trim() } : {}),
          blockedBy: Array.isArray(item.blockedBy) ? item.blockedBy.filter((one): one is string => typeof one === 'string') : [],
          ...levelOf(item.priority),
        })
      }
    }

    // A candidate the model skipped is new: nothing is lost by a partial answer.
    return Array.from({ length: count }, (_, index) => byIndex.get(index) ?? { verdict: 'new', blockedBy: [] })
  } catch {
    return null
  }
}

// One line for a command or a tool to answer with.
export const reconciledText = (done: Reconciled): string =>
  [`${done.added} added, ${done.merged} merged into existing tasks, ${done.skipped} already tracked${done.linked > 0 ? `, ${done.linked} dependencies set` : ''}${done.capped > 0 ? `, ${done.capped} not added (a checklist holds at most ${CHECKLIST_CAP} tasks)` : ''}`, ...done.notes].join('; ')

// Adds tasks to the checklist without repeating it: what a tracked task already says is skipped,
// what only adds to one is merged into its description, and what is new is added with what it has to wait
// for. The cheap word match goes first; the model (when allowed) decides the rest. Without a model
// the new ones are simply added.
export const reconcileTasks = async (port: Port, incoming: readonly FoundTask[], options: { judge?: string } = {}): Promise<Reconciled> => {
  const existing = await port.checklist.all()
  const fresh = addNew(existing, incoming).slice(existing.length)
  const skippedByWords = incoming.length - fresh.length
  const questions = await port.questions.own(true)
  const result: Reconciled = { added: 0, merged: 0, skipped: skippedByWords, linked: 0, capped: 0, notes: [] }

  if (fresh.length === 0) {
    return result
  }

  let verdicts: Verdict[] = fresh.map(() => ({ verdict: 'new', blockedBy: [] }))

  // A lone task with nothing to compare it with or wait for needs no judgement.
  if (options.judge !== 'heuristic' && (fresh.length > 1 || existing.length > 0 || questions.length > 0)) {
    try {
      const reply = await port.complete({ prompt: buildReconcilePrompt(existing, questions, fresh), maxTokens: 1200 })
      verdicts = (reply.isAnswered ? parseReconcile(reply.text, fresh.length) : null) ?? verdicts
    } catch {
      // The words already ruled out the plain repeats.
    }
  }

  // The id each candidate ends up under: its own when it is added, the task's it folded into otherwise.
  const ids: string[] = []

  for (const verdict of verdicts) {
    // Only an open task can take a candidate in; work a finished task covered is needed again.
    const target = verdict.verdict === 'new' ? undefined : existing.find(one => one.id === verdict.of && isOpenStatus(one.status))
    ids.push(target ? target.id : await port.newId())
  }

  await port.checklist.write(list => {
    let next = [...list]

    fresh.forEach((task, index) => {
      const verdict = verdicts[index] as Verdict
      const target = verdict.verdict === 'new' ? null : next.find(one => one.id === verdict.of && isOpenStatus(one.status))

      if (verdict.verdict === 'new' || !target) {
        // Never drop a tracked task to make room: the candidates that do not fit are not added.
        if (next.length >= CHECKLIST_CAP) {
          result.capped += 1

          return
        }

        // The candidate's own level (the scan read it from the conversation) wins over the judge's.
        const priority = task.priority ?? verdict.priority

        next = [...next, { id: ids[index] as string, text: task.text, status: task.status, ...(task.detail ? { detail: task.detail } : {}), ...(priority && priority !== 'normal' ? { priority } : {}) }]
        result.added += 1

        return
      }

      const extra = verdict.verdict === 'complements' ? (verdict.detail ?? task.detail ?? task.text) : ''
      const joined = [target.detail, extra].filter(Boolean).join('\n')

      if (extra !== '' && joined.length > MAX_DETAIL) {
        result.skipped += 1
        result.notes.push(`"${task.text}" not folded into "${target.text}": its description is full`)
      } else if (extra !== '' && !(target.detail ?? '').includes(extra)) {
        next = withDetail(target.id, joined)(next)
        result.merged += 1
        result.notes.push(`"${task.text}" folded into "${target.text}"`)
      } else {
        result.skipped += 1
      }
    })

    verdicts.forEach((verdict, index) => {
      const id = ids[index] as string
      const isAdded = next.some(one => one.id === id) && !existing.some(one => one.id === id)

      if (!isAdded) {
        return
      }

      for (const ref of verdict.blockedBy) {
        const blocker: Blocker | null = ref.startsWith('#') ? candidateBlocker(ref, ids) : resolveBlocker(ref, next, questions)

        // A finished (or never added) task blocks nothing, so it is neither linked nor counted.
        const isLive = blocker?.kind !== 'task' || next.some(one => one.id === blocker.id && isOpenStatus(one.status))

        if (blocker && isLive && blocker.id !== id) {
          const before = next.find(one => one.id === id)?.blockedBy?.length ?? 0
          next = withBlocker(id, blocker)(next)
          result.linked += (next.find(one => one.id === id)?.blockedBy?.length ?? 0) - before
        }
      }
    })

    return next
  })

  return result
}

// "#2" names another candidate: the task it became, or the one it was folded into.
const candidateBlocker = (ref: string, ids: readonly string[]): Blocker | null => {
  const id = ids[Number(ref.slice(1))]

  return id ? { kind: 'task', id } : null
}
