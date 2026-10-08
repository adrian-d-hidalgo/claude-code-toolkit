import type { Port } from '../../shared/port/port.hook'
import { isHelp } from '../../shared/help/help.hook'
import type { ScanMode } from '../../checklist/args/args.hook'
import { backfillQuestions } from '../backfill/backfill.hook'
import { runQuestionsDoctor } from '../doctor/doctor.hook'
import { QUESTIONS_HELP, QUESTIONS_VERBS } from '../help/help.hook'
import { cleanQuestions, rememberClosed, undoQuestions } from '../lifecycle/lifecycle.hook'
import { closing, withoutText } from '../ops/ops.hook'
import { plural } from '../../shared/diagnosis/diagnosis.hook'
import { partsOf, questionsIn } from '../parts/parts.hook'

export const QUESTIONS_COMMAND = { name: 'questions', description: 'Questions Claude asked that are still unanswered' }

// What a `/questions` run answers; `opens` asks the plugin to show the pane.
export type QuestionsCommandResult = { text: string; opens?: true }

export const runQuestionsCommand = async (port: Port, args: string, options: { judge?: string }): Promise<QuestionsCommandResult> => {
  const [verb = '', ...rest] = args.trim().split(/\s+/)
  const session = await port.sessionId()

  if (isHelp(verb)) {
    return { text: QUESTIONS_HELP }
  }

  if (!QUESTIONS_VERBS.includes(verb)) {
    return { text: `Unknown subcommand "${verb}".\n${QUESTIONS_HELP}` }
  }

  if (verb === 'clear') {
    if (rest[0] === 'all') {
      return { text: `Removed ${questionsIn(await cleanQuestions(port))}. \`/questions undo\` brings them back.` }
    }

    // Dropped for good, so a later scan must not read them as unanswered again.
    await rememberClosed(
      port,
      (await port.questions.own(false)).filter(one => !one.isOpen).flatMap(one => one.texts),
    )
    await port.questions.write(list => list.filter(one => one.session !== session || one.isOpen))

    return { text: 'Closed questions of this session cleared.' }
  }

  if (verb === 'doctor' || verb === 'fix') {
    return { text: await runQuestionsDoctor(port, verb === 'fix', rest.includes('--history'), options) }
  }

  if (verb === 'rebuild') {
    const removed = questionsIn(await cleanQuestions(port))
    const added = await backfillQuestions(port, false, 'deep', options)

    return {
      text: `Rebuilt: removed ${removed} of this session and re-read the conversation, ${plural(added, 'question')} found. \`/questions undo\` brings the old ones back.`,
    }
  }

  if (verb === 'undo') {
    return { text: `Restored ${questionsIn(await undoQuestions(port))} from the last \`clear all\`.` }
  }

  if (verb === 'dismiss') {
    await port.questions.write(list => list.map(one => (one.session === session ? { ...one, isOpen: false } : one)))

    return { text: 'Open questions of this session dismissed.' }
  }

  if (verb === 'scan') {
    const mode: ScanMode = rest.includes('fast') ? 'fast' : rest.includes('quick') ? 'quick' : 'deep'
    const added = await backfillQuestions(port, rest.includes('all'), mode, options)

    return { text: `Scan added ${plural(added, 'question')} (${mode}).` }
  }

  if (verb === 'done') {
    const parts = partsOf(await port.questions.own(true))
    // Numbered as the pane numbers them, one per thing asked; an id still closes its whole entry.
    const number = /^\d+$/.test(rest[0] ?? '') ? Number(rest[0]) : 0
    const part = parts[number - 1]
    const entry = part ? undefined : parts.find(item => item.one.id === rest[0])?.one

    if (!part && !entry) {
      return { text: `No open question ${rest[0] ?? ''}.` }
    }

    await port.questions.write(part ? withoutText(part.one.id, part.text) : closing([entry?.id ?? '']))

    return { text: 'Marked as answered.' }
  }

  return { text: 'Open questions pane opened.', opens: true }
}
