import type { Learning } from '../../../types'
import type { Port } from '../../shared/port/port.hook'

// Each session has its own ledger, the way it has its own checklist: what it proposed and what the
// user refused there. Only Claude's memory, where an accepted learning ends up, is shared.
export const learningsKey = (session: string): string => `learnings:${session}`

// What earlier versions kept: one ledger for every project, then one per project, keyed by its path.
export const LEGACY_KEY = 'learnings'

const isLegacyKey = (key: string): boolean => key === LEGACY_KEY || (key.startsWith('learnings:') && /[\\/]/.test(key.slice('learnings:'.length)))

// Moves what earlier versions kept to the key of the session that proposed it, once: what waits and
// what was refused; what was accepted is Claude's memory already. A learning a session's key already
// holds is not added twice. Returns how many moved.
export const splitBySession = async (port: Port): Promise<number> => {
  const bySession = new Map<string, Learning[]>()

  for (const key of (await port.store.keys()).filter(isLegacyKey)) {
    for (const one of ((await port.store.get(key)) as Learning[] | undefined) ?? []) {
      if (one.session !== '' && (one.status === 'proposed' || one.status === 'rejected')) {
        bySession.set(one.session, [...(bySession.get(one.session) ?? []), one])
      }
    }

    await port.store.delete(key)
  }

  let moved = 0

  for (const [session, items] of bySession) {
    const key = learningsKey(session)
    const kept = ((await port.store.get(key)) as Learning[] | undefined) ?? []
    const fresh = items.filter((one, at) => !kept.some(other => other.id === one.id) && items.findIndex(other => other.id === one.id) === at)

    if (fresh.length > 0) {
      await port.store.set(key, [...kept, ...fresh])
      moved += fresh.length
    }
  }

  return moved
}

// A session's id can change under a conversation (resume, reattach): its learnings stay under the old
// key. The transcript still holds the learnings tool's calls and answers, which name them by id, so
// the stored ledger whose ids this conversation used is taken over whole, with its backup, as the
// checklist is. What a turn's reading proposed leaves no call in the transcript, so `previous`, the old
// id the checklist or the questions were found under, is the fallback. Returns the session it came from.
export const adoptLearnings = async (port: Port, previous: string | null = null): Promise<{ from: string | null; adopted: number }> => {
  const session = await port.sessionId()
  const mine = learningsKey(session)
  const named = new Set<string>()

  for (const message of await port.messages()) {
    for (const use of message.toolUses) {
      if (use.tool.endsWith('learnings')) {
        const said = `${JSON.stringify(use.input)} ${typeof use.result === 'string' ? use.result : JSON.stringify(use.result ?? '')}`

        for (const word of said.match(/[A-Za-z0-9]+/g) ?? []) {
          named.add(word)
        }
      }
    }
  }

  let best: { key: string; list: Learning[]; hits: number } | null = null

  for (const key of (await port.store.keys()).filter(one => one.startsWith('learnings:') && one !== mine && !isLegacyKey(one))) {
    const list = ((await port.store.get(key)) as Learning[] | undefined) ?? []
    const hits = list.filter(one => named.has(one.id)).length

    if (hits > 0 && (!best || hits > best.hits)) {
      best = { key, list, hits }
    }
  }

  const fallback = previous !== null && previous !== session ? ((await port.store.get(learningsKey(previous))) as Learning[] | undefined) : undefined

  if (!best && fallback !== undefined) {
    best = { key: learningsKey(previous as string), list: fallback, hits: 0 }
  }

  if (!best) {
    return { from: null, adopted: 0 }
  }

  const { key, list } = best
  let adopted = 0

  await port.learnings.write(own => {
    const missing = list.filter(one => !own.some(other => other.id === one.id))
    adopted = missing.length

    return [...own, ...missing.map(one => ({ ...one, session }))]
  })

  const backup = await port.store.get(`backup:${key}`)

  if (backup !== undefined && (await port.store.get(`backup:${mine}`)) === undefined) {
    await port.store.set(`backup:${mine}`, backup)
  }

  await port.store.delete(key)
  await port.store.delete(`backup:${key}`)

  return { from: key.slice('learnings:'.length), adopted }
}

// What an earlier version stored as accepted (and the doctor's repairs and flags on it) is Claude's
// memory now: the ledger keeps only what waits and what was refused. The files are not touched.
export const dropSettled = async (port: Port): Promise<number> => {
  let dropped = 0

  await port.learnings.write(list =>
    list.flatMap(one => {
      const legacy = one as Learning & { repair?: unknown; flag?: unknown; kept?: unknown }

      if (one.status === 'accepted' || legacy.repair !== undefined || legacy.flag !== undefined) {
        dropped += 1

        return []
      }

      const { repair: _repair, flag: _flag, kept: _kept, file: _file, ...rest } = legacy

      return [rest as Learning]
    }),
  )

  return dropped
}
