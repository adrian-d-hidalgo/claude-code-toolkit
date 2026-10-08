import type { Choice } from '../../../types'
import { oneLine } from '../../shared/format/format.hook'
import { uniqueTexts } from '../parts/parts.hook'

export type JudgedGroup = { texts: string[]; repeatOf: string | null; choices?: Record<string, Choice> }

type Known = ReadonlyArray<{ id: string; texts: readonly string[] }>

// The prompt is English whatever language the conversation is in; the question texts
// come back in the language they were asked.
export const buildJudgePrompt = (content: string, known: Known, isDialog: boolean): string => {
  const tracked =
    known.length === 0 ? '(none)' : known.map(one => `${one.id}: ${one.texts.join(' | ')}`).join('\n')

  return [
    'You triage questions an AI assistant asked its user. Reply with JSON only, no prose.',
    '',
    'Questions already tracked as open (id: questions):',
    tracked,
    '',
    isDialog ? 'The assistant opened a dialog with these questions:' : 'The assistant wrote this message (or several, separated by ---):',
    '<<<',
    content,
    '>>>',
    '',
    'List the questions the assistant asks THE USER and expects an answer to. The text may be in any language: keep each question in its original wording. Every question must make sense on its own, shown in a list without the message around it: if it refers to something said earlier ("which one?", "¿Cuál eliges?"), rewrite it with the options or subject it needs, in the same language. Skip rhetorical questions, questions inside code or quotes, and questions the assistant answers itself. Put questions about the same decision in one group.',
    'For each group, set "repeatOf" to the id of a tracked question that asks the same thing, even in different words or another language; otherwise null.',
    'For each question also say how it is answered, in "choices" (same order as "texts"): kind "single" when the message lists options to pick one from, "multi" when several can be picked, "text" for a free answer; list the options (2 to 8 short labels, as the message words them) for single and multi.',
    'Format: {"groups":[{"texts":["..."],"choices":[{"kind":"single|multi|text","options":["..."]}],"repeatOf":"id or null"}]}',
  ].join('\n')
}

const MAX_OPTIONS = 8
const MAX_OPTION_CHARS = 100

// A pick-one or pick-several answer needs 2 to 8 options; anything else is a free-text question.
export const parseChoice = (value: unknown): Choice | null => {
  const item = value as { kind?: unknown; options?: unknown } | null

  if (!item || (item.kind !== 'single' && item.kind !== 'multi') || !Array.isArray(item.options)) {
    return null
  }

  const options = [
    ...new Set(
      item.options
        .filter((option): option is string => typeof option === 'string' && option.trim() !== '')
        .map(option => option.trim().slice(0, MAX_OPTION_CHARS)),
    ),
  ]

  return options.length >= 2 && options.length <= MAX_OPTIONS ? { kind: item.kind, options } : null
}

// null when the reply is not the expected JSON, so the caller can fall back.
export const parseJudge = (reply: string): JudgedGroup[] | null => {
  const match = /\{[\s\S]*\}/.exec(reply)

  if (!match) {
    return null
  }

  try {
    const value = JSON.parse(match[0]) as { groups?: unknown }

    if (!Array.isArray(value.groups)) {
      return null
    }

    const groups: JudgedGroup[] = []

    for (const group of value.groups as Array<{ texts?: unknown; choices?: unknown; repeatOf?: unknown }>) {
      const raw: unknown[] = Array.isArray(group.texts) ? group.texts : []
      // One line each: a newline in a judged text could forge a line of the prompt context.
      const texts = uniqueTexts(raw.filter((text): text is string => typeof text === 'string').map(text => oneLine(text)).filter(Boolean))
      const choices: Record<string, Choice> = {}

      raw.forEach((text, index) => {
        const choice = typeof text === 'string' && Array.isArray(group.choices) ? parseChoice(group.choices[index]) : null

        if (choice && typeof text === 'string' && oneLine(text) !== '') {
          choices[oneLine(text)] = choice
        }
      })

      if (texts.length > 0) {
        groups.push({
          texts,
          repeatOf: typeof group.repeatOf === 'string' ? group.repeatOf : null,
          ...(Object.keys(choices).length > 0 ? { choices } : {}),
        })
      }
    }

    return groups
  } catch {
    return null
  }
}

// Sent to the session's own model through a fork, which already holds the whole
// conversation: it knows what was asked, answered or skipped.
export const buildForkQuestionsPrompt = (known: Known): string =>
  [
    'Do not use tools. List every question you asked the user in this session that they have not answered yet: dialog questions they skipped or dismissed, and questions in your messages that got no reply. Put questions about the same decision in one group. Keep each question in its original wording, but make it understandable on its own: if it is vague, add the options or subject it refers to ("¿Cuál eliges?" becomes "¿Cuál eliges, t4g.large o m7g.large?").',
    'Skip questions already tracked as open (even in other words):',
    known.length === 0 ? '(none)' : known.map(one => `- ${one.texts.join(' | ')}`).join('\n'),
    'For each question say how it is answered, in "choices" (same order as "texts"): kind "single" (pick one of the options it lists), "multi" (pick several) or "text" (free answer), with the options for single and multi.',
    'Reply with JSON only: {"groups":[{"texts":["..."],"choices":[{"kind":"single|multi|text","options":["..."]}],"repeatOf":null}]}',
  ].join('\n')

// A question of a few words only makes sense next to its message; once it stands alone in the
// pane it must carry its own subject. Anything shorter than this is dropped, never tracked.
const MIN_WORDS = 4

export const isStandalone = (text: string): boolean => text.trim().split(/\s+/).length >= MIN_WORDS

export const standaloneOnly = (groups: JudgedGroup[]): JudgedGroup[] =>
  groups
    .map(group => ({ ...group, texts: group.texts.filter(isStandalone) }))
    .filter(group => group.texts.length > 0)

// Which tracked questions the user's latest message (and what the assistant did with it)
// settled. Each tracked question is numbered `<id>#<n>`; the reply names the numbers.
export const buildAnswerPrompt = (known: Known, userMessage: string, assistantMessage: string): string =>
  [
    'You decide which open questions an AI assistant asked its user have now been settled. Reply with JSON only, no prose.',
    '',
    'Open questions (ref: question):',
    known.flatMap(one => one.texts.map((text, index) => `${one.id}#${index + 1}: ${text}`)).join('\n'),
    '',
    'The user\'s latest message:',
    '<<<',
    userMessage.trim() === '' ? '(none)' : userMessage,
    '>>>',
    '',
    'The assistant\'s message after it:',
    '<<<',
    assistantMessage.trim() === '' ? '(none)' : assistantMessage,
    '>>>',
    '',
    'A question is settled when the user answered it directly (picked an option, gave a value, typed free text) or indirectly (decided something that makes it moot, told the assistant to proceed one way, said to drop it, or the assistant went ahead on the user\'s stated choice). Options or free text make no difference. Do NOT settle a question the assistant merely asks again, restates or offers options for, or one the user\'s message does not touch. When unsure, leave it open.',
    'Format: {"settled":["<ref>", ...]}',
  ].join('\n')

// The refs the reply names that exist in `known`; null when the reply is not the expected JSON.
export const parseSettled = (reply: string, known: Known): string[] | null => {
  const match = /\{[\s\S]*\}/.exec(reply)

  if (!match) {
    return null
  }

  try {
    const value = JSON.parse(match[0]) as { settled?: unknown }

    if (!Array.isArray(value.settled)) {
      return null
    }

    const valid = new Set(known.flatMap(one => one.texts.map((_, index) => `${one.id}#${index + 1}`)))

    return (value.settled as unknown[]).filter((ref): ref is string => typeof ref === 'string' && valid.has(ref))
  } catch {
    return null
  }
}

// Sent through a fork (it holds the conversation): vague questions come back self-contained.
export const buildRewritePrompt = (known: Known): string =>
  [
    'Do not use tools. These questions you asked the user are too vague to understand on their own. Rewrite each so it makes sense alone, adding the options or subject it refers to from this conversation. Keep the language it was asked in and keep it one sentence.',
    known.flatMap(one => one.texts.map((text, index) => `${one.id}#${index + 1}: ${text}`)).join('\n'),
    'Reply with JSON only: {"rewrites":[{"ref":"<ref>","text":"..."}]}',
  ].join('\n')

// ref -> new text, only for known refs whose rewrite is understandable on its own.
export const parseRewrites = (reply: string, known: Known): Map<string, string> => {
  const found = new Map<string, string>()
  const match = /\{[\s\S]*\}/.exec(reply)

  if (!match) {
    return found
  }

  try {
    const value = JSON.parse(match[0]) as { rewrites?: unknown }
    const valid = new Set(known.flatMap(one => one.texts.map((_, index) => `${one.id}#${index + 1}`)))

    for (const item of Array.isArray(value.rewrites) ? (value.rewrites as Array<{ ref?: unknown; text?: unknown }>) : []) {
      if (typeof item.ref === 'string' && valid.has(item.ref) && typeof item.text === 'string' && isStandalone(oneLine(item.text))) {
        found.set(item.ref, oneLine(item.text))
      }
    }
  } catch {
    // An unreadable reply rewrites nothing.
  }

  return found
}
