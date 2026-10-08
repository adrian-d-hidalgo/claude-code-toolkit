import { brief } from '../../shared/format/format.hook'
import type { Port } from '../../shared/port/port.hook'
import { resolveBlocker, withBlocker, withoutBlocker } from '../blockers/blockers.hook'
import { reconcileTasks, reconciledText } from '../reconcile/reconcile.hook'
import type { Priority } from '../../../types'
import { CHECKLIST_CAP, MAX_DETAIL, PRIORITIES, describe, hasRoom, moveInLevel, withDetail, withPriority, withStatus, withText, without } from '../ops/ops.hook'
import { STATUSES, isOpenStatus } from '../status/status.hook'

export const CHECKLIST_TOOL_SPEC = {
  name: 'checklist',
  description:
    'Read or change the shared checklist the user also sees and edits. Actions: list, add (text, optional detail, priority and blockedBy; a task the checklist already has is not added twice, and one that only adds to a task is folded into its description), block (id, blockedBy: ids of the tasks or open questions it must wait for), unblock (id, optional blockedBy to drop only those), status (id, status todo|doing|done|cancelled), edit (id, text, detail and/or priority), move (id, position within its priority level), remove (id). Priority is high|normal|low; the list is sorted by it, and move only reorders within a level. Keep titles short and put the rest in detail. Use it to keep the checklist current as you work.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'add', 'block', 'unblock', 'status', 'edit', 'move', 'remove'] },
      id: { type: 'string' },
      position: { type: 'number', description: 'move: the new 1-based position; it only reorders within the task\'s priority level.' },
      text: { type: 'string', description: 'Short title, one line.' },
      detail: { type: 'string', description: 'Longer description shown in the task detail view.' },
      status: { type: 'string', enum: STATUSES },
      priority: { type: 'string', enum: PRIORITIES, description: 'add/edit: high|normal|low (default normal). The list is sorted by it; move only reorders within a level.' },
      blockedBy: { type: 'array', items: { type: 'string' }, description: 'Ids of the tasks or open questions this task waits for.' },
    },
    required: ['action'],
  },
}

export type ChecklistCall = { action?: string; id?: string; text?: string; detail?: string; status?: string; position?: number; priority?: string; blockedBy?: string[] }

// What the model's `checklist` tool answers: the whole checklist after the change, with a note
// first when the change was refused or did nothing.
export const callChecklistTool = async (port: Port, call: ChecklistCall, options: { judge?: string } = {}): Promise<string> => {
  const status = STATUSES.find(one => one === call.status)
  const priority: Priority | undefined = PRIORITIES.find(one => one === call.priority)
  const text = typeof call.text === 'string' ? call.text.trim() : ''
  // A string would iterate by character: only a real array names blockers.
  const refs = Array.isArray(call.blockedBy) ? call.blockedBy.filter((one): one is string => typeof one === 'string' && one.trim() !== '') : undefined
  let note = ''

  if (call.priority !== undefined && !priority) {
    return 'Invalid priority: use high, normal or low.'
  }

  const known = (await port.checklist.all()).find(one => one.id === call.id)
  const needsTask = ['block', 'unblock', 'status', 'edit', 'remove'].includes(call.action ?? '')

  if (call.action === 'add' && text) {
    if (!hasRoom(await port.checklist.all())) {
      note = `The checklist is full (${CHECKLIST_CAP} tasks): remove some first.`
    } else {
      const before = new Set((await port.checklist.all()).map(one => one.id))
      // The title is cut short; the rest of the text and the given description both stay as the description.
      const short = brief(text)
      const description = [short.detail, call.detail?.trim()].filter(Boolean).join('\n').slice(0, MAX_DETAIL)
      const done = await reconcileTasks(port, [{ text: short.text, ...(description ? { detail: description } : {}), status: 'todo', ...(priority && priority !== 'normal' ? { priority } : {}) }], options)
      const created = (await port.checklist.all()).find(one => !before.has(one.id))
      const questions = await port.questions.own(true)

      for (const ref of refs ?? []) {
        const blocker = created ? resolveBlocker(ref, await port.checklist.all(), questions) : null

        if (created && blocker) {
          await port.checklist.write(withBlocker(created.id, blocker))
        }
      }

      note = created ? `Added [${created.id}].` : reconciledText(done)
    }
  } else if (needsTask && call.id && !known) {
    note = `Unknown task ${call.id}.`
  } else if ((call.action === 'block' || call.action === 'unblock') && call.id) {
    const questions = await port.questions.own(true)
    const notes: string[] = []

    if (call.action === 'block' && (refs ?? []).length === 0) {
      notes.push('Nothing blocked: blockedBy must list the ids of the tasks or open questions it waits for.')
    } else if (call.action === 'unblock' && call.blockedBy !== undefined && (refs ?? []).length === 0) {
      notes.push('Nothing unblocked: blockedBy is empty; leave it out to drop every blocker.')
    }

    for (const ref of refs ?? []) {
      const list = await port.checklist.all()
      const blocker = resolveBlocker(ref, list, questions)
      const target = list.find(one => one.id === ref)

      if (!blocker) {
        notes.push(`Unknown task or open question ${ref}.`)
      } else if (call.action === 'unblock') {
        await port.checklist.write(withoutBlocker(call.id as string, blocker))
      } else if (blocker.id === call.id) {
        notes.push('Not blocked: a task cannot wait for itself.')
      } else if (target && !isOpenStatus(target.status)) {
        notes.push(`Not blocked by ${ref}: it is already ${target.status}, so it blocks nothing.`)
      } else {
        await port.checklist.write(withBlocker(call.id as string, blocker))

        if (!(await port.checklist.all()).find(one => one.id === call.id)?.blockedBy?.some(held => held.kind === blocker.kind && held.id === blocker.id)) {
          notes.push(`Not blocked by ${ref}: it would make a loop.`)
        }
      }
    }

    if (call.action === 'unblock' && call.blockedBy === undefined) {
      await port.checklist.write(withoutBlocker(call.id))
    }

    note = notes.join(' ')
  } else if (call.action === 'status' && call.id && status) {
    await port.checklist.write(withStatus(call.id, status))
  } else if (call.action === 'edit' && call.id && (text || call.detail !== undefined || priority)) {
    if (call.text !== undefined && !text) {
      note = 'The title cannot be blank; it was left as it was.'
    } else if (text) {
      await port.checklist.write(withText(call.id, text))
    }

    if (call.detail !== undefined) {
      await port.checklist.write(withDetail(call.id, call.detail))
    }

    if (priority) {
      await port.checklist.write(withPriority(call.id, priority))
    }
  } else if (call.action === 'move' && call.id && Number.isInteger(call.position)) {
    const before = await port.checklist.all()
    const from = before.findIndex(one => one.id === call.id)

    if (from === -1 || (call.position as number) < 1) {
      return 'Invalid move: unknown id or position below 1.'
    }

    await port.checklist.write(list => moveInLevel(list, from, Math.min(call.position as number, list.length) - 1).list)

    const after = await port.checklist.all()
    const at = after.findIndex(one => one.id === call.id)

    if (after.map(one => one.id).join() === before.map(one => one.id).join()) {
      note = `Nothing moved: [${call.id}] stays at position ${at + 1}; a task only moves within its priority level.`
    } else if (at !== Math.min(call.position as number, after.length) - 1) {
      note = `Moved to position ${at + 1}, the edge of its priority level.`
    }
  } else if (call.action === 'remove' && call.id) {
    await port.checklist.write(without(call.id))
  } else if (call.action !== 'list') {
    return 'Invalid checklist call: check action, id, text and status.'
  }

  return [note, describe(await port.checklist.all(), await port.questions.own(true))].filter(Boolean).join('\n')
}
