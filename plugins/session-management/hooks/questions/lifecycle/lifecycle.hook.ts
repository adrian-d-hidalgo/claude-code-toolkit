import type { Question } from '../../../types'
import type { Port } from '../../shared/port/port.hook'
import { sameQuestion } from '../../shared/similarity/similarity.hook'
import { extractQuestions } from '../extract/extract.hook'
import { countParts } from '../parts/parts.hook'
import { park, restore, sweep } from '../orphans/orphans.hook'
import type { Parked } from '../orphans/orphans.hook'

export const loadParked = async (port: Port): Promise<Parked> => ((await port.store.get('parked:questions')) as Parked | undefined) ?? {}

// What a session's person closed or dismissed, kept after the entries themselves are dropped
// (parked, cleared): a later scan of the transcript must not bring those questions back.
const MAX_CLOSED = 100
const closedKey = (session: string) => `closed:questions:${session}`

export const loadClosed = async (port: Port): Promise<string[]> => {
  const found = await port.store.get(closedKey(await port.sessionId()))

  return Array.isArray(found) ? found.filter((text): text is string => typeof text === 'string') : []
}

export const rememberClosed = async (port: Port, texts: readonly string[]) => {
  if (texts.length > 0) {
    const next = [...new Set([...(await loadClosed(port)), ...texts])].slice(-MAX_CLOSED)
    await port.store.set(closedKey(await port.sessionId()), next)
  }
}

// The copy `undo` restores. An empty list never replaces a copy that holds something: running
// `clear all` twice must not lose the first one.
export const keepBackup = async (port: Port, own: readonly Question[]) => {
  const key = `backup:questions:${await port.sessionId()}`
  const kept = (await port.store.get(key)) as Question[] | undefined

  if (own.length > 0 || !kept || kept.length === 0) {
    await port.store.set(key, own)
  }
}

// `clear all` empties this session's questions but keeps a copy, so `undo` can bring them back
// (what was added since stays). Other sessions' questions are never touched.
export const cleanQuestions = async (port: Port): Promise<Question[]> => {
  const session = await port.sessionId()
  const own = await port.questions.own(false)
  await keepBackup(port, own)
  await port.questions.write(list => list.filter(one => one.session !== session))

  return own
}

// Brings back what the last `clear all`, `fix` or `rebuild` removed and returns what came back
// (entries that are still there do not count). The copy is used up.
export const undoQuestions = async (port: Port): Promise<Question[]> => {
  const session = await port.sessionId()
  const backup = ((await port.store.get(`backup:questions:${session}`)) as Question[] | undefined) ?? []
  let restored: Question[] = []
  await port.questions.write(current => {
    const back = backup.filter(old => !current.some(one => one.id === old.id))
    restored = back

    return [...back, ...current]
  })
  await port.store.delete(`backup:questions:${session}`)

  return restored
}

// Nothing outlives its session for long: a session that ends parks its open questions (a resume
// gives them back), and the next one to start sweeps what others left behind.
export const parkOwn = async (port: Port) => {
  const session = await port.sessionId()
  const all = await port.questions.all()
  const { parked } = park(all, await loadParked(port), session)
  await rememberClosed(
    port,
    all.filter(one => one.session === session && !one.isOpen).flatMap(one => one.texts),
  )
  await port.store.set('parked:questions', parked)
  await port.store.delete(`backup:questions:${session}`)
  await port.questions.write(list => list.filter(one => one.session !== session))
}

export const restoreAndSweep = async (port: Port) => {
  const session = await port.sessionId()
  const parked = await loadParked(port)
  const now = await port.now()
  let next: Parked = parked

  // Worked out on the list as it is when written, so a question another session added meanwhile stays.
  await port.questions.write(list => {
    const back = restore(list, parked, session)
    const swept = sweep(back.list, back.parked, session, now)
    next = swept.parked

    return swept.list
  })
  await port.store.set('parked:questions', next)
}

const flat = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase()

// A session's id can change under a conversation (resumed, reattached): its questions then sit
// under the old id and the pane, which shows this session's, comes up empty. The conversation
// itself still holds what was asked, so open questions of another id that this transcript asked
// (verbatim, or the same question in other words) are taken over. `isDryRun` only counts them (things asked, as the person counts them).
export const adoptFromTranscript = async (port: Port, isDryRun = false): Promise<number> => {
  const asked = (await port.messages()).filter(message => message.role === 'assistant')

  if (asked.length === 0) {
    return 0
  }

  const corpus = flat(asked.map(message => message.text).join(' '))
  const dialogs = asked.flatMap(message =>
    message.toolUses.flatMap(use =>
      use.tool === 'AskUserQuestion' && Array.isArray(use.input.questions)
        ? (use.input.questions as Array<{ question?: unknown }>).flatMap(item => (typeof item.question === 'string' ? [item.question] : []))
        : [],
    ),
  )
  const sentences = [...asked.flatMap(message => extractQuestions(message.text)), ...dialogs]
  const belongs = (one: Question) => one.texts.some(text => corpus.includes(flat(text)) || sentences.some(sentence => sameQuestion(sentence, text)))
  const session = await port.sessionId()
  const project = await port.root()
  const all = await port.questions.all()
  const parked = await loadParked(port)
  const taken = all.filter(one => one.session !== session && one.isOpen && belongs(one))
  const back = Object.entries(parked).flatMap(([id, group]) => (id === session ? [] : group.filter(belongs)))

  if (isDryRun || taken.length + back.length === 0) {
    return countParts(taken) + countParts(back)
  }

  const ids = new Set(taken.map(one => one.id))
  const mine = (one: Question): Question => ({ ...one, session, project })
  await port.questions.write(list => [
    ...list.map(one => (ids.has(one.id) ? mine(one) : one)),
    ...back.filter(one => !list.some(other => other.id === one.id)).map(mine),
  ])
  await port.store.set(
    'parked:questions',
    Object.fromEntries(Object.entries(parked).map(([id, group]) => [id, group.filter(one => !back.includes(one))]).filter(([, group]) => (group as Question[]).length > 0)),
  )

  return countParts(taken) + countParts(back)
}
