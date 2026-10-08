import { expect, test } from 'claude-code/testing'

import { sameGroup, sameQuestion, sameTask } from './similarity.hook'

test('the same question in other words is the same', () => {
  expect(sameQuestion('¿Cuál prefieres?', '¿Cuál prefieres tú?')).toBe(true)
  expect(
    sameQuestion('¿respetar el límite de usuarios del plan o no?', '¿Debemos respetar el límite de usuarios del plan?'),
  ).toBe(true)
  expect(sameQuestion('Should I rename the plugin to session-management?', 'Do you want the plugin renamed session-management?')).toBe(true)
})

test('different questions stay different', () => {
  expect(sameQuestion('Which name do you want?', 'Which color do you want?')).toBe(false)
  expect(sameQuestion('¿Lo agrego como plugin separado?', '¿Corro los evals de activación ahora?')).toBe(false)
})

test('a group repeats another when half its questions do', () => {
  const known = ['¿Cuál prefieres?', '¿respetar el límite de usuarios del plan o no?']

  expect(sameGroup(['¿Cuál prefieres tú?'], known)).toBe(true)
  expect(sameGroup(['¿Cuál prefieres?', '¿Quieres que corra los tests?'], known)).toBe(true)
  expect(sameGroup(['¿Quieres que corra los tests?'], known)).toBe(false)
})

test('tasks that differ in one meaningful word are different tasks', () => {
  expect(sameTask('Migrate users table to postgres', 'Migrate orders table to postgres')).toBe(false)
  expect(sameTask('Add tests for auth login', 'Add tests for auth logout')).toBe(false)
  expect(sameTask('Update the README file', 'Update README')).toBe(true)
  expect(sameTask('Run the test suite', 'Run the test suite again')).toBe(true)
  expect(sameTask('Write the tests', 'write the tests!')).toBe(true)
  expect(sameTask('Run the test suite', 'Run the lint suite')).toBe(false)
  // Long texts tolerate one differing word on each side; the model judges the rest.
  expect(sameTask('Replace the memory limiter with the valkey backed one everywhere', 'Replace the memory limiter with the redis backed one everywhere')).toBe(true)
})
