import type { Question } from '../../../types'
import { sameQuestion } from '../../shared/similarity/similarity.hook'
import { withTexts } from '../merge/merge.hook'

// The pane's "type it yourself" entry in a list of options.
export const OTHER = '__other__'

export const closing = (ids: string[]) => (list: Question[]) =>
  list.map(one => (ids.includes(one.id) ? { ...one, isOpen: false } : one))

// Takes the given texts out of an entry (one occurrence each); the entry closes when none is left.
const without = (one: Question, gone: readonly string[]): Question => {
  const left = [...one.texts]

  for (const text of gone) {
    const at = left.indexOf(text)

    if (at !== -1) {
      left.splice(at, 1)
    }
  }

  return left.length > 0 ? withTexts(one, left) : { ...one, isOpen: false }
}

// A dialog answered some of its questions: they leave their group, which closes once none is left.
// Only `session`'s open entries are touched. The entry may hold the judge's rewording of a dialog
// question, so a dialog entry matches by meaning when the exact text is not there.
export const answeredDialog = (answered: string[], session: string) => (list: Question[]) =>
  list.map(one => {
    if (one.session !== session || !one.isOpen) {
      return one
    }

    const gone = answered.flatMap(asked => {
      const exact = one.texts.find(text => text === asked)
      const similar = one.source === 'dialog' ? one.texts.find(text => sameQuestion(text, asked)) : undefined

      return exact ?? similar ?? []
    })

    return gone.length === 0 ? one : without(one, [...new Set(gone)])
  })

// One question of a group was answered from the pane: it leaves the group (only the first one
// with that wording), and the entry closes with the last.
export const withoutText = (id: string, text: string) => (list: Question[]) => list.map(one => (one.id === id ? without(one, [text]) : one))

// Several questions of one entry at once, by their wording.
export const withoutTexts = (id: string, texts: readonly string[]) => (list: Question[]) =>
  list.map(one => (one.id === id && one.isOpen ? without(one, texts) : one))
