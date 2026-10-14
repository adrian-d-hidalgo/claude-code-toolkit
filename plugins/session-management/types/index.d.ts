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

export type LearningKind = 'user' | 'feedback' | 'project' | 'reference'

/**
 * proposed: waiting for the user; rejected: a refusal, so the same proposal is answered with its reason.
 * accepted is never stored: it is what Claude's memory files say, read as they are (see `memoryLearnings`).
 */
export type LearningStatus = 'proposed' | 'accepted' | 'rejected'

export type Learning = {
  id: string
  kind: LearningKind
  /** The rule or fact, one line: what to do or what is true. */
  text: string
  /** Why it holds: the correction, confirmation or event it came from. */
  why: string
  /** How to apply it, when the text alone does not say. */
  how?: string
  status: LearningStatus
  /** rejected: why, so the same proposal is not made again. */
  reason?: string
  /** The project (its root) whose memory it belongs to. */
  project: string
  /** The session that proposed it. */
  session: string
  /** When it was proposed. */
  at: number
  /** How many times it was proposed, counting repeats in other words. */
  seen: number
  /** Only on what is read from memory: the file it lives in, inside the project's memory folder. */
  file?: string
  /** What in memory (`file:<name>`) or in the queue this proposal replaces once accepted: one it updates. */
  replaces?: string[]
  /** What it contradicts, by the same ids: accepting it retires them. */
  conflicts?: string[]
}

declare module 'claude-code' {
  interface PluginState {
    'session-management': {
      questions: Question[]
      checklist: ChecklistItem[]
      learnings: Learning[]
      /** The learning the pane has selected, if any. */
      learningSelected: string | null
      /** The learning whose details the pane reveals, if any. */
      learningViewing: string | null
      /** The learning whose comment box the pane has open, if any. */
      learningCommenting: string | null
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
