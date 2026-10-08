/** How a question is answered: pick one of its options, pick several, or free text (no entry). */
export type Choice = { kind: 'single' | 'multi'; options: string[] }

export type Question = {
  id: string
  /** Every question of one message or dialog: they are answered together. */
  texts: string[]
  /** The options of the questions that offer some, keyed by the question's text. */
  choices?: Record<string, Choice>
  source: 'dialog' | 'text'
  /** The session that asked it: each session sees only its own by default. */
  session: string
  project: string
  at: number
  /** How many times it was asked, counting re-asks in other words. */
  asks: number
  isOpen: boolean
}

export type ChecklistStatus = 'todo' | 'doing' | 'done' | 'cancelled'

/** What a task waits for: another task to finish, or a question to be answered. */
export type Blocker = { kind: 'task' | 'question'; id: string }

/** How soon a task matters: the list shows high first, then normal (the default), then low. */
export type Priority = 'high' | 'normal' | 'low'

export type ChecklistItem = {
  id: string
  text: string
  status: ChecklistStatus
  /** Longer description behind a short title; shown in the pane's detail view. */
  detail?: string
  /** Tasks and questions that must be finished or answered first; resolved ones stop blocking by themselves. */
  blockedBy?: Blocker[]
  /** Absent means normal. */
  priority?: Priority
}

declare module 'claude-code' {
  interface PluginState {
    'session-management': {
      questions: Question[]
      checklist: ChecklistItem[]
      /** The checklist task being edited in the pane, if any. */
      editing: string | null
      /** Index of the first task the checklist pane's window shows. */
      windowAt: number
      /** The checklist task whose own screen (title, description, every action) the pane shows, if any. */
      viewing: string | null
      /** The checklist task whose description is being edited in the pane, if any. */
      detailing: string | null
      /** The checklist task whose actions the pane shows, if any. */
      selected: string | null
      /** What has been typed so far in the checklist pane's add field. */
      adding: string
      /** The question part the pane has focused (its options and actions show), if the person picked one; by its entry and wording, so a part that moved or was reworded is not mistaken for another. */
      chosen: { id: string; text: string } | null
      /** Options ticked in the pane for a multiple choice, keyed `<question id>\0<wording>`. */
      picks: Record<string, string[]>
      /** What has been typed so far in a pane's text field (an answer, a title, a description). */
      draft: string
      /** The question part whose answer area (options or text box) is revealed in the pane, if any. */
      answering: { id: string; text: string } | null
      /** The part whose options were switched to the text box with Other, if any. */
      typing: { id: string; text: string } | null
    }
  }
}
