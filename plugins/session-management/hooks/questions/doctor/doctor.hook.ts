import type { Choice, Question } from '../../../types'
import type { Port } from '../../shared/port/port.hook'
import type { Check, Diagnosis } from '../../shared/diagnosis/diagnosis.hook'
import { formatChecks, plural } from '../../shared/diagnosis/diagnosis.hook'
import { sameGroup } from '../../shared/similarity/similarity.hook'
import { buildRewritePrompt, isStandalone, parseRewrites } from '../judge/judge.hook'
import { adoptFromTranscript, keepBackup } from '../lifecycle/lifecycle.hook'
import { carryChoices } from '../merge/merge.hook'
import { countParts, scopeCounts, uniqueTexts } from '../parts/parts.hook'

const DAY = 86_400_000
const STALE_DAYS = 14

// The same for one session's questions. Stale ones are only reported: whether they still
// matter is the user's call.
export const diagnoseQuestions = (list: readonly Question[], now: number, isHistoryIncluded = false): Diagnosis<Question> => {
  const fixed: Question[] = []
  const vague: string[] = []
  let vaguePartCount = 0
  let repeats = 0
  let stale = 0

  for (const one of list) {
    if (!one.isOpen && !isHistoryIncluded) {
      fixed.push(one)
      continue
    }

    if (one.texts.some(text => !isStandalone(text))) {
      vague.push(one.id)
      vaguePartCount += one.texts.filter(text => !isStandalone(text)).length
    }

    const twin = fixed.find(other => other.isOpen === one.isOpen && sameGroup(one.texts, other.texts))

    if (twin) {
      repeats += 1
      twin.asks += one.asks
      twin.at = Math.max(twin.at, one.at)
      twin.texts = twin.texts.join(' ').length >= one.texts.join(' ').length ? twin.texts : one.texts
      // The options are keyed by the wording, which just changed.
      const choices = carryChoices(twin.texts, twin.choices, one.choices)

      if (choices) {
        twin.choices = choices
      } else {
        delete twin.choices
      }
      continue
    }

    fixed.push({ ...one })
  }

  // Counted after the folds, which refresh the age of what they absorb.
  stale = countParts(fixed.filter(one => one.isOpen && now - one.at > STALE_DAYS * DAY))

  const vagueLines = vague.length > 0 ? [`${plural(vaguePartCount, 'vague question')} (too short to make sense alone; \`fix\` rewrites them with the conversation's context)`] : []
  const repeatLines = repeats > 0 ? [`${plural(repeats, 'duplicate question')} (folded into the first, fullest wording kept)`] : []
  const staleLines = stale > 0 ? [`${plural(stale, 'open question')} older than ${STALE_DAYS} days (kept; dismiss them if they no longer matter)`] : []
  const checks: Check[] = [
    { label: 'every open question makes sense on its own', lines: vagueLines },
    { label: 'no duplicates', lines: repeatLines },
    { label: `none open for more than ${STALE_DAYS} days`, lines: staleLines },
  ]
  const lines = checks.flatMap(check => check.lines)

  return { lines, fixed, vague: vague.filter(id => fixed.some(one => one.id === id)), checks }
}

// `doctor` reports what is wrong, `fix` applies the safe repairs (a copy is kept for `undo`).
// Vague wordings from earlier versions are rewritten by the session's own model, which holds
// the conversation they came from; one it cannot rewrite stays as it was.
export const runQuestionsDoctor = async (port: Port, isFixing: boolean, isHistory: boolean, options: { judge?: string }): Promise<string> => {
  const session = await port.sessionId()
  const stray = await adoptFromTranscript(port, !isFixing)
  const own = await port.questions.own(false)
  const { lines, fixed, vague = [], checks } = diagnoseQuestions(own, await port.now(), isHistory)
  const strayLines = stray > 0 ? [`${plural(stray, 'question')} of another session id ${isFixing ? 'taken over' : 'belong to this conversation (`fix` takes them over)'}`] : []
  const report = formatChecks(
    `Questions doctor · this session${isHistory ? ' · with closed questions (--history)' : ''}`,
    `${plural(countParts(own), 'question')}: ${scopeCounts(
      own.filter(one => one.isOpen),
      own.filter(one => !one.isOpen),
    )}`,
    [...checks, { label: 'none left over from another session id', lines: strayLines }],
  )

  if (lines.length + strayLines.length === 0) {
    return report.join('\n')
  }

  if (!isFixing) {
    return [...report, 'Run `/questions fix` to repair what can be repaired.'].join('\n')
  }

  const toReword = fixed.filter(one => vague.includes(one.id))
  let reworded = 0

  // The slow part comes first and works on a copy: what is written afterwards is applied to the
  // list as it is then, so nothing another writer did meanwhile is lost.
  if (toReword.length > 0 && options?.judge !== 'heuristic') {
    const text = await port.fork(buildRewritePrompt(toReword))
    const rewrites = text === null ? new Map<string, string>() : parseRewrites(text, toReword)

    for (const one of toReword) {
      const choices: Record<string, Choice> = {}
      const texts = uniqueTexts(
        one.texts.map((old, index) => {
          const next = rewrites.get(`${one.id}#${index + 1}`)
          reworded += next ? 1 : 0

          // A reworded question keeps the options it had.
          if (one.choices?.[old]) {
            choices[next ?? old] = one.choices[old] as Choice
          }

          return next ?? old
        }),
      )

      one.texts = texts

      if (Object.keys(choices).length > 0) {
        one.choices = choices
      } else {
        delete one.choices
      }
    }
  }

  const before = new Map(own.map(one => [one.id, one]))
  const after = new Map(fixed.map(one => [one.id, one]))
  const unchanged = (a: Question, b: Question) => a.isOpen === b.isOpen && a.texts.join('\n') === b.texts.join('\n')

  await keepBackup(port, own)
  await port.questions.write(list =>
    list.flatMap(one => {
      const old = before.get(one.id)

      // Not in what was diagnosed (added meanwhile), or changed by someone since: left as it is.
      if (one.session !== session || !old || !unchanged(old, one)) {
        return [one]
      }

      const repaired = after.get(one.id)

      return repaired ? [repaired] : []
    }),
  )

  return [
    'Fixed:',
    ...[...strayLines, ...lines].map(line => `- ${line}`),
    ...(vague.length > 0 ? [`- ${reworded} wording(s) rewritten; the rest stay as they were`] : []),
    'Removed questions come back with `/questions undo`.',
  ].join('\n')
}
