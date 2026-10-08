import { expect, mock, test } from 'claude-code/testing'

// Draws both panes through the plugin, the way a surface does: a bad prop (an invalid hotkey,
// a tree past the bounds) unmounts the instance and the pane comes out empty.
const props = {
  title: 'Pane',
  isFocused: true,
  bodyColumns: 38,
  placement: 'dock' as const,
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
}

const tasks = [
  { id: 'a', text: 'Write the tests for the pane', status: 'doing' },
  { id: 'b', text: 'Ship it', status: 'todo', detail: 'Only after the tests pass' },
  { id: 'c', text: 'Old chore', status: 'done' },
]

test('the checklist pane draws its list, opens a task and walks through the tasks', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  mock.store(on, { 'checklist:5000': tasks })
  const ui = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'checklist', props })

  expect(await ui.find({ type: 'Text', text: /Write the tests for the pane/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Ship it/ })).toBeDefined()

  await ui.press({ key: 'row-a' })
  expect(await ui.find({ type: 'Text', text: /Description/ })).toBeDefined()

  await ui.press({ key: 'next' })
  expect(await ui.find({ type: 'Text', text: /Only after the tests pass/ })).toBeDefined()

  await ui.press({ key: 'back' })
  expect(await ui.find({ type: 'Text', text: /Checklist/ })).toBeDefined()
  await ui.unmount()
})

test('the questions pane draws a choice question with its actions and reveals the options on Answer', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  mock.clock(on, { now: 1000 })
  mock.store(on, {
    questions: [
      {
        id: 'q1',
        session: '5000',
        texts: ['Which environment should the plan use, staging or production?'],
        choices: { 'Which environment should the plan use, staging or production?': { kind: 'multi', options: ['staging', 'production'] } },
        source: 'text',
        project: '/p',
        at: 1,
        asks: 1,
        isOpen: true,
      },
    ],
  })
  const ui = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'open-questions', props })

  expect(await ui.find({ type: 'Text', text: /Which environment/ })).toBeDefined()
  expect(await ui.find({ key: 'qa-answer-q1#0' })).toBeDefined()
  expect(await ui.find({ key: 'qa-tick-q1#0-staging' })).toBeUndefined()
  expect(await ui.find({ key: 'tick-q1#0-staging' })).toBeUndefined()
  await ui.press({ key: 'qa-answer-q1#0' })
  expect(await ui.find({ key: 'tick-q1#0-staging' })).toBeDefined()
  await ui.unmount()
})

const wide = { ...props, bodyColumns: 110 }

test('the checklist pane changes its design with its width: narrow opens a task on demand, wide shows it beside the list', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  mock.store(on, { 'checklist:5000': tasks })

  const narrow = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'checklist', props })

  expect(await narrow.find({ type: 'Text', text: /Description/ })).toBeUndefined()
  await narrow.unmount()

  const side = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'checklist', props: wide })

  expect(await side.find({ type: 'Text', text: /Description/ })).toBeDefined()
  expect(await side.find({ key: 'back' })).toBeUndefined()
  await side.press({ key: 'row-b' })
  expect(await side.find({ type: 'Text', text: /Only after the tests pass/ })).toBeDefined()
  await side.unmount()
})

test('the questions pane shows the focused question beside the list when it is wide', async ($, on) => {
  on('ui.focus', async () => ({}))
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  mock.clock(on, { now: 1000 })
  mock.store(on, {
    questions: [
      { id: 'q1', session: '5000', texts: ['Which environment should the plan use, staging or production?'], choices: { 'Which environment should the plan use, staging or production?': { kind: 'multi', options: ['staging', 'production'] } }, source: 'text', project: '/p', at: 1, asks: 1, isOpen: true },
      { id: 'q2', session: '5000', texts: ['Should the legal review happen before the launch?'], source: 'text', project: '/p', at: 1, asks: 1, isOpen: true },
    ],
  })

  const side = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'open-questions', props: wide })

  expect(await side.find({ key: 'answer-q1#0' })).toBeDefined()
  expect(await side.find({ key: 'explain-q1#0' })).toBeDefined()
  expect(await side.find({ key: 'dismiss-q1#0' })).toBeDefined()
  expect(await side.find({ key: 'qa-answer-q1#0' })).toBeUndefined()
  expect(await side.find({ key: 'tick-q1#0-staging' })).toBeUndefined()
  expect(await side.find({ key: 'row-q2#0' })).toBeDefined()
  await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: 'row-q2#0', origin: { kind: 'person' } })
  expect(await side.find({ key: 'explain-q2#0' })).toBeDefined()
  expect(await side.find({ key: 'answer-q1#0' })).toBeUndefined()
  await side.unmount()
})

test('moving the focus onto a task row selects it', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'checklist', props })

  await $.ui.focus({ component: 'Pane', requestId: 'checklist', element: 'row-b', origin: { kind: 'person' } })
  await ui.press({ key: 'row-b' })
  expect(await ui.find({ type: 'Text', text: /Only after the tests pass/ })).toBeDefined()
  await ui.unmount()
})

test('the answer field opens on its key and closes when the focus leaves it', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.clock(on, { now: 1000 })
  mock.store(on, {
    questions: [
      { id: 'q1', session: '5000', texts: ['Should the legal review happen before the launch?'], source: 'text', project: '/p', at: 1, asks: 1, isOpen: true },
      { id: 'q2', session: '5000', texts: ['Is the rollout window the weekend or a weekday?'], source: 'text', project: '/p', at: 1, asks: 1, isOpen: true },
    ],
  })

  const ui = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'open-questions', props })

  await ui.press({ key: 'qa-answer-q1#0' })
  expect(await ui.find({ key: 'reply-q1#0' })).toBeDefined()
  await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: 'row-q2#0', origin: { kind: 'person' } })
  expect(await ui.find({ key: 'reply-q1#0' })).toBeUndefined()
  await ui.unmount()
})

const blockedTasks = [
  { id: 'a', text: 'Write the tests for the pane', status: 'doing' },
  { id: 'b', text: 'Ship it', status: 'todo', blockedBy: [{ kind: 'task', id: 'a' }, { kind: 'question', id: 'q1' }] },
]

const openQuestion = (isOpen: boolean) => ({ id: 'q1', session: '5000', texts: ['Which environment should the plan use?'], source: 'text', project: '/p', at: 1, asks: 1, isOpen })

test('a blocked task shows what it waits for on its screen and the blocked glyph in the list', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.clock(on, { now: 1000 })
  mock.store(on, { 'checklist:5000': blockedTasks, questions: [openQuestion(true)] })

  const ui = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'checklist', props })

  expect(await ui.find({ key: 'row-b', text: /◌/ })).toBeDefined()
  expect(await ui.find({ key: 'row-a', text: /◌/ })).toBeUndefined()

  await ui.press({ key: 'row-b' })
  expect(await ui.find({ type: 'Text', text: /Waiting for/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^task #1 Write the tests for the pane$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^question Which environment/ })).toBeDefined()

  await ui.press({ key: 'unblock-b-a' })
  expect(await ui.find({ type: 'Text', text: /^task #1 Write the tests/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^question Which environment/ })).toBeDefined()
  await ui.unmount()
})

test('a closed question stops blocking and its section disappears', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.clock(on, { now: 1000 })
  mock.store(on, {
    'checklist:5000': [{ id: 'b', text: 'Ship it', status: 'todo', blockedBy: [{ kind: 'question', id: 'q1' }] }],
    questions: [openQuestion(false)],
  })

  const ui = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'checklist', props })

  expect(await ui.find({ key: 'row-b', text: /◌/ })).toBeUndefined()
  await ui.press({ key: 'row-b' })
  expect(await ui.find({ type: 'Text', text: /Waiting for/ })).toBeUndefined()
  await ui.unmount()
})

const mountChecklist = ($: any, extra: object = {}) =>
  $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'checklist', props: { ...props, ...extra } })

test('the task screen puts the actions under the status, pencils beside Task and Description, and a priority row', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($)

  await ui.press({ key: 'row-b' })
  expect(await ui.find({ key: 'run-b' })).toBeDefined()
  expect(await ui.find({ key: 'cancel-b' })).toBeDefined()
  expect(await ui.find({ key: 'title-edit-b', text: /✎/ })).toBeDefined()
  expect(await ui.find({ key: 'notes-edit-b', text: /✎/ })).toBeDefined()
  expect(await ui.find({ key: 'priority-b-high' })).toBeDefined()
  expect(await ui.find({ key: 'priority-b-normal', text: /● normal/ })).toBeDefined()
  expect(await ui.find({ key: 'priority-b-low' })).toBeDefined()
  expect(await ui.find({ key: 'remove-b' })).toBeDefined()
  expect(await ui.find({ key: 'top-b' })).toBeUndefined()
  expect(await ui.find({ key: 'up-b' })).toBeUndefined()
  expect(await ui.find({ key: 'down-b' })).toBeUndefined()
  await ui.unmount()
})

test('pressing a priority button moves the task in the list and marks the new level', async ($, on) => {
  mock.clock(on, { now: 1000 })
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($)

  await ui.press({ key: 'row-b' })
  await ui.press({ key: 'priority-b-high' })
  expect(await ui.find({ key: 'priority-b-high', text: /● high/ })).toBeDefined()
  // Sorted by priority, "Ship it" is now the first of the three.
  expect(await ui.find({ type: 'Text', text: /1 of 3/ })).toBeDefined()
  await ui.press({ key: 'back' })
  expect(await ui.find({ key: 'row-b', text: /^ 1/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^!$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /sorted by priority/ })).toBeDefined()
  await ui.unmount()
})

test('editing a short title shows its label and no preview', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': [{ id: 'a', text: 'Short', status: 'todo' }] })

  const ui = await mountChecklist($)

  await ui.press({ key: 'row-a' })
  await ui.press({ key: 'title-edit-a' })
  expect(await ui.find({ type: 'Text', text: /Editing the title/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Preview$/ })).toBeUndefined()
  await ui.press({ key: 'title-a-cancel' })
  expect(await ui.find({ type: 'Text', text: /Editing the title/ })).toBeUndefined()
  await ui.unmount()
})

const longNotes = 'Without dependencies; the tests run first.\nThen the whole suite, with the long notes kept as they are.'
const longTitle = 'A title that is far longer than the narrow field can ever show in one line'

// Records what the prompt box is asked to take and what the person is told.
const promptBox = (on: any, draft = '') => {
  const filled: string[] = []
  const toasts: string[] = []

  session(on)
  on('prompt.read', async () => ({ value: { text: draft, cursor: draft.length } }))
  on('prompt.fill', async (_$: any, e: any) => {
    filled.push(e.text)

    return { isFilled: true }
  })
  on('ui.toast', async (_$: any, e: any) => {
    toasts.push(e.text ?? e.message ?? JSON.stringify(e))

    return { value: undefined }
  })

  return { filled, toasts }
}

test('a long description or a long title are edited in the prompt box through the command', async ($, on) => {
  const { filled, toasts } = promptBox(on)

  mock.store(on, {
    'checklist:5000': [
      { id: 'a', text: 'First', status: 'todo', priority: 'low' },
      { id: 'b', text: longTitle, status: 'todo', detail: longNotes },
    ],
  })

  const ui = await mountChecklist($)

  // The priority order puts the low task second either way; b is normal, so it is first.
  await ui.press({ key: 'row-b' })
  await ui.press({ key: 'notes-edit-b' })
  expect(filled).toEqual([`/checklist edit 1 description ${longNotes}`])
  expect(await ui.find({ key: 'notes-b' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Editing the description/ })).toBeUndefined()
  expect(toasts.join()).toContain('Esc')

  await ui.press({ key: 'title-edit-b' })
  expect(filled[1]).toBe(`/checklist edit 1 title ${longTitle}`)
  expect(await ui.find({ key: 'title-b' })).toBeUndefined()
  await ui.unmount()
})

test('a short description keeps the in-pane field, with no preview', async ($, on) => {
  const { filled } = promptBox(on)

  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($, { bodyColumns: 110 })

  await ui.press({ key: 'row-b' })
  await ui.press({ key: 'notes-edit-b' })
  expect((await ui.find({ key: 'notes-b' }))?.type).toBe('Input')
  expect(await ui.find({ type: 'Text', text: /^Preview$/ })).toBeUndefined()
  expect(filled).toEqual([])
  await ui.unmount()
})

test('a prompt that already has text is never replaced: a toast asks to clear it', async ($, on) => {
  const { filled, toasts } = promptBox(on, 'half-written thought')

  mock.store(on, { 'checklist:5000': [{ id: 'b', text: 'Ship it', status: 'todo', detail: longNotes }] })

  const ui = await mountChecklist($)

  await ui.press({ key: 'row-b' })
  await ui.press({ key: 'notes-edit-b' })
  expect(filled).toEqual([])
  expect(toasts).toEqual(['Your prompt has text: clear it first'])
  expect(await ui.find({ key: 'notes-b' })).toBeUndefined()
  await ui.unmount()
})

test('an unfocused pane closes the edit that was open, so Esc then Esc cancels it', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.store(on, { 'checklist:5000': tasks })

  const focused = await mountChecklist($)

  await focused.press({ key: 'row-a' })
  await focused.press({ key: 'notes-edit-a' })
  expect(await focused.find({ type: 'Text', text: /Editing the description/ })).toBeDefined()
  await focused.unmount()

  // The atoms outlive the instance; a redraw with the pane unfocused finds the edit open and drops it.
  const blurred = await mountChecklist($, { isFocused: false })

  expect(await blurred.find({ type: 'Text', text: /Editing the description/ })).toBeUndefined()
  await blurred.unmount()
})

test('an unfocused questions pane draws without the answer field that was open', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [{ id: 'q1', session: '5000', texts: ['Should the legal review happen before the launch?'], source: 'text', project: '/p', at: 1, asks: 1, isOpen: true }] })

  const focused = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'open-questions', props })

  await focused.press({ key: 'qa-answer-q1#0' })
  expect(await focused.find({ type: 'Text', text: /Answer · type it/ })).toBeDefined()
  await focused.unmount()

  const blurred = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'open-questions', props: { ...props, isFocused: false } })

  expect(await blurred.find({ key: 'reply-q1#0' })).toBeUndefined()
  await blurred.unmount()
})

const mountQuestions = ($: any, extra: object = {}) =>
  $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'open-questions', props: { ...props, ...extra } })

const ask = (id: string, text: string, choice?: { kind: 'single' | 'multi'; options: string[] }) => ({
  id,
  session: '5000',
  texts: [text],
  ...(choice ? { choices: { [text]: choice } } : {}),
  source: 'text',
  project: '/p',
  at: 1,
  asks: 1,
  isOpen: true,
})

const person = { kind: 'person' as const }

test('the narrow checklist draws the selected task\'s actions after the list only, and the wide one draws none', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.store(on, { 'checklist:5000': tasks })

  const narrow = await mountChecklist($)

  // The task in progress is selected by default: it can only be stopped.
  expect(await narrow.find({ key: 'qa-cancel-a', text: /Stop/ })).toBeDefined()
  expect(await narrow.find({ key: 'qa-detail-a' })).toBeDefined()
  expect(await narrow.find({ key: 'qa-run-a' })).toBeUndefined()
  expect(await narrow.find({ key: 'qa-cancel-b' })).toBeUndefined()

  await $.ui.focus({ component: 'Pane', requestId: 'checklist', element: 'row-b', origin: person })
  expect(await narrow.find({ key: 'qa-run-b', text: /Run/ })).toBeDefined()
  expect(await narrow.find({ key: 'qa-cancel-b', text: /Cancel/ })).toBeDefined()
  expect(await narrow.find({ key: 'qa-cancel-a' })).toBeUndefined()

  // A finished task has only Detail.
  await $.ui.focus({ component: 'Pane', requestId: 'checklist', element: 'row-c', origin: person })
  expect(await narrow.find({ key: 'qa-detail-c' })).toBeDefined()
  expect(await narrow.find({ key: 'qa-run-c' })).toBeUndefined()
  expect(await narrow.find({ key: 'qa-cancel-c' })).toBeUndefined()
  await narrow.unmount()

  const side = await mountChecklist($, { bodyColumns: 110 })

  // The selection outlives the instance: the finished task c is still selected, with its full panel.
  expect(await side.find({ key: 'reopen-c' })).toBeDefined()
  await side.press({ key: 'row-b' })
  expect(await side.find({ key: 'cancel-b' })).toBeDefined()
  expect(await side.find({ key: 'qa-cancel-b' })).toBeUndefined()
  expect(await side.find({ key: 'qa-run-b' })).toBeUndefined()
  await side.unmount()
})

test('pressing the quick cancel cancels the task', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.clock(on, { now: 1000 })
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($)

  await $.ui.focus({ component: 'Pane', requestId: 'checklist', element: 'row-b', origin: person })
  await ui.press({ key: 'qa-cancel-b' })
  expect(await ui.find({ key: 'qa-cancel-b' })).toBeUndefined()
  expect(await ui.find({ key: 'qa-run-b' })).toBeUndefined()
  await ui.unmount()
})

test('the narrow questions pane has a/e/d on the quick line and shows no options or box before Answer', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.clock(on, { now: 1000 })
  mock.store(on, {
    questions: [
      ask('q1', 'Which environment should the plan use?', { kind: 'single', options: ['staging', 'production'] }),
      ask('q2', 'Which checks should run before the release?', { kind: 'multi', options: ['unit', 'e2e'] }),
      ask('q3', 'Should the legal review happen before the launch?'),
    ],
  })

  const ui = await mountQuestions($)

  for (const id of ['q1', 'q2', 'q3']) {
    await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: `row-${id}#0`, origin: person })
    expect(await ui.find({ key: `qa-answer-${id}#0` })).toBeDefined()
    expect(await ui.find({ key: `qa-explain-${id}#0` })).toBeDefined()
    expect(await ui.find({ key: `qa-dismiss-${id}#0` })).toBeDefined()
    // The detail does not repeat them, and nothing to answer with exists yet.
    expect(await ui.find({ key: `answer-${id}#0` })).toBeUndefined()
    expect(await ui.find({ key: `explain-${id}#0` })).toBeUndefined()
    expect(await ui.find({ key: `dismiss-${id}#0` })).toBeUndefined()
    expect(await ui.find({ key: `reply-${id}#0` })).toBeUndefined()
  }

  expect(await ui.find({ key: 'pick-q1#0-staging' })).toBeUndefined()
  expect(await ui.find({ key: 'tick-q2#0-unit' })).toBeUndefined()
  // No separate panel: the selected row carries the whole text, and the meta line sits under it.
  expect(await ui.find({ type: 'Text', text: /Should the legal review happen before the launch\?/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /ago|now|asked/ })).toBeDefined()
  await ui.unmount()
})

test('Answer reveals the options of a single choice, a multiple choice and the box of a free-text question', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.clock(on, { now: 1000 })
  mock.store(on, {
    questions: [
      ask('q1', 'Which environment should the plan use?', { kind: 'single', options: ['staging', 'production'] }),
      ask('q2', 'Which checks should run before the release?', { kind: 'multi', options: ['unit', 'e2e'] }),
      ask('q3', 'Should the legal review happen before the launch?'),
    ],
  })

  const ui = await mountQuestions($)

  await ui.press({ key: 'qa-answer-q1#0' })
  expect(await ui.find({ key: 'pick-q1#0-staging' })).toBeDefined()
  expect(await ui.find({ key: 'other-q1#0' })).toBeDefined()
  expect(await ui.find({ key: 'reply-q1#0' })).toBeUndefined()
  // Answer again hides it.
  await ui.press({ key: 'qa-answer-q1#0' })
  expect(await ui.find({ key: 'pick-q1#0-staging' })).toBeUndefined()

  await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: 'row-q2#0', origin: person })
  await ui.press({ key: 'qa-answer-q2#0' })
  expect(await ui.find({ key: 'tick-q2#0-unit', text: /☐ unit/ })).toBeDefined()
  expect(await ui.find({ key: 'send-q2#0' })).toBeDefined()
  await ui.press({ key: 'tick-q2#0-unit' })
  expect(await ui.find({ key: 'tick-q2#0-unit', text: /☑ unit/ })).toBeDefined()
  expect(await ui.find({ key: 'send-q2#0', text: /Send \(1\)/ })).toBeDefined()

  await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: 'row-q3#0', origin: person })
  expect(await ui.find({ key: 'reply-q3#0' })).toBeUndefined()
  await ui.press({ key: 'qa-answer-q3#0' })
  expect(await ui.find({ key: 'reply-q3#0' })).toBeDefined()
  expect(await ui.find({ key: 'other-q3#0' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Answer · type it/ })).toBeDefined()
  await ui.press({ key: 'reply-q3#0-cancel' })
  expect(await ui.find({ key: 'reply-q3#0' })).toBeUndefined()
  await ui.unmount()
})

test('Other switches the revealed options to the text box', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [ask('q1', 'Which environment should the plan use?', { kind: 'single', options: ['staging', 'production'] })] })

  const ui = await mountQuestions($)

  await ui.press({ key: 'qa-answer-q1#0' })
  await ui.press({ key: 'other-q1#0' })
  expect(await ui.find({ key: 'reply-q1#0' })).toBeDefined()
  expect(await ui.find({ key: 'pick-q1#0-staging' })).toBeUndefined()
  await ui.unmount()
})

test('a revealed option sends the answer and a quick dismiss closes the question', async ($, on) => {
  on('prompt.submit', async () => ({ text: 'sent' }))
  on('ui.status', async () => ({ value: undefined }))
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.clock(on, { now: 1000 })
  mock.store(on, {
    questions: [
      ask('q1', 'Which environment should the plan use?', { kind: 'single', options: ['staging', 'production'] }),
      ask('q2', 'Should the legal review happen before the launch?'),
    ],
  })

  const ui = await mountQuestions($)

  await ui.press({ key: 'qa-answer-q1#0' })
  await ui.press({ key: 'pick-q1#0-staging' })
  expect(await ui.find({ key: 'row-q1#0' })).toBeUndefined()
  expect(await ui.find({ key: 'qa-dismiss-q2#0' })).toBeDefined()
  await ui.press({ key: 'qa-dismiss-q2#0' })
  expect(await ui.find({ key: 'row-q2#0' })).toBeUndefined()
  await ui.unmount()
})

test('the wide questions pane reveals the options on its own Answer key and never repeats a key', async ($, on) => {
  on('prompt.submit', async () => ({ text: 'sent' }))
  on('ui.status', async () => ({ value: undefined }))
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [ask('q1', 'Which environment should the plan use?', { kind: 'single', options: ['staging', 'production'] })] })

  const side = await $.ui.mount({ plugin: 'session-management', surface: 'terminal', component: 'Pane', requestId: 'open-questions', props: wide })

  expect(await side.find({ key: 'pick-q1#0-staging' })).toBeUndefined()
  await side.press({ key: 'answer-q1#0' })
  expect(await side.find({ key: 'pick-q1#0-staging' })).toBeDefined()
  // Still one of each: a/e/d are drawn once, with the options revealed.
  expect(await side.find({ key: 'answer-q1#0' })).toBeDefined()
  expect(await side.find({ key: 'qa-answer-q1#0' })).toBeUndefined()
  await side.press({ key: 'pick-q1#0-production' })
  expect(await side.find({ key: 'row-q1#0' })).toBeUndefined()
  await side.unmount()
})

test('the answer area stays open on a revealed option and closes on another part\'s row', async ($, on) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  mock.clock(on, { now: 1000 })
  mock.store(on, {
    questions: [
      ask('q1', 'Which environment should the plan use?', { kind: 'single', options: ['staging', 'production'] }),
      ask('q2', 'Should the legal review happen before the launch?'),
    ],
  })

  const ui = await mountQuestions($)
  const focus = (element: string) => $.ui.focus({ component: 'Pane', requestId: 'open-questions', element, origin: person })

  await ui.press({ key: 'qa-answer-q1#0' })
  await focus('pick-q1#0-production')
  expect(await ui.find({ key: 'pick-q1#0-staging' })).toBeDefined()
  await focus('other-q1#0')
  expect(await ui.find({ key: 'pick-q1#0-staging' })).toBeDefined()
  await focus('row-q2#0')
  expect(await ui.find({ key: 'pick-q1#0-staging' })).toBeUndefined()
  await ui.unmount()
})

const topics = [
  ask('q1', 'Which environment should the plan use?', { kind: 'single', options: ['staging', 'production'] }),
  ask('q2', 'Should the legal review happen before the launch?'),
  ask('q3', 'Is the rollout date fixed?'),
]

test('the narrow questions list has one stop per row and the selected card holds its actions', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: topics })

  const ui = await mountQuestions($)
  const keys = (await stops(ui)).map(one => String(one.props?.key))

  expect(keys).toEqual(['row-q1#0', 'qa-answer-q1#0', 'qa-explain-q1#0', 'qa-dismiss-q1#0', 'row-q2#0', 'row-q3#0'])
  await ui.unmount()
})

test('the actions line targets the selected part and follows the selection', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: topics })

  const ui = await mountQuestions($)

  await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: 'row-q2#0', origin: person })
  expect(await ui.find({ key: 'qa-answer-q2#0' })).toBeDefined()
  expect(await ui.find({ key: 'qa-explain-q2#0' })).toBeDefined()
  expect(await ui.find({ key: 'qa-dismiss-q2#0' })).toBeDefined()
  expect(await ui.find({ key: 'qa-answer-q1#0' })).toBeUndefined()
  await ui.unmount()
})

test('the three actions are drawn side by side on one row inside the selected card, at 38 columns', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: topics })

  const ui = await mountQuestions($, { bodyColumns: 38 })
  const card = cardsOf(await ui.drawn())[0] as Drawn
  const row = parentOf(card, 'qa-answer-q1#0') as Drawn

  expect(row.type).toBe('Box')
  expect(row.props?.flexDirection).not.toBe('column')
  expect(row.props?.gap).toBe(1)
  expect((row.children as Drawn[]).map(child => child.props?.key)).toEqual(['qa-answer-q1#0', 'qa-explain-q1#0', 'qa-dismiss-q1#0'])
  // The roomy card puts a blank row above the actions: it is margin, not part of the row.
  expect(heightOf(row, 36) - (row.props?.marginTop ?? 0)).toBe(1)
  await ui.unmount()
})

test('the wide questions pane draws no actions line under the list', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: topics })

  const ui = await mountQuestions($, { bodyColumns: 100 })

  expect(await ui.find({ key: 'qa-answer-q1#0' })).toBeUndefined()
  expect(await ui.find({ key: 'answer-q1#0' })).toBeDefined()
  await ui.unmount()
})

test('Enter on a row still opens the answer area', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: topics })

  const ui = await mountQuestions($)

  await ui.press({ key: 'row-q1#0' })
  expect(await ui.find({ key: 'pick-q1#0-staging' })).toBeDefined()
  await ui.unmount()
})

// ---- Regression tests for the UI layer review ----

type Drawn = { type: string; props?: Record<string, any>; children?: unknown[] }

const walkTree = (node: unknown, visit: (one: Drawn) => void): void => {
  if (node && typeof node === 'object') {
    visit(node as Drawn)
    for (const child of (node as Drawn).children ?? []) {
      walkTree(child, visit)
    }
  }
}

const stops = async (ui: any): Promise<Drawn[]> => {
  const found: Drawn[] = []
  walkTree(await ui.drawn(), one => {
    if (one.type === 'Button' || one.type === 'Input') {
      found.push(one)
    }
  })

  return found
}

const duplicates = (values: string[]): string[] => values.filter((value, at) => values.indexOf(value) !== at)

const textOf = (node: unknown): string =>
  typeof node === 'string' ? node : ((node as Drawn).children ?? []).map(textOf).join('')

const linesOf = (text: string, width: number): number =>
  text.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / Math.max(1, width))), 0)

// A small layout model of the terminal: enough to tell how many rows a drawn tree takes.
const naturalWidth = (node: unknown): number => {
  const one = node as Drawn

  if (typeof node === 'string') {
    return node.length
  }

  if (one.type === 'Button') {
    return String(one.props?.label ?? '').length + 2
  }

  if (one.type === 'Input') {
    return 12
  }

  if (one.type === 'Text') {
    return textOf(one).length
  }

  const parts = (one.children ?? []).map(naturalWidth)
  const gap = one.props?.gap ?? 0

  return one.props?.flexDirection === 'column' ? Math.max(0, ...parts) : parts.reduce((sum, width) => sum + width, 0) + gap * Math.max(0, parts.length - 1)
}

const heightOf = (node: unknown, width: number): number => {
  const one = node as Drawn

  if (typeof node === 'string') {
    return linesOf(node, width)
  }

  if (one.type === 'Button' || one.type === 'Input') {
    return 1
  }

  if (one.type === 'Text') {
    const wrap = one.props?.wrap

    return typeof wrap === 'string' && wrap.startsWith('truncate') ? 1 : linesOf(textOf(one), width)
  }

  const props = one.props ?? {}
  // A border takes a column on each side and a row above and below.
  const border = props.borderStyle ? 1 : 0
  const inner = (props.width ?? width) - (props.paddingX ?? 0) * 2 - (props.paddingLeft ?? 0) - border * 2
  const margin = (props.marginTop ?? 0) + border * 2
  const children = one.children ?? []

  if (props.flexDirection === 'column') {
    return margin + children.reduce<number>((sum, child) => sum + heightOf(child, inner), 0)
  }

  if (props.flexWrap === 'wrap') {
    let rows = 1
    let used = 0

    for (const child of children) {
      const need = naturalWidth(child)

      if (used > 0 && used + need > inner) {
        rows += 1
        used = 0
      }

      used += need + (props.gap ?? 0)
    }

    return margin + rows
  }

  // A row: what does not grow keeps its width, the growing ones share the rest.
  const fixed = children.filter(child => typeof child === 'string' || !(child as Drawn).props?.flexGrow)
  const grow = children.length - fixed.length
  const left = Math.max(1, inner - fixed.reduce<number>((sum, child) => sum + naturalWidth(child), 0))

  return margin + Math.max(1, ...children.map(child => (typeof child !== 'string' && (child as Drawn).props?.flexGrow ? heightOf(child, Math.floor(left / grow)) : heightOf(child, naturalWidth(child) > 0 ? Math.min(inner, naturalWidth(child)) : inner))))
}

const rowsOf = async (ui: any, columns: number): Promise<number> => heightOf(await ui.drawn(), columns)

const manyTasks = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `t${index}`, text: `Task number ${index}`, status: 'todo' }))

// A store the test can change behind the pane's back, as a tool or a command does.
const liveStore = (on: any, data: Record<string, unknown>) => {
  on('store.get', async (_: unknown, e: { key: string }) => ({ value: data[e.key] }))
  on('store.set', async (_: unknown, e: { key: string; value: unknown }) => {
    data[e.key] = e.value

    return { value: undefined }
  })
  on('store.delete', async (_: unknown, e: { key: string }) => {
    delete data[e.key]

    return { value: undefined }
  })
  on('store.keys', async () => ({ value: Object.keys(data) }))
}

const session = (on: any) => {
  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.focus', async () => ({}))
  on('ui.status', async () => ({ value: undefined }))
}

test('no two stops of a drawn checklist share a key, in any state or layout', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  // A short description, so the narrow pane still opens the in-pane field.
  mock.store(on, { 'checklist:5000': tasks.map(one => (one.detail ? { ...one, detail: 'After tests' } : one)) })

  for (const extra of [{}, { bodyColumns: 110 }]) {
    const ui = await mountChecklist($, extra)

    expect(duplicates((await stops(ui)).map(one => one.props?.key))).toEqual([])
    await ui.press({ key: 'row-b' })
    expect(duplicates((await stops(ui)).map(one => one.props?.key))).toEqual([])
    expect(duplicates((await stops(ui)).map(one => one.props?.hotkey).filter(Boolean))).toEqual([])

    await ui.press({ key: 'title-edit-b' })
    expect(duplicates((await stops(ui)).map(one => one.props?.key))).toEqual([])
    await ui.press({ key: 'title-b-cancel' })
    await ui.press({ key: 'notes-edit-b' })
    expect(duplicates((await stops(ui)).map(one => one.props?.key))).toEqual([])
    await ui.press({ key: 'notes-b-cancel' })
    await ui.unmount()
  }
})

test('the description pencil and the description field are different elements, so the field is what takes the keyboard', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($, { bodyColumns: 110 })

  await ui.press({ key: 'row-b' })
  await ui.press({ key: 'notes-edit-b' })
  expect((await ui.find({ key: 'notes-b' }))?.type).toBe('Input')
  expect((await ui.find({ key: 'notes-edit-b' }))?.type).toBe('Button')
  await ui.press({ key: 'notes-b-cancel' })
  await ui.press({ key: 'title-edit-b' })
  expect((await ui.find({ key: 'title-b' }))?.type).toBe('Input')
  await ui.unmount()
})

test('focusing a pencil closes the edit, focusing the field keeps it', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($, { bodyColumns: 110 })
  const focus = (element: string) => $.ui.focus({ component: 'Pane', requestId: 'checklist', element, origin: person })

  await ui.press({ key: 'row-b' })
  await ui.press({ key: 'notes-edit-b' })
  await focus('notes-b')
  expect(await ui.find({ key: 'notes-b' })).toBeDefined()
  await focus('notes-b-cancel')
  expect(await ui.find({ key: 'notes-b' })).toBeDefined()
  await focus('notes-edit-b')
  expect((await ui.find({ key: 'notes-b' }))?.type).not.toBe('Input')
  await ui.unmount()
})

test('the above and below buttons move the selection and the window', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': manyTasks(30) })

  const ui = await mountChecklist($)
  const shownRows = async () => (await stops(ui)).filter(one => String(one.props?.key).startsWith('row-')).map(one => String(one.props?.key))

  const before = await shownRows()

  expect(before[0]).toBe('row-t0')
  expect(await ui.find({ key: 'below' })).toBeDefined()
  await ui.press({ key: 'below' })

  const after = await shownRows()

  expect(after).not.toContain('row-t0')
  expect(after).toContain(`row-t${before.length}`)
  expect(await ui.find({ key: 'qa-run-t' + before.length })).toBeDefined()
  await ui.press({ key: 'above' })

  const back = await shownRows()

  // The row just above the window the button was pressed in is the selected one.
  expect(back).toContain('row-t0')
  expect(await ui.find({ key: `qa-run-t${Number(String(after[0]).slice(5)) - 1}` })).toBeDefined()
  await ui.unmount()
})

test('a selection pointing to a removed task falls back, and removing a task selects its neighbour', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  const entries: Record<string, unknown> = { 'checklist:5000': manyTasks(4) }
  liveStore(on, entries)

  const ui = await mountChecklist($, { bodyColumns: 110 })

  await ui.press({ key: 'row-t2' })
  expect(await ui.find({ key: 'remove-t2' })).toBeDefined()
  await ui.press({ key: 'remove-t2' })
  expect(await ui.find({ key: 'remove-t3' })).toBeDefined()
  await ui.press({ key: 'remove-t3' })
  // The last one went: the previous row is selected, not nothing.
  expect(await ui.find({ key: 'remove-t1' })).toBeDefined()

  // Another path (a tool, a command) removes the selected task behind the pane's back.
  entries['checklist:5000'] = [{ id: 't0', text: 'Task number 0', status: 'todo' }]
  await ui.redraw()
  expect(await ui.find({ key: 'remove-t0' })).toBeDefined()
  expect(await ui.find({ key: 'remove-t1' })).toBeUndefined()
  await ui.unmount()
})

const group = (id: string, texts: string[], choices?: Record<string, { kind: 'single' | 'multi'; options: string[] }>) => ({
  id,
  session: '5000',
  texts,
  ...(choices ? { choices } : {}),
  source: 'text',
  project: '/p',
  at: 1,
  asks: 1,
  isOpen: true,
})

const pair = () =>
  group('q1', ['Which checks should run first?', 'Which checks should run last?'], {
    'Which checks should run first?': { kind: 'multi', options: ['unit', 'e2e'] },
    'Which checks should run last?': { kind: 'multi', options: ['lint', 'types'] },
  })

test('dismissing a part drops its ticks: nothing ticked carries over to the part that takes its place', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [pair()] })

  const ui = await mountQuestions($)

  await ui.press({ key: 'qa-answer-q1#0' })
  await ui.press({ key: 'tick-q1#0-unit' })
  await ui.press({ key: 'qa-dismiss-q1#0' })
  // The second text is now the first part.
  await ui.press({ key: 'qa-answer-q1#0' })
  expect(await ui.find({ key: 'tick-q1#0-lint', text: /☐ lint/ })).toBeDefined()
  expect(await ui.find({ key: 'send-q1#0', text: /^Send$/ })).toBeDefined()
  await ui.unmount()
})

test('a send carries only options the part offers, and a stale press on a reworded part does nothing', async ($, on) => {
  const sent: string[] = []
  on('prompt.submit', async (...args: any[]) => {
    sent.push(String(args.find(one => one && typeof one === 'object' && 'text' in one)?.text))

    return { text: 'sent' }
  })
  session(on)
  mock.clock(on, { now: 1000 })
  const entries: Record<string, unknown> = { questions: [pair()] }
  liveStore(on, entries)

  const ui = await mountQuestions($)

  await ui.press({ key: 'qa-answer-q1#0' })
  await ui.press({ key: 'tick-q1#0-unit' })
  // The part is reworded elsewhere while its area is open: the area goes, a late press is refused.
  entries.questions = [group('q1', ['Which checks must pass first of all?', 'Which checks should run last?'], { 'Which checks must pass first of all?': { kind: 'multi', options: ['smoke'] }, 'Which checks should run last?': { kind: 'multi', options: ['lint', 'types'] } })]
  await ui.redraw()
  expect(await ui.find({ key: 'tick-q1#0-unit' })).toBeUndefined()
  expect(await ui.find({ key: 'tick-q1#0-smoke' })).toBeUndefined()
  expect(sent).toEqual([])
  await ui.unmount()
})

test('answering the last part of a group selects the neighbour, not the top', async ($, on) => {
  on('prompt.submit', async () => ({ text: 'sent' }))
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [ask('q1', 'Which environment should the plan use?'), ask('q2', 'Should the legal review happen before the launch?'), ask('q3', 'Is the rollout date fixed for next week?')] })

  const ui = await mountQuestions($)

  await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: 'row-q2#0', origin: person })
  await ui.press({ key: 'qa-dismiss-q2#0' })
  expect(await ui.find({ key: 'qa-answer-q3#0' })).toBeDefined()
  expect(await ui.find({ key: 'qa-answer-q1#0' })).toBeUndefined()
  await ui.press({ key: 'qa-dismiss-q3#0' })
  expect(await ui.find({ key: 'qa-answer-q1#0' })).toBeDefined()
  await ui.unmount()
})

test('a text field closes when another one opens: the title, the description and the answer never share a draft', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($, { bodyColumns: 110 })

  await ui.press({ key: 'row-b' })
  await ui.press({ key: 'title-edit-b' })
  await ui.press({ key: 'notes-edit-b' })
  expect(await ui.find({ type: 'Text', text: /Editing the title/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Editing the description/ })).toBeDefined()
  await ui.press({ key: 'title-edit-b' })
  expect(await ui.find({ type: 'Text', text: /Editing the description/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Editing the title/ })).toBeDefined()
  await ui.unmount()
})

const longQuestion = (id: string, size: number) => ask(id, `${'Should we really go ahead with the rollout plan '.repeat(size)}tomorrow?`, { kind: 'multi', options: ['staging first', 'production right away', 'neither of the two'] })

const checklistFocus = ($: any, element: string) => $.ui.focus({ component: 'Pane', requestId: 'checklist', element, origin: person })

const parentOf = (tree: unknown, key: string): Drawn | undefined => {
  let found: Drawn | undefined

  walkTree(tree, one => {
    if ((one.children ?? []).some(child => (child as Drawn)?.props?.key === key)) {
      found = one
    }
  })

  return found
}

test('the checklist header shows the title and the counts, with a gauge and a percentage under it', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($)
  const header = parentOf(await ui.drawn(), 'nothing') ?? undefined
  let row: Drawn | undefined

  walkTree(await ui.drawn(), one => {
    if (one.type === 'Box' && one.props?.justifyContent === 'space-between' && textOf(one).startsWith('Checklist')) {
      row = one
    }
  })

  expect(header).toBeUndefined()
  expect(textOf(row)).toBe('Checklist1/3 · 1 doing')
  expect(await ui.find({ type: 'Text', text: /^▰+$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^▱+$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^33%$/ })).toBeDefined()
  await ui.unmount()
})

test('the selected task is a round card in the colour of its status; the other rows have no border', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($)
  const cards = cardsOf(await ui.drawn())

  expect(cards).toHaveLength(1)
  expect(cards[0]?.props?.borderStyle).toBe('round')
  expect(cards[0]?.props?.borderColor).toBe('claude')
  expect(cards[0]?.props?.borderDimColor).toBe(false)
  expect(hasKey(cards[0] as Drawn, 'row-a')).toBe(true)
  expect(hasKey(cards[0] as Drawn, 'row-b')).toBe(false)
  expect(hasKey(cards[0] as Drawn, 'row-c')).toBe(false)

  await checklistFocus($, 'row-b')
  expect(cardsOf(await ui.drawn())[0]?.props?.borderColor).toBe('suggestion')
  expect(textOf(cardsOf(await ui.drawn())[0])).not.toContain('description')
  await checklistFocus($, 'row-c')
  expect(cardsOf(await ui.drawn())[0]?.props?.borderColor).toBe('success')
  await ui.unmount()
})

test('an unfocused checklist pane draws its card border dim', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($, { isFocused: false })

  expect(cardsOf(await ui.drawn())[0]?.props?.borderDimColor).toBe(true)
  await ui.unmount()
})

test('a blocked task is a card in the attention colour with its waiting chip', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { 'checklist:5000': blockedTasks, questions: [openQuestion(true)] })

  const ui = await mountChecklist($)

  await checklistFocus($, 'row-b')

  const card = cardsOf(await ui.drawn())[0] as Drawn

  expect(card.props?.borderColor).toBe('warning')
  expect(textOf(card)).toContain('◌ waits for 2')
  await ui.unmount()
})

test('between two rows of the narrow list there is no other stop, but the selected card\'s actions', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($)
  const keys = async () => (await stops(ui)).map(one => String(one.props?.key))

  expect(await keys()).toEqual(['row-a', 'qa-detail-a', 'qa-cancel-a', 'row-b', 'row-c', 'add'])

  // The actions follow the selection, which follows the focus.
  await checklistFocus($, 'row-b')
  expect(await keys()).toEqual(['row-a', 'row-b', 'qa-detail-b', 'qa-run-b', 'qa-cancel-b', 'row-c', 'add'])
  await checklistFocus($, 'row-c')
  expect(await keys()).toEqual(['row-a', 'row-b', 'row-c', 'qa-detail-c', 'add'])
  await ui.unmount()
})

test('the narrow actions of a task sit side by side on one row inside the card, at 38 columns', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($, { bodyColumns: 38 })
  const order = async (id: string) => {
    await checklistFocus($, `row-${id}`)

    const card = cardsOf(await ui.drawn())[0] as Drawn
    const row = parentOf(card, `qa-detail-${id}`) as Drawn

    expect(row.type).toBe('Box')
    expect(row.props?.flexDirection).not.toBe('column')
    expect(row.props?.gap).toBe(1)
    // The roomy card puts a blank row above the actions: it is margin, not part of the row.
    expect(heightOf(row, 36) - (row.props?.marginTop ?? 0)).toBe(1)

    return (row.children as Drawn[]).filter(Boolean).map(child => child.props?.key)
  }

  expect(await order('a')).toEqual(['qa-detail-a', 'qa-cancel-a'])
  expect(await order('b')).toEqual(['qa-detail-b', 'qa-run-b', 'qa-cancel-b'])
  expect(await order('c')).toEqual(['qa-detail-c'])
  await ui.unmount()
})

test('the checklist Detail action opens the task screen', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($)

  await checklistFocus($, 'row-b')
  await ui.press({ key: 'qa-detail-b' })
  expect(await ui.find({ key: 'qa-detail-b' })).toBeUndefined()
  expect(await ui.find({ key: 'cancel-b' })).toBeDefined()
  await ui.unmount()
})

test('the checklist tree stays inside the pane rows with a long, high-priority, noted selected task', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': [{ id: 'long', text: 'Rewrite the whole onboarding flow so that every step explains itself '.repeat(3), status: 'todo', priority: 'high', detail: 'notes' }, ...manyTasks(30)] })

  for (const bodyRows of [12, 16, 24, 40]) {
    const ui = await mountChecklist($, { scroll: { offset: 0, bodyRows } })

    await checklistFocus($, 'row-long')
    expect(await rowsOf(ui, 38)).toBeLessThanOrEqual(bodyRows)
    await ui.unmount()
  }
})

test('the checklist tree stays inside the pane rows, whatever its size', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': [...manyTasks(40), { id: 'd1', text: 'Done one', status: 'done' }, { id: 'd2', text: 'Done two', status: 'done' }] })

  for (const bodyRows of [12, 16, 24, 40]) {
    for (const columns of [38, 60]) {
      const ui = await mountChecklist($, { bodyColumns: columns, scroll: { offset: 0, bodyRows } })

      expect(await rowsOf(ui, columns)).toBeLessThanOrEqual(bodyRows)
      if (await ui.find({ key: 'below' })) {
        await ui.press({ key: 'below' })
        expect(await rowsOf(ui, columns)).toBeLessThanOrEqual(bodyRows)
      }

      await ui.unmount()
    }
  }
})

test('the questions tree stays inside the pane rows when the selected row expands and while it is answered', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [longQuestion('q1', 3), ask('q2', 'Short one here?'), ...Array.from({ length: 12 }, (_, index) => ask(`z${index}`, `Another question number ${index} to fill the list?`)), longQuestion('q3', 1)] })

  for (const bodyRows of [20, 24, 40]) {
    const ui = await mountQuestions($, { scroll: { offset: 0, bodyRows } })

    expect(await rowsOf(ui, 38)).toBeLessThanOrEqual(bodyRows)
    await ui.press({ key: 'qa-answer-q1#0' })
    expect(await rowsOf(ui, 38)).toBeLessThanOrEqual(bodyRows)
    await ui.press({ key: 'other-q1#0' })
    expect(await rowsOf(ui, 38)).toBeLessThanOrEqual(bodyRows)
    // The state outlives the instance: close the area for the next size.
    await ui.press({ key: 'reply-q1#0-cancel' })
    await ui.unmount()
  }
})

const cardsOf = (tree: unknown): Drawn[] => {
  const found: Drawn[] = []

  walkTree(tree, one => {
    if (one.type === 'Box' && one.props?.borderStyle) {
      found.push(one)
    }
  })

  return found
}

const hasKey = (node: Drawn, key: string): boolean => {
  let found = false

  walkTree(node, one => {
    found = found || one.props?.key === key
  })

  return found
}

test('the questions header shows the title on the left and the count on the right', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [ask('q1', 'Which environment should the plan use?'), ask('q2', 'Is the rollout date fixed for next week?')] })

  const ui = await mountQuestions($)
  const header = (await ui.find({ type: 'Text', text: /Open questions/ })) as any

  expect(header).toBeDefined()
  expect(await ui.find({ type: 'Box', props: { justifyContent: 'space-between' } })).toBeDefined()
  expect(textOf(await ui.drawn())).toMatch(/Open questions\s*2/)
  await ui.unmount()
})

test('the selected question is a round card in the attention colour; the other rows have no border', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [ask('q1', 'Which environment should the plan use?'), ask('q2', 'Is the rollout date fixed for next week?')] })

  const ui = await mountQuestions($)
  const cards = cardsOf(await ui.drawn())

  expect(cards).toHaveLength(1)
  expect(cards[0]?.props?.borderStyle).toBe('round')
  expect(cards[0]?.props?.borderColor).toBe('warning')
  expect(cards[0]?.props?.borderDimColor).toBe(false)
  expect(hasKey(cards[0] as Drawn, 'row-q1#0')).toBe(true)
  expect(hasKey(cards[0] as Drawn, 'qa-answer-q1#0')).toBe(true)
  expect(hasKey(cards[0] as Drawn, 'row-q2#0')).toBe(false)
  await ui.unmount()
})

test('an unfocused questions pane draws its card border dim', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [ask('q1', 'Which environment should the plan use?')] })

  const ui = await mountQuestions($, { isFocused: false })

  expect(cardsOf(await ui.drawn())[0]?.props?.borderDimColor).toBe(true)
  await ui.unmount()
})

test('answering reveals the options inside the selected card', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [ask('q1', 'Which environment should the plan use?', { kind: 'single', options: ['staging', 'production'] })] })

  const ui = await mountQuestions($)

  expect(hasKey(cardsOf(await ui.drawn())[0] as Drawn, 'pick-q1#0-staging')).toBe(false)
  await ui.press({ key: 'qa-answer-q1#0' })

  const card = cardsOf(await ui.drawn())[0] as Drawn

  expect(hasKey(card, 'pick-q1#0-staging')).toBe(true)
  expect(hasKey(card, 'pick-q1#0-production')).toBe(true)
  await ui.press({ key: 'qa-answer-q1#0' })
  await ui.unmount()
})

test('the wide questions pane draws the detail as a card and marks the selected row', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [ask('q1', 'Which environment should the plan use?'), ask('q2', 'Is the rollout date fixed for next week?')] })

  const ui = await mountQuestions($, { bodyColumns: 100 })
  const cards = cardsOf(await ui.drawn())

  expect(cards).toHaveLength(1)
  expect(cards[0]?.props?.borderColor).toBe('warning')
  expect(hasKey(cards[0] as Drawn, 'answer-q1#0')).toBe(true)
  expect(hasKey(cards[0] as Drawn, 'row-q1#0')).toBe(false)
  await ui.unmount()
})

test('Up from the selected question reaches the previous row, not the paging line', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: Array.from({ length: 15 }, (_, index) => ask(`z${index}`, `Question number ${index} to answer today?`)) })

  const ui = await mountQuestions($, { scroll: { offset: 0, bodyRows: 24 } })

  await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: 'row-z7#0', origin: person })
  expect(await ui.find({ key: 'row-z6#0' })).toBeDefined()
  expect(await ui.find({ key: 'row-z8#0' })).toBeDefined()
  await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: 'row-z14#0', origin: person })
  expect(await ui.find({ key: 'row-z13#0' })).toBeDefined()
  await ui.unmount()
})

test('the meta line names the part, and the hint only promises Enter where it opens the task', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [pair()], 'checklist:5000': tasks })

  const questionsPane = await mountQuestions($)

  await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: 'row-q1#1', origin: person })
  expect(await questionsPane.find({ type: 'Text', text: /2 of 2 asked together/ })).toBeDefined()
  expect(await questionsPane.find({ type: 'Text', text: /1 of 2 asked together/ })).toBeUndefined()
  await questionsPane.unmount()

  const narrow = await mountChecklist($)

  expect(await narrow.find({ type: 'Text', text: /⏎ open/ })).toBeDefined()
  await narrow.unmount()

  const side = await mountChecklist($, { bodyColumns: 110 })

  expect(await side.find({ type: 'Text', text: /⏎ open/ })).toBeUndefined()
  await side.unmount()
})

test('options with the same wording are one option, so no key repeats', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [ask('q1', 'Which environment should the plan use?', { kind: 'single', options: ['staging', 'staging', 'production'] })] })

  const ui = await mountQuestions($)

  await ui.press({ key: 'qa-answer-q1#0' })
  expect(duplicates((await stops(ui)).map(one => one.props?.key))).toEqual([])
  expect(duplicates((await stops(ui)).map(one => one.props?.hotkey).filter(Boolean))).toEqual([])
  await ui.unmount()
})

test('no two stops of a drawn questions pane share a key, answering or not', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [pair(), ask('q2', 'Should the legal review happen before the launch?')] })

  for (const extra of [{}, { bodyColumns: 110 }]) {
    const ui = await mountQuestions($, extra)
    const answer = extra && 'bodyColumns' in extra ? 'answer-q1#0' : 'qa-answer-q1#0'

    expect(duplicates((await stops(ui)).map(one => one.props?.key))).toEqual([])
    await ui.press({ key: answer })
    expect(duplicates((await stops(ui)).map(one => one.props?.key))).toEqual([])
    expect(duplicates((await stops(ui)).map(one => one.props?.hotkey).filter(Boolean))).toEqual([])
    await ui.unmount()
  }
})

test('an edit left open when the pane lost focus is dropped when the ring comes back to its field', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($)

  await ui.press({ key: 'row-a' })
  await ui.press({ key: 'notes-edit-a' })
  await ui.redraw({ ...props, isFocused: false })
  expect(await ui.find({ key: 'notes-a' })).toBeUndefined()
  await ui.redraw(props)
  // The old edit is drawn again with the focus, and its field takes the ring.
  expect(await ui.find({ key: 'notes-a' })).toBeDefined()
  await $.ui.focus({ component: 'Pane', requestId: 'checklist', element: 'notes-a', origin: { kind: 'plugin', name: 'session-management' } })
  expect(await ui.find({ key: 'notes-a' })).toBeUndefined()
  await ui.unmount()
})

test('a stale open answer area is dropped the same way', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [ask('q1', 'Should the legal review happen before the launch?')] })

  const ui = await mountQuestions($)

  await ui.press({ key: 'qa-answer-q1#0' })
  await ui.redraw({ ...props, isFocused: false })
  await ui.redraw(props)
  expect(await ui.find({ key: 'reply-q1#0' })).toBeDefined()
  await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: 'reply-q1#0', origin: { kind: 'plugin', name: 'session-management' } })
  expect(await ui.find({ key: 'reply-q1#0' })).toBeUndefined()
  await ui.unmount()
})

test('closing a task screen with no selection returns the ring to the first row, not to row-null', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': [{ id: 'a', text: 'Old chore', status: 'done' }, { id: 'b', text: 'Next chore', status: 'todo' }] })

  const ui = await mountChecklist($)

  await ui.press({ key: 'row-a' })
  await ui.press({ key: 'back' })
  expect(await ui.find({ key: 'row-b' })).toBeDefined()
  await ui.unmount()
})

test('a task screen left open before the pane grew wide does not hide the list', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': tasks })

  const narrow = await mountChecklist($)

  await narrow.press({ key: 'row-b' })
  expect(await narrow.find({ key: 'back' })).toBeDefined()
  await narrow.unmount()

  const side = await mountChecklist($, { bodyColumns: 110 })

  expect(await side.find({ key: 'row-a' })).toBeDefined()
  expect(await side.find({ key: 'row-c' })).toBeDefined()
  await side.unmount()
})

test('adding a task keeps the same field and empties it', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { 'checklist:5000': tasks })

  const ui = await mountChecklist($)

  await ui.input({ key: 'add', text: 'half', kind: 'change' })
  expect((await ui.find({ key: 'add' }))?.props.value).toBe('half')
  await ui.input({ key: 'add', text: 'Brand new task' })
  expect(await ui.find({ type: 'Text', text: /Brand new task/ })).toBeDefined()
  expect((await ui.find({ key: 'add' }))?.props.value).toBe('')
  await ui.unmount()
})

// ---- Layout: fixed pieces never shrink, only the title gives way ----

const allOf = (tree: unknown, test: (one: Drawn) => boolean): Drawn[] => {
  const found: Drawn[] = []

  walkTree(tree, one => {
    if (test(one)) {
      found.push(one)
    }
  })

  return found
}

const parentNode = (tree: unknown, target: unknown): Drawn | undefined => allOf(tree, one => (one.children ?? []).includes(target))[0]

const boxes = (row: Drawn): Drawn[] => (row.children ?? []).filter(child => typeof child !== 'string') as Drawn[]

// The harness draws the tree but does not compute the engine's layout, so these assert the props that
// make the layout deterministic: every fixed piece is a flexShrink 0 box and the spacer is a margin.
test('every unselected checklist row has the same structure, with or without a description', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  const long = 'Rewrite the whole onboarding flow so that every step explains itself'
  mock.store(on, {
    'checklist:5000': [
      { id: 'sel', text: 'The one in progress', status: 'doing' },
      { id: 'n1', text: long, status: 'todo', detail: 'with notes' },
      { id: 'n2', text: long, status: 'todo' },
      { id: 'n3', text: 'Short', status: 'todo', detail: 'with notes' },
      { id: 'n4', text: long, status: 'todo', priority: 'high', detail: 'with notes' },
      { id: 'n5', text: long, status: 'done' },
    ],
  })

  const ui = await mountChecklist($)
  const tree = await ui.drawn()

  for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) {
    const button = allOf(tree, one => one.props?.key === `row-${id}`)[0] as Drawn
    const wrapper = parentNode(tree, button) as Drawn
    const row = parentNode(tree, wrapper) as Drawn
    const parts = boxes(row)
    const title = parts.find(one => one.props?.flexGrow === 1) as Drawn

    expect(wrapper.props?.flexShrink).toBe(0)
    // The spacer is the title's margin: no standalone space between the button and the title.
    expect(title.props?.marginLeft).toBe(1)
    expect(parts.some(one => one.type === 'Text' && textOf(one).trim() === '')).toBe(false)
    // Everything but the title is a non-shrinking box.
    for (const one of parts.filter(part => part !== title)) {
      expect(one.type).toBe('Box')
      expect(one.props?.flexShrink).toBe(0)
    }

    const marker = parts.filter(one => textOf(one) === '≡')
    const hasNotes = id === 'n1' || id === 'n3' || id === 'n4'

    expect(marker).toHaveLength(hasNotes ? 1 : 0)
    expect(parts.filter(one => textOf(one) === '!')).toHaveLength(id === 'n4' ? 1 : 0)
  }

  await ui.unmount()
})

test('every questions row has the same structure, with or without a group chip', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  const long = 'Which environment should the plan use when the rollout starts next week?'
  mock.store(on, { questions: [ask('q1', 'Selected one here?'), ask('q2', long), { ...ask('q3', long), texts: [long, 'And the second thing asked together?'] }] })

  const ui = await mountQuestions($)
  const tree = await ui.drawn()

  for (const key of ['row-q2#0', 'row-q3#0', 'row-q3#1']) {
    const button = allOf(tree, one => one.props?.key === key)[0] as Drawn
    const wrapper = parentNode(tree, button) as Drawn
    const row = parentNode(tree, wrapper) as Drawn
    const parts = boxes(row)
    const title = parts.find(one => one.props?.flexGrow === 1) as Drawn

    expect(wrapper.props?.flexShrink).toBe(0)
    expect(title.props?.marginLeft).toBe(1)
    expect(parts.some(one => one.type === 'Text' && textOf(one).trim() === '')).toBe(false)
    expect(textOf(row)).not.toContain('?  ')
    for (const one of parts.filter(part => part !== title)) {
      expect(one.type).toBe('Box')
      expect(one.props?.flexShrink).toBe(0)
    }

    expect(parts.filter(one => /^\(\d\/2\)$/.test(textOf(one).trim()))).toHaveLength(key === 'row-q2#0' ? 0 : 1)
    expect(parts.some(one => textOf(one).trim() === '?')).toBe(false)
  }

  await ui.unmount()
})

test('the header, the gauge and the paging lines are non-shrinking boxes', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { 'checklist:5000': manyTasks(30) })

  const ui = await mountChecklist($, { scroll: { offset: 0, bodyRows: 16 } })
  const tree = await ui.drawn()

  for (const key of ['below']) {
    expect(parentNode(tree, allOf(tree, one => one.props?.key === key)[0])?.props?.flexShrink).toBe(0)
  }

  const header = allOf(tree, one => one.props?.justifyContent === 'space-between')[0] as Drawn

  expect(boxes(header).every(one => one.props?.flexShrink === 0)).toBe(true)
  await ui.unmount()
})

// ---- Roomy and compact layouts ----

test('the task screen has a blank row between its sections when the pane has the rows, and none when it is tight', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': tasks })

  for (const [bodyRows, margin] of [[60, 1], [8, 0]] as const) {
    const ui = await mountChecklist($, { scroll: { offset: 0, bodyRows } })

    await ui.press({ key: 'row-a' })

    const tree = await ui.drawn()
    const actions = parentOf(tree, 'cancel-a') as Drawn
    const cards = cardsOf(tree)

    expect(actions.props?.marginTop ?? 0).toBe(margin)
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.every(card => (card.props?.marginTop ?? 0) === margin)).toBe(true)
    await ui.press({ key: 'back' })
    await ui.unmount()
  }
})

test('the narrow selected card has a blank row above its chips and actions only while the list keeps its rows', async ($, on) => {
  session(on)
  mock.store(on, { 'checklist:5000': [{ id: 'a', text: 'Selected task', status: 'doing', priority: 'high' }, ...manyTasks(20)] })

  for (const [bodyRows, margin] of [[40, 1], [12, 0]] as const) {
    const ui = await mountChecklist($, { scroll: { offset: 0, bodyRows } })
    const tree = await ui.drawn()
    const chips = allOf(tree, one => one.props?.paddingLeft === 4 && one.props?.flexWrap === 'wrap')[0]

    expect(await rowsOf(ui, 38)).toBeLessThanOrEqual(bodyRows)
    expect(chips?.props?.marginTop ?? 0).toBe(margin)
    await ui.unmount()
  }
})

const choiceQuestions = [
  ask('q1', 'Which environment should the plan use?', { kind: 'single', options: ['staging', 'production'] }),
  ask('q2', 'Which checks should run before the release?', { kind: 'multi', options: ['unit', 'e2e'] }),
  ask('q3', 'Should the legal review happen before the launch?'),
]

test('the revealed Answer area is a titled sub-card with marked options, narrow and wide', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: choiceQuestions })

  const expectations = [
    { id: 'q1', title: 'Answer · choose one', marker: /^○ staging$/ },
    { id: 'q2', title: 'Answer · choose any', marker: /^☐ unit$/ },
    { id: 'q3', title: 'Answer · type it', marker: undefined },
  ]

  for (const [bodyColumns, prefix] of [[38, 'qa-'], [100, '']] as const) {
    const ui = await mountQuestions($, { bodyColumns, scroll: { offset: 0, bodyRows: 60 } })

    for (const { id, title, marker } of expectations) {
      await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: `row-${id}#0`, origin: person })
      await ui.press({ key: `${prefix}answer-${id}#0` })

      const tree = await ui.drawn()
      const sub = allOf(tree, one => one.props?.borderStyle === 'single')[0] as Drawn
      const round = cardsOf(tree).find(card => card.props?.borderStyle === 'round') as Drawn

      expect(sub).toBeDefined()
      expect(sub.props?.borderColor).toBe('subtle')
      expect(sub.props?.marginTop).toBe(1)
      expect(hasKey(round, `row-${id}#0`) || bodyColumns >= 84).toBe(true)
      // The title is its first line.
      expect(textOf((sub.children as unknown[])[0])).toBe(title)
      expect(allOf(sub, one => one.type === 'Text' && textOf(one) === title)[0]?.props?.bold).toBe(true)

      if (marker) {
        const labels = allOf(sub, one => one.type === 'Button' && /^(pick|tick)-/.test(String(one.props?.key))).map(one => String(one.props?.label))

        expect(labels.some(label => marker.test(label))).toBe(true)
        expect(allOf(sub, one => one.props?.key === `other-${id}#0`)[0]?.props).toMatchObject({ label: 'Other (type your own)', dimColor: true })
      } else {
        expect(hasKey(sub, `reply-${id}#0`)).toBe(true)
      }

      expect(hasKey(sub, `send-${id}#0`)).toBe(id === 'q2')
      await ui.press({ key: `${prefix}answer-${id}#0` })
    }

    await ui.unmount()
  }
})

test('a tight pane draws the Answer area without its frame, and the tree still fits', async ($, on) => {
  session(on)
  mock.clock(on, { now: 1000 })
  mock.store(on, { questions: [longQuestion('q1', 3)] })

  const ui = await mountQuestions($, { scroll: { offset: 0, bodyRows: 20 } })

  await ui.press({ key: 'qa-answer-q1#0' })

  const tree = await ui.drawn()

  expect(allOf(tree, one => one.props?.borderStyle === 'single')).toHaveLength(0)
  expect(await ui.find({ type: 'Text', text: /Answer · choose any/ })).toBeDefined()
  expect(allOf(tree, one => one.props?.key === 'qa-answer-q1#0').length).toBe(1)
  expect(await rowsOf(ui, 38)).toBeLessThanOrEqual(20)
  await ui.press({ key: 'qa-answer-q1#0' })
  await ui.unmount()
})

// Records the pane opens and the toasts. The harness does not hand a plugin's own focus requests to any
// hook, so where the ring goes is not observable here: the state it follows is asserted instead.
const navigation = (on: any) => {
  const opened: Record<string, unknown>[] = []
  const toasts: string[] = []

  on('session.id', async () => ({ value: 'sx' }))
  on('session.usage', async () => ({ value: { startedAt: 5000 } as never }))
  on('ui.status', async () => ({ value: undefined }))
  mock.clock(on, { now: 1000 })
  on('ui.open', async (_$: any, e: any) => {
    opened.push(e)

    return { value: { isPlaced: true } }
  })
  on('ui.focus', async () => ({}))
  on('ui.toast', async (_$: any, e: any) => {
    toasts.push(e.text ?? e.message ?? JSON.stringify(e))

    return { value: undefined }
  })

  return { opened, toasts }
}

const twoAsked = [
  { ...openQuestion(true), id: 'q1', texts: ['Should the legal review happen before the launch?'] },
  { ...openQuestion(true), id: 'q2', texts: ['Which environment should the plan use?', 'And which region?'] },
]
const chained = [
  { id: 'a', text: 'Write the tests for the pane', status: 'doing' },
  { id: 'b', text: 'Ship it', status: 'todo', blockedBy: [{ kind: 'task', id: 'a' }, { kind: 'question', id: 'q2' }] },
]

test('Waiting for names each blocker and offers Go beside its drop button', async ($, on) => {
  navigation(on)
  mock.store(on, { 'checklist:5000': chained, questions: twoAsked })

  const ui = await mountChecklist($)

  await ui.press({ key: 'row-b' })
  expect(await ui.find({ type: 'Text', text: /^task #1 Write the tests for the pane$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^question Which environment should the plan use\? \(\+1\)$/ })).toBeDefined()
  expect(await ui.find({ key: 'go-b-a', text: /Go ›/ })).toBeDefined()
  expect(await ui.find({ key: 'go-b-q2', text: /Go ›/ })).toBeDefined()
  expect(await ui.find({ key: 'unblock-b-a' })).toBeDefined()
  expect(await ui.find({ key: 'unblock-b-q2' })).toBeDefined()
  expect(allOf(await ui.drawn(), one => one.type === 'Button' && String(one.props?.key).startsWith('go-')).every(one => one.props?.hotkey === undefined)).toBe(true)
  await ui.unmount()
})

test('Go on a task blocker opens that task\'s screen when narrow and selects it when wide', async ($, on) => {
  navigation(on)
  mock.store(on, { 'checklist:5000': chained, questions: twoAsked })

  const narrow = await mountChecklist($)

  await narrow.press({ key: 'row-b' })
  expect(await narrow.find({ type: 'Text', text: /2 of 2 · todo/ })).toBeDefined()
  await narrow.press({ key: 'go-b-a' })
  expect(await narrow.find({ type: 'Text', text: /1 of 2 · doing/ })).toBeDefined()
  expect(await narrow.find({ key: 'back' })).toBeDefined()
  await narrow.unmount()

  const side = await mountChecklist($, wide)

  await side.press({ key: 'row-b' })
  expect(await side.find({ type: 'Text', text: /2 of 2 · todo/ })).toBeDefined()
  await side.press({ key: 'go-b-a' })
  expect(await side.find({ type: 'Text', text: /1 of 2 · doing/ })).toBeDefined()
  expect(await side.find({ key: 'back' })).toBeUndefined()
  await side.unmount()
})

test('Go on a question blocker raises the questions pane on that question and asks for its row', async ($, on) => {
  const { opened, toasts } = navigation(on)
  mock.store(on, { 'checklist:5000': chained, questions: twoAsked })

  const questionsUi = await mountQuestions($)
  const ui = await mountChecklist($)

  expect(await questionsUi.find({ key: 'qa-answer-q1#0' })).toBeDefined()
  await ui.press({ key: 'row-b' })
  await ui.press({ key: 'go-b-q2' })
  expect(opened).toHaveLength(1)
  expect(opened[0]).toMatchObject({ id: 'open-questions', focus: true })
  expect(await questionsUi.find({ key: 'qa-answer-q2#0' })).toBeDefined()
  expect(await questionsUi.find({ key: 'qa-answer-q1#0' })).toBeUndefined()
  expect(toasts).toEqual([])
  await questionsUi.unmount()
  await ui.unmount()
})

test('Go on a question that closed since it was drawn says so and opens nothing', async ($, on) => {
  const { opened, toasts } = navigation(on)
  // A store the test can change under a drawn pane, without the pane being told.
  const data: Record<string, unknown> = {
    'checklist:5000': [{ id: 'b', text: 'Ship it', status: 'todo', blockedBy: [{ kind: 'question', id: 'q1' }] }],
    questions: twoAsked,
  }
  on('store.get', async (_$: any, e: any) => ({ value: data[e.key] }))
  on('store.set', async (_$: any, e: any) => {
    data[e.key] = e.value

    return { value: undefined }
  })
  on('store.keys', async () => ({ value: Object.keys(data) }))

  const ui = await mountChecklist($)

  await ui.press({ key: 'row-b' })
  data.questions = twoAsked.map(one => ({ ...one, isOpen: false }))
  expect(await ui.find({ key: 'go-b-q1' })).toBeDefined()
  await ui.press({ key: 'go-b-q1' })
  expect(toasts).toEqual(['That question is closed.'])
  expect(opened).toEqual([])
  await ui.unmount()
})

test('Blocks lists the open tasks that wait for this one, with Go and no drop button', async ($, on) => {
  navigation(on)
  mock.store(on, {
    'checklist:5000': [
      { id: 'a', text: 'Write the tests for the pane', status: 'doing' },
      { id: 'b', text: 'Ship it', status: 'todo', blockedBy: [{ kind: 'task', id: 'a' }] },
      { id: 'c', text: 'Announce it', status: 'done', blockedBy: [{ kind: 'task', id: 'a' }] },
      { id: 'd', text: 'Drop the plan', status: 'cancelled', blockedBy: [{ kind: 'task', id: 'a' }] },
    ],
  })

  const ui = await mountChecklist($)

  await ui.press({ key: 'row-a' })
  expect(await ui.find({ type: 'Text', text: /^Blocks$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^task #\d Ship it$/ })).toBeDefined()
  expect(await ui.find({ key: 'go-a-b', text: /Go ›/ })).toBeDefined()
  expect(await ui.find({ key: 'go-a-c' })).toBeUndefined()
  expect(await ui.find({ key: 'go-a-d' })).toBeUndefined()
  expect(await ui.find({ key: 'unblock-a-b' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^Waiting for$/ })).toBeUndefined()
  await ui.press({ key: 'go-a-b' })
  expect(await ui.find({ type: 'Text', text: /of 4 · todo/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^Blocks$/ })).toBeUndefined()
  await ui.unmount()
})

test('Blocks is absent once its dependants are finished', async ($, on) => {
  navigation(on)
  mock.store(on, {
    'checklist:5000': [
      { id: 'a', text: 'Write the tests for the pane', status: 'doing' },
      { id: 'b', text: 'Ship it', status: 'done', blockedBy: [{ kind: 'task', id: 'a' }] },
    ],
  })

  const ui = await mountChecklist($)

  await ui.press({ key: 'row-a' })
  expect(await ui.find({ type: 'Text', text: /^Blocks$/ })).toBeUndefined()
  await ui.unmount()
})

test('the selected question says how many open tasks wait for it', async ($, on) => {
  navigation(on)
  mock.store(on, {
    'checklist:5000': [
      { id: 'a', text: 'Write the tests', status: 'todo', blockedBy: [{ kind: 'question', id: 'q2' }] },
      { id: 'b', text: 'Ship it', status: 'doing', blockedBy: [{ kind: 'question', id: 'q2' }] },
      { id: 'c', text: 'Announce it', status: 'done', blockedBy: [{ kind: 'question', id: 'q2' }] },
    ],
    questions: twoAsked,
  })

  const ui = await mountQuestions($)

  expect(await ui.find({ type: 'Text', text: /blocks/ })).toBeUndefined()
  await $.ui.focus({ component: 'Pane', requestId: 'open-questions', element: 'row-q2#0', origin: person })
  expect(await ui.find({ type: 'Text', text: /blocks 2 tasks/ })).toBeDefined()
  await ui.unmount()
})

test('the task screen with Waiting for and Blocks stays inside the pane rows', async ($, on) => {
  navigation(on)
  mock.store(on, {
    'checklist:5000': [
      { id: 'a', text: 'Write the tests for the pane', status: 'doing', blockedBy: [{ kind: 'question', id: 'q2' }, { kind: 'task', id: 'b' }] },
      { id: 'b', text: 'A prerequisite whose title is long enough to wrap onto a second line', status: 'todo' },
      { id: 'c', text: 'Ship it after everything else, with a title that wraps as well', status: 'todo', blockedBy: [{ kind: 'task', id: 'a' }] },
    ],
    questions: twoAsked,
  })

  for (const bodyRows of [40, 60]) {
    const ui = await mountChecklist($, { scroll: { offset: 0, bodyRows } })

    await ui.press({ key: 'row-a' })
    expect(await ui.find({ key: 'go-a-c' })).toBeDefined()
    expect(await rowsOf(ui, 38)).toBeLessThanOrEqual(bodyRows)
    await ui.press({ key: 'back' })
    await ui.unmount()
  }
})
