// Subcommands `/questions` understands; anything else gets the usage instead of silently opening the pane.
export const QUESTIONS_VERBS = ['', 'scan', 'done', 'dismiss', 'clear', 'undo', 'doctor', 'fix', 'rebuild']

export const QUESTIONS_HELP = [
  '/questions: questions Claude asked that are still unanswered',
  '  /questions                      open the pane (this session)',
  '  /questions help                 this list',
  '  /questions scan [quick|fast] [all]  backfill from the conversation (default: deep, with the session model); all also counts questions you replied to',
  '  /questions done <n>             mark open question n as answered (n as the pane numbers them, one per thing asked)',
  '  /questions dismiss              dismiss every open question of this session',
  '  /questions clear [all]          drop closed ones; "all" also removes open ones (undo restores)',
  '  /questions undo                 restore what the last clear all, fix or rebuild removed',
  '  /questions doctor               report what is off, only in open questions of this session',
  '  /questions fix                  repair it: vague wordings are rewritten, duplicates folded',
  '  /questions rebuild              drop this session\'s questions and re-read the conversation',
  '  doctor and fix take --history (closed ones too)',
].join('\n')
