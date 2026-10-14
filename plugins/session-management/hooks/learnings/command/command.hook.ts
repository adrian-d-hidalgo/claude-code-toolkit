import type { ScanMode } from '../../checklist/args/args.hook'
import type { Port } from '../../shared/port/port.hook'
import { parseLearningsArgs } from '../args/args.hook'
import { scanLearnings } from '../capture/capture.hook'
import { clearLearnings, runLearningsDoctor, undoLearnings } from '../doctor/doctor.hook'
import { LEARNINGS_HELP } from '../help/help.hook'
import { GLYPH, needsReview } from '../kinds/kinds.hook'
import { byStatus, withField, withKind } from '../ops/ops.hook'
import { proposedText } from '../reconcile/reconcile.hook'
import { acceptAll, acceptLearning, commentOn, rejectLearning, removeLearning, reopenLearning, reviseLearning } from '../review/review.hook'
import { LEARNING_RULES, excerpt } from '../rules/rules.hook'

export const LEARNINGS_COMMAND = { name: 'learnings', description: 'What enters Claude\'s memory: review, accept or reject what it proposes' }

export type LearningsCommandResult = { text: string; opens?: true }

// What a scan of the conversation proposed.
const scanText = async (port: Port, mode: ScanMode, options: { judge?: string }): Promise<string> => {
  if (mode === 'fast' || options.judge === 'heuristic') {
    return 'A scan needs the model: learnings have no local rules to find them by (use scan or scan quick, with judge: model).'
  }

  const done = await scanLearnings(port, mode, options)
  const waiting = (await port.learnings.all()).filter(needsReview).length

  return [`Scan (${mode}): ${done ? proposedText(done) : 'nothing proposed'}.`, waiting > 0 ? `${waiting} waiting in /learnings: accept or reject them one by one, or all at once with \`/learnings accept all\`.` : ''].filter(Boolean).join('\n')
}

export const runLearningsCommand = async (port: Port, args: string, options: { judge?: string }): Promise<LearningsCommandResult> => {
  const command = parseLearningsArgs(args)

  switch (command.kind) {
    case 'open':
      return { text: 'Learnings pane opened.', opens: true }
    case 'help':
      return { text: LEARNINGS_HELP }
    case 'invalid':
      return { text: `${command.reason}.\n${LEARNINGS_HELP}` }
    case 'rules':
      return { text: ['A learning is accepted when:', ...LEARNING_RULES.map(rule => `- ${rule}`)].join('\n') }
    case 'doctor':
    case 'fix':
      return { text: await runLearningsDoctor(port, command.kind === 'fix', options) }
    case 'scan':
      return { text: await scanText(port, command.mode, options) }
    case 'acceptAll': {
      const done = await acceptAll(port)

      return { text: `${done.done} accepted; Claude saves ${done.done === 1 ? 'it' : 'them'} to its memory.${done.refused.length > 0 ? ` Still waiting, they break the rules (edit them first):\n${done.refused.map(line => `- ${line}`).join('\n')}` : ''}` }
    }
    case 'undo': {
      const restored = await undoLearnings(port)

      return {
        text:
          restored.ledger + restored.files === 0
            ? 'Nothing to restore.'
            : `Restored what the last fix, clear or rebuild changed${restored.ledger > 0 ? `: the queue (${restored.ledger})` : ''}${restored.files > 0 ? `${restored.ledger > 0 ? ' and' : ':'} ${restored.files} memory file(s) put back as they were` : ''}.`,
      }
    }
    case 'clear': {
      const cleared = await clearLearnings(port, command.isAll)

      return {
        text: cleared === 0 ? (command.isAll ? 'Nothing waits for review and nothing was refused.' : 'Nothing waits for review.') : `${command.isAll ? 'Review queue and refusals' : 'Review queue'} emptied (${cleared}); memory is untouched. \`/learnings undo\` brings them back.`,
      }
    }
    case 'rebuild': {
      const cleared = await clearLearnings(port)

      return { text: `Emptied the review queue (${cleared}) and scanned the conversation again.\n${await scanText(port, 'deep', options)}\n\`/learnings undo\` brings the old queue back.` }
    }
    case 'list': {
      const waiting = byStatus(await port.learnings.all()).filter(needsReview)

      return { text: waiting.length === 0 ? 'Nothing waits for review.' : waiting.map((one, index) => `${index + 1}. ${GLYPH.proposed} ${excerpt(one.text.split('\n')[0] ?? '', 100)}`).join('\n') }
    }
    default: {
      // Numbered as the pane numbers them: what waits first, then the refusals.
      const target = byStatus(await port.learnings.all())[command.position - 1]

      if (!target) {
        return { text: `No learning ${command.position}.` }
      }

      switch (command.kind) {
        case 'accept':
          return { text: await acceptLearning(port, target.id) }
        case 'reject':
          return { text: await rejectLearning(port, target.id, command.reason) }
        case 'comment':
          return { text: await commentOn(port, target.id, command.text) }
        case 'reopen':
          return { text: await reopenLearning(port, target.id) }
        case 'remove':
          return { text: await removeLearning(port, target.id) }
        case 'kind':
          await reviseLearning(port, withKind(target.id, command.value))

          return { text: 'Learning updated.' }
        default:
          await reviseLearning(port, withField(target.id, command.field, command.text))

          return { text: 'Learning updated.' }
      }
    }
  }
}
