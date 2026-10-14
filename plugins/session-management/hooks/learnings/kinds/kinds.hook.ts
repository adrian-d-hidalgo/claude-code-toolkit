import type { Learning, LearningKind, LearningStatus } from '../../../types'

export const KINDS: LearningKind[] = ['user', 'feedback', 'project', 'reference']
export const STATUSES: LearningStatus[] = ['proposed', 'accepted', 'rejected']
export const GLYPH = { proposed: '?', accepted: '✓', rejected: '✗' } as const

// What each kind holds, in the words the tool and the help use.
export const KIND_MEANING: Record<LearningKind, string> = {
  user: 'who the user is: role, expertise, preferences',
  feedback: 'how the user wants the work done: a correction or a confirmed approach, with its why',
  project: 'ongoing work, goals or constraints the repository does not record',
  reference: 'a pointer to an external resource: a URL, a dashboard, a ticket',
}

export const isKind = (value: unknown): value is LearningKind => KINDS.includes(value as LearningKind)

// What the user still has to decide on: a proposal. A refusal is settled; what is in memory is Claude's.
export const needsReview = (one: Pick<Learning, 'status'>): boolean => one.status === 'proposed'
