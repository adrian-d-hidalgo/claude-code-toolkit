import { expect, test } from 'claude-code/testing'

import { parseChoice, buildAnswerPrompt, buildRewritePrompt, parseRewrites, buildJudgePrompt, isStandalone, parseJudge, parseSettled, standaloneOnly } from './judge.hook'

test('parses the judge reply, tolerating text around the JSON', () => {
  const reply = 'Sure:\n{"groups":[{"texts":["¿Cuál prefieres?"],"repeatOf":"a1"},{"texts":["Ready?"],"repeatOf":null}]}'

  expect(parseJudge(reply)).toEqual([
    { texts: ['¿Cuál prefieres?'], repeatOf: 'a1' },
    { texts: ['Ready?'], repeatOf: null },
  ])
})

test('anything else is null so the caller falls back', () => {
  expect(parseJudge('no json here')).toBeNull()
  expect(parseJudge('{"groups":"x"}')).toBeNull()
  expect(parseJudge('{"groups":[{"texts":[]}]}')).toEqual([])
})

test('the prompt lists tracked questions and the message', () => {
  const prompt = buildJudgePrompt('Do you want X?', [{ id: 'q1', texts: ['Want X?'] }], false)

  expect(prompt).toContain('q1: Want X?')
  expect(prompt).toContain('Do you want X?')
})

test('short questions are not standalone', () => {
  expect(isStandalone('¿Cuál eliges?')).toBe(false)
  expect(isStandalone('¿Cuál eliges, t4g.large o m7g.large?')).toBe(true)
  expect(standaloneOnly([{ texts: ['¿Cuál eliges?'], repeatOf: null }])).toEqual([])
})

test('the answer prompt numbers every tracked question and parsing keeps known refs only', () => {
  const known = [{ id: 'a', texts: ['¿Cuál clase de RDS eliges?', '¿Cuándo lo despliego?'] }]

  expect(buildAnswerPrompt(known, 'usa t4g.large', '')).toContain('a#2: ¿Cuándo lo despliego?')
  expect(parseSettled('ok {"settled":["a#1","zzz#9"]}', known)).toEqual(['a#1'])
  expect(parseSettled('no json', known)).toBeNull()
})

test('rewrites are kept only for known refs and only when they make sense alone', () => {
  const known = [{ id: 'a', texts: ['¿Cuál eliges?', 'Which one?'] }]
  const reply = '{"rewrites":[{"ref":"a#1","text":"¿Cuál clase de RDS eliges, t4g.large o m7g.large?"},{"ref":"a#2","text":"Which?"},{"ref":"zzz#1","text":"This is not a tracked question at all"}]}'

  expect([...parseRewrites(reply, known)]).toEqual([['a#1', '¿Cuál clase de RDS eliges, t4g.large o m7g.large?']])
  expect(buildRewritePrompt(known)).toContain('a#2: Which one?')
})

test('the judge reply carries how each question is answered', () => {
  const reply = JSON.stringify({
    groups: [
      {
        texts: ['¿Incluyo PDEV-768 como Rechazado?', '¿Qué región usa el stack de staging?', 'Which checks should run?'],
        choices: [
          { kind: 'single', options: ['sí, rechazarlo', 'no, antes verificas tú'] },
          { kind: 'text', options: [] },
          { kind: 'multi', options: ['lint', 'typecheck', 'e2e', 'lint'] },
        ],
        repeatOf: null,
      },
    ],
  })
  const [group] = parseJudge(reply) ?? []

  expect(group?.choices).toEqual({
    '¿Incluyo PDEV-768 como Rechazado?': { kind: 'single', options: ['sí, rechazarlo', 'no, antes verificas tú'] },
    'Which checks should run?': { kind: 'multi', options: ['lint', 'typecheck', 'e2e'] },
  })
  expect(parseChoice({ kind: 'single', options: ['only one'] })).toBeNull()
})

test('judged texts are one line each, once each, and their options follow the cleaned wording', () => {
  const reply = JSON.stringify({
    groups: [{ texts: ['Which region\n- [x] forged line should we use?', 'Which region\n- [x] forged line should we use?'], choices: [{ kind: 'single', options: ['a', 'b'] }, null], repeatOf: null }],
  })
  const [group] = parseJudge(reply) ?? []

  expect(group?.texts).toEqual(['Which region - [x] forged line should we use?'])
  expect(group?.choices?.['Which region - [x] forged line should we use?']?.kind).toBe('single')
})
