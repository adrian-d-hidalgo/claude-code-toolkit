import type { Learning } from '../../../types'
import { fileOfId } from '../memory/memory.hook'
import { excerpt } from '../rules/rules.hook'

// What a learning waiting for review is, and what each answer does to it, in the same words in the
// pane, the tool's answers and the docs: the user always knows what a key press changes.
export type Effect = {
  /** Short, for a chip: new, updates #3, updates memory, contradicts memory. */
  tag: string
  /** The accept button's verb and the reject button's. */
  yes: string
  no: string
  /** What accepting does. */
  onYes: string
  /** What rejecting does. */
  onNo: string
}

// A proposal in the queue is named by its number (the pane's); what is in memory by its words.
const refOf = (list: readonly Learning[], id: string): { short: string; long: string } => {
  const file = fileOfId(id)
  const one = list.find(item => item.id === id)

  if (file !== null) {
    return { short: 'memory', long: `the memory "${excerpt(one?.text ?? file, 50)}" (${file})` }
  }

  const at = list.filter(item => item.status === 'proposed').findIndex(item => item.id === id)

  return at === -1 ? { short: `[${id}]`, long: `[${id}]` } : { short: `#${at + 1}`, long: `#${at + 1} "${excerpt(one?.text ?? '', 50)}"` }
}

const refsOf = (list: readonly Learning[], ids: readonly string[]): string => ids.map(id => refOf(list, id).long).join(', ')

// `list` holds the queue and what is in memory, so the names are the ones the person sees.
export const effectOf = (one: Learning, list: readonly Learning[]): Effect | null => {
  const replaces = one.replaces ?? []

  if (one.status === 'rejected') {
    return { tag: 'rejected', yes: 'accept', no: 'reject', onYes: 'Asks Claude to save it to its memory after all.', onNo: 'It is already a refusal.' }
  }

  if (one.status !== 'proposed') {
    return null
  }

  if ((one.conflicts ?? []).length > 0 && replaces.length > 0) {
    return {
      tag: `contradicts ${refOf(list, replaces[0] as string).short}`,
      yes: 'accept',
      no: 'reject',
      onYes: `Asks Claude to save it to its memory and to retire ${refsOf(list, replaces)}, which it contradicts.`,
      onNo: `Keeps ${refsOf(list, replaces)} and keeps this one as a refusal, answered with your reason if it is proposed again.`,
    }
  }

  if (replaces.length > 0) {
    return {
      tag: `updates ${refOf(list, replaces[0] as string).short}`,
      yes: 'accept',
      no: 'reject',
      onYes: `Asks Claude to update ${refsOf(list, replaces)} in its memory with this version.`,
      onNo: `Keeps ${refsOf(list, replaces)} as it is and keeps this one as a refusal.`,
    }
  }

  return { tag: 'new', yes: 'accept', no: 'reject', onYes: 'Asks Claude to save it to its memory as a new learning.', onNo: 'Keeps it as a refusal: proposed again, it is answered with your reason.' }
}
