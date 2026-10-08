import type { ChecklistItem, Question } from '../../../types'
import { briefChecklist } from '../../checklist/ops/ops.hook'

export type ContextInput = {
  /** What changed since the assistant last looked. */
  changes: string[]
  /** This session's open questions (the newest are shown). */
  open: Question[]
  list: ChecklistItem[]
  questionsTool: string
  checklistTool: string
}

// The notes attached to every prompt, for the model only: what changed, the open questions and the
// checklist. Nothing to say, nothing attached.
export const promptContext = ({ changes, open, list, questionsTool, checklistTool }: ContextInput): string[] => {
  const context: string[] = []
  const recent = open.slice(-10)

  if (changes.length > 0) {
    context.push(
      `Changed since you last looked (by the user or another session, not by you):\n${changes.map(line => `- ${line}`).join('\n')}\nTreat the checklist and questions below as current; do not undo these changes.`,
    )
  }

  if (recent.length > 0) {
    // Parts are numbered from 1, the way the tool's `parts` and the pane count them.
    const lines = recent.map(one => `- [${one.id}] ${one.texts.map((text, index) => `${index + 1}) ${text}`).join(' | ')}`).join('\n')
    context.push(
      `Open questions you asked that are not yet answered:\n${lines}\nIf the user's message answers any of them, or one became moot, close it with the ${questionsTool} tool (action close; parts for a partial answer). If the user asks what a question meant, reword it with action update. Every text must make sense on its own.`,
    )
  }

  if (list.length > 0) {
    context.push(`Shared checklist (the user edits it too; keep it current with the ${checklistTool} tool):\n${briefChecklist(list, open)}`)
  }

  return context
}
