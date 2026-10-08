import type { ChecklistItem } from '../../../types'
import type { Check, Diagnosis } from '../../shared/diagnosis/diagnosis.hook'
import { formatChecks, plural } from '../../shared/diagnosis/diagnosis.hook'
import { brief } from '../../shared/format/format.hook'
import type { Port } from '../../shared/port/port.hook'
import { sameTask } from '../../shared/similarity/similarity.hook'
import { withBlocker } from '../blockers/blockers.hook'
import { keepBackup } from '../lifecycle/lifecycle.hook'
import { PRIORITIES, byPriority } from '../ops/ops.hook'
import { STATUSES } from '../status/status.hook'

// What is wrong with a checklist and the list with the safe repairs applied, looking only at open
// tasks (todo, doing) unless `isHistoryIncluded` (`--history`). Nothing the
// user wrote is lost except exact repeats: a repair only fixes shape (ids, statuses, titles),
// folds duplicates into the first one, and frees a task stuck in progress after a crash. A blocker
// naming a task that is gone, or (when `questionIds` is given) a question no store knows, is dropped,
// and so is the later blocker of a loop.
export const diagnoseChecklist = (
  list: readonly ChecklistItem[],
  isTurnRunning: boolean,
  isHistoryIncluded = false,
  questionIds?: ReadonlySet<string>,
): Diagnosis<ChecklistItem> => {
  const seen = new Set<string>()
  // A folded duplicate's id -> the id of the task it was folded into, so what waited for it still waits.
  const alias = new Map<string, string>()
  let fixed: ChecklistItem[] = []
  let badIds = 0
  let badStatus = 0
  let badPriority = 0
  let empty = 0
  let long = 0
  let repeats = 0
  let stuck = 0

  for (const original of list) {
    let one = { ...original }

    if (typeof one.text !== 'string' || one.text.trim() === '') {
      empty += 1
      continue
    }

    if (!one.id || seen.has(one.id)) {
      badIds += 1
      one = { ...one, id: `${one.id || 'task'}-${seen.size + 1}` }
    }

    if (!STATUSES.includes(one.status)) {
      badStatus += 1
      one = { ...one, status: 'todo' }
    }

    if (one.priority !== undefined && !PRIORITIES.includes(one.priority)) {
      badPriority += 1
      const { priority: _unknown, ...rest } = one
      one = rest
    }

    // Finished and cancelled tasks are history: only their shape is repaired, never their wording,
    // and a new task that resembles a done one is not a duplicate of it.
    const isActive = isHistoryIncluded || one.status === 'todo' || one.status === 'doing'

    if (isActive && one.text.length > 70 && !one.detail) {
      long += 1
      one = { ...one, ...brief(one.text) }
    }

    if (one.status === 'doing' && !isTurnRunning) {
      stuck += 1
      one = { ...one, status: 'todo' }
    }

    const twin = isActive ? fixed.find(other => (isHistoryIncluded || other.status === 'todo' || other.status === 'doing') && sameTask(other.text, one.text)) : undefined

    if (twin) {
      repeats += 1

      if (!twin.detail && one.detail) {
        twin.detail = one.detail
      }

      alias.set(one.id, twin.id)

      // The dropped twin's own prerequisites stay (a wait on the kept task itself is meaningless).
      const carried = (one.blockedBy ?? []).filter(blocker => !(blocker.kind === 'task' && (blocker.id === twin.id || blocker.id === one.id)))

      if (carried.length > 0) {
        twin.blockedBy = [...(twin.blockedBy ?? []), ...carried]
      }

      continue
    }

    seen.add(one.id)
    fixed.push(one)
  }

  let stale = 0
  let loops = 0
  const taskIds = new Set(fixed.map(one => one.id))

  // Blockers are re-added one by one so that the later blocker of a loop is the one refused.
  const held = fixed

  fixed = held.map(({ blockedBy: _held, ...rest }) => rest)

  for (const original of held) {
    for (const named of original.blockedBy ?? []) {
      const blocker = named.kind === 'task' ? { ...named, id: alias.get(named.id) ?? named.id } : named

      // A wait on its own folded twin is just gone.
      if (blocker.kind === 'task' && blocker.id === original.id && named.id !== original.id) {
        continue
      }

      if (blocker.kind === 'task' ? !taskIds.has(blocker.id) : questionIds !== undefined && !questionIds.has(blocker.id)) {
        stale += 1
        continue
      }

      const before = fixed.find(one => one.id === original.id)?.blockedBy?.length ?? 0
      fixed = withBlocker(original.id, blocker)(fixed)

      if ((fixed.find(one => one.id === original.id)?.blockedBy?.length ?? 0) === before) {
        loops += 1
      }
    }
  }

  const shape: string[] = []
  const wording: string[] = []
  const dependencies: string[] = []
  const priorities: string[] = []

  if (empty > 0) shape.push(`${plural(empty, 'task')} with no text (dropped)`)
  if (badIds > 0) shape.push(`${plural(badIds, 'task')} with a missing or repeated id (renumbered)`)
  if (badStatus > 0) shape.push(`${plural(badStatus, 'task')} with an unknown status (set to todo)`)
  if (badPriority > 0) priorities.push(`${plural(badPriority, 'task')} with an unknown priority (set to normal)`)
  if (long > 0) wording.push(`${plural(long, 'long title')} (cut to a short title, the full text moved to its description)`)
  if (repeats > 0) wording.push(`${plural(repeats, 'duplicate task')} (folded into the first)`)
  if (stuck > 0) wording.push(`${plural(stuck, 'task')} in progress with no turn running (back to todo)`)

  if (stale > 0) dependencies.push(`${plural(stale, 'stale blocker')} (dropped)`)
  if (loops > 0) dependencies.push(`${plural(loops, 'blocker')} in a loop or repeated (dropped)`)

  // The report lists the problems in the order of the checks.
  const checks: Check[] = [
    { label: 'ids and statuses are valid', lines: shape },
    { label: 'no long titles, duplicates or stuck tasks', lines: wording },
    { label: 'dependencies are fine (none stale, none in a loop)', lines: dependencies },
    { label: 'priorities are valid', lines: priorities },
  ]
  const lines = checks.flatMap(check => check.lines)

  return { lines, fixed: byPriority(fixed), checks }
}

// "35 tasks: 2 doing, 18 todo, 13 done, 2 cancelled": what the checklist holds, by status.
const countTasks = (list: readonly ChecklistItem[]): string => {
  const parts = (['doing', 'todo', 'done', 'cancelled'] as const).map(status => ({ status, count: list.filter(one => one.status === status).length })).filter(one => one.count > 0)

  return parts.length === 0 ? plural(list.length, 'task') : `${plural(list.length, 'task')}: ${parts.map(one => `${one.count} ${one.status}`).join(', ')}`
}

// `doctor` reports what is wrong in this session's checklist, `fix` applies the safe repairs (a copy
// is kept for `undo`).
export const runChecklistDoctor = async (port: Port, isFixing: boolean, isHistory: boolean): Promise<string> => {
  const older = (await port.checklist.legacy()).length

  if (isFixing && older > 0) {
    await port.checklist.claimLegacy()
  }

  const list = await port.checklist.all()
  const { lines, fixed, checks } = diagnoseChecklist(list, port.turn.current() !== null, isHistory, new Set((await port.questions.all()).map(one => one.id)))
  const legacy =
    older > 0
      ? [`${plural(older, 'task')} in this folder's older shared checklist ${isFixing ? 'brought into this session' : '(`fix` brings them into this session)'}`]
      : []
  const report = formatChecks(`Checklist doctor · this session${isHistory ? ' · with finished and cancelled tasks (--history)' : ''}`, countTasks(list), checks, legacy)

  if (lines.length + legacy.length === 0) {
    return report.join('\n')
  }

  if (!isFixing) {
    return [...report, 'Run `/checklist fix` to repair what can be repaired.'].join('\n')
  }

  await keepBackup(port, list, fixed)
  await port.checklist.write(() => fixed)

  return ['Fixed:', ...[...legacy, ...lines].map(line => `- ${line}`), 'Dropped tasks come back with `/checklist undo`.'].join('\n')
}
