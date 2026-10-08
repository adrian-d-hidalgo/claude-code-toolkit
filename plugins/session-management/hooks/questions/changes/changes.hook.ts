import { quoted } from '../../shared/format/format.hook'

type Seen = ReadonlyArray<{ id: string; texts: readonly string[]; isOpen: boolean }>

// Questions of the session the user closed, dismissed, reopened or reworded since the assistant
// last looked, and ones a repair or a rebuild removed (folded duplicates, a rebuilt list).
export const diffQuestions = (seen: Seen, now: Seen): string[] => {
  const before = new Map(seen.map(one => [one.id, one]))
  const after = new Set(now.map(one => one.id))
  const lines: string[] = []

  for (const one of now) {
    const old = before.get(one.id)

    if (!old) {
      continue
    }

    if (old.isOpen && !one.isOpen) {
      lines.push(`question closed (answered or dismissed): ${quoted(old.texts.join(' | '))}`)
    } else if (!old.isOpen && one.isOpen) {
      lines.push(`question reopened: ${quoted(one.texts.join(' | '))}`)
    } else if (old.texts.join('|') !== one.texts.join('|')) {
      lines.push(`question reworded: ${quoted(old.texts.join(' | '))} -> ${quoted(one.texts.join(' | '))}`)
    }
  }

  for (const old of seen) {
    if (old.isOpen && !after.has(old.id)) {
      lines.push(`question removed: ${quoted(old.texts.join(' | '))}`)
    }
  }

  return lines
}
