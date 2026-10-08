import type { Choice, Question } from '../../../types'
import { oneLine } from '../../shared/format/format.hook'
import type { Port } from '../../shared/port/port.hook'
import { buildAnswerPrompt, buildJudgePrompt, parseJudge, parseSettled, standaloneOnly } from '../judge/judge.hook'
import type { JudgedGroup } from '../judge/judge.hook'
import { capSession, carryChoices, mergeGroup, refreshQuestion } from '../merge/merge.hook'
import { withoutTexts } from '../ops/ops.hook'
import { uniqueTexts } from '../parts/parts.hook'

// Asks a small model which of `content`'s questions are real and which tracked question
// each repeats; null (no model, bad reply, `judge: heuristic`) sends the caller to the
// deterministic extraction.
export const judgeQuestions = async (port: Port, content: string, isDialog: boolean, options: { judge?: string }): Promise<JudgedGroup[] | null> => {
  if (options?.judge === 'heuristic') {
    return null
  }

  try {
    const known = await port.questions.own(true)
    const reply = await port.complete({ prompt: buildJudgePrompt(content, known, isDialog), maxTokens: 700 })
    const groups = reply.isAnswered ? parseJudge(reply.text) : null

    return groups === null ? null : standaloneOnly(groups)
  } catch {
    return null
  }
}

// Tracks new groups of questions of this session: a repeat of an open one refreshes it.
export const addGroups = async (port: Port, groups: JudgedGroup[], source: Question['source']) => {
  const project = await port.root()
  const session = await port.sessionId()
  const at = await port.now()
  const items: Array<{ item: Question; repeatOf: string | null }> = []

  for (const group of groups) {
    // One line each, once each: a newline would forge a line of the prompt context.
    const texts = uniqueTexts(group.texts.map(text => oneLine(text)).filter(Boolean))
    const choices = carryChoices(texts, group.choices)

    if (texts.length > 0) {
      items.push({
        item: { id: await port.newId(), texts, source, session, project, at, asks: 1, isOpen: true, ...(choices ? { choices } : {}) },
        repeatOf: group.repeatOf,
      })
    }
  }

  // The cap is per session: another session's open questions are never evicted by this one's.
  await port.questions.write(list =>
    capSession(
      items.reduce(
        (all, { item, repeatOf }) =>
          repeatOf !== null && all.some(one => one.id === repeatOf && one.isOpen && one.session === session)
            ? refreshQuestion(all, repeatOf, item.texts, at, item.choices)
            : mergeGroup(all, item, false),
        list,
      ),
      session,
    ),
  )
}

// Questions from a finished turn or an opened dialog; the model judges when it can.
export const captureQuestions = async (
  port: Port,
  content: string,
  fallback: string[],
  source: Question['source'],
  options: { judge?: string },
  given?: Record<string, Choice>,
) => {
  if (fallback.length === 0 && source === 'text') {
    return
  }

  const judged = await judgeQuestions(port, content, source === 'dialog', options)
  const own: JudgedGroup[] = fallback.length > 0 ? [{ texts: fallback, repeatOf: null }] : []
  const groups = judged ?? (source === 'text' ? standaloneOnly(own) : own)

  if (groups.length > 0) {
    // A dialog's own options are exact; the judge's reading of a message fills in the rest.
    await addGroups(
      port,
      groups.map(group => {
        const choices = carryChoices(group.texts, given, group.choices)

        return choices ? { ...group, choices } : group
      }),
      source,
    )
  }
}

// Closes what the user's message, or the assistant's turn on it, settled: answered directly (an
// option, a value, free text) or indirectly (a decision that makes the question moot). A
// small model judges every open question of this session; without one nothing is closed
// here and the assistant's close tool remains.
export const resolveAnswered = async (port: Port, userText: string, assistantText: string, options: { judge?: string }) => {
  if (options?.judge === 'heuristic' || userText.trim() === '') {
    return
  }

  try {
    const known = await port.questions.own(true)

    if (known.length === 0) {
      return
    }

    const reply = await port.complete({ prompt: buildAnswerPrompt(known, userText, assistantText), maxTokens: 300 })
    const settled = reply.isAnswered ? parseSettled(reply.text, known) : null

    if (settled === null || settled.length === 0) {
      return
    }

    // The refs count the parts of the list the judge saw; the list may have changed while it ran,
    // so they are turned into wordings now and matched by wording when writing.
    const gone = new Map<string, string[]>()

    for (const ref of settled) {
      const [id = '', position = ''] = ref.split('#')
      const text = known.find(one => one.id === id)?.texts[Number(position) - 1]

      if (text !== undefined) {
        gone.set(id, [...(gone.get(id) ?? []), text])
      }
    }

    await port.questions.write(list => [...gone].reduce((all, [id, texts]) => withoutTexts(id, texts)(all), list))
  } catch {
    // The judge is best effort: a failed call leaves the questions open.
  }
}
