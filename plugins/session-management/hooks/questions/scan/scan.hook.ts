import type { Choice } from '../../../types'
import { extractQuestions } from '../extract/extract.hook'
import type { ScanMessage } from '../../shared/transcript/transcript.hook'
import { parseChoice } from '../judge/judge.hook'

export type Scanned = { texts: string[]; source: 'dialog' | 'text'; choices?: Record<string, Choice> }

const asked = (input: Record<string, unknown>): string[] =>
  Array.isArray(input.questions)
    ? input.questions.flatMap(one =>
        typeof (one as { question?: unknown }).question === 'string'
          ? [(one as { question: string }).question]
          : [],
      )
    : []

// The options of an AskUserQuestion dialog, keyed by the question: pick one, or several when the
// dialog allows it. Options may be bare labels or `{ label }` objects.
export const dialogChoices = (input: Record<string, unknown>): Record<string, Choice> => {
  const found: Record<string, Choice> = {}

  for (const item of Array.isArray(input.questions) ? (input.questions as Array<Record<string, unknown>>) : []) {
    const options = (Array.isArray(item.options) ? item.options : []).map(option =>
      typeof option === 'string' ? option : (option as { label?: unknown })?.label,
    )
    const choice = parseChoice({ kind: item.multiSelect === true ? 'multi' : 'single', options })

    if (typeof item.question === 'string' && choice) {
      found[item.question] = choice
    }
  }

  return found
}

// Questions a past transcript left open, one group per message or dialog. A dialog
// question is open unless its result answered it; a prose group is open unless the
// person wrote anything after it, or always with `includeReplied`, since any later
// message may or may not answer it.
export const scanMessages = (messages: readonly ScanMessage[], includeReplied: boolean): Scanned[] => {
  const found: Scanned[] = []

  messages.forEach((message, index) => {
    if (message.role !== 'assistant') {
      return
    }

    for (const use of message.toolUses) {
      if (use.tool !== 'AskUserQuestion') {
        continue
      }

      const answers = Object.keys((use.result as { answers?: Record<string, string> } | undefined)?.answers ?? {})
      const texts = asked(use.input).filter(text => !answers.includes(text))

      if (texts.length > 0) {
        const all = dialogChoices(use.input)
        const choices = Object.fromEntries(Object.entries(all).filter(([text]) => texts.includes(text)))

        found.push({ texts, source: 'dialog', ...(Object.keys(choices).length > 0 ? { choices } : {}) })
      }
    }

    const isReplied = messages.slice(index + 1).some(next => next.role === 'user' && next.text.trim() !== '')
    const texts = extractQuestions(message.text)

    if (texts.length > 0 && (includeReplied || !isReplied)) {
      found.push({ texts, source: 'text' })
    }
  })

  return found
}
