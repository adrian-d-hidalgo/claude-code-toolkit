import type { Choice, Question } from '../../../types'
import { sameGroup, sameQuestion } from '../../shared/similarity/similarity.hook'
import { isStandalone } from '../judge/judge.hook'
import { uniqueTexts } from '../parts/parts.hook'

// The options of a group, found for each of its final texts: by the text itself, else by a question
// that says the same (a re-ask words it differently).
export const carryChoices = (texts: readonly string[], ...sources: Array<Record<string, Choice> | undefined>): Record<string, Choice> | undefined => {
  const found: Record<string, Choice> = {}

  for (const text of texts) {
    for (const source of sources) {
      if (!source) {
        continue
      }

      const key = text in source ? text : Object.keys(source).find(other => sameQuestion(other, text))

      if (key !== undefined) {
        found[text] = source[key] as Choice
        break
      }
    }
  }

  return Object.keys(found).length > 0 ? found : undefined
}

// A re-ask usually shortens the question ("¿Cuál eliges?"); keep the older wording when the
// newer one lost most of what made it understandable.
const fuller = (old: string, next: string): string => (next.length * 10 < old.length * 6 ? old : next)

// The texts of an entry plus the ones a repeat brings: a repeat that words a text differently
// replaces it (unless it lost context); a text the entry did not have is added (unless it is too
// vague to stand alone), and none of the entry's is ever dropped.
export const unionTexts = (known: readonly string[], incoming: readonly string[]): string[] => {
  const texts = [...known]

  for (const text of incoming) {
    const at = texts.findIndex(old => sameQuestion(old, text))

    if (at === -1) {
      if (isStandalone(text)) {
        texts.push(text)
      }
    } else {
      texts[at] = fuller(texts[at] as string, text)
    }
  }

  return uniqueTexts(texts)
}

// Changes an entry's texts and re-keys its options to the new wording (they are keyed by the
// text, so a stale key would leave the pane with a free-text box instead of the options).
export const withTexts = (one: Question, texts: string[], ...extra: Array<Record<string, Choice> | undefined>): Question => {
  const { choices: _old, ...rest } = one
  const choices = carryChoices(texts, ...extra, one.choices)

  return { ...rest, texts, ...(choices ? { choices } : {}) }
}

// Adds a group of questions unless it repeats one the same session already has. A repeat of an open
// group refreshes it (newest wording, age reset, asked again); a repeat of a closed
// group is ignored when `isScan` (a transcript scan must not reopen what the person dismissed,
// nor re-add or re-count what is already tracked) and is a fresh group otherwise (a live re-ask
// means it is still open).
export const mergeGroup = (list: Question[], incoming: Question, isScan: boolean): Question[] => {
  const index = list.findIndex(one => one.session === incoming.session && (isScan || one.isOpen) && sameGroup(incoming.texts, one.texts))

  if (index === -1) {
    return [...list, incoming]
  }

  const known = list[index] as Question

  if (!known.isOpen || isScan) {
    return list
  }

  const texts = unionTexts(known.texts, incoming.texts)

  return list.map((one, position) =>
    position === index ? { ...withTexts(known, texts, incoming.choices), at: incoming.at, asks: known.asks + 1 } : one,
  )
}

// A repeat the judge named by id: refresh that open question with the newest wording. A repeat
// that names fewer parts loses none, as in `mergeGroup`.
export const refreshQuestion = (
  list: Question[],
  id: string,
  texts: string[],
  at: number,
  choices?: Record<string, Choice>,
): Question[] =>
  list.map(one => {
    if (one.id !== id || !one.isOpen) {
      return one
    }

    // A repeat that shares no wording with the entry and asks as many things is the same questions
    // reworded: they take each other's place. Anything else only adds to the entry.
    const isReworded = texts.length === one.texts.length && !texts.some(text => one.texts.some(old => sameQuestion(old, text)))
    const next = isReworded ? texts.map((text, index) => fuller(one.texts[index] as string, text)) : unionTexts(one.texts, texts)

    return { ...withTexts(one, next, choices), at, asks: one.asks + 1 }
  })

// A session keeps its newest `max` entries (closed ones go first); other sessions' are never touched.
export const capSession = (list: Question[], session: string, max = 200): Question[] => {
  const mine = list.filter(one => one.session === session)
  const excess = mine.length - max

  if (excess <= 0) {
    return list
  }

  const drop = new Set([...mine.filter(one => !one.isOpen), ...mine.filter(one => one.isOpen)].slice(0, excess).map(one => one.id))

  return list.filter(one => one.session !== session || !drop.has(one.id))
}
