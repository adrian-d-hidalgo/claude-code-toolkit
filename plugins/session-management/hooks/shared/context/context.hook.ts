import type { ChecklistItem, Learning, Question } from '../../../types'
import { briefChecklist } from '../../checklist/ops/ops.hook'
import { briefLearnings } from '../../learnings/ops/ops.hook'

export type ContextInput = {
  /** What changed since the assistant last looked. */
  changes: string[]
  /** This session's open questions (the newest are shown). */
  open: Question[]
  list: ChecklistItem[]
  /** This session's learnings: what waits and what was refused. */
  learnings: Learning[]
  /** Whether writes to the memory folder are refused and turned into proposals. */
  isMemoryGuarded: boolean
  questionsTool: string
  checklistTool: string
  learningsTool: string
}

// The notes attached to every prompt, for the model only: what changed, the open questions and the
// checklist. Nothing to say, nothing attached.
export const promptContext = ({ changes, open, list, learnings, isMemoryGuarded, questionsTool, checklistTool, learningsTool }: ContextInput): string[] => {
  const context: string[] = []
  const recent = open.slice(-10)

  if (changes.length > 0) {
    context.push(
      `Changed since you last looked (by the user or another session, not by you):\n${changes.map(line => `- ${line}`).join('\n')}\nTreat the checklist, questions and learnings below as current; do not undo these changes.`,
    )
  }

  if (recent.length > 0) {
    // Parts are numbered from 1, the way the tool's `parts` and the pane count them.
    const lines = recent.map(one => `- [${one.id}] ${one.texts.map((text, index) => `${index + 1}) ${text}`).join(' | ')}`).join('\n')
    context.push(
      `Open questions you asked that are not yet answered:\n${lines}\nIf the user's message answers any of them, or one became moot, close it with the ${questionsTool} tool (action close; parts for a partial answer). If the user asks what a question meant, reword it with action update. Every text must make sense on its own and stay short: one sentence, the question itself; the pane lists each on one line.`,
    )
  }

  if (list.length > 0) {
    context.push(`Shared checklist (the user edits it too; keep it current with the ${checklistTool} tool):\n${briefChecklist(list, open)}`)
  }

  const brief = briefLearnings(learnings)

  if (isMemoryGuarded || brief !== '') {
    context.push(
      [
        `${isMemoryGuarded ? 'Memory goes through review: do not write memory files. ' : ''}Propose a learning with the ${learningsTool} tool only for a preference the user stated about how you work (how to do something, what never to do, where to find or get something, what they prefer); the user accepts or rejects it. A convention of the code or the process goes in CLAUDE.md and a product or architecture decision in the docs, never in memory. Most turns have nothing to propose.`,
        brief,
      ]
        .filter(Boolean)
        .join('\n'),
    )
  }

  return context
}
