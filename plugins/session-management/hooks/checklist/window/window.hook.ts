import type { ChecklistStatus } from '../../../types'
import { isOpenStatus } from '../status/status.hook'

export type ListWindow = {
  /** Indexes of every task that qualifies, shown or not: what `start` counts into. */
  rows: number[]
  /** Indexes of the tasks shown, in order. */
  shown: number[]
  /** Where the window starts among the tasks that qualify. */
  start: number
  above: number
  below: number
  /** Finished tasks left out to make room. */
  hidden: number
}

// Arrows and Tab walk a pane's buttons only while the tree fits it, so a long list is cut to a
// window of `room` rows. Finished and cancelled tasks make room first, and the window follows the
// selection (`first` is where the person left it).
export const windowOf = (list: ReadonlyArray<{ status: ChecklistStatus }>, selectedAt: number, first: number, room: number): ListWindow => {
  const rows = list
    .map((_, index) => index)
    .filter(index => list.length <= room || index === selectedAt || isOpenStatus((list[index] as { status: ChecklistStatus }).status))
  const at = rows.indexOf(selectedAt)
  const target = at !== -1 && (at < first || at >= first + room) ? at - Math.floor(room / 2) : first
  const start = Math.max(0, Math.min(target, Math.max(0, rows.length - room)))
  const shown = rows.slice(start, start + room)

  return { rows, shown, start, above: start, below: Math.max(0, rows.length - start - shown.length), hidden: list.length - rows.length }
}
