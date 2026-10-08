import type { ChecklistItem } from '../../../types'
import type { Port } from '../../shared/port/port.hook'
import { CHECKLIST_CAP } from '../ops/ops.hook'

const backupKey = async (port: Port): Promise<string> => `backup:${await port.checklist.key()}`

// Keeps a copy of a list about to change. An empty list or a change that alters nothing never
// replaces the copy, so a second `clear all`, `rebuild` or `fix` cannot wipe what `undo` would restore.
export const keepBackup = async (port: Port, before: readonly ChecklistItem[], after: readonly ChecklistItem[]): Promise<void> => {
  if (before.length > 0 && JSON.stringify(before) !== JSON.stringify(after)) {
    await port.store.set(await backupKey(port), before)
  }
}

// `clear all` empties a list but keeps a copy, so `undo` can bring it back (items added since stay).
export const cleanChecklist = async (port: Port): Promise<number> => {
  const list = await port.checklist.all()
  await keepBackup(port, list, [])
  await port.checklist.write(() => [])

  return list.length
}

// Brings the copy back once: it is deleted after a restore, so a second `undo` cannot resurrect
// tasks removed since. Returns how many tasks it put back (the cap may leave some out).
export const undoChecklist = async (port: Port): Promise<number> => {
  const key = await backupKey(port)
  const backup = ((await port.store.get(key)) as ChecklistItem[] | undefined) ?? []
  let restored = 0
  let left = 0

  await port.checklist.write(current => {
    const missing = backup.filter(old => !current.some(one => one.id === old.id))
    const back = missing.slice(0, Math.max(0, CHECKLIST_CAP - current.length))
    restored = back.length
    left = missing.length - back.length

    return [...back, ...current]
  })
  // What the cap left out stays in the copy for a later `undo`.
  if (left === 0) {
    await port.store.delete(key)
  }

  return restored
}

// Which checklists exist and when each was last written, so those of conversations nobody came
// back to can go.
export const CHECKLIST_INDEX = 'index:checklists'
export const CHECKLIST_DAYS = 30

export const sweepChecklists = async (port: Port): Promise<number> => {
  const index = ((await port.store.get(CHECKLIST_INDEX)) as Record<string, number> | undefined) ?? {}
  const now = await port.now()
  const mine = await port.checklist.key()
  const gone = Object.entries(index).filter(([key, at]) => key !== mine && now - at > CHECKLIST_DAYS * 86_400_000)

  for (const [key] of gone) {
    await port.store.delete(key)
    await port.store.delete(`backup:${key}`)
  }

  await port.store.set(CHECKLIST_INDEX, Object.fromEntries(Object.entries(index).filter(([key]) => !gone.some(([old]) => old === key))))

  return gone.length
}
