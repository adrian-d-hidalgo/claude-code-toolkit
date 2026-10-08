import type { ChecklistItem, Question } from '../../../types'
import { byPriority } from '../../checklist/ops/ops.hook'
import type { ScanMessage } from '../transcript/transcript.hook'

// The engine's `$` cannot cross an import, so the services never see it: the plugin builds a Port
// out of the few things they need and hands that over. It is also what tests replace (memoryPort).
export type ModelReply = { isAnswered: boolean; text: string }

export type Port = {
  now: () => Promise<number>
  sessionId: () => Promise<string>
  root: () => Promise<string>
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
    /** The shared checklist of this folder that earlier versions kept, if any. */
    legacy: () => Promise<ChecklistItem[]>
    /** Brings the folder's older checklist into this session's and removes it. */
    claimLegacy: () => Promise<void>
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
}

// A Port over memory, for tests: what it stored, said and aborted can be read back.
export const memoryPort = (options: MemoryPortOptions = {}) => {
  const data: Record<string, unknown> = { ...options.store }
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
      legacy: async () => read<ChecklistItem[]>(`checklist:${root}`, []),
      claimLegacy: async () => {
        const legacy = read<ChecklistItem[]>(`checklist:${root}`, [])
        const own = read<ChecklistItem[]>(`checklist:${session}`, [])
        data[`checklist:${session}`] = [...own, ...legacy.filter(old => !own.some(one => one.id === old.id))]
        delete data[`checklist:${root}`]
      },
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

  return { port, data, said, aborted }
}
