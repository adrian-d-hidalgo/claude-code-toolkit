import { expect, test } from 'claude-code/testing'

import { diffQuestions } from './changes.hook'

test('a question the user closed in the pane, and one reopened, are reported', () => {
  const seen = [
    { id: 'q1', texts: ['¿Qué clase de RDS eliges, t4g.large o m7g.large?'], isOpen: true },
    { id: 'q2', texts: ['Which region should the staging stack use?'], isOpen: false },
  ]
  const now = [
    { id: 'q1', texts: seen[0]!.texts, isOpen: false },
    { id: 'q2', texts: seen[1]!.texts, isOpen: true },
  ]

  expect(diffQuestions(seen, now)).toEqual([
    'question closed (answered or dismissed): "¿Qué clase de RDS eliges, t4g.large o m7g.large?"',
    'question reopened: "Which region should the staging stack use?"',
  ])
})

test('questions added since are not reported: the assistant asked them itself', () => {
  expect(diffQuestions([], [{ id: 'q9', texts: ['Which region should the stack use?'], isOpen: true }])).toEqual([])
})

test('a reworded or removed question is reported (what fix and rebuild do)', () => {
  const seen = [
    { id: 'q1', texts: ['¿Cuál eliges?'], isOpen: true },
    { id: 'q2', texts: ['Which region should the staging stack use?'], isOpen: true },
  ]
  const now = [{ id: 'q1', texts: ['¿Cuál clase de RDS eliges, t4g.large o m7g.large?'], isOpen: true }]

  expect(diffQuestions(seen, now)).toEqual([
    'question reworded: "¿Cuál eliges?" -> "¿Cuál clase de RDS eliges, t4g.large o m7g.large?"',
    'question removed: "Which region should the staging stack use?"',
  ])
})
