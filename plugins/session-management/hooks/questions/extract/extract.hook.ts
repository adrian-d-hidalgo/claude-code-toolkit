const FENCE = /```[\s\S]*?```/g

// Questions found in prose: code blocks, quotes and table rows are skipped
// because a `?` there is rarely something Claude asked the person.
// A question that is only a few words ("¿Cuál eliges?") means nothing without what came before
// it, so it carries the sentences that precede it; the pane and the prompt context show it alone.
const SHORT = 6
const CONTEXT = 240

const standalone = (sentence: string, before: string): string => {
  if (before === '' || sentence.split(/\s+/).length >= SHORT) {
    return sentence
  }

  const context = before.length > CONTEXT ? `…${before.slice(-CONTEXT)}` : before

  return `${context} ${sentence}`
}

export const extractQuestions = (answer: string): string[] => {
  const found: string[] = []
  let previous = ''

  for (const raw of answer.replace(FENCE, '').split('\n')) {
    const line = raw.trim()

    if (line === '' || line.startsWith('>') || line.startsWith('|')) {
      continue
    }

    const plain = line.replace(/^([-*]|\d+[.)])\s+/, '').replace(/[*_`]/g, '')

    let before = previous

    for (const sentence of plain.split(/(?<=[.!?:])\s+/)) {
      const text = sentence.trim()

      if (text.endsWith('?') && text.length >= 8) {
        const full = standalone(text, before)

        if (!found.includes(full)) {
          found.push(full)
        }
      } else {
        before = `${before} ${text}`.trim()
      }
    }

    previous = before
  }

  return found
}
