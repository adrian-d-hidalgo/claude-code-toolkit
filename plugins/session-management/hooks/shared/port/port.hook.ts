import type { ChecklistItem, Learning, Question } from '../../../types'
import { byPriority } from '../../checklist/ops/ops.hook'
import type { ScanMessage } from '../transcript/transcript.hook'

// The engine's `$` cannot cross an import, so the services never see it: the plugin builds a Port
// out of the few things they need and hands that over. It is also what tests replace (memoryPort).
export type ModelReply = { isAnswered: boolean; text: string }

export type Port = {
  now: () => Promise<number>
  sessionId: () => Promise<string>
  root: () => Promise<string>
  /** The working directory: what Claude's memory of the project is filed under. */
  project: () => Promise<string>
  messages: () => Promise<ScanMessage[]>
  newId: () => Promise<string>
  /** A small, cheap model call; a failure throws. */
  complete: (request: { prompt: string; maxTokens: number }) => Promise<ModelReply>
  /** The session's own model over the whole conversation; null when it cannot answer. */
  fork: (prompt: string) => Promise<string | null>
  store: {
    get: (key: string) => Promise<unknown>
    set: (key: string, value: unknown) => Promise<void>
    delete: (key: string) => Promise<void>
    keys: () => Promise<string[]>
  }
  questions: {
    all: () => Promise<Question[]>
    /** This session's questions; another session's belong to its own pane and prompts. */
    own: (isOpenOnly: boolean) => Promise<Question[]>
    write: (change: (list: Question[]) => Question[]) => Promise<void>
  }
  checklist: {
    all: () => Promise<ChecklistItem[]>
    write: (change: (list: ChecklistItem[]) => ChecklistItem[]) => Promise<void>
    /** The store key of this session's checklist. */
    key: () => Promise<string>
  }
  learnings: {
    /** This session's learnings: what waits for the user and what they refused. */
    all: () => Promise<Learning[]>
    write: (change: (list: Learning[]) => Learning[]) => Promise<void>
  }
  /** Claude's own memory folder for this project: the files the engine loads, by name. */
  memory: {
    dir: () => Promise<string>
    read: (name: string) => Promise<string | null>
    write: (name: string, text: string) => Promise<void>
    /** The `.md` files in the folder. */
    list: () => Promise<string[]>
    /** Deletes a file of the folder; false when it was not there. */
    remove: (name: string) => Promise<boolean>
    /** Whether an absolute path exists anywhere (relative ones are taken from the project). */
    exists: (path: string) => Promise<boolean>
  }
  turn: {
    /** The model turn running now, if any. */
    current: () => string | null
    abort: (turnId: string) => Promise<void>
  }
  /** Sends a prompt to the session as if the user had typed it. */
  say: (text: string) => Promise<void>
}

export type MemoryPortOptions = {
  store?: Record<string, unknown>
  session?: string
  root?: string
  now?: number
  messages?: ScanMessage[]
  /** The small model's reply to a prompt; null means it could not answer. */
  complete?: (prompt: string) => string | null
  /** The session model's reply to a prompt; null means it could not answer. */
  fork?: (prompt: string) => string | null
  turn?: string | null
  /** The memory folder's files by name. */
  files?: Record<string, string>
  /** Paths that exist outside the memory folder. */
  paths?: string[]
}

// A Port over memory, for tests: what it stored, said and aborted can be read back.
export const memoryPort = (options: MemoryPortOptions = {}) => {
  const data: Record<string, unknown> = { ...options.store }
  const files: Record<string, string> = { ...options.files }
  const said: string[] = []
  const aborted: string[] = []
  const session = options.session ?? 's1'
  const root = options.root ?? '/p'
  let counter = 0
  const read = <T>(key: string, fallback: T) => (data[key] as T | undefined) ?? fallback

  const port: Port = {
    now: async () => options.now ?? 1000,
    sessionId: async () => session,
    root: async () => root,
    project: async () => root,
    messages: async () => options.messages ?? [],
    newId: async () => `id${++counter}`,
    complete: async ({ prompt }) => {
      const text = options.complete?.(prompt) ?? null

      return { isAnswered: text !== null, text: text ?? '' }
    },
    fork: async prompt => options.fork?.(prompt) ?? null,
    store: {
      get: async key => data[key],
      set: async (key, value) => {
        data[key] = value
      },
      delete: async key => {
        delete data[key]
      },
      keys: async () => Object.keys(data),
    },
    questions: {
      all: async () => read<Question[]>('questions', []),
      own: async isOpenOnly => read<Question[]>('questions', []).filter(one => one.session === session && (!isOpenOnly || one.isOpen)),
      write: async change => {
        data['questions'] = change(read<Question[]>('questions', []))
      },
    },
    checklist: {
      // Like the real port: always listed and stored by priority.
      all: async () => byPriority(read<ChecklistItem[]>(`checklist:${session}`, [])),
      write: async change => {
        data[`checklist:${session}`] = byPriority(change(byPriority(read<ChecklistItem[]>(`checklist:${session}`, []))))
      },
      key: async () => `checklist:${session}`,
    },
    learnings: {
      all: async () => read<Learning[]>(`learnings:${session}`, []),
      write: async change => {
        data[`learnings:${session}`] = change(read<Learning[]>(`learnings:${session}`, []))
      },
    },
    memory: {
      dir: async () => '/m',
      read: async name => files[name] ?? null,
      write: async (name, text) => {
        files[name] = text
      },
      list: async () => Object.keys(files).filter(name => name.endsWith('.md')),
      remove: async name => {
        const had = name in files
        delete files[name]

        return had
      },
      exists: async path => path.startsWith('/m/') ? path.slice(3) in files : (options.paths ?? []).includes(path.startsWith('/') ? path : `${root}/${path}`),
    },
    turn: {
      current: () => options.turn ?? null,
      abort: async turnId => {
        aborted.push(turnId)
      },
    },
    say: async text => {
      said.push(text)
    },
  }

  return { port, data, files, said, aborted }
}
