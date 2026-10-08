# session-management

Runtime mods that keep a Claude Code session organized. Both mods are driven by one hooks module, `hooks/register/register.hook.tsx` (a plugin names one module and an event takes one unmatched hook). It is the only place that touches the engine's `$`, which cannot cross an import: it builds a small `Port` (clock, store, session, models, prompts) and hands that to the services, so everything else is plain code with tests, run against `memoryPort`.

```
hooks/
  register/    the wiring: events, atoms, the Port, the two pane renderers
  questions/   extract, judge, capture, backfill, merge, orphans, lifecycle, doctor, changes, command, tool, help, ops, scan, pane
  checklist/   args, ops, status, window, scan, judge, backfill, lifecycle, tasks, doctor, changes, command, tool, help, pane
  shared/      format, similarity, help, context, diagnosis, transcript, port
```

Each module is a folder with `<name>.hook.ts` and its `<name>.test.ts`.

## Mods

| Mod | What it does |
|---|---|
| `open-questions` | Lists every question Claude asked that is still unanswered; answer from a pane or from the chat. |
| `checklist` | A task checklist you and Claude both see and edit, one per conversation. |

### open-questions

- Captures each `AskUserQuestion` dialog and the questions in Claude's answers (code blocks, quotes and table rows are skipped). All questions of one message or dialog form one entry, answered together.
- A repeated question, in the same or different words or language, folds into the open entry (newest wording, age reset, `asked N×`) instead of duplicating it. A re-ask of a dismissed question opens a new entry.
- A small model (`haiku`, one short call per turn that contains a `?`, run in the background) decides which sentences are real questions for you and which tracked question each repeats. If the call fails, or the option `judge` is `heuristic`, local rules decide instead: sentences ending in `?` and a content-word overlap. `deep` scans cost a full-context call (the conversation is mostly cached); use `quick` or `fast` to spend less.
- `/questions` opens a pane built for the keyboard: one line per question asked (a message that asked several things lists each on its own line), a single stop for the arrows, and the focused question in full (beside the list from 84 columns; narrow, there is no separate panel: the selected line itself becomes a card with its whole text wrapped and its chips, while the others stay one truncated line, and the list pages with ▲/▼). Every question has the same three actions, in this order: **Answer** (`a`), **Explain** (`e`) and **Dismiss** (`d`). Narrow, the three actions sit side by side on one row inside the selected question's card (before the options or box that Answer reveals); wide, they sit in the card beside the list. The selection follows the focus ring, so the arrows are all it takes to pick one. Nothing to answer with is shown until you press **Answer** (or Enter on a line): the Answer area is a bordered section titled `Answer · choose one`, `Answer · choose any` or `Answer · type it` (in a pane too short for it, the same section without its frame), set apart from the actions by a blank row. A question with options reveals them, marked `○` (single) or `☐`/`☑` (multiple), (**single choice** on `1`-`9` sends; **multiple choice** toggles on `1`-`9` and `s` sends) together with **Other (type your own)** (`o`), which switches to the free-text box, and a question without options reveals the box (focused; `⏎` sends, `✕` or moving the focus away closes it). Pressing **Answer** again, `✕`, sending, dismissing or moving to another line hides it. The options come from the dialog itself (`AskUserQuestion`, with its multi-select flag) or, for a question in prose, from the model that judges the message (`judge: heuristic` finds none, so those stay free text). The selected question's chips add a dim `blocks N tasks` while open tasks wait for it. Each question of a group is answered on its own and leaves the group. **Explain** (`e`) asks Claude to explain a question that was not clear and to reword it in the pane with the `questions` tool (it stays open); **Dismiss** (`d`) closes it.
- `/questions doctor` looks only at open questions of this session (finished history, the closed ones, is left alone unless you add `--history`) (the checklist's looks only at this session's) and prints what it checked, one line per check (`✓` passed, `✗` with what is wrong), including leftovers of earlier versions of the plugin: vague wordings, duplicates, stale open questions, questions of another session id. The report opens with the question count (`6 questions: 4 open, 2 closed`; `--history` is named in its header):

  ```
  Questions doctor · this session
  6 questions: 4 open, 2 closed
  ✓ every open question makes sense on its own
  ✓ no duplicates
  ✗ 2 open questions older than 14 days (kept; dismiss them if they no longer matter)
  ✓ none left over from another session id
  Run `/questions fix` to repair what can be repaired.
  ```

  `fix` repairs it: vague wordings are rewritten by the session's own model with the context of the conversation (one it cannot rewrite stays as it was), duplicates fold into the fullest wording, and a copy is kept for `undo`. `rebuild` drops this session's questions and re-reads the whole conversation.
- `/questions help` (and `/checklist help`) lists every subcommand; an unknown subcommand prints it too instead of opening the pane.
- `/questions done <n>` marks the n-th question as the pane lists it (one number per thing asked, so a message with three questions takes three numbers) as answered and leaves the rest of its message open; `done <id>` closes a whole entry. `dismiss` (all open), `clear` (drop closed) and `clear all` (remove everything, open ones too; `undo` restores it, and a second `clear all` never replaces a copy that holds something). The status line shows `questions: N`.
- `/questions scan` backfills from the conversation: by default (`deep`) the session's own model lists what it asked and you never answered; `quick` runs a small model over the local candidates; `fast` (or `judge: heuristic`) keeps only the local rules. Add `all` to also count prose questions you replied after (any later message may or may not have answered them). A scan only adds what is not tracked yet: a question already tracked keeps its wording, age and ask count, and one you dismissed (also before the session was parked or the closed ones were cleared) is not brought back.
- Every prompt carries the newest 10 open questions, and a small model judges after each message and each turn which were settled, directly (an option, a value, free text) or indirectly (a decision that makes one moot). Claude manages them with the `questions` tool: list, add, update (reword), close (whole or parts), reopen and merge duplicates; `close_question` still closes by id. Questions shorter than 4 words are never tracked: each one must make sense alone, so a vague "Which one?" carries the sentences before it, and the model is asked to rewrite it with its options.
- A session's id can change under a conversation (resume, reattach), which would leave its questions under the old id. When a session starts, when its id changes and on `/questions doctor`/`fix`, open questions of another id that this transcript asked (verbatim or in other words) are taken over, parked ones included.
- Everything acts on the current session: the pane, the status counter, the prompt context and every command only see and touch the questions this session asked. There is no all-sessions view. Other sessions' questions are never shown; nothing is left behind (below).
- Stored with `$.store`, a JSON file under `~/.claude/plugins/store/`, each entry tagged with its session and project. Nothing is left behind: when a session ends (exit, `/clear`, resume) its open questions are parked out of every pane and closed ones are dropped; resuming that session gives the parked ones back; on every session start, other sessions' questions quiet for 7 days are parked (or dropped when they have no session, the entries from before sessions were tracked) and parked ones nobody resumed expire after 30 days.

### checklist

- `/checklist` opens a pane built for the keyboard: progress, status glyphs (○ todo, ◐ doing, ✓ done, ⊘ cancelled, ◌ blocked), one truncated line per task (a single stop for the arrows) and an add field. The list is sorted by priority (`!` marks high, dim marks low). The selection follows the focus ring (by default the task in progress, else the first open one); Enter opens the task's own screen, where every action lives (beside the list from 84 columns). Narrow, the selected task is a card with its full title and chips, and its main actions sit side by side on one row inside that card, on their letters: `o` Detail (opens the task's screen, like Enter), `r` Run and `c` Cancel for a todo task, `o` Detail and `c` Stop for a doing one, only `o` Detail for a finished one. Long titles and descriptions stay out of the list (`≡` marks a task that has a description). The list is cut to a window that fits the pane, because arrows and Tab walk the buttons only while the tree fits (a taller one scrolls instead); **▲ n above** and **▼ n below** page through it, and the window follows the selection.
- A task's own screen (Enter on its line), top to bottom: **‹ Back** (`b`), **‹ prev** (`h`) and **next ›** (`l`) to walk through the tasks without going back; its status; the main actions, **▶ run** (`r`: marks it in progress and asks Claude to do it ahead of the rest), **✕ cancel** (`c`), **■ stop** on a task in progress (marks it cancelled, ends the running turn and tells Claude to stop, background agents included; other work in that turn stops too) and **↺ reopen** (`r`) on a finished one; the **Task** title with its pencil `✎` (`e`); **Waiting for**, when it has blockers, each line saying what it is (`task #3 <title>` by the number the list shows, or `question <text>` with `(+k)` when the message asked more) with a **Go ›** that takes you there (a task's screen when narrow, its selected row when wide; the questions pane on that question, raised with the keys when the surface grants them, or a toast if it was closed meanwhile) and a `✕` to drop it; **Blocks**, when open tasks wait for this one, one `task #n <title>` line each with a **Go ›** (finished or cancelled dependants are not listed); the **Description** with its pencil `✎` (`n`), the longer text behind the short title (files, constraints, why); the **Priority** (`1` high, `2` normal, `3` low), which moves the task to its place in the list; and **remove** (`x`). While a field is edited, `⏎` saves and `✕` cancels. The pane field is one line and does not scroll, so it only takes short single-line text: the pencil of a title or description that do not fit one line (or hold a newline) fills the prompt box with `/checklist edit <n> title <title>` or `/checklist edit <n> description <description>` carrying the current text instead; press Esc to reach the prompt, edit and press Enter. If the prompt already has text, nothing is replaced: clear it first. Esc alone only hands the keyboard back (the engine does not tell a plugin about it): Esc then Esc, Esc then an arrow, or `✕` close the edit. Long scanned tasks arrive as a short title plus their description.
  A cancelled task that had not started only gets the mark; every prompt tells Claude not to work on cancelled tasks. When the list outgrows the pane, finished and cancelled tasks hide first. Marking a task done by hand is `/checklist done <n>`; Claude marks its own through the tool.
- Both panes read their own width (`bodyColumns`). Narrow, as above; from 84 columns they show the list on the left and the selected task (checklist) or focused question (questions) on the right, so nothing has to be opened.
- `/checklist scan [quick|fast]` backfills from the transcript: the last `TodoWrite`, the last plan (`ExitPlanMode`) and markdown checkboxes, plus a model pass. By default (`deep`) the session's own model reads the whole conversation, running subagents included, as if you had asked it for the pending work; `quick` runs a small model over a recent excerpt; `fast` (or `judge: heuristic`) keeps only the structured sources. A model that cannot answer falls back to `quick`, then to the structured sources. Every task a scan finds goes through the same check as a task Claude adds (see **Smarter scan and add** below).
- Keyboard: `/checklist add <text>`, `edit <n> title <text>` (one line), `edit <n> description <text>` (keeps the newlines and spacing as typed, up to 2000 characters; no text clears it; `detail <n> <text>` is an alias), where the section word is not case-sensitive and `edit <n> <text>` without it also sets the title, so a title that itself starts with `title` or `description` needs the explicit `title` keyword, `todo|doing|done <n>`, `run <n>`, `cancel <n>`, `priority <n> high|normal|low` (or `pri`), `mv <n> <to>` (only reorders within the task's priority level; it says when nothing moved or the task stopped at the edge of its level), `block <n> <m|qK>`, `unblock <n> [<m|qK>]`, `rm <n>`, `clear` (drops done and cancelled tasks) and `clear all` (removes every task). `undo` restores what the last `clear all`, `fix` or `rebuild` removed, once: the copy is only replaced by a change that actually alters a non-empty list, and it is spent after a restore. A checklist holds at most 200 tasks: past that, adds say so instead of dropping anything.
- Priority says what matters: every task is `high`, `normal` (the default) or `low`, and the list is always shown and stored sorted by it (high first, then normal, then low). Within one level the stored order stands, so `mv` and the tool's `move` only reorder inside a level. `/checklist priority <n> high|normal|low` sets it, the `checklist` tool takes `priority` on `add` and `edit` (the model sees non-normal levels as `!high` / `!low`), and scans infer it (high only for urgent, blocking or promised-first work, low for later or nice-to-have items, otherwise normal). `doctor` reports an unknown priority and `fix` sets it to normal.
- `/checklist doctor` looks only at open tasks (todo, doing): done and cancelled ones are history, never reworded or folded unless you add `--history`. It prints what it checked, one line per check (`✓` passed, `✗` with what is wrong), after the task count by status:

  ```
  Checklist doctor · this session
  35 tasks: 2 doing, 18 todo, 13 done, 2 cancelled
  ✓ ids and statuses are valid
  ✗ 2 duplicate tasks (folded into the first)
  ✓ dependencies are fine (none stale, none in a loop)
  ✓ priorities are valid
  ✗ 1 task in progress with no turn running (back to todo)
  Run `/checklist fix` to repair what can be repaired.
  ```

  It finds, including leftovers of earlier versions: empty or repeated ids, unknown statuses, long titles (fix splits them into a short title plus description), duplicate tasks (same strict rule as the add match; a folded twin's blockers move to the kept task), tasks stuck in progress with no turn running, and stale blockers (a task that no longer exists, a question no longer in the store, the later blocker of a loop; `fix` drops them). `fix` repairs it (dropped tasks come back with `undo`); `rebuild` clears the list and re-derives it with a deep scan.
- Claude reads and updates it through the `checklist` tool (list, add, block, unblock, status, edit, move, remove); every prompt carries the open tasks (done ones as a count), plus a short list of what changed since Claude last looked, so your edits reach it.
- **Dependencies.** A task can wait for other tasks or for open questions (`blockedBy`). It stays blocked while any of them is open; there is nothing to clear by hand, because a blocker that is done, cancelled, removed, answered or dismissed stops blocking by itself (a cancelled task will never finish, so it releases what waited for it; blocking on a task that is already done or cancelled is refused, since it would block nothing). A task cannot wait for itself or close a loop (A waits for B waits for A); the later blocker is refused. Set them with:
  - the `checklist` tool: `add` takes `blockedBy` (ids of tasks or open questions) and `priority`, `edit` takes `priority`, and `block` / `unblock` take an `id` and `blockedBy` (`unblock` without it drops every blocker);
  - the commands `/checklist block <n> <m|qK>` (task `n` waits for task `m`, or for open question `K`, numbered as the `/questions` pane lists them, part by part; a blocker names the whole entry, so a question asked together with others holds until all of them are closed; `by` is optional: `block 3 by q2`) and `/checklist unblock <n> [<m|qK>]` (one blocker, or all of them);
  - the scan and `add`, which infer them (below).

  `run` refuses a blocked task and says what it waits for. A blocked task is marked in the pane and in the task's own screen, and the prompt context and the tool answers show it as `blocked by ...`, so Claude sees the order of the work.
- **Smarter scan and add.** What Claude adds with the tool and what a scan finds is not appended blindly. A task an open task already says in nearly the same words (the same content words, one extra word, or for long titles one differing word) is skipped by a cheap word match; done and cancelled tasks never count, so work that was finished and is needed again is added. Different tasks that merely share most words (`Migrate users table` / `Migrate orders table`) are kept, and the fuzzy cases are left to the model. Otherwise a small model (not used with `judge: heuristic`, nor when it cannot answer; then new tasks are simply added) compares the new tasks with the tracked ones and the open questions and decides for each: **duplicate** (of an open task; skipped, in any wording or language), **complements** (it only adds information to an open task, so the new part is folded into that task's description once and no task is added) or **new** (added, with the dependencies it needs: tracked tasks, open questions or other tasks found in the same pass). The answer reads like `2 added, 1 merged into existing tasks, 3 already tracked, 1 dependencies set`. A single new task with nothing to compare costs no model call.
- One checklist per conversation: a new chat starts empty and two chats never share tasks. It is keyed by the conversation's first launch time, which a resumed session keeps while its session id changes, so resuming brings it back. A checklist nobody wrote to for 30 days is deleted, backup included. The shared per-folder checklist earlier versions kept is left alone until `/checklist doctor` reports it and `/checklist fix` brings its tasks into this session (the first chat to do it takes them). The status line shows `checklist: done/total`.

The `judge` option (`model` default, or `heuristic`) is in the plugin's config menu. UI text is English; questions keep the language they were asked in.

Both mods read and write `$.store` on every change (the store has no conditional write). The writes of one session are queued, and a write is applied to the list as it is when it happens, but two processes writing the same key at the same instant can still lose one of the two changes.

## Scenarios

| Situation | What happens |
|---|---|
| New conversation, new project | Both lists start empty. Questions appear as Claude asks them; add tasks by hand, with `/checklist scan`, or let Claude add them. |
| New conversation in a known project | Both lists start empty: the checklist and the questions belong to the conversation. A folder's older shared checklist, if there is one, is offered by `/checklist doctor`. |
| Resumed conversation | Its checklist is still there (same conversation key) and its questions are taken over from the old session id; a quick background scan backfills the ones you never answered. The checklist is not backfilled from the transcript on its own (a task you removed would keep coming back): run `/checklist scan` when you want it. |
| You answer in chat (option or free text) | A small model closes the questions the message settled, even indirectly; a partial answer removes only the answered parts. |
| You close, dismiss, reorder, edit, add or remove from a pane or a command | The next prompt tells Claude what changed since it last looked and not to undo it. |
| Claude changes the checklist or the questions itself | Through the tools; the result is what Claude sees, so nothing is echoed back as a change. |
| Claude's question is vague or repeated | It is kept only if it makes sense alone; a repeat folds into the open one and keeps the fuller wording; Claude can reword (`update`) or `merge` duplicates. |
| You cancel a task in progress | The running turn is aborted and Claude is told to stop and carry on with the rest. |
| Another chat works on the same project | Nothing is shared: each chat has its own checklist and its own questions. |
| No model available, or `judge: heuristic` | Local rules detect questions (with the preceding sentences as context); nothing is closed automatically. |

## Install

```bash
claude plugin install session-management@claude-code-toolkit
```

## Develop

```bash
claude plugin validate plugins/session-management
claude plugin test plugins/session-management
```


Run the validator on the plugin folder, not on the repo root: the root one only checks the marketplace, while this one loads `register.hook.tsx` and refuses what the engine would (a `$` passed across an import, an invalid `hotkey`).

For the editor and `tsc`, the plugin ships a `tsconfig.json` that reads the API typings from `.claude-plugin/types/claude-code/index.d.ts`. That folder is git-ignored (root `.gitignore`): it is a copy of the typings the plugin-authoring skill carries, laid down per machine, for example

```bash
mkdir -p plugins/session-management/.claude-plugin/types/claude-code
cp <plugin-authoring skill>/types/claude-code.d.ts plugins/session-management/.claude-plugin/types/claude-code/index.d.ts
npx -p typescript tsc -p plugins/session-management
```
