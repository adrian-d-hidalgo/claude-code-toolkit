import type { Port } from '../../shared/port/port.hook'
import { KINDS, KIND_MEANING, STATUSES, isKind } from '../kinds/kinds.hook'
import { byStatus, describe, withField, without } from '../ops/ops.hook'
import { proposeLearnings, proposedText } from '../reconcile/reconcile.hook'
import { LEARNING_RULES, doorProblems } from '../rules/rules.hook'

export const LEARNINGS_TOOL_SPEC = {
  name: 'learnings',
  description:
    `Propose a preference the user stated about how you work, to remember across sessions; the user accepts or rejects every proposal from the Learnings pane, and you save to memory only what they accepted, when they ask you to. Never write memory files on your own: propose here instead. Actions: list (what waits for the user and what they refused; optional status proposed|rejected), propose (kind, text, why, optional how; one that breaks the rules or says too much is turned away with what to fix, one the project already knows is counted, one the user rejected is refused with the reason, one that updates or contradicts a known learning is proposed as replacing it, and a convention, a decision or general knowledge is turned away with where it belongs), withdraw (id: a proposal of this session that turned out wrong), revise (id, and the text, why or how that change: a proposal waiting for review, reworded after the user's comment; it keeps waiting), rules (the rules of a good learning). Kinds: ${KINDS.map(kind => `${kind} (${KIND_MEANING[kind]})`).join('; ')}. A learning is a preference of the user about how you work (how to do something, what never to do, where to find or get something, what they prefer), in one line with its why. Not a learning: a convention of the code or the process (CLAUDE.md), a product or architecture decision (the docs), general engineering knowledge, anything that only matters to this conversation. Most turns have nothing to propose.`,
  inputSchema: {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['list', 'propose', 'withdraw', 'revise', 'rules'] },
      id: { type: 'string' },
      kind: { type: 'string', enum: KINDS },
      text: { type: 'string', description: 'The fact or rule, one line, at most 200 characters: what to do or what is true.' },
      why: { type: 'string', description: 'Why it holds: the correction, confirmation or event it came from, with its absolute date. Required. Together with how, under 600 characters.' },
      how: { type: 'string', description: 'How to apply it, only when the text alone does not say. Do not repeat the text.' },
      status: { type: 'string', enum: ['proposed', 'rejected'], description: 'list: only learnings with this status.' },
    },
    required: ['action'],
  },
}

export type LearningsCall = { action?: string; id?: string; kind?: string; text?: string; why?: string; how?: string; status?: string }

// What the model's `learnings` tool answers: a note on what the call did, then the session's learnings.
export const callLearningsTool = async (port: Port, call: LearningsCall, options: { judge?: string } = {}): Promise<string> => {
  const text = typeof call.text === 'string' ? call.text.trim() : ''
  const why = typeof call.why === 'string' ? call.why.trim() : ''
  let note = ''

  if (call.action === 'rules') {
    return ['A learning is accepted when:', ...LEARNING_RULES.map(rule => `- ${rule}`)].join('\n')
  }

  if (call.action === 'propose') {
    if (!isKind(call.kind)) {
      return `Invalid kind: use ${KINDS.join(', ')}.`
    }

    if (text === '' || why === '') {
      return 'A proposal needs a text (the fact or rule) and a why (where it comes from).'
    }

    const done = await proposeLearnings(port, [{ kind: call.kind, text, why, ...(typeof call.how === 'string' ? { how: call.how } : {}) }], options)
    const id = done.ids[0]
    const isQueued = done.added + done.updated + done.contradicting > 0

    note = isQueued && id ? `Proposed [${id}]; the user reviews it in the Learnings pane. ${proposedText(done)}` : proposedText(done)
  } else if (call.action === 'withdraw' && call.id) {
    const session = await port.sessionId()
    const one = (await port.learnings.all()).find(item => item.id === call.id)

    if (!one) {
      note = `Unknown learning ${call.id}.`
    } else if (one.status !== 'proposed' || one.session !== session) {
      note = `Not withdrawn: [${one.id}] is ${one.status === 'proposed' ? "another session's proposal" : one.status}; only the user changes it.`
    } else {
      await port.learnings.write(without(one.id))
      note = `Withdrawn [${one.id}].`
    }
  } else if (call.action === 'revise' && call.id) {
    const one = (await port.learnings.all()).find(item => item.id === call.id)
    const change = { text: text === '' ? one?.text ?? '' : text, why: why === '' ? one?.why ?? '' : why, how: typeof call.how === 'string' ? call.how.trim() : one?.how }
    const problems = one ? doorProblems(change) : []

    if (!one) {
      note = `Unknown learning ${call.id}.`
    } else if (one.status !== 'proposed') {
      note = `Not revised: [${one.id}] is ${one.status}; propose the change instead (action propose).`
    } else if (problems.length > 0) {
      note = `Not revised, it breaks the rules: ${problems.join('; ')}. Fix it and revise again.`
    } else {
      await port.learnings.write(list => [withField(one.id, 'text', change.text), withField(one.id, 'why', change.why), withField(one.id, 'how', change.how ?? '')].reduce((rest, step) => step(rest), list).map(item => (item.id === one.id && isKind(call.kind) ? { ...item, kind: call.kind } : item)))
      note = `Revised [${one.id}]; it keeps waiting for the user's review.`
    }
  } else if (call.action === 'list') {
    const status = STATUSES.find(one => one === call.status)
    const list = byStatus(await port.learnings.all())

    return describe(status ? list.filter(one => one.status === status) : list)
  } else {
    return 'Invalid learnings call: check action, kind, text, why and id.'
  }

  return [note, describe(byStatus(await port.learnings.all()))].filter(Boolean).join('\n')
}
