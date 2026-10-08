import { expect, test } from 'claude-code/testing'

import { extractQuestions } from './extract.hook'

test('keeps prose questions and skips code, quotes and tables', () => {
  const answer = [
    'Done. Do you want me to run the gate now?',
    '```',
    'const x = a ? b : c?',
    '```',
    '> Quoted: is this a question?',
    '| col | Really? |',
    '- Should I also add the pane?',
  ].join('\n')

  expect(extractQuestions(answer)).toEqual([
    'Do you want me to run the gate now?',
    'Should I also add the pane?',
  ])
})

test('a vague question carries the sentences before it', () => {
  const answer = 'Pending: te recomiendo t4g.large, la otra opción es m7g.large. ¿Cuál eliges?'

  expect(extractQuestions(answer)).toEqual([
    'Pending: te recomiendo t4g.large, la otra opción es m7g.large. ¿Cuál eliges?',
  ])
})

test('a self-contained question stays as written', () => {
  expect(extractQuestions('Hice el cambio. ¿Quieres que corra las pruebas ahora mismo?')).toEqual([
    '¿Quieres que corra las pruebas ahora mismo?',
  ])
})
