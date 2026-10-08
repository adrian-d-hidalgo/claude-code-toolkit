// One meaning per colour, by the terminal theme's own names so both panes follow the user's theme:
// what a task or a question is (accent), what is waiting, what went well, what needs care.
export const COLORS = {
  /** The checklist's identity, and work in progress. */
  accent: 'claude',
  /** Something still to do. */
  todo: 'suggestion',
  /** Finished, healthy, nothing left. */
  ok: 'success',
  /** Open questions and anything blocked or waiting. */
  attention: 'warning',
  /** Failures and the urgent. */
  bad: 'error',
  /** Secondary text. */
  dim: 'inactive',
  /** Borders and rules at rest. */
  faint: 'subtle',
} as const
