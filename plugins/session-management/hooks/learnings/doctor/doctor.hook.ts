import type { Learning } from '../../../types'
import { plural } from '../../shared/diagnosis/diagnosis.hook'
import type { Port } from '../../shared/port/port.hook'
import type { NewLearning, Repair, RepairItem } from '../judge/judge.hook'
import { buildClusterPrompt, buildConflictPrompt, buildLearningsReconcilePrompt, buildRepairPrompt, buildSectionPrompt, buildWordingPrompt, parseClusters, parseConflicts, parseLearningVerdicts, parseRepairs, parseSections, parseWording } from '../judge/judge.hook'
import { KINDS, needsReview } from '../kinds/kinds.hook'
import { INDEX_FILE, fileOfId, indexHeadings, indexedFiles, memoryIdOf, memoryLearnings } from '../memory/memory.hook'
import { byStatus, without } from '../ops/ops.hook'
import { openApproval } from '../review/review.hook'
import { COMPACT_AT, excerpt, isSuperseded, lintLearning, pathsIn } from '../rules/rules.hook'

// `doctor` diagnoses what is in Claude's memory and in the queue; `fix` repairs all of it. The ledger is
// the mod's and is repaired in place; the memory files are Claude's, so fix asks Claude, in one message,
// to apply the repairs, and keeps a copy of the folder first for `undo`.
export const BACKUP_KEY = 'backup:learnings'
export const MEMORY_BACKUP_KEY = 'backup:memory'

const REPAIR_BATCH = 4
const WORDING_BATCH = 25
const PLACE_BATCH = 25
const EXAMPLES = 3

const norm = (text: string): string => text.toLowerCase().replace(/\s+/g, ' ').trim()

const ask = async <T>(port: Port, prompt: string, maxTokens: number, parse: (text: string) => T | null): Promise<T | null> => {
  try {
    const reply = await port.complete({ prompt, maxTokens })

    return reply.isAnswered ? parse(reply.text) : null
  } catch {
    return null
  }
}

const chunks = <T>(list: readonly T[], size: number): T[][] => Array.from({ length: Math.ceil(list.length / size) }, (_, index) => list.slice(index * size, index * size + size))

// What fix repairs without judgment: the ledger's shape, and the memory folder's bookkeeping.
export type Housekeeping = {
  /** The ledger repaired. */
  fixed: Learning[]
  lines: string[]
  /** Lines of the index that point at no file. */
  toUnindex: string[]
  /** Files that say word for word what another file says: [the copy, the one kept]. */
  copies: [string, string][]
  /** Files the index does not list. */
  unindexed: string[]
}

// The ledger with its shape repaired (ids, kinds, statuses, links to what is gone), and the memory
// folder's bookkeeping: index lines with no file, copies of a file, files the index does not list.
// What an earlier version stored as accepted is Claude's memory now, not the ledger's: it goes.
export const diagnoseLearnings = (list: readonly Learning[], memory: readonly Learning[], index: string, files: readonly string[]): Housekeeping => {
  const seen = new Set<string>()
  let fixed: Learning[] = []
  let empty = 0
  let badIds = 0
  let badKinds = 0
  let settled = 0

  for (const original of list) {
    let one: Learning = { ...original }

    if (typeof one.text !== 'string' || one.text.trim() === '') {
      empty += 1
      continue
    }

    if (one.status !== 'proposed' && one.status !== 'rejected') {
      settled += 1
      continue
    }

    if (!one.id || seen.has(one.id)) {
      badIds += 1
      one = { ...one, id: `${one.id || 'learning'}-${seen.size + 1}` }
    }

    if (!KINDS.includes(one.kind)) {
      badKinds += 1
      one = { ...one, kind: 'project' }
    }

    if (typeof one.why !== 'string') {
      one = { ...one, why: '' }
    }

    seen.add(one.id)
    fixed.push(one)
  }

  // Links to what is gone are dropped, in the queue and in memory alike.
  const live = new Set([...fixed.map(one => one.id), ...memory.map(one => one.id)])
  let dangling = 0

  fixed = fixed.map(one => {
    const replaces = (one.replaces ?? []).filter(id => live.has(id) && id !== one.id)
    const conflicts = (one.conflicts ?? []).filter(id => live.has(id) && id !== one.id)

    if (replaces.length !== (one.replaces ?? []).length || conflicts.length !== (one.conflicts ?? []).length) {
      dangling += 1
    }

    const { replaces: _replaces, conflicts: _conflicts, ...rest } = one

    return { ...rest, ...(replaces.length > 0 ? { replaces } : {}), ...(conflicts.length > 0 ? { conflicts } : {}) }
  })

  const names = new Set(files.filter(name => name !== INDEX_FILE))
  const indexed = new Set(indexedFiles(index))
  const toUnindex = [...indexed].filter(name => !names.has(name))
  const copies: [string, string][] = []

  for (const [position, one] of memory.entries()) {
    const twin = memory.slice(0, position).find(other => norm(other.text) === norm(one.text) && norm(other.why) === norm(one.why) && norm(other.how ?? '') === norm(one.how ?? ''))

    if (twin?.file && one.file && !copies.some(([copy]) => copy === twin.file)) {
      copies.push([one.file, twin.file])
    }
  }

  const copied = new Set(copies.map(([copy]) => copy))
  const unindexed = [...names].filter(name => !indexed.has(name) && !copied.has(name))
  const lines: string[] = []

  if (empty > 0) lines.push(`${plural(empty, 'entry', 'entries')} of the queue with no text (dropped)`)
  if (settled > 0) lines.push(`${plural(settled, 'entry', 'entries')} an earlier version kept for what is in memory (dropped from the ledger; the files stay)`)
  if (badIds > 0) lines.push(`${plural(badIds, 'entry', 'entries')} with a missing or repeated id (renumbered)`)
  if (badKinds > 0) lines.push(`${plural(badKinds, 'entry', 'entries')} with an unknown kind (set to project)`)
  if (dangling > 0) lines.push(`${plural(dangling, 'proposal')} linked to what is gone (links dropped)`)
  if (toUnindex.length > 0) lines.push(`${plural(toUnindex.length, 'line')} of ${INDEX_FILE} pointing at no file (fix drops them)`)
  if (copies.length > 0) lines.push(`${plural(copies.length, 'memory file')} saying word for word what another says (fix removes the copy)`)

  return { fixed: byStatus(fixed), lines, toUnindex, copies, unindexed }
}

// The paths a learning names that no longer exist. A relative path is only judged when its first folder
// is in the project root: `nodes/main.ts` may well live under a package the learning does not name.
export const stalePaths = async (port: Port, one: Learning): Promise<string[]> => {
  const project = await port.project()
  const missing: string[] = []

  for (const path of pathsIn([one.text, one.why, one.how ?? ''].join('\n'))) {
    if (path.startsWith('~/')) {
      continue
    }

    const relative = path.replace(/^\.\//, '')
    const absolute = path.startsWith('/') ? path : `${project}/${relative}`

    if (!path.startsWith('/') && !(await port.memory.exists(`${project}/${relative.split('/')[0]}`).catch(() => false))) {
      continue
    }

    if (!(await port.memory.exists(absolute).catch(() => true))) {
      missing.push(path)
    }
  }

  return missing
}

export type FindingKind = 'misplaced' | 'rules' | 'stale' | 'long' | 'wording' | 'superseded' | 'cluster' | 'conflict' | 'unindexed'

// What a learning that should not be in memory is instead.
type Place = 'convention' | 'decision' | 'general'

// One thing the doctor found: the learnings it is about (memory ids, or a proposal's) and what is wrong.
export type Finding = { kind: FindingKind; ids: string[]; problems: string[]; place?: Place }

const PLACE_PROBLEM: Record<Place, string> = {
  convention: 'a convention of the code or the process: it belongs in CLAUDE.md',
  decision: "a product or architecture decision: it belongs in the project's docs",
  general: 'general engineering knowledge, true for any project',
}

const FINDING_LABEL: Record<FindingKind, (count: number) => string> = {
  misplaced: count => `${plural(count, 'learning')} that ${count === 1 ? 'is' : 'are'} not a learning: conventions, decisions or general knowledge (fix moves them to CLAUDE.md or the docs, retires them, or takes them out of the queue)`,
  rules: count => `${plural(count, 'learning')} breaking the rules (fix rewrites or splits them)`,
  stale: count => `${plural(count, 'learning')} naming paths that no longer exist (fix rewrites or retires them)`,
  long: count => `${plural(count, 'learning')} longer than they need to be (fix compacts them)`,
  wording: count => `${plural(count, 'learning')} hard to read (fix rewords them)`,
  superseded: count => `${plural(count, 'learning')} that ${count === 1 ? 'says it is' : 'say they are'} superseded (fix retires ${count === 1 ? 'it' : 'them'})`,
  cluster: count => `${plural(count, 'group')} of learnings that say the same thing (fix merges each into one)`,
  conflict: count => `${plural(count, 'contradiction')} between learnings (fix settles each)`,
  unindexed: count => `${plural(count, 'memory file')} missing from ${INDEX_FILE} (fix adds a line under the right heading)`,
}

const ORDER: FindingKind[] = ['misplaced', 'conflict', 'cluster', 'rules', 'stale', 'superseded', 'long', 'wording', 'unindexed']

// Asks, with the door's own verdicts, which learnings are not learnings: a convention, a decision or
// general knowledge. A batch the model does not answer finds nothing.
const misplacedOf = async (port: Port, list: readonly Learning[]): Promise<Map<string, Place>> => {
  const found = new Map<string, Place>()

  for (const batch of chunks(list, PLACE_BATCH)) {
    const verdicts = await ask(port, buildLearningsReconcilePrompt([], batch), 1500, text => parseLearningVerdicts(text, batch.length))

    for (const [index, verdict] of (verdicts ?? []).entries()) {
      const one = batch[index]

      if (one && (verdict.verdict === 'convention' || verdict.verdict === 'decision' || verdict.verdict === 'general')) {
        found.set(one.id, verdict.verdict)
      }
    }
  }

  return found
}

// What is wrong with what is in memory (and, for not being a learning, with what waits in the queue).
export const findFindings = async (port: Port, memory: readonly Learning[], queue: readonly Learning[], unindexed: readonly string[], options: { judge?: string } = {}): Promise<Finding[]> => {
  const findings: Finding[] = []
  // What is not a learning at all is settled first: tidying its wording would be wasted.
  const misplaced = options.judge === 'heuristic' ? new Map<string, Place>() : await misplacedOf(port, [...memory, ...queue.filter(needsReview)])
  const targets = memory.filter(one => !misplaced.has(one.id))

  findings.push(...[...misplaced].map(([id, place]) => ({ kind: 'misplaced' as const, ids: [id], problems: [PLACE_PROBLEM[place]], place })))

  for (const one of targets) {
    const problems = lintLearning(one)
    const missing = await stalePaths(port, one)

    if (isSuperseded(one)) {
      findings.push({ kind: 'superseded', ids: [one.id], problems: ['its text says it is superseded'] })
      continue
    }

    if (problems.length > 0) findings.push({ kind: 'rules', ids: [one.id], problems })
    if (missing.length > 0) findings.push({ kind: 'stale', ids: [one.id], problems: [`names ${missing.length === 1 ? 'a path that no longer exists' : 'paths that no longer exist'}: ${missing.join(', ')}`] })
    if (one.why.length + (one.how ?? '').length > COMPACT_AT) findings.push({ kind: 'long', ids: [one.id], problems: [`the why and the how take ${one.why.length + (one.how ?? '').length} characters`] })
  }

  const live = new Set(targets.map(one => one.id))

  if (options.judge !== 'heuristic' && targets.length >= 2) {
    const groups = (await ask(port, buildClusterPrompt(targets), 2000, text => parseClusters(text, live))) ?? []
    findings.push(...groups.map(ids => ({ kind: 'cluster' as const, ids, problems: ['they say the same thing, or are parts of one rule'] })))

    const known = new Set<string>()

    for (const [a, b] of (await ask(port, buildConflictPrompt(targets), 2000, text => parseConflicts(text, live))) ?? []) {
      const ids = [a, b].sort()

      if (!known.has(ids.join())) {
        known.add(ids.join())
        findings.push({ kind: 'conflict', ids, problems: ['they contradict each other'] })
      }
    }

    const flagged = new Set(findings.filter(one => one.kind === 'rules' || one.kind === 'long' || one.kind === 'superseded').flatMap(one => one.ids))

    for (const batch of chunks(targets.filter(one => !flagged.has(one.id)), WORDING_BATCH)) {
      const found = (await ask(port, buildWordingPrompt(batch), 1500, text => parseWording(text, new Set(batch.map(one => one.id))))) ?? new Map<string, string>()
      findings.push(...[...found].map(([id, reason]) => ({ kind: 'wording' as const, ids: [id], problems: [`wording: ${reason}`] })))
    }
  }

  findings.push(...unindexed.map(memoryIdOf).filter(id => live.has(id)).map(id => ({ kind: 'unindexed' as const, ids: [id], problems: [`not in ${INDEX_FILE}`] })))

  return joinOverlaps(findings)
}

// Groups and contradictions that share a learning become one finding, so one repair settles them all.
export const joinOverlaps = (findings: readonly Finding[]): Finding[] => {
  const joined: Finding[] = []

  for (const finding of findings) {
    if (finding.ids.length < 2) {
      joined.push(finding)
      continue
    }

    const overlapping = joined.filter(other => other.ids.length > 1 && other.ids.some(id => finding.ids.includes(id)))
    const ids = [...new Set([...overlapping.flatMap(other => other.ids), ...finding.ids])]
    const problems = [...new Set([...overlapping.flatMap(other => other.problems), ...finding.problems])]
    const kind: FindingKind = [...overlapping, finding].some(other => other.kind === 'conflict') ? 'conflict' : 'cluster'
    const at = overlapping.length > 0 ? joined.indexOf(overlapping[0] as Finding) : joined.length

    for (const other of overlapping) {
      joined.splice(joined.indexOf(other), 1)
    }

    joined.splice(Math.min(at, joined.length), 0, { kind, ids, problems })
  }

  return joined
}

// The report: a summary per check, with a few examples of what it found, never a line per learning.
const reportOf = (title: string, memory: readonly Learning[], queue: readonly Learning[], housekeeping: Housekeeping, findings: readonly Finding[], isHeuristic: boolean): string[] => {
  const byId = new Map([...memory, ...queue].map(one => [one.id, one]))
  const waiting = queue.filter(needsReview).length
  const lines = [title, `${plural(memory.length, 'memory file')}${waiting > 0 ? ` · ${waiting} waiting for your review in /learnings` : ''}`, '', 'Bookkeeping:']

  lines.push(...(housekeeping.lines.length === 0 ? ['✓ the queue and the memory folder are in order'] : housekeeping.lines.map(line => `✗ ${line}`)))
  lines.push('', 'Memory:')

  for (const kind of ORDER) {
    const found = findings.filter(one => one.kind === kind)

    if (found.length === 0) {
      continue
    }

    lines.push(`✗ ${FINDING_LABEL[kind](found.length)}`)

    if (kind !== 'unindexed') {
      for (const one of found.slice(0, EXAMPLES)) {
        lines.push(`  - ${one.ids.map(id => excerpt(byId.get(id)?.text ?? id, kind === 'cluster' || kind === 'conflict' ? 45 : 60)).join(' / ')}: ${excerpt(one.problems.join(', '), 90)}`)
      }

      if (found.length > EXAMPLES) {
        lines.push(`  - and ${found.length - EXAMPLES} more`)
      }

      lines.push('')
    }
  }

  if (findings.length === 0) {
    lines.push(`✓ nothing${isHeuristic ? ' the local rules can see (judge: heuristic finds no duplicates, contradictions or unclear wording)' : ''}`)
  }

  return lines
}

// One repair of the memory folder, as fix hands it to Claude.
export type Step =
  | { action: 'rewrite' | 'split' | 'merge'; files: string[]; learnings: NewLearning[]; reason: string }
  | { action: 'retire'; files: string[]; reason: string }
  | { action: 'move'; files: string[]; to: 'CLAUDE.md' | 'docs'; reason: string }
  | { action: 'index'; files: string[]; section?: string }
  | { action: 'unindex'; files: string[] }
  | { action: 'uncopy'; files: string[]; of: string }

export type Plan = { steps: Step[]; dropped: number; kept: number; unrepaired: number }

const filesOf = (ids: readonly string[]): string[] => ids.flatMap(id => fileOfId(id) ?? [])

// Every finding becomes a step: what is not a learning is moved or retired (no model needed); the rest
// is written by the model from the whole memory file, with one more try for a repair that still breaks
// the rules. A proposal in the queue that is not a learning leaves the queue here and now.
export const planRepairs = async (port: Port, findings: readonly Finding[], memory: readonly Learning[], housekeeping: Housekeeping, options: { judge?: string } = {}): Promise<Plan> => {
  const plan: Plan = { steps: [], dropped: 0, kept: 0, unrepaired: 0 }
  const byId = new Map(memory.map(one => [one.id, one]))
  const isHeuristic = options.judge === 'heuristic'

  for (const one of findings.filter(item => item.kind === 'misplaced')) {
    const id = one.ids[0] as string
    const reason = one.problems[0] ?? 'it is not a learning'

    if (fileOfId(id) === null) {
      await port.learnings.write(without(id))
      plan.dropped += 1
    } else if (one.place === 'general') {
      plan.steps.push({ action: 'retire', files: filesOf([id]), reason })
    } else {
      plan.steps.push({ action: 'move', files: filesOf([id]), to: one.place === 'decision' ? 'docs' : 'CLAUDE.md', reason })
    }
  }

  const multi = findings.filter(one => one.ids.length > 1)
  const grouped = new Set(multi.flatMap(one => one.ids))

  for (const one of findings.filter(item => item.kind === 'superseded' && !grouped.has(item.ids[0] as string))) {
    plan.steps.push({ action: 'retire', files: filesOf(one.ids), reason: 'its text says it is superseded' })
  }

  // A learning in a group or a contradiction is repaired there, with its own problems along.
  const isWritten = (kind: FindingKind) => kind !== 'unindexed' && kind !== 'superseded' && kind !== 'misplaced'
  const problemsOf = (id: string): string[] => findings.filter(one => one.ids.length === 1 && one.ids[0] === id && isWritten(one.kind)).flatMap(one => one.problems)
  const singles = [...new Set(findings.filter(one => one.ids.length === 1 && isWritten(one.kind)).map(one => one.ids[0] as string))].filter(id => !grouped.has(id))
  const items: RepairItem[] = []

  // The model rewrites from the whole file: lists, steps and examples a file holds would be lost otherwise.
  for (const draft of [...multi.map(one => ({ learnings: one.ids.flatMap(id => byId.get(id) ?? []), problems: [...one.problems, ...one.ids.flatMap(problemsOf)] })), ...singles.flatMap(id => (byId.get(id) ? [{ learnings: [byId.get(id) as Learning], problems: problemsOf(id) }] : []))]) {
    const sources: Record<string, string> = {}

    for (const one of draft.learnings) {
      const text = one.file ? await port.memory.read(one.file) : null

      if (text) {
        sources[one.id] = text
      }
    }

    items.push(Object.keys(sources).length > 0 ? { ...draft, sources } : draft)
  }

  if (isHeuristic) {
    plan.unrepaired += items.length
  } else {
    const repairs: (Repair | null)[] = []

    for (const batch of chunks(items, REPAIR_BATCH)) {
      repairs.push(...((await ask(port, buildRepairPrompt(batch), 8000, text => parseRepairs(text, batch))) ?? batch.map(() => null)))
    }

    const retry = items.flatMap((item, index) => {
      const broken = (repairs[index]?.learnings ?? []).flatMap(one => lintLearning(one))

      return repairs[index] && broken.length > 0 ? [{ index, item: { ...item, problems: [...item.problems, `the last repair still had: ${[...new Set(broken)].join(', ')}`] } }] : []
    })

    for (const batch of chunks(retry, REPAIR_BATCH)) {
      const again = (await ask(port, buildRepairPrompt(batch.map(one => one.item)), 8000, text => parseRepairs(text, batch.map(one => one.item)))) ?? []

      batch.forEach((one, position) => {
        if (again[position]) {
          repairs[one.index] = again[position] as Repair
        }
      })
    }

    for (const [index, item] of items.entries()) {
      const repair = repairs[index]
      const files = filesOf(item.learnings.map(one => one.id))

      if (!repair) {
        plan.unrepaired += 1
      } else if (repair.action === 'keep') {
        plan.kept += 1
      } else if (repair.action === 'retire') {
        plan.steps.push({ action: 'retire', files: repair.id ? filesOf([repair.id]) : files, reason: repair.reason })
      } else if (repair.action === 'move') {
        plan.steps.push({ action: 'move', files: repair.id ? filesOf([repair.id]) : files, to: 'CLAUDE.md', reason: repair.reason })
      } else {
        plan.steps.push({ action: repair.action === 'rewrite' && files.length > 1 ? 'merge' : repair.action, files, learnings: repair.learnings, reason: repair.reason })
      }
    }
  }

  // A file a step already rewrites or takes out gets its index line from that step.
  const touched = new Set(plan.steps.flatMap(step => step.files))
  const toIndex = findings.filter(one => one.kind === 'unindexed').flatMap(one => byId.get(one.ids[0] as string) ?? []).filter(one => one.file && !touched.has(one.file))

  if (toIndex.length > 0) {
    const headings = indexHeadings((await port.memory.read(INDEX_FILE)) ?? '')
    const sections = new Map<string, string>()

    if (!isHeuristic) {
      for (const batch of chunks(toIndex, 40)) {
        for (const [id, section] of (await ask(port, buildSectionPrompt(headings, batch), 2000, text => parseSections(text, new Set(batch.map(one => one.id))))) ?? new Map<string, string>()) {
          sections.set(id, section)
        }
      }
    }

    for (const one of toIndex) {
      plan.steps.push({ action: 'index', files: [one.file as string], ...(sections.get(one.id) ? { section: sections.get(one.id) } : {}) })
    }
  }

  if (housekeeping.toUnindex.length > 0) {
    plan.steps.push({ action: 'unindex', files: housekeeping.toUnindex })
  }

  for (const [copy, of] of housekeeping.copies) {
    plan.steps.push({ action: 'uncopy', files: [copy], of })
  }

  return plan
}

const learningLines = (one: NewLearning): string[] => [`   ${one.kind}: ${one.text}`, `   Why: ${one.why}`, ...(one.how ? [`   How to apply: ${one.how}`] : [])]

const stepLines = (step: Step, index: number): string[] => {
  const files = step.files.join(', ')

  switch (step.action) {
    case 'rewrite':
      return [`${index}. Rewrite ${files} so it says (${step.reason}):`, ...step.learnings.flatMap(learningLines)]
    case 'merge':
      return [`${index}. Merge ${files} into one memory that says (${step.reason}); remove the others and their index lines:`, ...step.learnings.flatMap(learningLines)]
    case 'split':
      return [`${index}. Split ${files} into these memories, one file each (${step.reason}):`, ...step.learnings.flatMap(one => ['   -', ...learningLines(one)])]
    case 'retire':
      return [`${index}. Retire ${files}: delete the file and its index line (${step.reason}).`]
    case 'move':
      return [
        step.to === 'docs'
          ? `${index}. Move ${files} to the project's docs, in the architecture or design document where it fits, then delete the file and its index line (${step.reason}).`
          : `${index}. Move ${files} to the project's CLAUDE.md, in the section where it fits and worded as a project convention, then delete the file and its index line (${step.reason}).`,
      ]
    case 'index':
      return [`${index}. Add ${files} to ${INDEX_FILE}${step.section ? ` under "${step.section}"` : ''}.`]
    case 'unindex':
      return [`${index}. Drop the lines of ${INDEX_FILE} that point at files that do not exist: ${files}.`]
    case 'uncopy':
      return [`${index}. Delete ${files} and its index line: it says word for word what ${step.of} says.`]
  }
}

// The one message fix sends: every step, in order.
export const fixMessage = (steps: readonly Step[]): string =>
  [
    `Repair your memory for this project as listed below, following your own memory instructions (one memory per file with its frontmatter, ${INDEX_FILE} only as the index). Apply exactly these ${plural(steps.length, 'change')} and nothing else, then tell me in a few lines what you did.`,
    '',
    ...steps.flatMap((step, index) => stepLines(step, index + 1)),
  ].join('\n')

const countOf = (steps: readonly Step[]): string => {
  const by = (action: Step['action']) => steps.filter(step => step.action === action).length

  return [
    by('rewrite') > 0 ? plural(by('rewrite'), 'rewrite') : '',
    by('split') > 0 ? plural(by('split'), 'split') : '',
    by('merge') > 0 ? plural(by('merge'), 'merge') : '',
    by('retire') > 0 ? plural(by('retire'), 'retirement') : '',
    steps.filter(step => step.action === 'move' && step.to === 'CLAUDE.md').length > 0 ? `${steps.filter(step => step.action === 'move' && step.to === 'CLAUDE.md').length} to CLAUDE.md` : '',
    steps.filter(step => step.action === 'move' && step.to === 'docs').length > 0 ? `${steps.filter(step => step.action === 'move' && step.to === 'docs').length} to the docs` : '',
    by('index') > 0 ? plural(by('index'), 'index line') : '',
    by('unindex') > 0 ? 'dead index lines dropped' : '',
    by('uncopy') > 0 ? plural(by('uncopy'), 'copy', 'copies') + ' removed' : '',
  ]
    .filter(Boolean)
    .join(', ')
}

export const runLearningsDoctor = async (port: Port, isFixing: boolean, options: { judge?: string } = {}): Promise<string> => {
  const queue = await port.learnings.all()
  const memory = await memoryLearnings(port)
  const files = await port.memory.list()
  const index = (await port.memory.read(INDEX_FILE)) ?? ''
  const housekeeping = diagnoseLearnings(queue, memory, index, files)
  const findings = await findFindings(port, memory, housekeeping.fixed, housekeeping.unindexed, options)
  const isHeuristic = options.judge === 'heuristic'

  if (!isFixing) {
    const report = reportOf('Learnings doctor · this project', memory, housekeeping.fixed, housekeeping, findings, isHeuristic)

    return [...report, '', housekeeping.lines.length + findings.length === 0 ? 'Everything checks out.' : '`/learnings fix` repairs all of it; `/learnings undo` brings it back.'].join('\n').replace(/\n{3,}/g, '\n\n')
  }

  const project = await port.project()
  const session = await port.sessionId()

  if (queue.length > 0) {
    await port.store.set(`${BACKUP_KEY}:${session}`, queue)
  }

  await port.learnings.write(() => housekeeping.fixed)

  const plan = await planRepairs(port, findings, memory, housekeeping, options)

  if (plan.steps.length > 0) {
    const snapshot: Record<string, string> = {}

    for (const name of files) {
      snapshot[name] = (await port.memory.read(name)) ?? ''
    }

    await port.store.set(`${MEMORY_BACKUP_KEY}:${project}`, snapshot)
    await openApproval(port)
    await port.say(fixMessage(plan.steps))
  }

  return [
    'Learnings doctor · fix · this project',
    '',
    ...(housekeeping.lines.length > 0 ? ['Bookkeeping:', ...housekeeping.lines.map(line => `- ${line}`), ''] : []),
    plan.steps.length === 0 ? 'Nothing to change in memory.' : `Asked Claude to repair your memory in one message: ${countOf(plan.steps)}.`,
    ...(plan.dropped > 0 ? [`- ${plural(plan.dropped, 'proposal')} that ${plan.dropped === 1 ? 'was' : 'were'} not a learning taken out of the queue`] : []),
    ...(plan.kept > 0 ? [`- ${plural(plan.kept, 'finding')} the model judged a false alarm, left as they are`] : []),
    ...(plan.unrepaired > 0 ? [`- ${plural(plan.unrepaired, 'finding')} with no repair: ${isHeuristic ? 'they need the model (judge: model)' : 'the model did not answer; run fix again'}`] : []),
    '`/learnings undo` brings the queue and the memory folder back as they were before this fix.',
  ].join('\n')
}

// Empties the review queue (proposals leave the ledger, so they may be proposed again); `isAll` also
// forgets the refusals, which then no longer answer a proposal that comes back. Memory is not touched.
// The ledger is kept first, so `/learnings undo` brings it back.
export const clearLearnings = async (port: Port, isAll = false): Promise<number> => {
  const list = await port.learnings.all()
  const gone = list.filter(one => needsReview(one) || (isAll && one.status === 'rejected'))

  if (gone.length === 0) {
    return 0
  }

  await port.store.set(`${BACKUP_KEY}:${await port.sessionId()}`, list)
  await port.learnings.write(items => gone.reduce((rest, one) => without(one.id)(rest), items))

  return gone.length
}

// Brings back what the last fix, clear or rebuild changed, once: the ledger, and the memory folder as
// fix found it (the files written since are put back word for word; the ones it added go).
export const undoLearnings = async (port: Port): Promise<{ ledger: number; files: number }> => {
  const project = await port.project()
  const session = await port.sessionId()
  const backup = ((await port.store.get(`${BACKUP_KEY}:${session}`)) as Learning[] | undefined) ?? []
  const snapshot = (await port.store.get(`${MEMORY_BACKUP_KEY}:${project}`)) as Record<string, string> | undefined
  let files = 0

  if (backup.length > 0) {
    await port.learnings.write(() => backup)
    await port.store.delete(`${BACKUP_KEY}:${session}`)
  }

  if (snapshot) {
    for (const name of (await port.memory.list()).filter(one => !(one in snapshot))) {
      await port.memory.remove(name)
    }

    for (const [name, text] of Object.entries(snapshot)) {
      if ((await port.memory.read(name)) !== text) {
        await port.memory.write(name, text)
        files += 1
      }
    }

    await port.store.delete(`${MEMORY_BACKUP_KEY}:${project}`)
  }

  return { ledger: backup.length, files }
}
