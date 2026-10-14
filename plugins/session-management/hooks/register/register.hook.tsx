import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { ChecklistItem, Learning, Question } from '../../types'
import { diffChecklist } from '../checklist/changes/changes.hook'
import { activeBlockers, withoutBlocker } from '../checklist/blockers/blockers.hook'
import type { ActiveBlocker } from '../checklist/blockers/blockers.hook'
import { CHECKLIST_COMMAND, runChecklistCommand } from '../checklist/command/command.hook'
import { byPriority, hasRoom, withDetail, withPriority, withStatus, withText, without } from '../checklist/ops/ops.hook'
import { CHECKLIST_INDEX, adoptChecklist, migrateToId, sweepChecklists } from '../checklist/lifecycle/lifecycle.hook'
import { ADD_FIELD, WIDE, renderChecklistPane, selectedOf } from '../checklist/pane/pane.hook'
import { CHECKLIST_TOOL_SPEC, callChecklistTool } from '../checklist/tool/tool.hook'
import type { ChecklistCall } from '../checklist/tool/tool.hook'
import { cancelTask, runTask } from '../checklist/tasks/tasks.hook'
import { backfillQuestions } from '../questions/backfill/backfill.hook'
import { captureQuestions, resolveAnswered } from '../questions/capture/capture.hook'
import { diffQuestions } from '../questions/changes/changes.hook'
import { QUESTIONS_COMMAND, runQuestionsCommand } from '../questions/command/command.hook'
import { extractQuestions } from '../questions/extract/extract.hook'
import { adoptFromTranscript, parkOwn, restoreAndSweep } from '../questions/lifecycle/lifecycle.hook'
import { answeredDialog, withoutText } from '../questions/ops/ops.hook'
import type { Mark } from '../questions/pane/pane.hook'
import { findPart, markOf, partsOf, renderQuestionsPane, tickKey } from '../questions/pane/pane.hook'
import { dialogChoices } from '../questions/scan/scan.hook'
import { CLOSE_TOOL_SPEC, QUESTIONS_TOOL_SPEC, callCloseQuestion, callQuestionsTool } from '../questions/tool/tool.hook'
import type { QuestionsCall } from '../questions/tool/tool.hook'
import { isOpenStatus } from '../checklist/status/status.hook'
import { captureLearnings } from '../learnings/capture/capture.hook'
import { diffLearnings } from '../learnings/changes/changes.hook'
import { LEARNINGS_COMMAND, runLearningsCommand } from '../learnings/command/command.hook'
import { guardMemoryWrite, guardModeOf, writeOf } from '../learnings/guard/guard.hook'
import { adoptLearnings, dropSettled, learningsKey, splitBySession } from '../learnings/lifecycle/lifecycle.hook'
import { needsReview } from '../learnings/kinds/kinds.hook'
import { INDEX_FILE, memoryDirOf, memoryLearnings } from '../learnings/memory/memory.hook'
import { byStatus } from '../learnings/ops/ops.hook'
import { renderLearningsPane } from '../learnings/pane/pane.hook'
import { acceptAll, acceptLearning, acceptedIds, approvalAt, closeApproval, commentOn, rejectLearning } from '../learnings/review/review.hook'
import { LEARNINGS_TOOL_SPEC, callLearningsTool } from '../learnings/tool/tool.hook'
import type { LearningsCall } from '../learnings/tool/tool.hook'
import { promptContext } from '../shared/context/context.hook'
import { needsPreview } from '../shared/draft/draft.hook'
import { oneLine } from '../shared/format/format.hook'
import type { Port } from '../shared/port/port.hook'

// A plugin names one hooks module and an event takes one unmatched hook, so both
// mods (open questions, checklist) share this file and its session.start and
// prompt.submit hooks. `$.store` is the truth (several sessions may write it); the
// atoms only make the panes redraw.
const QUESTIONS_PANE = 'open-questions'
const CHECKLIST_PANE = 'checklist'
const CLOSE_TOOL = 'mcp__session-management__close_question'
const QUESTIONS_TOOL = 'mcp__session-management__questions'
const CHECKLIST_TOOL = 'mcp__session-management__checklist'
const LEARNINGS_PANE = 'learnings'
const LEARNINGS_TOOL = 'mcp__session-management__learnings'
const questions = atom({ plugin: 'session-management', key: 'questions' } as const, [])
const checklist = atom({ plugin: 'session-management', key: 'checklist' } as const, [])
const learnings = atom({ plugin: 'session-management', key: 'learnings' } as const, [])
const learningSelected = atom({ plugin: 'session-management', key: 'learningSelected' } as const, null)
const learningViewing = atom({ plugin: 'session-management', key: 'learningViewing' } as const, null)
const learningCommenting = atom({ plugin: 'session-management', key: 'learningCommenting' } as const, null)
const editing = atom({ plugin: 'session-management', key: 'editing' } as const, null)
const windowAt = atom({ plugin: 'session-management', key: 'windowAt' } as const, 0)
const viewing = atom({ plugin: 'session-management', key: 'viewing' } as const, null)
const detailing = atom({ plugin: 'session-management', key: 'detailing' } as const, null)
const selected = atom({ plugin: 'session-management', key: 'selected' } as const, null)
const adding = atom({ plugin: 'session-management', key: 'adding' } as const, '')
const chosen = atom({ plugin: 'session-management', key: 'chosen' } as const, null)
const picks = atom({ plugin: 'session-management', key: 'picks' } as const, {})
const draft = atom({ plugin: 'session-management', key: 'draft' } as const, '')
const answering = atom({ plugin: 'session-management', key: 'answering' } as const, null)
const typing = atom({ plugin: 'session-management', key: 'typing' } as const, null)

let counter = 0
let runningTurn: string | null = null
let lastUserText = ''
// What the user typed for the turn running: empty when a plugin prompt started it.
let learningUserText = ''
// When the main turn running started, so an approval closes with the turn that answered it.
let turnStartedAt: number | null = null
// The session id the last prompt ran under: it can change under a conversation (resume, reattach).
let lastSessionId = ''
// Whether this process has moved what an earlier version kept under the launch time to the session id.
let isMigrated = false
// What the assistant last saw of the checklist and of this session's questions; the next prompt
// reports what changed since (the user's edits, another session's). Null until baselined.
let seenChecklist: ChecklistItem[] | null = null
let seenQuestions: Question[] | null = null
let seenLearnings: Learning[] | null = null

async function newId($: any) {
  counter += 1
  return `${(await $.clock.now()).toString(36)}${counter.toString(36)}`
}

// The conversation's key is its session id: it holds through /login, a restart and /compact.
async function conversationKey($: any): Promise<string> {
  return String(await $.session.id())
}

// Each conversation has its own checklist.
async function checklistKey($: any) {
  return `checklist:${await conversationKey($)}`
}

async function loadQuestions($: any): Promise<Question[]> {
  return ((await $.store.get('questions')) as Question[] | undefined) ?? []
}

// Questions of this session only: another session's belong to its own pane and prompts.
async function ownQuestions($: any, isOpenOnly: boolean): Promise<Question[]> {
  const session = await conversationKey($)

  return (await loadQuestions($)).filter(one => one.session === session && (!isOpenOnly || one.isOpen))
}

async function loadChecklist($: any): Promise<ChecklistItem[]> {
  return byPriority(((await $.store.get(await checklistKey($))) as ChecklistItem[] | undefined) ?? [])
}

// Claude's memory belongs to the project: its root, where the session started (or where /cd took it).
// Not the working directory: a shell `cd` into a subfolder moves that, and the memory folder with it.
async function projectKey($: any): Promise<string> {
  try {
    return String(await $.session.root())
  } catch {
    return String(await $.session.cwd())
  }
}

async function loadLearnings($: any): Promise<Learning[]> {
  return ((await $.store.get(learningsKey(await conversationKey($)))) as Learning[] | undefined) ?? []
}

// Claude's own memory folder for the project: the files the engine loads at the start of a session.
async function memoryDir($: any): Promise<string> {
  return memoryDirOf(String((await $.env.get('HOME')) ?? ''), await $.env.get('CLAUDE_CONFIG_DIR'), await projectKey($))
}

// One status line exists per plugin, so it joins what each mod has to show.
async function showStatus($: any) {
  // Every thing asked counts, as the pane lists them: a message with four questions is four.
  const open = (await ownQuestions($, true)).reduce((total, one) => total + one.texts.length, 0)
  const list = await loadChecklist($)
  const done = list.filter(one => one.status === 'done').length
  const active = list.filter(one => one.status !== 'cancelled').length
  // What waits for the user, as the pane lists it: like the open questions, nothing shows when nothing waits.
  const pending = (await loadLearnings($)).filter(needsReview).length
  const parts = [
    open > 0 ? `questions: ${open}` : '',
    active > 0 ? `checklist: ${done}/${active}` : '',
    pending > 0 ? `learnings: ${pending}` : '',
  ].filter(Boolean)
  $.ui.status(parts.length > 0 ? parts.join(' · ') : undefined)
}

// Writes are read-modify-write on one store key (the store has no conditional write), so the ones
// of this process run one after another; another process's write in between is still a race.
let lastWrite: Promise<unknown> = Promise.resolve()

async function writeQuestions($: any, change: (list: Question[]) => Question[]) {
  const run = async () => {
    const before = await loadQuestions($)
    const next = change(before)
    await $.store.set('questions', next)
    await update($, questions, () => next)
    // Ticked options are keyed by position, so an entry whose parts changed (or that closed) would
    // leave ticks that now belong to another part.
    const stale = before.filter(old => {
      const now = next.find(one => one.id === old.id)

      return !now || !now.isOpen || now.texts.join('\n') !== old.texts.join('\n')
    })

    if (stale.length > 0) {
      await update($, picks, current =>
        Object.fromEntries(Object.entries(current).filter(([key]) => !stale.some(old => key.startsWith(`${old.id}#`)))),
      )
    }

    await showStatus($)
  }
  const done = lastWrite.then(run, run)
  lastWrite = done.catch(() => undefined)

  return done
}

async function writeChecklist($: any, change: (list: ChecklistItem[]) => ChecklistItem[]) {
  const next = byPriority(change(await loadChecklist($)))
  const key = await checklistKey($)
  await $.store.set(key, next)
  const index = ((await $.store.get(CHECKLIST_INDEX)) as Record<string, number> | undefined) ?? {}
  await $.store.set(CHECKLIST_INDEX, { ...index, [key]: await $.clock.now() })
  await update($, checklist, () => next)
  await showStatus($)
}

async function writeLearnings($: any, change: (list: Learning[]) => Learning[]) {
  const run = async () => {
    const next = change(await loadLearnings($))
    await $.store.set(learningsKey(await conversationKey($)), next)
    await update($, learnings, () => next)
    await showStatus($)
  }
  const done = lastWrite.then(run, run)
  lastWrite = done.catch(() => undefined)

  return done
}

// A pane drawn unfocused (Esc, Esc) hides its open field but cannot drop the edit's state (no writes
// while drawing). The next focus event in that pane drops it, so a field that comes back with the
// pane's focus is not an old edit with its old text.
let isQuestionsStale = false
let isChecklistStale = false
let isLearningsStale = false

// The few things the services need, built from `$` (which cannot cross an import).
function makePort($: any): Port {
  return {
    now: () => $.clock.now(),
    sessionId: () => conversationKey($),
    root: () => $.session.root(),
    project: () => projectKey($),
    messages: () => $.session.messages(),
    newId: () => newId($),
    complete: ({ prompt, maxTokens }) => $.model.complete({ model: 'haiku', prompt, maxTokens, effort: 'low' }),
    fork: async prompt => {
      try {
        const reply = await $.model.fork({ prompt })

        return reply.isAnswered ? reply.text : null
      } catch {
        return null
      }
    },
    store: {
      get: key => $.store.get(key),
      set: (key, value) => $.store.set(key, value),
      delete: key => $.store.delete(key),
      keys: () => $.store.keys(),
    },
    questions: {
      all: () => loadQuestions($),
      own: isOpenOnly => ownQuestions($, isOpenOnly),
      write: change => writeQuestions($, change),
    },
    checklist: {
      all: () => loadChecklist($),
      write: change => writeChecklist($, change),
      key: () => checklistKey($),
    },
    learnings: {
      all: () => loadLearnings($),
      write: change => writeLearnings($, change),
    },
    memory: {
      dir: () => memoryDir($),
      read: async name => {
        try {
          return String(await $.fs.read(`${await memoryDir($)}/${name}`))
        } catch {
          return null
        }
      },
      write: async (name, text) => $.fs.write(`${await memoryDir($)}/${name}`, text),
      list: async () => {
        try {
          return ((await $.fs.list(await memoryDir($))) as Array<{ name: string; kind: string }>).filter(entry => entry.kind === 'file' && entry.name.endsWith('.md')).map(entry => entry.name)
        } catch {
          return []
        }
      },
      // Only a markdown file of the folder itself, never the index: the one deletion the mod makes.
      remove: async name => {
        const dir = await memoryDir($)

        if (name.includes('/') || name.includes('..') || !name.endsWith('.md') || name === INDEX_FILE || !(await $.fs.exists(`${dir}/${name}`))) {
          return false
        }

        const ran = await $.process.run(['rm', '--', `${dir}/${name}`])

        return ran.exitCode === 0
      },
      exists: path => $.fs.exists(path),
    },
    turn: {
      current: () => runningTurn,
      abort: turnId => $.turn.abort({ turnId }),
    },
    say: text => $.prompt.submit({ text, asUser: true }),
  }
}

// The assistant has now seen the current state (a tool result, or the context just sent).
async function markSeen($: any) {
  seenChecklist = await loadChecklist($)
  seenQuestions = await ownQuestions($, false)
  seenLearnings = await loadLearnings($)
}

// Edits made since the assistant last looked, for the next prompt's context.
async function changesSince($: any): Promise<string[]> {
  const lines = [
    ...(seenChecklist === null ? [] : diffChecklist(seenChecklist, await loadChecklist($))),
    ...(seenQuestions === null ? [] : diffQuestions(seenQuestions, await ownQuestions($, false))),
    ...(seenLearnings === null ? [] : diffLearnings(seenLearnings, await loadLearnings($), await acceptedIds(makePort($)))),
  ]
  await markSeen($)

  return lines
}

// Sends the options picked for one question of a group; that question leaves the group, and the
// entry closes when it was the last.
async function answerChoice($: any, id: string, text: string, options: string[]) {
  const session = await conversationKey($)
  const one = (await loadQuestions($)).find(item => item.id === id && item.session === session && item.isOpen)
  const offered = one?.choices?.[text]?.options
  // Only what this question offers goes out; a part that was reworded or moved since the press is refused.
  const sending = offered ? options.filter(option => offered.includes(option)) : []

  if (!one || !one.texts.includes(text) || sending.length === 0) {
    return
  }

  await leaveQuestions($, id, text)
  await $.prompt.submit({
    text: `Answering your question:\n- ${text}\n\nMy answer: ${sending.join(', ')}`,
    asUser: true,
  })
  $.ui.toast('Answer sent')
}

// Asks Claude to explain a question that did not land, then reword it in the pane so the next
// reading is clear. The question stays open: explaining is not answering.
async function explainQuestion($: any, id: string, part: string) {
  const session = await conversationKey($)
  const one = (await loadQuestions($)).find(item => item.id === id && item.session === session && item.isOpen)

  if (!one || !one.texts.includes(part)) {
    return
  }

  await $.prompt.submit({
    text: `I did not fully understand this question you asked me:\n- ${part}\n\nExplain it more clearly: what you are asking, why you need it, what each option would change and what you recommend. Then reword it with the ${QUESTIONS_TOOL} tool (action update, id ${id}, texts: the entry's questions with this one reworded) so it makes sense on its own. Do not close it: I have not answered yet.`,
    asUser: true,
  })
  $.ui.toast('Asked Claude to explain it')
}

// Editing something with a text field: the field opens with its text in it and takes the keyboard
// at once, so the person does not have to navigate to it. An id of null stops editing.
async function focusField($: any, pane: string, field: string) {
  try {
    await $.ui.focus({ requestId: pane, key: field })
  } catch {
    // The pane may not hold the keyboard; the field's own autofocus still applies.
  }
}

// Reveals (or, with null, hides) a part's answer area and moves the ring into it. The title and
// description fields share the draft, so only one text field is ever open.
async function startAnswering($: any, mark: Mark | null, field?: string) {
  const part = findPart(partsOf(await ownQuestions($, true)), mark)

  // A part that moved or was reworded since it was drawn is not what the person pressed on.
  if (mark !== null && !part) {
    return
  }

  isQuestionsStale = false
  await update($, draft, () => '')
  await update($, editing, () => null)
  await update($, detailing, () => null)
  await update($, typing, () => null)
  await update($, answering, () => mark)

  if (part) {
    await focusField($, QUESTIONS_PANE, field ?? `reply-${part.key}`)
  }
}

// Other: the options give way to the text box, focused.
async function startTyping($: any, mark: Mark | null) {
  const part = findPart(partsOf(await ownQuestions($, true)), mark)

  if (mark !== null && !part) {
    return
  }

  isQuestionsStale = false
  await update($, draft, () => '')
  await update($, editing, () => null)
  await update($, detailing, () => null)
  await update($, typing, () => mark)

  if (part) {
    await focusField($, QUESTIONS_PANE, `reply-${part.key}`)
  }
}

async function closeAnswering($: any) {
  await update($, answering, () => null)
  await update($, typing, () => null)
  await update($, draft, () => '')
}

// Drops whatever text field is open in the checklist pane.
async function closeEditing($: any) {
  await update($, editing, () => null)
  await update($, detailing, () => null)
  await update($, draft, () => '')
}

// The one-line field cannot hold or scroll a long or multi-line text, so those are edited in the real
// prompt box through the command that saves them. The draft already there is never replaced.
async function editInPrompt($: any, section: 'title' | 'description', id: string, text: string) {
  const position = (await loadChecklist($)).findIndex(one => one.id === id) + 1

  if (position === 0) {
    return
  }

  if ((await $.prompt.read()).text.trim() !== '') {
    $.ui.toast('Your prompt has text: clear it first')

    return
  }

  const filled = await $.prompt.fill({ text: `/checklist edit ${position} ${section} ${text}` })

  $.ui.toast(filled.isFilled ? 'Press Esc to reach the prompt, edit the text and press Enter' : 'The prompt box is not available now')
}

async function startTitle($: any, id: string | null, text: string) {
  isChecklistStale = false
  await closeAnswering($)
  await update($, detailing, () => null)
  await update($, draft, () => text)
  await update($, editing, () => id)

  if (id !== null) {
    await focusField($, CHECKLIST_PANE, `title-${id}`)
  }
}

async function startNotes($: any, id: string | null, text: string) {
  isChecklistStale = false
  await closeAnswering($)
  await update($, editing, () => null)
  await update($, draft, () => text)
  await update($, detailing, () => id)

  if (id !== null) {
    await focusField($, CHECKLIST_PANE, `notes-${id}`)
  }
}

// A learning is reworded in the prompt box, as `/learnings edit <n> text …`, like a long task description.
async function editLearningInPrompt($: any, id: string) {
  const list = byStatus(await loadLearnings($))
  const position = list.findIndex(one => one.id === id) + 1

  if (position === 0) {
    return
  }

  if ((await $.prompt.read()).text.trim() !== '') {
    $.ui.toast('Your prompt has text: clear it first')

    return
  }

  const filled = await $.prompt.fill({ text: `/learnings edit ${position} text ${list[position - 1]?.text ?? ''}` })

  $.ui.toast(filled.isFilled ? 'Press Esc to reach the prompt, edit the text (or write why / how instead of text) and press Enter' : 'The prompt box is not available now')
}

// Answers a learning and leaves the selection (and the ring) on the one that took its place, as the
// questions pane does with a part it closes.
async function answerLearning($: any, id: string, answer: (port: Port) => Promise<string>) {
  const at = byStatus(await loadLearnings($)).filter(needsReview).findIndex(one => one.id === id)
  $.ui.toast(await answer(makePort($)))

  const rest = byStatus(await loadLearnings($)).filter(needsReview)
  const near = at === -1 ? undefined : rest[Math.min(at, rest.length - 1)]

  await update($, learningViewing, () => null)
  await update($, learningCommenting, () => null)
  await update($, learningSelected, () => near?.id ?? null)

  if (near) {
    await focusField($, LEARNINGS_PANE, `row-${near.id}`)
  }
}

// Takes a part out of the open ones, with its ticks and any open answer area, and leaves the selection
// (and the ring) on its neighbour instead of sending it back to the top.
async function leaveQuestions($: any, id: string, text: string) {
  const at = partsOf(await ownQuestions($, true)).findIndex(part => part.one.id === id && part.text === text)
  await writeQuestions($, withoutText(id, text))
  await closeAnswering($)
  await update($, picks, all => Object.fromEntries(Object.entries(all).filter(([key]) => key !== tickKey({ id, text }))))

  const parts = partsOf(await ownQuestions($, true))
  const near = parts[Math.min(Math.max(at, 0), parts.length - 1)]

  await update($, chosen, () => (near ? markOf(near) : null))

  if (near) {
    await focusField($, QUESTIONS_PANE, `row-${near.key}`)
  }
}

// A free-text answer typed in the pane: the question closes and the reply goes to the session.
async function replyToQuestion($: any, id: string, part: string, value: string) {
  const session = await conversationKey($)
  const one = (await loadQuestions($)).find(item => item.id === id && item.session === session && item.isOpen)
  const text = value.trim()

  if (!one || !one.texts.includes(part) || text === '') {
    return
  }

  await leaveQuestions($, id, part)
  await $.prompt.submit({
    text: `Answering your question:\n- ${part}\n\nMy answer: ${text}`,
    asUser: true,
  })
  $.ui.toast('Answer sent')
}

// Takes the person to a question from a task's screen: the questions pane opens (raised, with the keys
// if the surface grants them), the entry's first part is the chosen one and the ring is asked for its row.
async function goToQuestion($: any, entryId: string) {
  const one = (await ownQuestions($, true)).find(item => item.id === entryId)
  const part = one ? partsOf([one])[0] : undefined

  if (!part) {
    $.ui.toast('That question is closed.')

    return
  }

  await update($, chosen, () => markOf(part))
  await $.ui.open({ id: QUESTIONS_PANE, title: 'Open questions', focus: true })
  await focusField($, QUESTIONS_PANE, `row-${part.key}`)
}

// Draws the questions pane: the view is pure, so what a press does is spelled out here.
async function drawQuestions($: any, e: any) {
  await read($, questions)
  await read($, checklist)

  // Esc inside a field only hands the keys back to the ring and never reaches the plugin; a second Esc
  // unfocuses the pane. Drawing is pure (no state writes), so an unfocused pane just draws without its
  // open field; the stale state is dropped by the next ui.focus when the ring comes back.
  const isBlurred = e.props?.isFocused === false
  const open = await ownQuestions($, true)
  const parts = partsOf(open)
  const keyOf = (mark: Mark | null) => findPart(parts, mark)?.key ?? null
  const marked = await read($, picks)
  // The open tasks waiting for each entry, so the selected question can say it holds them up.
  const blocking: Record<string, number> = {}

  for (const task of (await loadChecklist($)).filter(one => isOpenStatus(one.status))) {
    for (const held of task.blockedBy ?? []) {
      if (held.kind === 'question') {
        blocking[held.id] = (blocking[held.id] ?? 0) + 1
      }
    }
  }

  const ticked: Record<string, string[]> = {}

  // Ticks belong to a part by its wording, and only count while the question still offers the option.
  for (const part of parts) {
    const offered = part.one.choices?.[part.text]?.options ?? []
    const ticks = marked[tickKey(markOf(part))]

    if (ticks) {
      ticked[part.key] = ticks.filter(option => offered.includes(option))
    }
  }

  if (isBlurred) {
    isQuestionsStale = true
  }

  return renderQuestionsPane(
    $.ui.resolve(e),
    {
      open,
      chosenId: keyOf(await read($, chosen)),
      answeringId: isBlurred ? null : keyOf(await read($, answering)),
      typingId: isBlurred ? null : keyOf(await read($, typing)),
      draft: await read($, draft),
      ticked,
      blocking,
      isFocused: !isBlurred,
      now: await $.clock.now(),
      // The pane's own body width when the surface says it, else the transcript's.
      columns: e.props?.bodyColumns ?? Math.min(e.viewport?.columns ?? 60, 48),
      bodyRows: e.props?.scroll?.bodyRows ?? (e.viewport?.rows ?? 24) - 6,
    },
    {
      choose: mark => update($, chosen, () => mark),
      setAnswering: (mark, field) => startAnswering($, mark, field),
      setTyping: mark => startTyping($, mark),
      type: text => update($, draft, () => text),
      tick: (mark, options) => update($, picks, all => ({ ...all, [tickKey(mark)]: options })),
      pick: (id, text, value) => answerChoice($, id, text, [value]),
      send: (id, text, options) => answerChoice($, id, text, options),
      explain: (id, text) => explainQuestion($, id, text),
      dismiss: async (id, text) => {
        const one = (await ownQuestions($, true)).find(item => item.id === id)

        // A part that is no longer there (reworded, closed elsewhere) is not dismissed by a stale press.
        if (one?.texts.includes(text)) {
          await leaveQuestions($, id, text)
        }
      },
      reply: (id, text, value) => replyToQuestion($, id, text, value),
    },
  )
}

// Draws the checklist pane, the same way.
async function drawChecklist($: any, e: any) {
  await read($, checklist)

  // Same as the questions pane: a second Esc unfocuses the pane, and an unfocused pane draws without
  // its title or description field.
  const isBlurred = e.props?.isFocused === false
  const list = await loadChecklist($)
  const open = await ownQuestions($, true)
  const blockers: Record<string, ActiveBlocker[]> = {}

  for (const task of list) {
    const waiting = activeBlockers(task, list, open)

    if (waiting.length > 0) {
      blockers[task.id] = waiting
    }
  }

  if (isBlurred) {
    isChecklistStale = true
  }

  // The pane's own body width when the surface says it, else a side pane's.
  const columns = e.props?.bodyColumns ?? Math.min(e.viewport?.columns ?? 60, 38)

  return renderChecklistPane(
    $.ui.resolve(e),
    {
      list,
      blockers,
      selectedId: await read($, selected),
      viewingId: await read($, viewing),
      editingId: isBlurred ? null : await read($, editing),
      detailingId: isBlurred ? null : await read($, detailing),
      draft: await read($, draft),
      adding: await read($, adding),
      first: await read($, windowAt),
      columns,
      bodyRows: e.props?.scroll?.bodyRows ?? (e.viewport?.rows ?? 24) - 6,
      isFocused: !isBlurred,
    },
    {
      select: id => update($, selected, () => id),
      // The ring starts at the top of a task's screen, and returns to the task's row on the way back,
      // instead of keeping the position it had in the other screen.
      view: async id => {
        const from = selectedOf(await loadChecklist($), await read($, selected))
        await update($, viewing, () => id)
        await focusField($, CHECKLIST_PANE, id === null ? `row-${from?.id ?? ''}` : 'back')
      },
      walk: async id => {
        await closeEditing($)
        await update($, selected, () => id)
        await update($, viewing, () => id)
      },
      edit: async id => {
        const task = (await loadChecklist($)).find(one => one.id === id)
        const text = task?.text ?? ''

        if (id !== null && task && needsPreview(text, columns)) {
          return editInPrompt($, 'title', id, text)
        }

        await startTitle($, id, text)
      },
      editNotes: async id => {
        const task = (await loadChecklist($)).find(one => one.id === id)
        const text = task?.detail ?? ''

        if (id !== null && task && needsPreview(text, columns)) {
          return editInPrompt($, 'description', id, text)
        }

        await startNotes($, id, text)
      },
      type: text => update($, draft, () => text),
      typeAdd: text => update($, adding, () => text),
      // The window moves with the selection: the window follows the selected row, so moving it alone
      // would be undone at the next draw.
      scroll: async (first, id) => {
        await update($, windowAt, () => first)

        if (id !== null) {
          await update($, selected, () => id)
          await focusField($, CHECKLIST_PANE, `row-${id}`)
        }
      },
      run: async id => $.ui.toast(await runTask(makePort($), id)),
      unblock: (id, blocker) => writeChecklist($, withoutBlocker(id, blocker)),
      // Narrow, the task's own screen replaces this one (ring on its Back); wide, the list shows the task
      // beside it, so it is picked and the ring goes to its row.
      goTask: async id => {
        await closeEditing($)
        await update($, selected, () => id)

        if (columns >= WIDE) {
          await focusField($, CHECKLIST_PANE, `row-${id}`)

          return
        }

        await update($, viewing, () => id)
        await focusField($, CHECKLIST_PANE, 'back')
      },
      goQuestion: entryId => goToQuestion($, entryId),
      cancel: id => cancelTask(makePort($), id),
      reopen: id => writeChecklist($, withStatus(id, 'todo')),
      setPriority: (id, priority) => writeChecklist($, withPriority(id, priority)),
      rename: async (id, value) => {
        if (value.trim() !== '') {
          await writeChecklist($, withText(id, value))
        }

        await update($, editing, () => null)
        await update($, draft, () => '')
      },
      saveNotes: async (id, value) => {
        await writeChecklist($, withDetail(id, value))
        await update($, detailing, () => null)
        await update($, draft, () => '')
      },
      // The neighbour (the next task, else the previous) takes the selection and the ring.
      remove: async id => {
        const at = (await loadChecklist($)).findIndex(one => one.id === id)
        await writeChecklist($, without(id))

        const rest = await loadChecklist($)
        const near = at === -1 ? undefined : rest[Math.min(at, rest.length - 1)]

        await update($, viewing, () => null)
        await update($, selected, () => near?.id ?? null)

        if (near) {
          await focusField($, CHECKLIST_PANE, `row-${near.id}`)
        }
      },
      add: async value => {
        const text = oneLine(value)

        if (text !== '') {
          if (!hasRoom(await loadChecklist($))) {
            $.ui.toast('The checklist is full (200 tasks): clear done ones or remove some first.')

            return
          }

          const id = await newId($)
          await writeChecklist($, list => [...list, { id, text, status: 'todo' }])
        }

        // The field is controlled and keeps its key, so it empties without losing the ring.
        await update($, adding, () => '')
        await focusField($, CHECKLIST_PANE, ADD_FIELD)
      },
    },
  )
}

// Draws the learnings pane, the same way.
async function drawLearnings($: any, e: any) {
  await read($, learnings)

  const isBlurred = e.props?.isFocused === false

  if (isBlurred) {
    isLearningsStale = true
  }

  return renderLearningsPane(
    $.ui.resolve(e),
    {
      // What is in memory comes along only to name what a proposal updates; the pane lists what waits.
      list: [...byStatus(await loadLearnings($)), ...(await memoryLearnings(makePort($)))],
      chosenId: await read($, learningSelected),
      openId: isBlurred ? null : await read($, learningViewing),
      commentingId: isBlurred ? null : await read($, learningCommenting),
      draft: await read($, draft),
      isFocused: !isBlurred,
      now: await $.clock.now(),
      // The pane's own body width when the surface says it, else the transcript's.
      columns: e.props?.bodyColumns ?? Math.min(e.viewport?.columns ?? 60, 48),
      bodyRows: e.props?.scroll?.bodyRows ?? (e.viewport?.rows ?? 24) - 6,
    },
    {
      choose: id => update($, learningSelected, () => id),
      setOpen: async id => {
        isLearningsStale = false

        if (id !== null) {
          await update($, learningSelected, () => id)
        }

        await update($, learningViewing, () => id)
      },
      accept: id => answerLearning($, id, port => acceptLearning(port, id)),
      reject: id => answerLearning($, id, port => rejectLearning(port, id)),
      setCommenting: async id => {
        isLearningsStale = false
        await update($, draft, () => '')
        await update($, learningCommenting, () => id)

        if (id !== null) {
          await focusField($, LEARNINGS_PANE, `comment-box-${id}`)
        }
      },
      type: text => update($, draft, () => text),
      comment: async (id, text) => {
        $.ui.toast(await commentOn(makePort($), id, text, LEARNINGS_TOOL))

        if (text.trim() !== '') {
          await update($, learningCommenting, () => null)
          await update($, draft, () => '')
          await focusField($, LEARNINGS_PANE, `row-${id}`)
        }
      },
      edit: id => editLearningInPrompt($, id),
      acceptAll: async () => {
        const done = await acceptAll(makePort($))
        $.ui.toast(`${done.done} accepted${done.refused.length > 0 ? `; ${done.refused.length} still waiting: they break the rules` : ''}`)
        await update($, learningViewing, () => null)
      },
    },
  )
}

// Takes back the checklist and the learnings a resumed conversation left under its old id.
async function adoptOwnChecklist($: any) {
  const done = await adoptChecklist(makePort($))
  await adoptLearnings(makePort($), done.from)
}

// Bookkeeping must never break a session, a turn or the user's answer: a failure leaves that
// step undone and the rest goes on.
// Once per process, from session.start or the first prompt (a plugin reload does not fire session.start).
async function migrate($: any) {
  if (!isMigrated) {
    isMigrated = true
    await migrateToId(makePort($), String((await $.session.usage()).startedAt))
    await splitBySession(makePort($))
    await dropSettled(makePort($))
  }
}

async function attempt(job: () => Promise<unknown>) {
  try {
    await job()
  } catch {
    // Best effort.
  }
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.command.register(QUESTIONS_COMMAND)
    await $.command.register(CHECKLIST_COMMAND)
    await $.command.register(LEARNINGS_COMMAND)
    await $.tool.register(CLOSE_TOOL_SPEC)
    await $.tool.register(QUESTIONS_TOOL_SPEC)
    await $.tool.register(CHECKLIST_TOOL_SPEC)
    await $.tool.register(LEARNINGS_TOOL_SPEC)
    await attempt(() => writeQuestions($, list => list))
    await attempt(() => writeChecklist($, list => list))
    // What earlier versions kept moves to this project's key, without what is in memory: that is Claude's.
    await attempt(() => splitBySession(makePort($)))
    await attempt(() => dropSettled(makePort($)))
    await attempt(() => writeLearnings($, list => list))
    // What an earlier version kept under the launch time moves to the session id, before the sweep.
    await attempt(() => migrate($))
    // A resumed conversation under a new id takes its own list back before the sweep.
    await attempt(() => adoptOwnChecklist($))
    await attempt(() => sweepChecklists(makePort($)))
    // The conversation's own questions first, so the sweep does not take them for another session's.
    await attempt(() => adoptFromTranscript(makePort($)))
    await attempt(() => restoreAndSweep(makePort($)))
    await attempt(async () => {
      lastSessionId = await $.session.id()
      await markSeen($)
    })

    // A resumed session gets the questions it never answered back.
    await attempt(async () => {
      if ((await $.session.messages()).length > 0) {
        void backfillQuestions(makePort($), false, 'quick', options).catch(() => undefined)
      }
    })

    return next(e)
  })

  on('session.end', async ($, e, next) => {
    await attempt(() => parkOwn(makePort($)))
    seenChecklist = null
    seenQuestions = null
    seenLearnings = null

    return next(e)
  })

  on('command.run', { command: 'questions' }, async ($, e) => {
    const done = await runQuestionsCommand(makePort($), e.args, options)

    if (done.opens) {
      // Another session's process writes the same store (a migration, an adoption) without touching this
      // process's state, so a pane drawn before would keep what it showed: opening it draws what is stored now.
      const fresh = await loadQuestions($)
      await update($, questions, () => fresh)
      await showStatus($)
      await $.ui.open({ id: QUESTIONS_PANE, title: 'Open questions', focus: true })
    }

    return { text: done.text }
  })

  on('command.run', { command: 'checklist' }, async ($, e) => {
    const done = await runChecklistCommand(makePort($), e.args, options)

    if (done.opens) {
      const fresh = await loadChecklist($)
      await update($, checklist, () => fresh)
      await showStatus($)
      await $.ui.open({ id: CHECKLIST_PANE, title: 'Checklist', focus: true })
    }

    return { text: done.text }
  })

  on('command.run', { command: 'learnings' }, async ($, e) => {
    const done = await runLearningsCommand(makePort($), e.args, options)

    if (done.opens) {
      const fresh = await loadLearnings($)
      await update($, learnings, () => fresh)
      await showStatus($)
      await $.ui.open({ id: LEARNINGS_PANE, title: 'Learnings', focus: true })
    }

    return { text: done.text }
  })

  on('tool.call', { tool: LEARNINGS_TOOL }, async ($, e) => {
    const result = await callLearningsTool(makePort($), e as LearningsCall, options).catch(() => 'The learnings tool failed; nothing was changed. Try again.')
    await attempt(() => markSeen($))

    return { result } as never
  })

  // A write into Claude's memory folder is the model deciding alone what to remember: under `guard`
  // it is refused and becomes a proposal; under `observe` it goes through and is tracked as one.
  for (const tool of ['Write', 'Edit', 'MultiEdit']) {
    on('tool.call', { tool: tool as 'Write' }, async ($, e, next) => {
      const mode = guardModeOf(options.memory)
      const write = mode === 'off' ? null : writeOf(tool, e as unknown as Record<string, unknown>)
      let guarded: { deny?: string; note?: string } | null = null

      if (write) {
        try {
          guarded = await guardMemoryWrite(makePort($), write, mode, options)
        } catch {
          // The guard must never block ordinary file writes.
        }
      }

      if (guarded?.deny) {
        return { deny: guarded.deny } as never
      }

      const ran = await next(e)

      if (guarded?.note) {
        $.ui.toast(guarded.note)
      }

      return ran
    })
  }

  on('tool.call', { tool: CLOSE_TOOL }, async ($, e) => {
    const ids = (e as { ids?: unknown }).ids
    const result = await callCloseQuestion(makePort($), Array.isArray(ids) ? ids : []).catch(() => 'The close_question tool failed; nothing was changed. Try again.')
    await attempt(() => markSeen($))

    return { result } as never
  })

  on('tool.call', { tool: QUESTIONS_TOOL }, async ($, e) => {
    // A failure is the tool's answer, not an error in the user's turn.
    const result = await callQuestionsTool(makePort($), e as QuestionsCall).catch(() => 'The questions tool failed; nothing was changed. Try again.')
    await attempt(() => markSeen($))

    return { result } as never
  })

  on('tool.call', { tool: CHECKLIST_TOOL }, async ($, e) => {
    const result = await callChecklistTool(makePort($), e as ChecklistCall, options)
    await markSeen($)

    return { result } as never
  })

  on('tool.call', { tool: 'AskUserQuestion' }, async ($, e, next) => {
    // The capture runs while the dialog is open; the answer is applied once it has landed, so a
    // quick answer finds the entry it closes.
    let captured: Promise<unknown> = Promise.resolve()

    try {
      const asked = (Array.isArray(e.questions) ? e.questions : []).flatMap(one => (typeof one?.question === 'string' ? [one.question] : []))
      captured = captureQuestions(makePort($), asked.join('\n'), asked, 'dialog', options, dialogChoices({ questions: e.questions })).catch(() => undefined)
    } catch {
      // Tracking the dialog must not stop it.
    }

    const ran = await next(e)

    await attempt(async () => {
      if ('result' in ran && ran.result) {
        const answers = (ran.result as { answers?: Record<string, string> }).answers ?? {}
        const session = await conversationKey($)
        await captured
        await writeQuestions($, answeredDialog(Object.keys(answers), session))
      }
    })

    return ran
  })

  on('turn.start', async ($, e, next) => {
    runningTurn = e.turnId

    if (!(e as { agentId?: string }).agentId) {
      await attempt(async () => {
        turnStartedAt = await $.clock.now()
      })
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      runningTurn = null
    }

    if (!e.agentId && !e.isAborted) {
      const port = makePort($)
      // What this turn settled is judged before its own new questions are tracked.
      void resolveAnswered(port, lastUserText, e.answer, options)
        .catch(() => undefined)
        .then(() => captureQuestions(port, e.answer, extractQuestions(e.answer), 'text', options))
        .catch(() => undefined)

      // What the turn taught goes to the review queue, the same way, unless memory is not watched. A turn
      // a plugin prompt started (a save, a fix, a comment) teaches nothing: the user did not speak.
      if (guardModeOf(options.memory) !== 'off' && learningUserText !== '') {
        void captureLearnings(port, { user: learningUserText, assistant: e.answer }, options).catch(() => undefined)
      }

      // The turn that answered an approval (a save, a fix) closes it: the guard watches again.
      await attempt(async () => {
        const at = await approvalAt(port)

        if (at !== null && turnStartedAt !== null && at <= turnStartedAt) {
          await closeApproval(port)
        }
      })
    }

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (e.origin.kind === 'plugin') {
      learningUserText = ''

      return next(e)
    }

    lastUserText = e.text
    learningUserText = e.text

    await attempt(() => migrate($))

    await attempt(async () => {
      if ((await $.session.id()) !== lastSessionId) {
        lastSessionId = await $.session.id()
        await adoptFromTranscript(makePort($))
        await adoptOwnChecklist($)
      }
    })

    void resolveAnswered(makePort($), e.text, '', options).catch(() => undefined)

    // The notes are a help: when they cannot be built the prompt still goes through.
    let context: string[] = []

    try {
      context = promptContext({
        changes: await changesSince($),
        open: await ownQuestions($, true),
        list: await loadChecklist($),
        learnings: await loadLearnings($),
        isMemoryGuarded: guardModeOf(options.memory) === 'guard',
        questionsTool: QUESTIONS_TOOL,
        checklistTool: CHECKLIST_TOOL,
        learningsTool: LEARNINGS_TOOL,
      })
    } catch {
      context = []
    }

    return context.length === 0 ? next(e) : next({ ...e, context: [...(e.context ?? []), ...context] })
  })

  on('ui.render', { component: 'Pane', requestId: QUESTIONS_PANE }, ($, e) => drawQuestions($, e))

  on('ui.render', { component: 'Pane', requestId: CHECKLIST_PANE }, ($, e) => drawChecklist($, e))

  on('ui.render', { component: 'Pane', requestId: LEARNINGS_PANE }, ($, e) => drawLearnings($, e))

  // Same as the questions pane: the selection follows the ring, and the details close when it leaves them.
  on('ui.focus', { requestId: LEARNINGS_PANE }, async ($, e, next) => {
    const element = e.element ?? ''

    try {
      if (isLearningsStale) {
        isLearningsStale = false
        await update($, learningViewing, () => null)
        await update($, learningCommenting, () => null)
      }

      if (element.startsWith('row-')) {
        await update($, learningSelected, () => element.slice(4))
      }

      // The details stay open on their own row, actions and Edit (all keyed ending with the learning's id).
      const open = await read($, learningViewing)

      if (open !== null && !element.endsWith(`-${open}`)) {
        await update($, learningViewing, () => null)
      }

      // The comment box stays open on its field, its ✕ and the actions of its learning.
      const commenting = await read($, learningCommenting)

      if (commenting !== null && !element.endsWith(`-${commenting}`)) {
        await update($, learningCommenting, () => null)
      }
    } catch {
      // The ring must move even when the pane's state cannot follow it.
    }

    return next(e)
  })

  // The selection follows the focus ring, so the arrows are all it takes to pick a row; and a
  // field being typed in closes when the ring leaves it (Esc, a click elsewhere).
  on('ui.focus', { requestId: QUESTIONS_PANE }, async ($, e, next) => {
    const element = e.element ?? ''

    try {
      // The pane was drawn unfocused and has the ring back: whatever field it kept open is an old edit.
      if (isQuestionsStale) {
        isQuestionsStale = false
        await closeAnswering($)
      }

      const parts = partsOf(await ownQuestions($, true))

      if (element.startsWith('row-')) {
        const part = parts.find(one => one.key === element.slice(4))

        if (part) {
          await update($, chosen, () => markOf(part))
        }
      }

      // The area stays open on its own options, Send, Other, box and a/e/d buttons (all keyed with the
      // part's key) and closes on anything else, e.g. another part's row, or when its part is gone.
      const marked = await read($, answering)
      const open = findPart(parts, marked)

      if (marked !== null && (!open || (!element.endsWith(`-${open.key}`) && !element.includes(`-${open.key}-`)))) {
        await closeAnswering($)
      }
    } catch {
      // The ring must move even when the pane's state cannot follow it.
    }

    return next(e)
  })

  on('ui.focus', { requestId: CHECKLIST_PANE }, async ($, e, next) => {
    const element = e.element ?? ''

    try {
      // The pane was drawn unfocused and has the ring back: whatever field it kept open is an old edit.
      if (isChecklistStale) {
        isChecklistStale = false
        await closeEditing($)
      }

      if (element.startsWith('row-')) {
        await update($, selected, () => element.slice(4))
      }

      // Only the fields and their cancel buttons: the pencils beside Task and Description are `*-edit-<id>`.
      const isTyping = (element.startsWith('title-') || element.startsWith('notes-')) && !element.startsWith('title-edit-') && !element.startsWith('notes-edit-')

      if (!isTyping && ((await read($, editing)) !== null || (await read($, detailing)) !== null)) {
        await closeEditing($)
      }
    } catch {
      // The ring must move even when the pane's state cannot follow it.
    }

    return next(e)
  })
}
