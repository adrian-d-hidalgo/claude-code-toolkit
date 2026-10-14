import type { ChecklistItem } from '../../../types'
import type { Port } from '../../shared/port/port.hook'
import { CHECKLIST_CAP, byPriority } from '../ops/ops.hook'

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

// One-time move of what an earlier version stored under the session's launch time to the
// conversation's id: the checklist (the live list wins on the same id, the old backup comes
// along), the questions' session, and the per-session copies kept beside them. Does nothing once
// nothing is left under the old key.
export const migrateToId = async (port: Port, launch: string): Promise<boolean> => {
  const id = await port.sessionId()

  if (launch === id) {
    return false
  }

  const older = (await port.store.get(`checklist:${launch}`)) as ChecklistItem[] | undefined
  const questions = (await port.questions.all()).filter(one => one.session === launch)
  const parked = ((await port.store.get('parked:questions')) as Record<string, unknown> | undefined) ?? {}
  const moves = ['backup:checklist', 'closed:questions', 'backup:questions'].map(prefix => [`${prefix}:${launch}`, `${prefix}:${id}`] as const)
  const kept = await Promise.all(moves.map(async ([from]) => port.store.get(from)))

  if (!older && questions.length === 0 && !(launch in parked) && kept.every(one => one === undefined)) {
    return false
  }

  if (older) {
    await port.checklist.write(own => byPriority([...own, ...older.filter(task => !own.some(one => one.id === task.id))].slice(0, CHECKLIST_CAP)))
    await port.store.delete(`checklist:${launch}`)
  }

  if (questions.length > 0) {
    await port.questions.write(list => list.map(one => (one.session === launch ? { ...one, session: id } : one)))
  }

  if (launch in parked) {
    const { [launch]: group, ...rest } = parked
    await port.store.set('parked:questions', { ...rest, [id]: group })
  }

  for (const [index, [from, to]] of moves.entries()) {
    const value = kept[index]

    if (value !== undefined) {
      if ((await port.store.get(to)) === undefined) {
        await port.store.set(to, value)
      }

      await port.store.delete(from)
    }
  }

  const index = ((await port.store.get(CHECKLIST_INDEX)) as Record<string, number> | undefined) ?? {}
  const { [`checklist:${launch}`]: _moved, ...rest } = index
  await port.store.set(CHECKLIST_INDEX, rest)

  return true
}

// A session's id can change under a conversation (resume, reattach): its checklist stays under the
// old key and the pane comes up empty. The transcript still holds the checklist tool's calls and
// answers, which name its tasks by id, so the stored list whose ids this conversation used is taken
// over whole, done and cancelled tasks included, with its backup. Returns the session it came from;
// `isDryRun` only counts the tasks it would bring.
export const adoptChecklist = async (port: Port, isDryRun = false): Promise<{ from: string | null; adopted: number }> => {
  const mine = await port.checklist.key()
  const named = new Set<string>()

  for (const message of await port.messages()) {
    for (const use of message.toolUses) {
      if (use.tool.endsWith('checklist')) {
        const said = `${JSON.stringify(use.input)} ${typeof use.result === 'string' ? use.result : JSON.stringify(use.result ?? '')}`

        for (const word of said.match(/[A-Za-z0-9]+/g) ?? []) {
          named.add(word)
        }
      }
    }
  }

  if (named.size === 0) {
    return { from: null, adopted: 0 }
  }

  const index = ((await port.store.get(CHECKLIST_INDEX)) as Record<string, number> | undefined) ?? {}
  const keys = [...new Set([...Object.keys(index), ...(await port.store.keys()).filter(key => key.startsWith('checklist:'))])].filter(key => key !== mine)
  let best: { key: string; list: ChecklistItem[]; hits: number } | null = null

  for (const key of keys) {
    const list = ((await port.store.get(key)) as ChecklistItem[] | undefined) ?? []
    const hits = list.filter(one => named.has(one.id)).length

    if (hits > 0 && (!best || hits > best.hits)) {
      best = { key, list, hits }
    }
  }

  if (!best) {
    return { from: null, adopted: 0 }
  }

  const { key, list } = best

  if (isDryRun) {
    const own = await port.checklist.all()

    return { from: key.slice('checklist:'.length), adopted: list.filter(task => !own.some(one => one.id === task.id)).length }
  }

  let adopted = 0

  await port.checklist.write(own => {
    const missing = list.filter(task => !own.some(one => one.id === task.id))
    adopted = missing.length

    return byPriority([...own, ...missing].slice(0, CHECKLIST_CAP))
  })

  const backup = await port.store.get(`backup:${key}`)

  if (backup !== undefined && (await port.store.get(`backup:${mine}`)) === undefined) {
    await port.store.set(`backup:${mine}`, backup)
  }

  await port.store.delete(key)
  await port.store.delete(`backup:${key}`)
  const { [key]: _gone, ...rest } = ((await port.store.get(CHECKLIST_INDEX)) as Record<string, number> | undefined) ?? {}
  await port.store.set(CHECKLIST_INDEX, rest)

  return { from: key.slice('checklist:'.length), adopted }
}
