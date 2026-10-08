import type { Port } from '../../shared/port/port.hook'
import { activeBlockers } from '../blockers/blockers.hook'
import { withStatus } from '../ops/ops.hook'

// Starts a task now: it becomes in progress and the model is asked to do it ahead of the rest.
export const runTask = async (port: Port, id: string): Promise<string> => {
  const item = (await port.checklist.all()).find(one => one.id === id)

  if (!item || item.status === 'doing' || item.status === 'done') {
    return 'Nothing to run.'
  }

  const waiting = activeBlockers(item, await port.checklist.all(), await port.questions.own(true))

  if (waiting.length > 0) {
    return `Blocked: ${item.text} waits for ${waiting.map(one => `${one.kind} "${one.label}"`).join(', ')}. Finish or unblock it first.`
  }

  await port.checklist.write(withStatus(id, 'doing'))
  await port.say(
    `Run this checklist task now, ahead of the others: "${item.text}" (id ${id}).${item.detail ? ` Details: ${item.detail}` : ''} Mark it done in the checklist when it is finished.`,
  )

  return `Running: ${item.text}`
}

// Cancels a task. A task not started only needs the mark (the next prompt carries it);
// one in progress also ends the running turn and tells the model to stop, background
// agents included.
export const cancelTask = async (port: Port, id: string): Promise<string> => {
  const item = (await port.checklist.all()).find(one => one.id === id)

  if (!item || item.status === 'cancelled') {
    return 'Nothing to cancel.'
  }

  await port.checklist.write(withStatus(id, 'cancelled'))

  if (item.status !== 'doing') {
    return `Cancelled: ${item.text}`
  }

  const turn = port.turn.current()

  if (turn !== null) {
    try {
      await port.turn.abort(turn)
    } catch {
      // The turn ended on its own; the notice below still goes out.
    }
  }

  await port.say(
    `The user cancelled this checklist task: "${item.text}" (id ${id}). Stop any work on it, background agents included, and continue with the remaining tasks.`,
  )

  return `Cancelled and signalled the model: ${item.text}`
}
