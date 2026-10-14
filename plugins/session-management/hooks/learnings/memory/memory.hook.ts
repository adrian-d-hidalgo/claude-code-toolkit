import type { Learning, LearningKind } from '../../../types'
import { oneLine } from '../../shared/format/format.hook'
import type { Port } from '../../shared/port/port.hook'
import { isKind } from '../kinds/kinds.hook'

export const INDEX_FILE = 'MEMORY.md'

// Claude's auto-memory of a project: `<config dir>/projects/<the working directory, every
// non-alphanumeric character as a dash>/memory`. The config dir is `CLAUDE_CONFIG_DIR`, else `~/.claude`.
export const memoryDirOf = (home: string, configDir: string | undefined, cwd: string): string =>
  `${(configDir ?? `${home}/.claude`).replace(/\/+$/, '')}/projects/${cwd.replace(/[^a-zA-Z0-9]/g, '-')}/memory`

// Whether a path (as a tool was given it) lands inside the memory folder; the file's name when it does.
export const memoryNameOf = (path: string, dir: string): string | null => {
  const clean = path.replace(/\/+$/, '')

  return clean.startsWith(`${dir}/`) ? clean.slice(dir.length + 1) : null
}

export type ParsedMemory = { kind: LearningKind; text: string; why: string; how?: string }

const unquote = (text: string): string => {
  const trimmed = text.trim()

  if (/^".*"$/.test(trimmed)) {
    try {
      return String(JSON.parse(trimmed))
    } catch {
      return trimmed.slice(1, -1)
    }
  }

  return trimmed.replace(/^'(.*)'$/, '$1')
}

// A memory file back into a learning, best effort: the type from the frontmatter (top level or
// under metadata), the fact from the first body line (a heading counts) whole, however long (the
// doctor proposes a rewrite for one past the cap: cutting it here would lose its end), the why from
// its bold label to the how's, and the how from its label to the end, lists and steps included. A
// file with no body is not a learning.
export const parseMemoryFile = (text: string): ParsedMemory | null => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text)
  const front = match ? (match[1] as string) : ''
  const body = (match ? (match[2] as string) : text).trim()
  const typed = /^\s*type:\s*(\S+)\s*$/m.exec(front)?.[1]
  const kind: LearningKind = isKind(typed) ? typed : 'project'
  const lines = body.split(/\r?\n/)
  const label = (text: string | undefined): string | undefined => text?.replace(/^[\s:—–-]+/, '').trim()
  const why = label(/\*\*Why:?\*\*([\s\S]*?)(?=\n\s*\*\*How(?: to apply)?:?\*\*|$)/.exec(body)?.[1]) ?? ''
  const how = label(/\*\*How(?: to apply)?:?\*\*([\s\S]*)$/.exec(body)?.[1])
  const first = lines.find(line => line.trim() !== '' && !/^\*\*(?:Why|How)/.test(line.trim()))
  const described = /^\s*description:\s*(.+)$/m.exec(front)?.[1]
  const summary = described ? oneLine(unquote(described)) : ''
  const line = first ? oneLine(first.replace(/^#+\s*/, '').replace(/\*\*/g, ''), Number.POSITIVE_INFINITY) : ''
  const fact = line === '' || (/:\s*$/.test(line) && summary !== '') ? summary : line

  if (fact === '') {
    return null
  }

  return { kind, text: fact, why: why || (summary !== fact ? summary : ''), ...(how ? { how } : {}) }
}

const linkOf = (line: string): string | null => /^\s*-\s*\[[^\]]*\]\(([^)]+)\)/.exec(line)?.[1] ?? null

// The headings MEMORY.md groups its lines under.
export const indexHeadings = (index: string): string[] => index.split(/\r?\n/).flatMap(line => (/^#{2,6}\s+\S/.test(line) ? [line.replace(/^#+\s+/, '').trim()] : []))

// The files MEMORY.md points at.
export const indexedFiles = (index: string): string[] => index.split(/\r?\n/).flatMap(line => (linkOf(line) ? [linkOf(line) as string] : []))

// What is in memory, as the door, the doctor and the scan read it: every file but the index, as a
// learning that is not stored anywhere (`file:<name>`). The files are Claude's: the mod never writes them.
export const MEMORY_ID = 'file:'

export const memoryIdOf = (name: string): string => `${MEMORY_ID}${name}`

export const fileOfId = (id: string): string | null => (id.startsWith(MEMORY_ID) ? id.slice(MEMORY_ID.length) : null)

export const memoryLearnings = async (port: Port): Promise<Learning[]> => {
  const project = await port.project()
  const found: Learning[] = []

  for (const name of (await port.memory.list()).filter(one => one !== INDEX_FILE).sort()) {
    const parsed = parseMemoryFile((await port.memory.read(name)) ?? '')

    if (parsed) {
      found.push({ id: memoryIdOf(name), ...parsed, status: 'accepted', project, session: '', at: 0, seen: 1, file: name })
    }
  }

  return found
}

// The queue and what is in memory, for what has to be compared with both.
export const knownOf = async (port: Port): Promise<Learning[]> => [...(await port.learnings.all()), ...(await memoryLearnings(port))]
