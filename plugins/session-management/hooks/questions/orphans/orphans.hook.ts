import type { Question } from '../../../types'

const DAY = 86_400_000
// A question of another session this quiet is taken as left behind (that session crashed or was
// never reopened); a parked one that nobody resumed is dropped after a longer wait.
export const LEFT_BEHIND_DAYS = 7
export const PARKED_DAYS = 30

export type Parked = Record<string, Question[]>

// A session that ends parks its open questions out of every pane: nobody can answer them
// until it is resumed, and closed ones are history. Resuming gives them back.
export const park = (all: readonly Question[], parked: Parked, session: string): { kept: Question[]; parked: Parked } => {
  const mine = all.filter(one => one.session === session)
  const open = mine.filter(one => one.isOpen)
  const next = { ...parked }
  // A sweep may have parked this session's quiet questions while it was alive: they stay.
  const swept = (parked[session] ?? []).filter(old => !open.some(one => one.id === old.id))

  if (open.length + swept.length > 0) {
    next[session] = [...swept, ...open]
  } else {
    delete next[session]
  }

  return { kept: all.filter(one => one.session !== session), parked: next }
}

// What a resumed session gets back, minus anything it already tracks again.
export const restore = (all: readonly Question[], parked: Parked, session: string): { list: Question[]; parked: Parked } => {
  const back = (parked[session] ?? []).filter(old => !all.some(one => one.id === old.id))
  const next = { ...parked }
  delete next[session]

  return { list: [...all, ...back], parked: next }
}

// Run when a session starts, so nothing outlives its session for long: other sessions' questions
// that went quiet are parked (or dropped when they have no session at all, the entries from before
// sessions were tracked), and parked ones nobody resumed expire.
export const sweep = (
  all: readonly Question[],
  parked: Parked,
  session: string,
  now: number,
): { list: Question[]; parked: Parked; moved: number; dropped: number } => {
  const next: Parked = {}
  let moved = 0
  let dropped = 0
  const list: Question[] = []

  for (const [id, group] of Object.entries(parked)) {
    const fresh = group.filter(one => now - one.at <= PARKED_DAYS * DAY)
    dropped += group.length - fresh.length

    if (fresh.length > 0) {
      next[id] = fresh
    }
  }

  for (const one of all) {
    const isStale = one.session !== session && now - one.at > LEFT_BEHIND_DAYS * DAY

    if (!isStale) {
      list.push(one)
    } else if (!one.session || !one.isOpen) {
      dropped += 1
    } else {
      next[one.session] = [...(next[one.session] ?? []), one]
      moved += 1
    }
  }

  return { list, parked: next, moved, dropped }
}
