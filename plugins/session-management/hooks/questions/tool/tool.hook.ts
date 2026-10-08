import type { Question } from '../../../types'
import { oneLine } from '../../shared/format/format.hook'
import type { Port } from '../../shared/port/port.hook'
import { addGroups } from '../capture/capture.hook'
import { isStandalone } from '../judge/judge.hook'
import { unionTexts, withTexts } from '../merge/merge.hook'
import { closing, withoutTexts } from '../ops/ops.hook'
import { questionsIn, uniqueTexts } from '../parts/parts.hook'

export const CLOSE_TOOL_SPEC = {
  name: 'close_question',
  description: 'Mark open questions as answered. Call it when the user answered them in chat. Pass the ids listed in the open questions context.',
  inputSchema: {
    type: 'object',
    properties: { ids: { type: 'array', items: { type: 'string' } } },
    required: ['ids'],
  },
}

export const QUESTIONS_TOOL_SPEC = {
  name: 'questions',
  description:
    'Manage the open questions the user sees in the Open questions pane (this session only). Actions: list (all: true includes closed), add (texts), update (id, texts: reword the question so it makes sense on its own, e.g. after the user asked what it meant), close (id; parts: the 1-based positions answered, omit to close the whole group), reopen (id), merge (id, into: fold a duplicate into the question that says the same). Every text must be understandable alone, with its options or subject. Close a question when the user answered it in chat or the matter became moot.',
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'add', 'update', 'close', 'reopen', 'merge'] },
      id: { type: 'string' },
      into: { type: 'string', description: 'merge: the id of the question that keeps the wording.' },
      texts: { type: 'array', items: { type: 'string' } },
      parts: { type: 'array', items: { type: 'number' } },
      all: { type: 'boolean' },
    },
    required: ['action'],
  },
}

// The older tool: closes by id, in this session only.
export const callCloseQuestion = async (port: Port, ids: string[]): Promise<string> => {
  const session = await port.sessionId()
  const own = (await port.questions.all()).filter(one => one.session === session && ids.map(String).includes(one.id))
  await port.questions.write(closing(own.map(one => one.id)))

  return `Closed ${questionsIn(own)}.`
}

export type QuestionsCall = { action?: string; id?: string; into?: string; texts?: string[]; parts?: number[]; all?: boolean }

// Parts are numbered the way the pane and the prompt context number them, from 1.
const show = (list: Question[]) =>
  list.length === 0
    ? 'No questions.'
    : list.map(one => `[${one.id}] (${one.isOpen ? 'open' : 'closed'}) ${one.texts.map((text, index) => `${index + 1}) ${text}`).join(' | ')}`).join('\n')

const NOT_ALONE = 'each question must make sense on its own (at least 4 words, with its options or subject).'

// What the model's `questions` tool answers: the list of this session's open questions after the change.
export const callQuestionsTool = async (port: Port, call: QuestionsCall): Promise<string> => {
  const session = await port.sessionId()
  const own = await port.questions.own(false)
  const target = own.find(one => one.id === String(call.id))

  if (call.action === 'list') {
    return show(call.all ? own : own.filter(one => one.isOpen))
  }

  if (call.texts !== undefined && !Array.isArray(call.texts)) {
    return 'Invalid questions call: texts must be an array of strings.'
  }

  if (call.parts !== undefined && !Array.isArray(call.parts)) {
    return 'Invalid questions call: parts must be an array of 1-based positions.'
  }

  const given = uniqueTexts((call.texts ?? []).map(text => oneLine(String(text))).filter(Boolean))
  const tooShort = given.filter(text => !isStandalone(text))
  const kept = given.filter(isStandalone)

  if (call.action === 'add') {
    if (kept.length === 0) {
      return `Not added: ${NOT_ALONE}`
    }

    await addGroups(port, [{ texts: kept, repeatOf: null }], 'text')

    return `${tooShort.length > 0 ? `Skipped, ${NOT_ALONE} ${tooShort.map(text => `"${text}"`).join(', ')}\n` : ''}${show(await port.questions.own(true))}`
  }

  if (!target) {
    return `No question ${call.id ?? ''} in this session. Use list to see the ids.`
  }

  if (call.action === 'update') {
    // Nothing is half-applied: a text that would be dropped would take an open part with it.
    if (kept.length === 0 || tooShort.length > 0) {
      return `Not updated: ${NOT_ALONE}${tooShort.length > 0 ? ` Too short: ${tooShort.map(text => `"${text}"`).join(', ')}` : ''}`
    }

    await port.questions.write(list => list.map(one => (one.id === target.id && one.session === session ? withTexts(one, kept) : one)))
  } else if (call.action === 'close') {
    const asked = call.parts ?? []
    const bad = asked.filter(part => !Number.isInteger(part) || part < 1 || part > target.texts.length)

    if (bad.length > 0) {
      return `Not closed: question ${target.id} has ${target.texts.length} part(s), numbered from 1; no part ${bad.map(String).join(', ')}.`
    }

    // By wording, on the list as it is when written: a part reworded meanwhile is not closed by mistake.
    const gone = [...new Set(asked)].map(part => target.texts[part - 1] as string)

    await port.questions.write(list =>
      gone.length === 0 || gone.length >= target.texts.length
        ? list.map(one => (one.id === target.id ? { ...one, isOpen: false } : one))
        : withoutTexts(target.id, gone)(list),
    )
  } else if (call.action === 'merge') {
    const keeper = own.find(one => one.id === String(call.into) && one.id !== target.id)

    if (!keeper) {
      return `No question ${call.into ?? ''} to merge into in this session.`
    }

    // What the merged entry still asks moves to the keeper, with its options; a closed one has
    // nothing left to ask.
    await port.questions.write(list =>
      list.map(one =>
        one.id === target.id
          ? { ...one, isOpen: false }
          : one.id === keeper.id
            ? {
                ...(target.isOpen ? withTexts(one, unionTexts(one.texts, target.texts), target.choices) : one),
                isOpen: true,
                asks: one.asks + target.asks,
                at: Math.max(one.at, target.at),
              }
            : one,
      ),
    )
  } else if (call.action === 'reopen') {
    await port.questions.write(list => list.map(one => (one.id === target.id ? { ...one, isOpen: true } : one)))
  } else {
    return 'Invalid questions call: check action, id, texts and parts.'
  }

  return show(await port.questions.own(true))
}
