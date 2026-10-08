import type { Question } from '../../../types'
import { plural } from '../../shared/diagnosis/diagnosis.hook'

// One thing a question asked: its entry, its wording and where it sits in the entry.
export type Part = { one: Question; text: string; slot: number; key: string }

// A message that asked several things is one entry in the store, but the person sees and numbers
// each thing on its own: the pane, `/questions done <n>` and `/checklist block <n> q<k>` all count
// parts, in the order of the entries.
export const partsOf = (open: readonly Question[]): Part[] =>
  open.flatMap(one => one.texts.map((text, slot) => ({ one, text, slot, key: `${one.id}#${slot}` })))

// The same wording twice in one entry would make its count wrong and let a removal take both.
export const uniqueTexts = (texts: readonly string[]): string[] => [...new Set(texts)]

// The number every message shows: things asked, not entries. A closed entry still holds what it
// asked, so closed ones count the same way.
export const countParts = (list: readonly Question[]): number => list.reduce((total, one) => total + one.texts.length, 0)

// "4 questions": things asked, however many entries hold them.
export const questionsIn = (list: readonly Question[]): string => plural(countParts(list), 'question')

// "4 open, 2 closed".
export const scopeCounts = (open: readonly Question[], closed: readonly Question[]): string => `${countParts(open)} open, ${countParts(closed)} closed`
