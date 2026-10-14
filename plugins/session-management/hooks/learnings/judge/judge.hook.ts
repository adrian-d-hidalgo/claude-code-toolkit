import type { Learning, LearningKind } from '../../../types'
import { MAX_TITLE } from '../../shared/format/format.hook'
import { isKind } from '../kinds/kinds.hook'
import { LEARNING_RULES } from '../rules/rules.hook'

export type Candidate = Pick<Learning, 'kind' | 'text' | 'why'> & { how?: string }

// What a candidate is to the project: new; the same as a known learning (duplicate); a known learning
// with something added (updates: one learning holds both); the opposite of a known one (contradicts:
// accepting it retires the other); or a convention of the code or process (convention: CLAUDE.md, not memory).
export type LearningVerdict = { verdict: 'new' | 'duplicate' | 'updates' | 'contradicts' | 'convention' | 'decision' | 'general'; of?: string }

const VERDICTS = ['new', 'duplicate', 'updates', 'contradicts', 'convention', 'decision', 'general']

const line = (one: Learning): string => `- [${one.id}] (${one.status}) ${one.kind}: ${one.text} — why: ${one.why.slice(0, 160)}${one.status === 'rejected' && one.reason ? ` — rejected: ${one.reason}` : ''}`

// Asks what each candidate is to the learnings the project already has.
export const buildLearningsReconcilePrompt = (known: readonly Learning[], candidates: readonly Candidate[]): string =>
  [
    "You keep the learnings of a project tidy: durable facts and rules an AI coding assistant remembers across sessions. Reply with JSON only, no prose.",
    '',
    'The rules of a learning:',
    ...LEARNING_RULES.map(rule => `- ${rule}`),
    '',
    'Known learnings (proposed: waiting for the user; accepted: in memory, its id names the file; rejected: the user refused it):',
    known.length === 0 ? '(none)' : known.map(line).join('\n'),
    '',
    'Candidates:',
    candidates.map((one, index) => `${index}. ${one.kind}: ${one.text} — why: ${one.why.slice(0, 200)}${one.how ? ` — how: ${one.how.slice(0, 200)}` : ''}`).join('\n'),
    '',
    'For each candidate decide a "verdict", with "of" set to the known learning it is about:',
    '- "duplicate": a known learning already says it, in any words or language (a rejected one counts).',
    '- "updates": it is about the same rule as a known proposed or accepted learning and adds a detail, a case, a condition or a scope, so the two belong in one learning.',
    '- "contradicts": following it and a known proposed or accepted learning is impossible, or they state opposite facts.',
    '- "convention": a convention of the code, the repository or the process that anyone working on it should follow: naming, folders, file suffixes, tests and gates, env files, how agents run, verify or delegate. It belongs in CLAUDE.md (no "of").',
    '- "decision": a product or architecture decision: how the system works or will work, what a feature does, what is shared or private. It belongs in the project\'s docs (no "of").',
    '- "general": general engineering knowledge, or how a library, a model or an API behaves: true for any project, so nothing to remember (no "of").',
    '- "new": none of these: a preference of the user about how the assistant works (how to do something, what never to do, where to find or get something, what they prefer). Sharing a topic does not make a candidate an update.',
    'Be strict: when in doubt between "new" and convention, decision or general, it is not "new". Agreeing on something with the user does not make it a learning.',
    'Format: {"items":[{"index":0,"verdict":"new|duplicate|updates|contradicts|convention|decision|general","of":"id"}]}',
  ].join('\n')

export const parseLearningVerdicts = (reply: string, count: number): LearningVerdict[] | null => {
  const match = /\{[\s\S]*\}/.exec(reply)

  if (!match) {
    return null
  }

  try {
    const value = JSON.parse(match[0]) as { items?: unknown }

    if (!Array.isArray(value.items)) {
      return null
    }

    const byIndex = new Map<number, LearningVerdict>()

    for (const item of value.items as Array<{ index?: unknown; verdict?: unknown; of?: unknown }>) {
      // An earlier prompt said "refines" for what is now an update.
      const verdict = item.verdict === 'refines' ? 'updates' : String(item.verdict)

      if (typeof item.index === 'number' && item.index >= 0 && item.index < count && VERDICTS.includes(verdict)) {
        byIndex.set(item.index, { verdict: verdict as LearningVerdict['verdict'], ...(typeof item.of === 'string' ? { of: item.of } : {}) })
      }
    }

    // A candidate the model skipped is new: nothing is lost by a partial answer.
    return Array.from({ length: count }, (_, index) => byIndex.get(index) ?? { verdict: 'new' })
  } catch {
    return null
  }
}

// Asks for the one learning that holds a known learning and the candidate that updates it.
export const buildMergePrompt = (known: Learning, candidate: Candidate, source?: string): string =>
  [
    "You merge two learnings an AI coding assistant keeps for a project into one. Reply with JSON only, no prose.",
    '',
    'The rules of a learning:',
    ...LEARNING_RULES.map(rule => `- ${rule}`),
    '',
    'Known learning:',
    full(known, source),
    '',
    'New learning that updates it:',
    `  ${candidate.kind}: ${candidate.text}`,
    `    why: ${candidate.why.slice(0, 2500)}`,
    ...(candidate.how ? [`    how: ${candidate.how.slice(0, 2500)}`] : []),
    '',
    `Write the one learning that says everything both say: "text" is the rule in one line of at most ${MAX_TITLE} characters, "why" where it comes from (both origins when they differ), "how" how to apply it, every concrete detail kept, nothing repeated, as compact as it can be. Write in the language of the known learning.`,
    'Format: {"learning":{"kind":"feedback","text":"...","why":"...","how":"..."}}',
  ].join('\n')

export const parseMerged = (reply: string): NewLearning | null => newLearningOf(jsonOf(reply)?.learning)

// Asks which pairs of the project's learnings cannot both be followed: the doctor's contradiction check.
export const buildConflictPrompt = (list: readonly Learning[]): string =>
  [
    'You review the learnings an AI coding assistant keeps for a project. Reply with JSON only, no prose.',
    '',
    'Learnings:',
    list.map(one => `- [${one.id}] ${one.kind}: ${one.text} — why: ${one.why.slice(0, 160)}`).join('\n'),
    '',
    'List every pair that contradicts: following one makes following the other impossible, or they state opposite facts. Different scopes or merely overlapping topics are not contradictions. Nothing found is an empty list.',
    'Format: {"pairs":[["id","id"]]}',
  ].join('\n')

export const parseConflicts = (reply: string, ids: ReadonlySet<string>): [string, string][] | null => {
  const match = /\{[\s\S]*\}/.exec(reply)

  if (!match) {
    return null
  }

  try {
    const value = JSON.parse(match[0]) as { pairs?: unknown }

    if (!Array.isArray(value.pairs)) {
      return null
    }

    return (value.pairs as unknown[]).flatMap(pair =>
      Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string' && typeof pair[1] === 'string' && pair[0] !== pair[1] && ids.has(pair[0]) && ids.has(pair[1]) ? [[pair[0], pair[1]] as [string, string]] : [],
    )
  } catch {
    return null
  }
}

const jsonOf = (reply: string): Record<string, unknown> | null => {
  const match = /\{[\s\S]*\}/.exec(reply)

  if (!match) {
    return null
  }

  try {
    const value = JSON.parse(match[0]) as unknown

    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
  } catch {
    return null
  }
}

// Asks which learnings say the same thing, or are parts of one rule, so each group becomes one.
export const buildClusterPrompt = (list: readonly Learning[]): string =>
  [
    'You review the learnings an AI coding assistant keeps for a project. Reply with JSON only, no prose.',
    '',
    'Learnings:',
    list.map(one => `- [${one.id}] ${one.kind}: ${one.text}`).join('\n'),
    '',
    'List the groups of learnings that should be one: they say the same thing in other words, or they are parts or cases of one rule. A group has 2 to 6 learnings and a learning is in one group at most. Learnings that only share a topic are not a group. Nothing found is an empty list.',
    'Format: {"groups":[["id","id"]]}',
  ].join('\n')

export const parseClusters = (reply: string, ids: ReadonlySet<string>): string[][] | null => {
  const value = jsonOf(reply)

  if (!value || !Array.isArray(value.groups)) {
    return null
  }

  const used = new Set<string>()

  return (value.groups as unknown[]).flatMap(group => {
    const members = Array.isArray(group) ? [...new Set(group.filter((id): id is string => typeof id === 'string' && ids.has(id) && !used.has(id)))].slice(0, 6) : []

    if (members.length < 2) {
      return []
    }

    members.forEach(id => used.add(id))

    return [members]
  })
}

export type RepairAction = 'rewrite' | 'split' | 'merge' | 'retire' | 'move' | 'keep'

/** `sources`: the whole memory file of each learning that has one, by its id. */
export type RepairItem = { learnings: Learning[]; problems: string[]; sources?: Record<string, string> }

export type NewLearning = { kind: LearningKind; text: string; why: string; how?: string }

export type Repair = { action: RepairAction; reason: string; learnings: NewLearning[]; id?: string }

const ACTIONS: RepairAction[] = ['rewrite', 'split', 'merge', 'retire', 'move', 'keep']

// A learning for the model: the whole memory file when there is one (the ledger's fields only
// summarize it), else its text, why and how.
const full = (one: Learning, source?: string): string =>
  source
    ? [`  [${one.id}] ${one.kind}, its whole memory file:`, ...source.slice(0, 6000).split('\n').map(line => `    | ${line}`)].join('\n')
    : [`  [${one.id}] ${one.kind}: ${one.text}`, `    why: ${one.why.slice(0, 2500)}`, ...(one.how ? [`    how: ${one.how.slice(0, 2500)}`] : [])].join('\n')

// Asks for the repair of each item: the learnings it holds and what is wrong with them. Every repair is
// a concrete change the user accepts or rejects, never a complaint.
export const buildRepairPrompt = (items: readonly RepairItem[]): string =>
  [
    "You repair the learnings an AI coding assistant keeps in its memory for a project. Your repairs are applied as you write them. Reply with JSON only, no prose.",
    '',
    'The rules of a learning:',
    ...LEARNING_RULES.map(rule => `- ${rule}`),
    '',
    'Items (each with its learnings and what is wrong):',
    items.map((item, index) => [`${index}. problems: ${item.problems.join('; ')}`, ...item.learnings.map(one => full(one, item.sources?.[one.id]))].join('\n')).join('\n\n'),
    '',
    'For each item give the one repair that fixes every problem listed:',
    '- "rewrite": one learning that replaces the item\'s learning.',
    '- "split": two or more learnings, one fact each, that replace it.',
    '- "merge": one learning that replaces every learning of the item (they say the same thing or are parts of one rule).',
    '- for contradicting learnings: "merge" into one learning that states what holds now, or "retire" with "id" set to the learning that no longer holds.',
    '- "retire": the learning no longer holds or is superseded, and nothing replaces it ("id" names it when the item has several).',
    '- "move": it is a convention of the project\'s code or process that belongs in CLAUDE.md rather than in memory.',
    '- "keep": only when every problem listed is a false alarm.',
    'When a problem is length or wording, compact: cut repetition, filler, narration of how it was found, hedging and restated context, aiming for half the length or less; keep every concrete detail. Every rewrite, split or merge is also tightened this way.',
    `Every learning you write: "text" is the rule or fact itself in one line of at most ${MAX_TITLE} characters (never a lead-in such as "Two rules:"); "why" says where it comes from; "how" (optional) says how to apply it; neither repeats the text. Keep every concrete detail the originals carry (names, numbers, absolute dates, files, examples) by moving it to the why or the how, never by dropping it. Write in the language the learning is written in. "kind" is user, feedback, project or reference. A relative date becomes absolute when the learning gives the day, and is dropped otherwise. A reference to "this session" or "this conversation" is rewritten so it makes sense in any later session. A path that no longer exists is dropped from the wording, or the learning is retired when it is only about that path.`,
    '"reason" is one short sentence in English saying what was wrong, shown to the user.',
    'Format: {"repairs":[{"index":0,"action":"rewrite|split|merge|retire|move|keep","id":"for retire on several","learnings":[{"kind":"feedback","text":"...","why":"...","how":"..."}],"reason":"..."}]}',
  ].join('\n')

const newLearningOf = (value: unknown): NewLearning | null => {
  const one = value as { kind?: unknown; text?: unknown; why?: unknown; how?: unknown }

  if (typeof one?.text !== 'string' || one.text.trim() === '' || typeof one.why !== 'string') {
    return null
  }

  return { kind: isKind(one.kind) ? one.kind : 'project', text: one.text.trim(), why: one.why.trim(), ...(typeof one.how === 'string' && one.how.trim() !== '' ? { how: one.how.trim() } : {}) }
}

// The repairs by item; an item the model skipped, or answered in a shape its action does not take, has none.
export const parseRepairs = (reply: string, items: readonly RepairItem[]): (Repair | null)[] | null => {
  const value = jsonOf(reply)

  if (!value || !Array.isArray(value.repairs)) {
    return null
  }

  const byIndex = new Map<number, Repair>()

  for (const raw of value.repairs as Array<{ index?: unknown; action?: unknown; id?: unknown; learnings?: unknown; reason?: unknown }>) {
    const item = typeof raw.index === 'number' ? items[raw.index] : undefined
    const action = ACTIONS.find(one => one === raw.action)

    if (!item || !action) {
      continue
    }

    const learnings = (Array.isArray(raw.learnings) ? raw.learnings : []).map(newLearningOf).filter((one): one is NewLearning => one !== null)
    const id = typeof raw.id === 'string' && item.learnings.some(one => one.id === raw.id) ? raw.id : item.learnings.length === 1 ? item.learnings[0]?.id : undefined
    const isValid =
      action === 'keep' ||
      ((action === 'rewrite' || action === 'merge') && learnings.length === 1) ||
      (action === 'split' && learnings.length >= 2) ||
      ((action === 'retire' || action === 'move') && id !== undefined)

    if (isValid) {
      byIndex.set(raw.index as number, { action, reason: typeof raw.reason === 'string' && raw.reason.trim() !== '' ? raw.reason.trim() : 'the doctor found a problem', learnings, ...(id ? { id } : {}) })
    }
  }

  return items.map((_, index) => byIndex.get(index) ?? null)
}

// Asks which learnings are hard to read: unclear, padded, narrated, or saying in many words what fits in few.
export const buildWordingPrompt = (list: readonly Learning[]): string =>
  [
    'You review how the learnings an AI coding assistant keeps for a project are written. Reply with JSON only, no prose.',
    '',
    'Learnings:',
    list.map(one => [`- [${one.id}] ${one.text}`, `  why: ${one.why.slice(0, 800)}`, ...(one.how ? [`  how: ${one.how.slice(0, 800)}`] : [])].join('\n')).join('\n'),
    '',
    'List the learnings whose wording should be rewritten: the rule is unclear or buried, the text is padded or narrates how it was found, or the why and how say in many words what fits in few. A learning that is clear and tight is not listed, however long its details are. "reason" is one short sentence in English.',
    'Format: {"items":[{"id":"id","reason":"..."}]}',
  ].join('\n')

export const parseWording = (reply: string, ids: ReadonlySet<string>): Map<string, string> | null => {
  const value = jsonOf(reply)

  if (!value || !Array.isArray(value.items)) {
    return null
  }

  const found = new Map<string, string>()

  for (const item of value.items as Array<{ id?: unknown; reason?: unknown }>) {
    if (typeof item.id === 'string' && ids.has(item.id)) {
      found.set(item.id, typeof item.reason === 'string' && item.reason.trim() !== '' ? item.reason.trim() : 'hard to read')
    }
  }

  return found
}

// Asks under which heading of MEMORY.md each learning's line belongs.
export const buildSectionPrompt = (headings: readonly string[], list: readonly Learning[]): string =>
  [
    "You keep the index (MEMORY.md) of an AI coding assistant's memory tidy. Reply with JSON only, no prose.",
    '',
    'Its headings:',
    headings.length === 0 ? '(none)' : headings.map(heading => `- ${heading}`).join('\n'),
    '',
    'Learnings without a line in the index:',
    list.map(one => `- [${one.id}] ${one.kind}: ${one.text}`).join('\n'),
    '',
    'For each learning give the heading its line belongs under, written exactly as listed. When none fits, give a short new heading in the language the headings use, the same one for the learnings that go together.',
    'Format: {"items":[{"id":"id","section":"heading"}]}',
  ].join('\n')

export const parseSections = (reply: string, ids: ReadonlySet<string>): Map<string, string> | null => {
  const value = jsonOf(reply)

  if (!value || !Array.isArray(value.items)) {
    return null
  }

  const sections = new Map<string, string>()

  for (const item of value.items as Array<{ id?: unknown; section?: unknown }>) {
    if (typeof item.id === 'string' && ids.has(item.id) && typeof item.section === 'string' && item.section.trim() !== '') {
      sections.set(item.id, item.section.trim().replace(/^#+\s*/, '').slice(0, 80))
    }
  }

  return sections
}

// What a stretch of conversation can teach, the same bar for every turn and every scan.
const WORTH = [
  'A learning is a preference of the user about how the assistant works: how to do something ("do it this way"), what never to do ("no, never that"), where to find or get something ("the specs are in that dashboard"), what they prefer ("short answers").',
  'Not worth one: a convention of the code or the process (CLAUDE.md), a product or architecture decision (the docs), general engineering knowledge or how a library or API behaves, what the repository already says, the task of the moment, and anything the assistant decided, designed or explained. Most stretches teach nothing.',
  'Take it only from what the user said themselves, and at most two per stretch.',
]

const EXTRACT_FORMAT = 'Format: {"learnings":[{"kind":"user|feedback|project|reference","text":"...","why":"...","how":"..."}]}, or {"learnings":[]} when there is nothing.'

const knownLines = (known: readonly Learning[]): string => (known.length === 0 ? '(none)' : known.map(line).join('\n'))

export type Exchange = { user: string; assistant: string }

// Asks a small model what a stretch of the conversation (a turn, or several for a scan) teaches.
export const buildExtractPrompt = (known: readonly Learning[], exchanges: readonly Exchange[], today: string): string =>
  [
    'You read part of a conversation between a user and an AI coding assistant and pick out what the assistant should remember across sessions. Reply with JSON only, no prose.',
    '',
    'The rules of a learning:',
    ...LEARNING_RULES.map(rule => `- ${rule}`),
    '',
    ...WORTH,
    `Write each learning in the language the user writes in. The why says what happened and when: today is ${today}.`,
    '',
    'Known learnings (in memory, waiting in the queue, or refused by the user; skip what they already say, in any words):',
    knownLines(known),
    '',
    'Conversation:',
    exchanges.map(one => `User: ${one.user.slice(0, 1500)}\nAssistant: ${one.assistant.slice(0, 2500)}`).join('\n\n'),
    '',
    EXTRACT_FORMAT,
  ].join('\n')

// The same question for the session's own model, which sees the whole conversation.
export const buildForkLearningsPrompt = (known: readonly Learning[], today: string): string =>
  [
    'Do not use tools. List what you should remember from this whole conversation across sessions, for this project or this user.',
    'The rules of a learning:',
    ...LEARNING_RULES.map(rule => `- ${rule}`),
    ...WORTH,
    `Write each learning in the language the user writes in. The why says what happened and when: today is ${today}.`,
    'Skip what these known learnings already say (in memory, waiting in the queue, or refused by the user):',
    knownLines(known),
    `Reply with JSON only. ${EXTRACT_FORMAT}`,
  ].join('\n')

export const parseExtracted = (reply: string): NewLearning[] | null => {
  const value = jsonOf(reply)?.learnings

  return Array.isArray(value) ? value.flatMap(item => newLearningOf(item) ?? []) : null
}
