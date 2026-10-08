import type { ChecklistStatus } from '../../../types'

export const STATUSES: ChecklistStatus[] = ['todo', 'doing', 'done', 'cancelled']
export const GLYPH = { todo: '○', doing: '◐', done: '✓', cancelled: '⊘' } as const

// A task someone still has to do or is doing; done and cancelled ones are history.
export const isOpenStatus = (status: ChecklistStatus): boolean => status === 'todo' || status === 'doing'
