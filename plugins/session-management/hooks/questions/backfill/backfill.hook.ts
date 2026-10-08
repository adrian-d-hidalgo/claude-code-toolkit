import type { Choice, Question } from '../../../types'
import type { ScanMode } from '../../checklist/args/args.hook'
import { oneLine } from '../../shared/format/format.hook'
import type { Port } from '../../shared/port/port.hook'
import { sameQuestion } from '../../shared/similarity/similarity.hook'
import { judgeQuestions } from '../capture/capture.hook'
import { buildForkQuestionsPrompt, parseJudge, standaloneOnly } from '../judge/judge.hook'
import type { JudgedGroup } from '../judge/judge.hook'
import { loadClosed } from '../lifecycle/lifecycle.hook'
import { capSession, carryChoices, mergeGroup } from '../merge/merge.hook'
import { countParts, uniqueTexts } from '../parts/parts.hook'
import { scanMessages } from '../scan/scan.hook'

type Group = { texts: string[]; source: Question['source']; repeatOf: string | null; choices?: Record<string, Choice> }

// Backfills from the transcript. `deep` asks the session's own model, which sees the
// whole conversation; if it cannot answer, `quick` runs: local rules find candidates and
// a small model keeps the real ones. `fast` (or `judge: heuristic`) stops at the local
// rules. Repeats of a known group, open or closed, fold into it. Returns how many questions (things asked) were added.
export const backfillQuestions = async (port: Port, includeReplied: boolean, mode: ScanMode, options: { judge?: string }): Promise<number> => {
  const found = scanMessages(await port.messages(), includeReplied)
  const isModel = mode !== 'fast' && options?.judge !== 'heuristic'
  let groups: Group[] = found.map(group => ({ ...group, repeatOf: null }))
  const dialogs = groups.filter(group => group.source === 'dialog')
  let judged: JudgedGroup[] | null = null

  if (isModel && mode === 'deep') {
    const text = await port.fork(buildForkQuestionsPrompt(await port.questions.own(true)))
    // The same bar as every other path: a reply like "¿Cuál eliges?" is not tracked.
    const parsed = text === null ? null : parseJudge(text)
    judged = parsed === null ? null : standaloneOnly(parsed)
  }

  if (isModel && judged === null) {
    const textGroups = found.filter(group => group.source === 'text')
    judged = textGroups.length > 0 ? await judgeQuestions(port, textGroups.map(group => group.texts.join('\n')).join('\n---\n'), false, options) : null
  }

  if (judged) {
    groups = [...dialogs, ...judged.map(group => ({ texts: group.texts, source: 'text' as const, repeatOf: group.repeatOf, choices: group.choices }))]
  }

  const project = await port.root()
  const session = await port.sessionId()
  const at = await port.now()
  const closed = await loadClosed(port)
  const fresh: Array<{ item: Question; repeatOf: string | null }> = []

  for (const group of groups) {
    // What the person dismissed before the session was parked is not asked again.
    const texts = uniqueTexts(group.texts.map(text => oneLine(text)).filter(text => text !== '' && !closed.some(old => sameQuestion(old, text))))
    const choices = carryChoices(texts, group.choices)

    if (texts.length > 0) {
      fresh.push({
        item: { id: await port.newId(), texts, source: group.source, session, project, at, asks: 1, isOpen: true, ...(choices ? { choices } : {}) },
        repeatOf: group.repeatOf,
      })
    }
  }

  let added = 0
  await port.questions.write(list => {
    // A scan only adds what is not tracked: a repeat, the judge's or not, changes nothing (no new
    // wording, no age reset, no extra ask).
    const next = fresh.reduce(
      (all, { item, repeatOf }) => (repeatOf !== null && all.some(one => one.id === repeatOf && one.isOpen && one.session === session) ? all : mergeGroup(all, item, true)),
      list,
    )
    added = countParts(next) - countParts(list)

    return capSession(next, session)
  })

  return added
}
