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
