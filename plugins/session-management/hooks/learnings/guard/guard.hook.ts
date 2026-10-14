import { oneLine } from '../../shared/format/format.hook'
import type { Port } from '../../shared/port/port.hook'
import { INDEX_FILE, memoryNameOf, parseMemoryFile } from '../memory/memory.hook'
import { proposeLearnings, proposedText } from '../reconcile/reconcile.hook'
import { approvalAt } from '../review/review.hook'

// guard: a write to the memory folder is refused and becomes a proposal, unless it carries what the
// user approved (an accepted learning, a fix). observe: every write goes through; the doctor looks at
// what it left. off: nothing is watched.
export type GuardMode = 'guard' | 'observe' | 'off'

export const guardModeOf = (value: unknown): GuardMode => (value === 'observe' || value === 'off' ? value : 'guard')

// A file write as the Write, Edit and MultiEdit tools carry it.
export type MemoryWrite = { tool: string; path: string; text: string }

export type Guarded = { deny?: string; note?: string }

export const writeOf = (tool: string, input: Record<string, unknown>): MemoryWrite | null => {
  const path = typeof input.file_path === 'string' ? input.file_path : null

  if (!path) {
    return null
  }

  if (tool === 'Write') {
    return { tool, path, text: typeof input.content === 'string' ? input.content : '' }
  }

  if (tool === 'Edit') {
    return { tool, path, text: typeof input.new_string === 'string' ? input.new_string : '' }
  }

  if (tool === 'MultiEdit') {
    const edits = Array.isArray(input.edits) ? (input.edits as Array<{ new_string?: unknown }>) : []

    return { tool, path, text: edits.map(edit => (typeof edit.new_string === 'string' ? edit.new_string : '')).join('\n') }
  }

  return null
}

const REVIEW = 'The user reviews memory from the Learnings pane: propose with the learnings tool instead of writing memory files.'

// What to do with a tool call that writes into the memory folder; null when it lets it through. Under
// guard, a write the user did not approve becomes one proposal (an edit's new text, when it is not a
// whole file, is taken as the fact); the index only changes with an approval.
export const guardMemoryWrite = async (port: Port, write: MemoryWrite, mode: GuardMode, options: { judge?: string } = {}): Promise<Guarded | null> => {
  if (mode !== 'guard') {
    return null
  }

  const name = memoryNameOf(write.path, await port.memory.dir())

  if (name === null || (await approvalAt(port)) !== null) {
    return null
  }

  if (name === INDEX_FILE) {
    return { deny: `${INDEX_FILE} changes only with what the user approved. ${REVIEW}` }
  }

  const parsed = parseMemoryFile(write.text)
  const fact = parsed?.text ?? oneLine(write.text)

  if (fact === '') {
    return { deny: `Nothing to remember in that write. ${REVIEW}` }
  }

  const done = await proposeLearnings(port, [{ kind: parsed?.kind ?? 'project', text: fact, why: parsed?.why ?? '', ...(parsed?.how ? { how: parsed.how } : {}) }], options)
  const id = done.ids[0]
  const isQueued = done.added + done.updated + done.contradicting > 0

  return { deny: `${isQueued ? `Not written: proposed as learning [${id}] instead, for the user to accept or reject (${proposedText(done)}).` : `Not written: ${proposedText(done)}.`} ${REVIEW}` }
}
