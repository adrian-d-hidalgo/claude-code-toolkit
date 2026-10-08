import type { ChecklistItem } from '../../../types'
import { oneLine } from '../../shared/format/format.hook'
import type { Port } from '../../shared/port/port.hook'
import { parseChecklistArgs } from '../args/args.hook'
import { backfillChecklist } from '../backfill/backfill.hook'
import { partsOf } from '../../questions/parts/parts.hook'
import { withBlocker, withoutBlocker } from '../blockers/blockers.hook'
import { runChecklistDoctor } from '../doctor/doctor.hook'
import { CHECKLIST_HELP } from '../help/help.hook'
import { cleanChecklist, undoChecklist } from '../lifecycle/lifecycle.hook'
import { CHECKLIST_CAP, hasRoom, moveInLevel, withDetail, withPriority, withStatus, withText, without } from '../ops/ops.hook'
import { isOpenStatus } from '../status/status.hook'
import { cancelTask, runTask } from '../tasks/tasks.hook'

export const CHECKLIST_COMMAND = { name: 'checklist', description: 'Shared task checklist: view, add, edit and mark tasks' }

// What a `/checklist` run answers; `opens` asks the plugin to show the pane.
export type ChecklistCommandResult = { text: string; opens?: true }

export const runChecklistCommand = async (port: Port, args: string, options: { judge?: string }): Promise<ChecklistCommandResult> => {
  const command = parseChecklistArgs(args)

  switch (command.kind) {
    case 'open':
      return { text: 'Checklist pane opened.', opens: true }
    case 'help':
      return { text: CHECKLIST_HELP }
    case 'invalid':
      return { text: `${command.reason}.\n${CHECKLIST_HELP}` }
    case 'doctor':
    case 'fix': {
      return { text: await runChecklistDoctor(port, command.kind === 'fix', command.isHistory) }
    }
    case 'rebuild': {
      const removed = await cleanChecklist(port)

      return { text: `Rebuilt: removed ${removed} task(s). ${await backfillChecklist(port, 'deep', options)} \`/checklist undo\` brings the old ones back.` }
    }
    case 'scan':
      return { text: await backfillChecklist(port, command.mode, options) }
    case 'add': {
      if (!hasRoom(await port.checklist.all())) {
        return { text: `The checklist is full (${CHECKLIST_CAP} tasks): clear done ones or remove some first.` }
      }

      const id = await port.newId()
      await port.checklist.write(list => [...list, { id, text: oneLine(command.text), status: 'todo' }])

      return { text: 'Task added.' }
    }
    case 'undo': {
      const restored = await undoChecklist(port)

      return { text: restored === 0 ? 'Nothing to restore.' : `Restored ${restored} task(s) removed by the last clear all, fix or rebuild.` }
    }
    case 'clear':
      if (command.isAll) {
        return { text: `Removed ${await cleanChecklist(port)} task(s). \`/checklist undo\` brings them back.` }
      }

      await port.checklist.write(list => list.filter(one => one.status !== 'done' && one.status !== 'cancelled'))

      return { text: 'Done and cancelled tasks cleared.' }
    case 'move': {
      const before = await port.checklist.all()

      for (const position of [command.from, command.to]) {
        if (!before[position - 1]) {
          return { text: `No task ${position}.` }
        }
      }

      // A task only moves within its priority level (the list is sorted by it).
      await port.checklist.write(list => moveInLevel(list, command.from - 1, command.to - 1).list)

      const after = await port.checklist.all()
      const at = after.findIndex(one => one.id === (before[command.from - 1] as { id: string }).id)

      if (after.map(one => one.id).join() === before.map(one => one.id).join()) {
        return { text: at === command.from - 1 && command.from !== command.to ? 'Nothing moved: a task only moves within its priority level.' : 'Nothing moved: the task is already there.' }
      }

      return { text: at === command.to - 1 ? 'Task moved.' : `Task moved to position ${at + 1}, the edge of its priority level.` }
    }
    default: {
      // The rest name a task by its position.
      const target = (await port.checklist.all())[command.position - 1]

      if (!target) {
        return { text: `No task ${command.position}.` }
      }

      if (command.kind === 'block' || command.kind === 'unblock') {
        const list = await port.checklist.all()
        // Questions are numbered like the /questions pane does: by part, not by entry. Blockers are
        // per entry, so a blocker on one part of a group holds until the whole entry closes.
        const parts = partsOf(await port.questions.own(true))
        const by = command.by
        const blocking = by?.kind === 'task' ? list[by.position - 1] : undefined
        const asking = by?.kind === 'question' ? parts[by.position - 1]?.one : undefined
        const blocker = blocking ? { kind: 'task' as const, id: blocking.id } : asking ? { kind: 'question' as const, id: asking.id } : undefined

        if (by !== null && !blocker) {
          return { text: `No ${by.kind === 'task' ? 'task' : 'open question'} ${by.position}.` }
        }

        if (command.kind === 'block' && blocker?.kind === 'task' && blocker.id === target.id) {
          return { text: 'A task cannot wait for itself.' }
        }

        // A finished or cancelled task blocks nothing.
        if (command.kind === 'block' && blocking && !isOpenStatus(blocking.status)) {
          return { text: `Not blocked: task ${by?.position} is already ${blocking.status}, so it blocks nothing.` }
        }

        const held = (one: ChecklistItem | undefined) => (one?.blockedBy ?? []).length
        const has = (one: ChecklistItem | undefined) => (one?.blockedBy ?? []).some(old => old.kind === blocker?.kind && old.id === blocker?.id)
        const before = list.find(one => one.id === target.id)

        if (command.kind === 'block' && has(before)) {
          return { text: 'Already blocked by that.' }
        }

        await port.checklist.write(command.kind === 'block' ? withBlocker(target.id, blocker as NonNullable<typeof blocker>) : withoutBlocker(target.id, blocker))
        const after = (await port.checklist.all()).find(one => one.id === target.id)

        if (command.kind === 'unblock') {
          return { text: held(after) < held(before) ? 'Task unblocked.' : 'Nothing to unblock.' }
        }

        // The blocker itself, not just any blocker, tells whether a loop refused it.
        return { text: has(after) ? 'Task blocked.' : 'Not blocked: that would make a loop.' }
      }

      if (command.kind === 'run') {
        return { text: await runTask(port, target.id) }
      }

      if (command.kind === 'cancel') {
        return { text: await cancelTask(port, target.id) }
      }

      const change =
        command.kind === 'edit'
          ? withText(target.id, command.text)
          : command.kind === 'detail'
            ? withDetail(target.id, command.text)
            : command.kind === 'remove'
              ? without(target.id)
              : command.kind === 'priority'
                ? withPriority(target.id, command.priority)
                : withStatus(target.id, command.status)

      await port.checklist.write(change)

      return { text: 'Checklist updated.' }
    }
  }
}
