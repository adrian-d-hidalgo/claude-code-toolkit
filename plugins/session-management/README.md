# session-management

Runtime mods that keep a Claude Code session organized. The three mods are driven by one hooks module, `hooks/register/register.hook.tsx` (a plugin names one module and an event takes one unmatched hook). It is the only place that touches the engine's `$`, which cannot cross an import: it builds a small `Port` (clock, store, session, models, prompts) and hands that to the services, so everything else is plain code with tests, run against `memoryPort`.

```
hooks/
  register/    the wiring: events, atoms, the Port, the two pane renderers
  questions/   extract, judge, capture, backfill, merge, orphans, lifecycle, doctor, changes, command, tool, help, ops, scan, pane
  checklist/   args, ops, status, window, scan, judge, backfill, lifecycle, tasks, doctor, changes, command, tool, help, pane
  learnings/   kinds, rules, ops, effect, memory, judge, reconcile, review, tool, guard, capture, changes, lifecycle, doctor, args, command, help, pane
  shared/      format, similarity, help, context, diagnosis, transcript, port
```

Each module is a folder with `<name>.hook.ts` and its `<name>.test.ts`.

## Mods

| Mod | What it does |
|---|---|
| `open-questions` | Lists every question Claude asked that is still unanswered; answer from a pane or from the chat. |
| `checklist` | A task checklist you and Claude both see and edit, one per conversation. |
| `learnings` | What Claude proposes to remember about a project; you accept or reject, and only accepted learnings enter its memory. |

### open-questions

- Captures each `AskUserQuestion` dialog and the questions in Claude's answers (code blocks, quotes and table rows are skipped). All questions of one message or dialog form one entry, answered together.
- A repeated question, in the same or different words or language, folds into the open entry (newest wording, age reset, `asked N×`) instead of duplicating it. A re-ask of a dismissed question opens a new entry.
- A small model (`haiku`, one short call per turn that contains a `?`, run in the background) decides which sentences are real questions for you and which tracked question each repeats. If the call fails, or the option `judge` is `heuristic`, local rules decide instead: sentences ending in `?` and a content-word overlap. `deep` scans cost a full-context call (the conversation is mostly cached); use `quick` or `fast` to spend less.
- `/questions` opens a pane built for the keyboard: one line per question asked (a message that asked several things lists each on its own line), a single stop for the arrows, and the focused question in full (beside the list from 84 columns; narrow, there is no separate panel: the selected line itself becomes a card with its whole text wrapped and its chips, while the others stay one truncated line, and the list pages with ▲/▼). Every question has the same three actions, in this order: **Answer** (`a`), **Explain** (`e`) and **Dismiss** (`d`). Narrow, the three actions sit side by side on one row inside the selected question's card (before the options or box that Answer reveals); wide, they sit in the card beside the list. The selection follows the focus ring, so the arrows are all it takes to pick one. Nothing to answer with is shown until you press **Answer** (or Enter on a line): the Answer area is a bordered section titled `Answer · choose one`, `Answer · choose any` or `Answer · type it` (in a pane too short for it, the same section without its frame), set apart from the actions by a blank row. A question with options reveals them, marked `○` (single) or `☐`/`☑` (multiple), (**single choice** on `1`-`9` sends; **multiple choice** toggles on `1`-`9` and `s` sends) together with **Other (type your own)** (`o`), which switches to the free-text box, and a question without options reveals the box (focused; `⏎` sends, `✕` or moving the focus away closes it). Pressing **Answer** again, `✕`, sending, dismissing or moving to another line hides it. The options come from the dialog itself (`AskUserQuestion`, with its multi-select flag) or, for a question in prose, from the model that judges the message (`judge: heuristic` finds none, so those stay free text). The selected question's chips add a dim `blocks N tasks` while open tasks wait for it. Each question of a group is answered on its own and leaves the group. **Explain** (`e`) asks Claude to explain a question that was not clear and to reword it in the pane with the `questions` tool (it stays open); **Dismiss** (`d`) closes it.
- `/questions doctor` looks only at open questions of this session (finished history, the closed ones, is left alone unless you add `--history`) (the checklist's looks only at this session's) and prints what it checked, one line per check (`✓` passed, `✗` with what is wrong), including leftovers of earlier versions of the plugin: vague wordings, duplicates, stale open questions. The report opens with the question count (`6 questions: 4 open, 2 closed`; `--history` is named in its header):

  ```
  Questions doctor · this session
  6 questions: 4 open, 2 closed
  ✓ every open question makes sense on its own
  ✓ no duplicates
  ✗ 2 open questions older than 14 days (kept; dismiss them if they no longer matter)
  Run `/questions fix` to repair what can be repaired.
  ```

  `fix` repairs it: vague wordings are rewritten by the session's own model with the context of the conversation (one it cannot rewrite stays as it was), duplicates fold into the fullest wording, and a copy is kept for `undo`. `rebuild` drops this session's questions and re-reads the whole conversation.
- `/questions list` prints the open questions of this session as plain text, for surfaces that cannot show the pane: each thing asked in full, numbered as the pane numbers it, with its options (`choose one` or `choose any`) and how often it was asked.
- `/questions help` (and `/checklist help`) lists every subcommand; an unknown subcommand prints it too instead of opening the pane.
- `/questions done <n>` marks the n-th question as the pane lists it (one number per thing asked, so a message with three questions takes three numbers) as answered and leaves the rest of its message open; `done <id>` closes a whole entry. `dismiss` (all open), `clear` (drop closed) and `clear all` (remove everything, open ones too; `undo` restores it, and a second `clear all` never replaces a copy that holds something). The status line shows `questions: N`.
- `/questions scan` backfills from the conversation: by default (`deep`) the session's own model lists what it asked and you never answered; `quick` runs a small model over the local candidates; `fast` (or `judge: heuristic`) keeps only the local rules. Add `all` to also count prose questions you replied after (any later message may or may not have answered them). A scan only adds what is not tracked yet: a question already tracked keeps its wording, age and ask count, and one you dismissed (also before the session was parked or the closed ones were cleared) is not brought back.
- Every prompt carries the newest 10 open questions, and a small model judges after each message and each turn which were settled, directly (an option, a value, free text) or indirectly (a decision that makes one moot). Claude manages them with the `questions` tool: list, add, update (reword), close (whole or parts), reopen and merge duplicates; `close_question` still closes by id. Questions shorter than 4 words are never tracked: each one must make sense alone, so a vague "Which one?" carries the sentences before it, and the model is asked to rewrite it with its options. A question is stored whole up to 500 characters (the pane wraps the focused one in full); the judge, the tool and the prompt context ask for the question sentence alone, without the reasons or examples around it, so the list rows stay readable.
- Everything acts on the current session: the pane, the status counter, the prompt context and every command only see and touch the questions this session asked. There is no all-sessions view. Other sessions' questions are never shown; nothing is left behind (below).
- Stored with `$.store`, a JSON file under `~/.claude/plugins/store/`, each entry tagged with its session and project. Nothing is left behind: when a session ends (exit, `/clear`, resume) its open questions are parked out of every pane and closed ones are dropped; resuming that session gives the parked ones back; on every session start, other sessions' questions quiet for 7 days are parked (or dropped when they have no session, the entries from before sessions were tracked) and parked ones nobody resumed expire after 30 days.

### checklist

- `/checklist` opens a pane built for the keyboard: progress, status glyphs (○ todo, ◐ doing, ✓ done, ⊘ cancelled, ◌ blocked), one truncated line per task (a single stop for the arrows) and an add field. The list is sorted by priority (`!` marks high, dim marks low). The selection follows the focus ring (by default the task in progress, else the first open one); Enter opens the task's own screen, where every action lives (beside the list from 84 columns). Narrow, the selected task is a card with its full title and chips, and its main actions sit side by side on one row inside that card, on their letters: `o` Detail (opens the task's screen, like Enter), `r` Run and `c` Cancel for a todo task, `o` Detail and `c` Stop for a doing one, only `o` Detail for a finished one. Long titles and descriptions stay out of the list (`≡` marks a task that has a description). The list is cut to a window that fits the pane, because arrows and Tab walk the buttons only while the tree fits (a taller one scrolls instead); **▲ n above** and **▼ n below** page through it, and the window follows the selection.
- A task's own screen (Enter on its line), top to bottom: **‹ Back** (`b`), **‹ prev** (`h`) and **next ›** (`l`) to walk through the tasks without going back; its status; the main actions, **▶ run** (`r`: marks it in progress and asks Claude to do it ahead of the rest), **✕ cancel** (`c`), **■ stop** on a task in progress (marks it cancelled, ends the running turn and tells Claude to stop, background agents included; other work in that turn stops too) and **↺ reopen** (`r`) on a finished one; the **Task** title with its pencil `✎` (`e`); **Waiting for**, when it has blockers, each line saying what it is (`task #3 <title>` by the number the list shows, or `question <text>` with `(+k)` when the message asked more) with a **Go ›** that takes you there (a task's screen when narrow, its selected row when wide; the questions pane on that question, raised with the keys when the surface grants them, or a toast if it was closed meanwhile) and a `✕` to drop it; **Blocks**, when open tasks wait for this one, one `task #n <title>` line each with a **Go ›** (finished or cancelled dependants are not listed); the **Description** with its pencil `✎` (`n`), the longer text behind the short title (files, constraints, why); the **Priority** (`1` high, `2` normal, `3` low), which moves the task to its place in the list; and **remove** (`x`). While a field is edited, `⏎` saves and `✕` cancels. The pane field is one line and does not scroll, so it only takes short single-line text: the pencil of a title or description that do not fit one line (or hold a newline) fills the prompt box with `/checklist edit <n> title <title>` or `/checklist edit <n> description <description>` carrying the current text instead; press Esc to reach the prompt, edit and press Enter. If the prompt already has text, nothing is replaced: clear it first. Esc alone only hands the keyboard back (the engine does not tell a plugin about it): Esc then Esc, Esc then an arrow, or `✕` close the edit. A title is at most 200 characters: a longer one (scanned, added by Claude or typed) is cut at a word and the rest becomes the start of its description, so the description never repeats the title.
  A cancelled task that had not started only gets the mark; every prompt tells Claude not to work on cancelled tasks. When the list outgrows the pane, finished and cancelled tasks hide first. Marking a task done by hand is `/checklist done <n>`; Claude marks its own through the tool.
- Both panes read their own width (`bodyColumns`). Narrow, as above; from 84 columns they show the list on the left and the selected task (checklist) or focused question (questions) on the right, so nothing has to be opened.
- `/checklist scan [quick|fast]` backfills from the transcript: the last `TodoWrite`, the last plan (`ExitPlanMode`) and markdown checkboxes, plus a model pass. By default (`deep`) the session's own model reads the whole conversation, running subagents included, as if you had asked it for the pending work; `quick` runs a small model over a recent excerpt; `fast` (or `judge: heuristic`) keeps only the structured sources. A model that cannot answer falls back to `quick`, then to the structured sources. Every task a scan finds goes through the same check as a task Claude adds (see **Smarter scan and add** below).
- `/checklist list` prints the open tasks as plain text, for surfaces that cannot show the pane: each whole title with its status glyph, status and non-normal priority, its description indented below it, and `waits for: task 3, q2` when something holds it, numbered as the pane numbers them. `list all` adds done and cancelled tasks.
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

  It finds, including leftovers of earlier versions: empty or repeated ids, unknown statuses, long titles (over 200 characters; fix cuts them and moves the rest into the description), duplicate tasks (same strict rule as the add match; a folded twin's blockers move to the kept task), tasks stuck in progress with no turn running, and stale blockers (a task that no longer exists, a question no longer in the store, the later blocker of a loop; `fix` drops them). `fix` repairs it (dropped tasks come back with `undo`); `rebuild` clears the list and re-derives it with a deep scan.
- Claude reads and updates it through the `checklist` tool (list, add, block, unblock, status, edit, move, remove); every prompt carries the open tasks (done ones as a count), plus a short list of what changed since Claude last looked, so your edits reach it.
- **Dependencies.** A task can wait for other tasks or for open questions (`blockedBy`). It stays blocked while any of them is open; there is nothing to clear by hand, because a blocker that is done, cancelled, removed, answered or dismissed stops blocking by itself (a cancelled task will never finish, so it releases what waited for it; blocking on a task that is already done or cancelled is refused, since it would block nothing). A task cannot wait for itself or close a loop (A waits for B waits for A); the later blocker is refused. Set them with:
  - the `checklist` tool: `add` takes `blockedBy` (ids of tasks or open questions) and `priority`, `edit` takes `priority`, and `block` / `unblock` take an `id` and `blockedBy` (`unblock` without it drops every blocker);
  - the commands `/checklist block <n> <m|qK>` (task `n` waits for task `m`, or for open question `K`, numbered as the `/questions` pane lists them, part by part; a blocker names the whole entry, so a question asked together with others holds until all of them are closed; `by` is optional: `block 3 by q2`) and `/checklist unblock <n> [<m|qK>]` (one blocker, or all of them);
  - the scan and `add`, which infer them (below).

  `run` refuses a blocked task and says what it waits for. A blocked task is marked in the pane and in the task's own screen, and the prompt context and the tool answers show it as `blocked by ...`, so Claude sees the order of the work.
- **Smarter scan and add.** What Claude adds with the tool and what a scan finds is not appended blindly. A task an open task already says in nearly the same words (the same content words, one extra word, or for long titles one differing word) is skipped by a cheap word match; done and cancelled tasks never count, so work that was finished and is needed again is added. Different tasks that merely share most words (`Migrate users table` / `Migrate orders table`) are kept, and the fuzzy cases are left to the model. Otherwise a small model (not used with `judge: heuristic`, nor when it cannot answer; then new tasks are simply added) compares the new tasks with the tracked ones and the open questions and decides for each: **duplicate** (of an open task; skipped, in any wording or language), **complements** (it only adds information to an open task, so the new part is folded into that task's description once and no task is added) or **new** (added, with the dependencies it needs: tracked tasks, open questions or other tasks found in the same pass). The answer reads like `2 added, 1 merged into existing tasks, 3 already tracked, 1 dependencies set`. A single new task with nothing to compare costs no model call.
- One checklist per conversation: a new chat starts empty and two chats never share tasks. It is keyed by the conversation's session id, which holds through `/login`, a restart and `/compact`. A checklist nobody wrote to for 30 days is deleted, backup included. The status line shows `checklist: done/total`.

### learnings

Claude Code's auto-memory lets the model write a file into `<config dir>/projects/<project>/memory/` whenever it decides something is worth remembering: no review, no deduplication, no trace of what you refused. This mod is a door in front of that folder: it decides what may enter or change, and nothing else. The memory itself stays Claude's: the mod never writes it and never lists it. When you accept something, Claude is asked to save it, following its own memory instructions (one file per memory, `MEMORY.md` only as the index).

**Practices it enforces**

1. **One door.** Every learning enters through the same path, whoever proposes it: the `learnings` tool, a memory write the guard caught, a turn read on its own, or a scan. The same rules apply at each.
2. **Rules at the door.** A proposal that breaks the rules, says too much, or is not a learning never reaches the queue: Claude gets back what is wrong, or where it belongs instead.
3. **Nothing enters memory without you.** Claude writes its memory only for what you accepted, or for a `/learnings fix` you ran; any other write is refused.
4. **Every item says what your answer does,** in the same words in the pane, the tool's answers and this README.
5. **Your answers are remembered.** A rejection keeps the proposal as a refusal with your reason, so the same proposal is answered with it in that session.
6. **One rule, one learning.** What memory or the queue already says is not proposed again; an update is folded into what it updates; a contradiction replaces what it contradicts.
7. **Compact and durable.** One line plus its why and how, under 600 characters together, with absolute dates and nothing that only made sense in the conversation it came from.
8. **Only your preferences.** A learning is a preference of yours about how the assistant works: how to do something, what never to do, where to find or get something, what you prefer. A convention of the code or the process goes to CLAUDE.md, a product or architecture decision to the project's docs, and general engineering knowledge nowhere, even when you agreed on it in the conversation.

**The rules** (`/learnings rules`), one text shared by the tool, the model prompts and the doctor:

```
One fact per learning: a sentence of at most 200 characters ... "And also" means two learnings.
Every learning says why it holds ... Without a why it is not accepted.
A learning is durable ... Nothing that only matters to this conversation.
A learning is a preference of the user about how the assistant works: how to do something, what never to do, where to find or get something, what they prefer ...
Not memory, even when it was agreed with the user: a convention of the code or the process goes in CLAUDE.md; a product or architecture decision goes in the project's docs; general engineering knowledge ... goes nowhere.
A learning is not derivable from the repository: not its code structure, its git history, its CLAUDE.md or its README.
Dates are absolute (2026-10-13), never relative (yesterday, last week).
No secrets, credentials or tokens ...
A file, function, flag or URL it names must exist when it is written.
The why and the how add to the text; they never repeat it.
```

A learning has a kind (`user`, `feedback`, `project`, `reference`, the kinds Claude's own memory instructions use), a one-line text, a why and an optional how. The mod's ledger holds only what is in transit: **proposed** (waiting for you) and **rejected** (a refusal, with your reason). Once accepted, a learning is Claude's memory and leaves the ledger.

**What happens to a new proposal**

| The proposal is | What the mod does | In the queue as | If you accept | If you reject |
|---|---|---|---|---|
| Breaking a rule, or over 600 characters of why and how | Turned away at the door with what to fix | nothing | | |
| A convention of the code or the process (naming, folders, tests, gates, env files, how agents run) | Turned away: Claude is told to suggest it as a CLAUDE.md change | nothing | | |
| A product or architecture decision | Turned away: it belongs in the project's docs | nothing | | |
| General engineering knowledge, or how a library or API behaves | Turned away: nothing to remember | nothing | | |
| What memory already says | Not proposed: Claude is told it is there | nothing | | |
| What waits in the queue already | One more sighting (`seen`) | the same item | | |
| What you rejected before | Refused, answered with your reason | nothing | | |
| An update of a pending proposal | Folded into it in place | the same item | | |
| An update of a memory (a detail, a case, a scope) | Merged with it by the model into one learning | `updates memory` | Claude updates that memory file | the memory stays; this is a refusal |
| The opposite of a memory | Proposed as replacing it | `contradicts memory` | Claude retires that file and saves this one | the memory stays; this is a refusal |
| Something new | Proposed as it is | `new` | Claude saves it as a new memory | a refusal |

Without a model (`judge: heuristic`) only the word match and the door run: plain repeats and rule breaks are caught, updates and contradictions are not.

**How proposals arrive.** Claude proposes through the `learnings` tool (`propose` with kind, text, why, how; `list`; `withdraw` for a proposal of its own session it no longer stands by; `revise` to reword a proposal after your comment; `rules`). It cannot accept: the tool has no such action. Every prompt tells it that memory goes through review, lists the proposals waiting and the last refusals with their reasons, and, as for the checklist and the questions, what you changed since it last looked (accepted, rejected with your reason, reopened, reworded, taken out of the queue). **Every turn is read too**, as the questions are: once Claude answers, a small model reads the turn for a preference you stated (taken only from what you said, never from what Claude decided or explained; at most two), and what it finds goes through the door into the queue (most turns teach nothing; a turn a plugin prompt started is not read). The door's judge always runs, an empty project too. A `Write`, `Edit` or `MultiEdit` into the memory folder is caught by the **memory guard**: under `memory: guard` (the default) a write you did not approve is refused and its content goes through the door like any proposal, and the tool result tells Claude what happened; `MEMORY.md` changes only with an approval. Accepting a learning or running `/learnings fix` opens an approval: Claude's memory writes go through until the turn that answers it completes (30 minutes at most). Under `memory: observe` every write goes through, for the doctor to review. Under `memory: off` nothing is watched and turns are not read. A write made through `Bash` is not seen.

**The pane** (`/learnings`) has the shape of the questions pane: a direct list of what waits for your answer, nothing else. One line per item (`N text tag`), numbered as the commands number them; the tag says what it is (`new`, `updates`, `contradicts`). The selected item is a card with its chips (kind, the full tag such as `updates memory`, how long ago, sightings) and its four actions, side by side: **Accept** (`a`) and **Reject** (`r`); **Comment** (`c`), a box for what should change: it goes to Claude, which rewords the proposal with the tool's `revise` action (through the same rules), and the item keeps waiting for your answer; and **Details** (`d`, or Enter on the row), which reveals what each answer does (**If you ...:**), the why, the how, the rules it breaks, and **Edit in the prompt** (`e`, fills `/learnings edit <n> text ...`). From 84 columns the selected item sits beside the list. **✓ Accept all n** at the top accepts everything waiting and asks Claude to save it in one message; what still breaks the rules stays, named in a toast. Nothing waiting: **✓ All caught up**.

**Scan.** `/learnings scan [quick|fast]` is the backfill, as `/questions scan` and `/checklist scan` are: it reads the conversation again for what could have been a learning and is not in memory, in the queue or refused yet, and puts it in the queue for you to accept or reject (deep by default, with the session's own model; `quick` with a small model over a few exchanges at a time; `fast` finds nothing, learnings have no local rules). What it finds again is not counted as a new sighting. `/learnings rebuild` empties the queue and scans again.

**The doctor.** As for the checklist and the questions, `/learnings doctor` only diagnoses and `/learnings fix` repairs all of it. The doctor reads the memory folder as it is and reports in two parts, each a summary with a few examples, never a line per file:

```
Learnings doctor · this project
234 memory files · 3 waiting for your review in /learnings

Bookkeeping:
✗ 4 lines of MEMORY.md pointing at no file (fix drops them)
✗ 6 memory files saying word for word what another says (fix removes the copy)

Memory:
✗ 58 learnings that are not a learning: conventions, decisions or general knowledge (fix moves them to CLAUDE.md or the docs, retires them, or takes them out of the queue)
✗ 3 contradictions between learnings (fix settles each)
✗ 12 groups of learnings that say the same thing (fix merges each into one)
✗ 9 learnings breaking the rules (fix rewrites or splits them)
  - Al construir más agentes, los mecanismos ya deben estar resueltos: tied to the conversation it came from
  - ...
  - and 6 more
✗ 41 learnings longer than they need to be (fix compacts them)
✗ 70 memory files missing from MEMORY.md (fix adds a line under the right heading)
```

What it checks: what is not a learning (in memory, and waiting in the queue), judged with the door's own verdicts and checked first, so its wording is not tidied for nothing; the rules; paths that no longer exist (absolute ones, and relative ones whose first folder is in the project root); learnings over 600 characters of why and how; learnings whose text says they are superseded; with the model, groups that say the same thing, contradictions, and wording that is unclear or padded; and the bookkeeping: index lines with no file, files that copy another word for word, files the index does not list.

`/learnings fix` turns every finding into one concrete repair (a rewrite, merge or split written by a small model from the whole file, compacted and kept in its language with every concrete detail, with one more try when it still breaks the rules; a move to CLAUDE.md or to the docs; a retirement; an index line under the right heading of `MEMORY.md`; a dead index line dropped; a copy removed) and asks Claude to apply all of them in one message, with the guard open for it. A proposal in the queue that is not a learning leaves the queue. The memory folder and the ledger are copied first: `/learnings undo` puts the folder back word for word (files fix added go, files it removed or changed come back) and restores the queue.

- `/learnings list` prints what waits as plain text, for surfaces that cannot show the pane: each learning in full with its kind, why and how.
- Keyboard: `/learnings list`, `accept <n>`, `accept all`, `reject <n> [reason]`, `comment <n> <text>`, `reopen <n>` (a refusal back to the queue), `edit <n> text|why|how <text>` (no text clears the how), `kind <n> <kind>`, `rm <n>`, `rules`, `scan [quick|fast]`, `doctor`, `fix`, `clear [all]`, `rebuild`, `undo`. Numbers are the pane's: what waits first, then the refusals.
- `/learnings clear` empties the review queue (the proposals may come back); `clear all` also forgets the refusals, so a refused learning proposed again is no longer answered with your reason. Memory is never touched; `/learnings undo` brings the ledger back.
- Learnings belong to the session, as its checklist and its questions do: what it proposed and what you refused in it, stored under `learnings:<session id>`. What earlier versions kept, in one shared list or per project, moves once to the session that proposed it; what was accepted is in memory already and goes. A session's ledger holds at most 500 entries. The status line shows `learnings: n` while n items wait for review, beside `questions: n` and `checklist: d/n`, and nothing when none waits.

The `judge` option (`model` default, or `heuristic`) and the `memory` option (`guard` default, `observe`, `off`) are in the plugin's config menu. UI text is English; questions keep the language they were asked in.

The mods read and write `$.store` on every change (the store has no conditional write). The writes of one session are queued, and a write is applied to the list as it is when it happens, but two processes writing the same key at the same instant can still lose one of the two changes.

## Scenarios

| Situation | What happens |
|---|---|
| New conversation, new project | Both lists start empty. Questions appear as Claude asks them; add tasks by hand, with `/checklist scan`, or let Claude add them. |
| New conversation in a known project | Both lists start empty: the checklist and the questions belong to the conversation. |
| Resumed conversation | It keeps its session id, so its checklist, questions and learnings are its own as they were; a session never reads another session's. A quick background scan backfills the questions you never answered. The checklist is not backfilled from the transcript on its own (a task you removed would keep coming back): run `/checklist scan` when you want it. Learnings are not read again either: each turn was read as it happened, so `/learnings scan` is there for conversations from before this version. |
| You answer in chat (option or free text) | A small model closes the questions the message settled, even indirectly; a partial answer removes only the answered parts. |
| You close, dismiss, reorder, edit, add or remove from a pane or a command | The next prompt tells Claude what changed since it last looked and not to undo it. |
| Claude changes the checklist or the questions itself | Through the tools; the result is what Claude sees, so nothing is echoed back as a change. |
| Claude's question is vague or repeated | It is kept only if it makes sense alone; a repeat folds into the open one and keeps the fuller wording; Claude can reword (`update`) or `merge` duplicates. |
| You cancel a task in progress | The running turn is aborted and Claude is told to stop and carry on with the rest. |
| Another chat works on the same project | Nothing is shared: each chat has its own checklist and its own questions. |
| No model available, or `judge: heuristic` | Local rules detect questions (with the preceding sentences as context); nothing is closed automatically. Learnings are reconciled by words alone; the doctor finds no contradictions. |
| Claude tries to write a memory file | Refused and sent through the door as a proposal (`memory: guard`), unless it carries what you accepted or a fix; the tool result says what happened. You answer it in `/learnings`. |
| You reject a learning Claude keeps proposing | The refusal and its reason are kept: the next proposal is answered with them, and every prompt lists the last refusals. |
| Two memories contradict | `doctor` reports it; `fix` asks Claude to settle it (one memory that says what holds, or retiring the one that no longer does); `undo` puts the folder back. |
| Your memory is long, repetitive or full of conventions | `doctor` reports it; `fix` asks Claude to merge what says the same thing, compact what is long, and move conventions to CLAUDE.md and decisions to the docs. |

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
