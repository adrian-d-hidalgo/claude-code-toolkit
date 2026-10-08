import type { Port } from '../../shared/port/port.hook'
import type { ScanMode } from '../args/args.hook'
import { buildForkTasksPrompt, buildTaskPrompt, parseTasks } from '../judge/judge.hook'
import { reconcileTasks, reconciledText } from '../reconcile/reconcile.hook'
import { addNew, scanTasks } from '../scan/scan.hook'
import type { FoundTask } from '../scan/scan.hook'

// Backfills the checklist from the transcript: structured sources always; then, unless
// `fast`, the session's own model over the whole conversation (`deep`, falling back to
// `quick`) or a small model over an excerpt (`quick`). Tasks the checklist already says,
// even in other words, are skipped or folded into the one that has them, and the new ones come with
// what they wait for (see reconcile). Returns the line the command prints.
export const backfillChecklist = async (port: Port, mode: ScanMode, options: { judge?: string }): Promise<string> => {
  const messages = await port.messages()
  const structured = scanTasks(messages)
  let found: FoundTask[] = structured
  let source = 'structured only'
  let modelCount = 0

  if (mode !== 'fast' && options?.judge !== 'heuristic') {
    // What the structured sources just found counts as known too: the model must not list it again.
    const known = [...(await port.checklist.all()).map(one => one.text), ...structured.map(one => one.text)]
    let tasks: FoundTask[] | null = null

    if (mode === 'deep') {
      const text = await port.fork(buildForkTasksPrompt(known))
      tasks = text === null ? null : parseTasks(text)
      source = tasks === null ? 'deep failed, fell back to quick' : 'deep'
    } else {
      source = 'quick'
    }

    if (tasks === null) {
      try {
        const reply = await port.complete({ prompt: buildTaskPrompt(messages.slice(-30), known), maxTokens: 900 })
        tasks = reply.isAnswered ? parseTasks(reply.text) : null
      } catch {
        // The structured sources still stand.
      }

      if (tasks === null) {
        source = `${source}; model unavailable`
      }
    }

    modelCount = tasks?.length ?? 0
    found = addNew(found, tasks ?? [])
  }

  const done = await reconcileTasks(port, found, options)

  return `Scan (${source}): ${structured.length} structured, ${modelCount} from the model, ${reconciledText(done)}.`
}
