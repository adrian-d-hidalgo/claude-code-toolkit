import type { ScanMode } from '../../checklist/args/args.hook'
import type { Port } from '../../shared/port/port.hook'
import type { ScanMessage } from '../../shared/transcript/transcript.hook'
import { buildExtractPrompt, buildForkLearningsPrompt, parseExtracted } from '../judge/judge.hook'
import type { Exchange, NewLearning } from '../judge/judge.hook'
import { knownOf } from '../memory/memory.hook'
import { proposeLearnings } from '../reconcile/reconcile.hook'
import type { Proposed } from '../reconcile/reconcile.hook'

// Exchanges a small model reads at once in a quick scan.
const SCAN_BATCH = 6

const today = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

// Each user message with what the assistant answered until the next one.
export const exchangesOf = (messages: readonly ScanMessage[]): Exchange[] =>
  messages.reduce<Exchange[]>((list, message) => {
    if (message.role === 'user') {
      return message.text.trim() === '' ? list : [...list, { user: message.text, assistant: '' }]
    }

    const last = list[list.length - 1]

    return last ? [...list.slice(0, -1), { ...last, assistant: `${last.assistant}${last.assistant === '' ? '' : '\n'}${message.text}` }] : list
  }, [])

// What a small model finds in some exchanges; null when it cannot answer.
const extract = async (port: Port, exchanges: readonly Exchange[]): Promise<NewLearning[] | null> => {
  try {
    const reply = await port.complete({ prompt: buildExtractPrompt(await knownOf(port), exchanges, today(await port.now())), maxTokens: 1200 })

    return reply.isAnswered ? parseExtracted(reply.text) : null
  } catch {
    return null
  }
}

// After every turn, as the questions are captured: what the turn taught goes through the door like a
// proposal from the tool, so it lands in the review queue and never in memory on its own.
export const captureLearnings = async (port: Port, exchange: Exchange, options: { judge?: string }): Promise<Proposed | null> => {
  if (options.judge === 'heuristic' || exchange.user.trim() === '') {
    return null
  }

  const found = await extract(port, [exchange])

  return found && found.length > 0 ? proposeLearnings(port, found, options) : null
}

// Reads the conversation again, for what could have been a learning and is not in memory or the queue
// yet: `deep` asks the session's own model, which sees all of it, and falls back to `quick`, a small
// model over a few exchanges at a time. What it finds lands in the queue; what is known already is not
// counted as a new sighting. `fast` (or `judge: heuristic`) has
// no local rules to go by, so it finds nothing.
export const scanLearnings = async (port: Port, mode: ScanMode, options: { judge?: string }): Promise<Proposed | null> => {
  if (mode === 'fast' || options.judge === 'heuristic') {
    return null
  }

  let found: NewLearning[] | null = null

  if (mode === 'deep') {
    const text = await port.fork(buildForkLearningsPrompt(await knownOf(port), today(await port.now())))
    found = text === null ? null : parseExtracted(text)
  }

  if (found === null) {
    const exchanges = exchangesOf(await port.messages())
    found = []

    for (let at = 0; at < exchanges.length; at += SCAN_BATCH) {
      found.push(...((await extract(port, exchanges.slice(at, at + SCAN_BATCH))) ?? []))
    }
  }

  return proposeLearnings(port, found, { ...options, isRecount: false })
}
