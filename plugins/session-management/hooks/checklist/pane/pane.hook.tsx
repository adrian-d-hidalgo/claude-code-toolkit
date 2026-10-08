import type { Blocker, ChecklistItem, Priority } from '../../../types'
import { COLORS } from '../../shared/palette/palette.hook'
import type { ActiveBlocker } from '../blockers/blockers.hook'
import { PRIORITIES } from '../ops/ops.hook'
import { GLYPH, isOpenStatus } from '../status/status.hook'
import { windowOf } from '../window/window.hook'

export type ChecklistPaneState = {
  list: ChecklistItem[]
  /** What each blocked task still waits for, by task id; a task with nothing pending has no entry. */
  blockers: Record<string, ActiveBlocker[]>
  /** The task the person picked, if any; by default the one in progress, else the first open one. */
  selectedId: string | null
  /** The task whose own screen is open. */
  viewingId: string | null
  editingId: string | null
  detailingId: string | null
  /** What has been typed so far in the title or description field. */
  draft: string
  /** What has been typed in the add field. */
  adding: string
  /** Where the person left the list window. */
  first: number
  columns: number
  bodyRows: number
  /** Whether the pane holds the focus; unfocused, its cards draw their borders dim. Defaults to focused. */
  isFocused?: boolean
}

// What a press does. The pane draws; the plugin decides (and owns `$`).
export type ChecklistPaneActions = {
  select: (id: string | null) => unknown
  /** Opens a task's own screen, or closes it with null. */
  view: (id: string | null) => unknown
  /** Moves the task screen to another task, dropping any edit in progress. */
  walk: (id: string | null) => unknown
  /** Starts editing a task's title (or stops, with null), with the field focused. */
  edit: (id: string | null) => unknown
  editNotes: (id: string | null) => unknown
  type: (text: string) => unknown
  /** Moves the list window to `first` and the selection (and the ring) to the task `id` inside it. */
  scroll: (first: number, id: string | null) => unknown
  run: (id: string) => unknown
  /** Stops a task waiting for one thing it was waiting for. */
  unblock: (id: string, blocker: Blocker) => unknown
  /** Takes the person to a task: its screen when narrow, its row in the list when wide. */
  goTask: (id: string) => unknown
  /** Takes the person to the questions pane, on the first thing the entry asked. */
  goQuestion: (entryId: string) => unknown
  cancel: (id: string) => unknown
  reopen: (id: string) => unknown
  /** Sets a task's priority; the list re-sorts and the task moves to its new place. */
  setPriority: (id: string, priority: Priority) => unknown
  rename: (id: string, text: string) => unknown
  saveNotes: (id: string, text: string) => unknown
  remove: (id: string) => unknown
  add: (text: string) => unknown
  /** What has been typed in the add field. */
  typeAdd: (text: string) => unknown
}

type Elements = { Box: any; Text: any; Button: any; Input?: any }

// From this many columns the pane shows the list and the selected task side by side.
export const WIDE = 84
const LIST_WIDTH = 38
const GAUGE_CELLS = 12
// Rows the list must keep for the narrow selected card to be roomy.
const ROOMY_LIST = 3
/** The add field's key: stable, so the ring stays on it after an add. */
export const ADD_FIELD = 'add'

// One colour per meaning: what the task is doing, or what holds it back.
const colorOf = (task: ChecklistItem, isBlocked: boolean): string => {
  if (task.status === 'doing') {
    return COLORS.accent
  }

  if (task.status === 'done') {
    return COLORS.ok
  }

  if (task.status === 'cancelled') {
    return COLORS.faint
  }

  return isBlocked ? COLORS.attention : COLORS.todo
}

// A gauge of block glyphs: filled in the healthy colour, the rest faint, then the percentage.
const Gauge = ({ el, done, total }: { el: Elements; done: number; total: number }) => {
  const { Box, Text } = el
  const filled = total === 0 ? 0 : Math.round((GAUGE_CELLS * done) / total)

  return (
    <Box gap={1}>
      <Box flexShrink={0}>
        <Text color={COLORS.ok}>{'▰'.repeat(filled)}</Text>
        <Text color={COLORS.faint}>{'▱'.repeat(GAUGE_CELLS - filled)}</Text>
      </Box>
      <Box flexShrink={0}>
        <Text bold>{`${total === 0 ? 0 : Math.round((100 * done) / total)}%`}</Text>
      </Box>
    </Box>
  )
}

// A small card: the one frame of every concept, its border carrying the meaning.
const cardProps = (color: string, isFocused: boolean | undefined) => ({ borderStyle: 'round', borderColor: color, borderDimColor: isFocused === false, paddingX: 1 })

// The main actions of a task, every one on its letter. They sit right under the status line, so the
// task screen (and the panel beside a wide list) has them at the same place for every task.
const TaskActions = ({ el, act, task, gap }: { el: Elements; act: ChecklistPaneActions; task: ChecklistItem; gap: number }) => {
  const { Box, Button } = el
  const isOff = !isOpenStatus(task.status)

  return (
    <Box gap={2} flexWrap="wrap" marginTop={gap}>
      {task.status === 'todo' && <Button plain key={`run-${task.id}`} hotkey="r" label="▶ run" onPress={() => act.run(task.id)} />}
      {isOpenStatus(task.status) && (
        <Button plain key={`cancel-${task.id}`} hotkey="c" label={task.status === 'doing' ? '■ stop' : '✕ cancel'} onPress={() => act.cancel(task.id)} />
      )}
      {isOff && <Button plain key={`reopen-${task.id}`} hotkey="r" label="↺ reopen" onPress={() => act.reopen(task.id)} />}
    </Box>
  )
}

// The priority picker: one button per level, the current one marked. Labels keep their text, only the
// marker moves, so the keys stay the same across redraws.
const PriorityRow = ({ el, act, task }: { el: Elements; act: ChecklistPaneActions; task: ChecklistItem }) => {
  const { Box, Text, Button } = el
  const current = task.priority ?? 'normal'

  return (
    <Box gap={2} flexWrap="wrap">
      <Text dimColor>Priority</Text>
      {PRIORITIES.map((level, position) => (
        <Button plain key={`priority-${task.id}-${level}`} hotkey={String(position + 1)} label={`${current === level ? '● ' : ''}${level}`} onPress={() => act.setPriority(task.id, level)} />
      ))}
    </Box>
  )
}

// A text field being edited, with the way out beside it. Esc cannot cancel on its own (the engine
// never hands it to the plugin), so the label says what ends the edit and the button drops it. Only
// short one-line text gets here: a longer one is edited in the prompt box (the field does not scroll).
const Editor = ({ el, state, type, name, noun, placeholder, submitLabel, onSubmit, onCancel }: { el: Elements; state: ChecklistPaneState; type: (text: string) => unknown; name: string; noun: string; placeholder?: string; submitLabel: string; onSubmit: (value: string) => unknown; onCancel: () => unknown }) => {
  const { Box, Text, Button, Input } = el

  return (
    <Box flexDirection="column">
      <Text dimColor>{`Editing the ${noun} · ⏎ ${submitLabel} · ✕ cancel`}</Text>
      <Box>
        <Box flexGrow={1} flexShrink={1}>
          <Input key={name} autoFocus value={state.draft} placeholder={placeholder} submitLabel={submitLabel} onInput={(value: string) => type(value)} onSubmit={onSubmit} />
        </Box>
        <Box flexShrink={0}>
          <Button plain key={`${name}-cancel`} label=" ✕" onPress={onCancel} />
        </Box>
      </Box>
    </Box>
  )
}

// Rows a text takes at `width` columns (a generous count: a word that does not fit moves down whole).
const wrapped = (text: string, width: number): number => text.split('\n').reduce((total, line) => total + Math.max(1, Math.ceil(line.length / Math.max(1, width))), 0)

// Columns the buttons beside a line take: ` Go ›` (5) and, in Waiting for, ` ✕` (2) more.
const GO_COLUMNS = 5
const DROP_COLUMNS = 2

// What a task is called where another one points at it: the number the list shows and its title.
const taskLine = (list: ChecklistItem[], target: ChecklistItem): string => `task #${list.indexOf(target) + 1} ${target.text}`

// What a blocker is, in one line: the task by its number and title, the question by its first text.
const blockerLine = (list: ChecklistItem[], one: ActiveBlocker): string => {
  const target = list.find(item => item.id === one.id)

  return one.kind === 'task' && target ? taskLine(list, target) : `question ${one.label}${one.more ? ` (+${one.more})` : ''}`
}

// The open tasks that wait for this one.
const dependantsOf = (list: ChecklistItem[], task: ChecklistItem): ChecklistItem[] =>
  list.filter(one => isOpenStatus(one.status) && (one.blockedBy ?? []).some(held => held.kind === 'task' && held.id === task.id))

// The task screen is roomy (a blank row between its sections) when the pane has the rows for its compact
// height plus the 5 blank rows; otherwise it stays compact. The estimate counts the nav, the status, the
// actions, the Task, Waiting, Blocks and Description cards (border, label, text) and the priority row, plus the field
// rows while a title or description edit is open (its label and field).
const SCREEN_GAPS = 5
const screenIsRoomy = (state: ChecklistPaneState, task: ChecklistItem, withNav: boolean, isPadded: boolean): boolean => {
  const inner = Math.max(1, state.columns - (isPadded ? 2 : 0) - 4)
  const waiting = (state.blockers[task.id] ?? []).reduce((total, one) => total + wrapped(blockerLine(state.list, one), inner - GO_COLUMNS - DROP_COLUMNS), 0)
  const blocks = dependantsOf(state.list, task).reduce((total, one) => total + wrapped(taskLine(state.list, one), inner - GO_COLUMNS), 0)
  const editing = state.editingId === task.id || state.detailingId === task.id ? 2 : 0
  const compact = (withNav ? 1 : 0) + 1 + 1 + (3 + wrapped(task.text, inner)) + (waiting > 0 ? 3 + waiting : 0) + (blocks > 0 ? 3 + blocks : 0) + (3 + wrapped(task.detail ?? 'No description yet.', inner)) + 2 + editing

  return state.bodyRows >= compact + SCREEN_GAPS
}

// The task's own screen: its full title, its description and every action, away from the list. Each concept
// is a card; the waiting card exists only while something is pending.
const TaskScreen = ({ el, state, act, task, withNav = true, isPadded = true }: { el: Elements; state: ChecklistPaneState; act: ChecklistPaneActions; task: ChecklistItem; withNav?: boolean; isPadded?: boolean }) => {
  const { Box, Text, Button, Input } = el
  const { list, editingId, detailingId } = state
  const position = list.indexOf(task)
  const waiting = state.blockers[task.id] ?? []
  const dependants = dependantsOf(list, task)
  const color = colorOf(task, waiting.length > 0)
  // One blank row between the sections when the pane has the rows for them.
  const gap = screenIsRoomy(state, task, withNav, isPadded) ? 1 : 0

  return (
    <Box flexDirection="column" paddingX={isPadded ? 1 : 0}>
      {withNav && (
        <Box gap={2}>
          <Box flexShrink={0}>
            <Button plain key="back" hotkey="b" label="‹ Back" onPress={() => act.view(null)} />
          </Box>
          {position > 0 && (
            <Box flexShrink={0}>
              <Button plain key="prev" hotkey="h" label="‹ prev" onPress={() => walkTo(act, list, position - 1)} />
            </Box>
          )}
          {position < list.length - 1 && (
            <Box flexShrink={0}>
              <Button plain key="next" hotkey="l" label="next ›" onPress={() => walkTo(act, list, position + 1)} />
            </Box>
          )}
        </Box>
      )}
      <Box gap={1}>
        <Box flexShrink={0}>
          <Text color={color} bold>
            {waiting.length > 0 && task.status === 'todo' ? '◌' : GLYPH[task.status]}
          </Text>
        </Box>
        <Box flexShrink={1}>
          <Text dimColor wrap="truncate-end">{`${position + 1} of ${list.length} · ${task.status}`}</Text>
        </Box>
      </Box>
      {TaskActions({ el, act, task, gap })}
      <Box flexDirection="column" marginTop={gap} {...cardProps(COLORS.faint, state.isFocused)}>
        <Box justifyContent="space-between">
          <Box flexShrink={0}>
            <Text dimColor>Task</Text>
          </Box>
          {Input && (
            <Box flexShrink={0}>
              <Button plain key={`title-edit-${task.id}`} hotkey="e" label="✎" onPress={() => act.edit(task.id)} />
            </Box>
          )}
        </Box>
        {Input && editingId === task.id ? (
          <Editor el={el} state={state} type={act.type} name={`title-${task.id}`} noun="title" submitLabel="save" onSubmit={value => act.rename(task.id, value)} onCancel={() => act.edit(null)} />
        ) : (
          <Text bold wrap="wrap">
            {task.text}
          </Text>
        )}
      </Box>
      {waiting.length > 0 && (
        <Box flexDirection="column" marginTop={gap} {...cardProps(COLORS.attention, state.isFocused)}>
          <Box justifyContent="space-between">
            <Box flexShrink={0}>
              <Text color={COLORS.attention} bold>
                Waiting for
              </Text>
            </Box>
            <Box flexShrink={0}>
              <Text dimColor>{String(waiting.length)}</Text>
            </Box>
          </Box>
          {waiting.map(one => (
            <Box key={`waiting-${task.id}-${one.id}`}>
              <Box flexGrow={1} flexShrink={1}>
                <Text wrap="wrap">{blockerLine(list, one)}</Text>
              </Box>
              <Box flexShrink={0} marginLeft={1}>
                <Button plain key={`go-${task.id}-${one.id}`} label="Go ›" onPress={() => (one.kind === 'task' ? act.goTask(one.id) : act.goQuestion(one.id))} />
              </Box>
              <Box flexShrink={0}>
                <Button plain key={`unblock-${task.id}-${one.id}`} label=" ✕" onPress={() => act.unblock(task.id, { kind: one.kind, id: one.id })} />
              </Box>
            </Box>
          ))}
        </Box>
      )}
      {dependants.length > 0 && (
        <Box flexDirection="column" marginTop={gap} {...cardProps(COLORS.faint, state.isFocused)}>
          <Box justifyContent="space-between">
            <Box flexShrink={0}>
              <Text dimColor>Blocks</Text>
            </Box>
            <Box flexShrink={0}>
              <Text dimColor>{String(dependants.length)}</Text>
            </Box>
          </Box>
          {dependants.map(one => (
            <Box key={`blocks-${task.id}-${one.id}`}>
              <Box flexGrow={1} flexShrink={1}>
                <Text wrap="wrap">{taskLine(list, one)}</Text>
              </Box>
              <Box flexShrink={0} marginLeft={1}>
                <Button plain key={`go-${task.id}-${one.id}`} label="Go ›" onPress={() => act.goTask(one.id)} />
              </Box>
            </Box>
          ))}
        </Box>
      )}
      <Box flexDirection="column" marginTop={gap} {...cardProps(COLORS.faint, state.isFocused)}>
        <Box justifyContent="space-between">
          <Box flexShrink={0}>
            <Text dimColor>Description</Text>
          </Box>
          {Input && (
            <Box flexShrink={0}>
              <Button plain key={`notes-edit-${task.id}`} hotkey="n" label="✎" onPress={() => act.editNotes(task.id)} />
            </Box>
          )}
        </Box>
        {Input && detailingId === task.id ? (
          <Editor el={el} state={state} type={act.type} name={`notes-${task.id}`} noun="description" placeholder="Description for this task" submitLabel="save" onSubmit={value => act.saveNotes(task.id, value)} onCancel={() => act.editNotes(null)} />
        ) : (
          <Text wrap="wrap" dimColor={!task.detail}>
            {task.detail ?? 'No description yet.'}
          </Text>
        )}
      </Box>
      <Box gap={2} flexWrap="wrap" marginTop={gap}>
        {PriorityRow({ el, act, task })}
        <Button plain dimColor key={`remove-${task.id}`} hotkey="x" label="remove" onPress={() => act.remove(task.id)} />
      </Box>
    </Box>
  )
}

// The quick actions of the selected task in the narrow list: side by side on one row inside the
// selected task's card, each on its letter. Detail opens the task screen (the same as Enter on the row);
// a finished task has only that (reopen lives on its screen). Never drawn beside the wide panel or the
// task screen, which carry the full set.
const QuickActions = ({ el, act, task, gap = 0 }: { el: Elements; act: ChecklistPaneActions; task: ChecklistItem; gap?: number }) => {
  const { Box, Button } = el

  return (
    <Box gap={1} paddingLeft={4} marginTop={gap}>
      <Button plain key={`qa-detail-${task.id}`} hotkey="o" label="Detail" onPress={() => act.view(task.id)} />
      {task.status === 'todo' && <Button plain key={`qa-run-${task.id}`} hotkey="r" label="Run" onPress={() => act.run(task.id)} />}
      {isOpenStatus(task.status) && <Button plain key={`qa-cancel-${task.id}`} hotkey="c" label={task.status === 'doing' ? 'Stop' : 'Cancel'} onPress={() => act.cancel(task.id)} />}
    </Box>
  )
}

// The selected task defaults to the one in progress, else the first open one; a pick that is no
// longer in the list (removed by the tool, the command or the other pane) falls back the same way.
export const selectedOf = (list: ChecklistItem[], pickedId: string | null): ChecklistItem | undefined =>
  list.find(one => one.id === pickedId) ?? list.find(one => one.status === 'doing') ?? list.find(one => one.status === 'todo')

const walkTo = (act: ChecklistPaneActions, list: ChecklistItem[], index: number) => act.walk(list[index]?.id ?? null)

// The chips of the selected task: what sets it apart, each in the colour of its meaning. Its description is
// not one: the Detail action opens them, and the `≡` at the row's edge says they exist.
const chipsOf = (task: ChecklistItem, waiting: number): { text: string; color?: string; lead?: string }[] => [
  ...(task.priority === 'high' ? [{ lead: '! ', text: 'high', color: COLORS.bad }] : []),
  ...(task.priority === 'low' ? [{ text: 'low', color: COLORS.dim }] : []),
  ...(waiting > 0 ? [{ text: `◌ waits for ${waiting}`, color: COLORS.attention }] : []),
]

// The row label: the number and the glyph, which is the row's one ring stop.
const labelOf = (index: number, task: ChecklistItem, isBlocked: boolean): string => `${String(index + 1).padStart(2)} ${isBlocked && task.status === 'todo' ? '◌' : GLYPH[task.status]}`

// One task of the list: a single line and a single stop for the arrows. Its actions are not here,
// except on the narrow selected row (`withQuick`), which is a card holding its full title, chips and
// quick actions (a plain marked row, when the pane is too short for the card, keeps them under it).
const TaskRow = ({ el, state, act, list, index, isSelected, isBlocked, isCompact = false, asCard = false, isRoomy = false, withQuick = false }: { el: Elements; state: ChecklistPaneState; act: ChecklistPaneActions; list: ChecklistItem[]; index: number; isSelected: boolean; isBlocked: boolean; isCompact?: boolean; asCard?: boolean; isRoomy?: boolean; withQuick?: boolean }) => {
  const { Box, Text, Button } = el
  const one = list[index] as ChecklistItem
  const isOff = !isOpenStatus(one.status)
  // Its own non-shrinking box: a Button whose label does not fit is dropped by the engine.
  const press = (
    <Box flexShrink={0}>
      <Button plain key={`row-${one.id}`} label={labelOf(index, one, isBlocked)} onPress={() => (isCompact ? act.select(one.id) : act.view(one.id))} />
    </Box>
  )

  if (isSelected && asCard) {
    const chips = chipsOf(one, (state.blockers[one.id] ?? []).length)

    return (
      <Box flexDirection="column" {...cardProps(colorOf(one, isBlocked), state.isFocused)}>
        <Box>
          {press}
          {one.priority === 'high' && (
            <Box flexShrink={0} marginLeft={1}>
              <Text color={COLORS.bad} bold>
                {'!'}
              </Text>
            </Box>
          )}
          <Box flexGrow={1} flexShrink={1} marginLeft={1}>
            <Text bold wrap="wrap" strikethrough={isOff}>
              {one.text}
            </Text>
          </Box>
        </Box>
        {chips.length > 0 && (
          <Box paddingLeft={4} gap={2} flexWrap="wrap" marginTop={isRoomy ? 1 : 0}>
            {chips.map(chip => (
              <Box key={chip.text}>
                {chip.lead && (
                  <Text color={chip.color} bold>
                    {chip.lead}
                  </Text>
                )}
                <Text color={chip.color}>{chip.text}</Text>
              </Box>
            ))}
          </Box>
        )}
        {withQuick && QuickActions({ el, act, task: one, gap: isRoomy && chips.length === 0 ? 1 : 0 })}
      </Box>
    )
  }

  const line = (
    <Box>
      <Box flexShrink={0}>
        <Text color={COLORS.accent} bold>
          {isSelected ? '▸ ' : '  '}
        </Text>
      </Box>
      {press}
      {one.priority === 'high' && (
        <Box flexShrink={0} marginLeft={1}>
          <Text color={COLORS.bad} bold>
            {'!'}
          </Text>
        </Box>
      )}
      <Box flexGrow={1} flexShrink={1} marginLeft={1}>
        <Text wrap="truncate-end" dimColor={isOff || one.priority === 'low'} strikethrough={isOff} bold={one.status === 'doing' || isSelected}>
          {one.text}
        </Text>
      </Box>
      {one.detail && (
        <Box flexShrink={0} marginLeft={1}>
          <Text dimColor>≡</Text>
        </Box>
      )}
    </Box>
  )

  return withQuick ? (
    <Box flexDirection="column">
      {line}
      {QuickActions({ el, act, task: one })}
    </Box>
  ) : (
    line
  )
}

// The rows the narrow selected card takes beyond the one line its task would take plain: the border,
// the lines its title wraps onto and the chips. The card's text is the pane less the
// pane's padding, the border and the card's padding; the row's label and the `! ` take the rest.
const cardExtra = (state: ChecklistPaneState, task: ChecklistItem, isRoomy: boolean): number => {
  const index = state.list.indexOf(task)
  const isBlocked = (state.blockers[task.id] ?? []).length > 0
  const width = Math.max(1, state.columns - 6 - (labelOf(index, task, isBlocked).length + 2) - 1 - (task.priority === 'high' ? 2 : 0))
  const lines = Math.max(1, Math.ceil(task.text.length / width))
  const chips = chipsOf(task, (state.blockers[task.id] ?? []).length).length > 0 ? 1 : 0

  // The roomy card has a blank row between the title and the chips or the quick actions.
  return 2 + (lines - 1) + chips + (isRoomy ? 1 : 0)
}

export const renderChecklistPane = (el: Elements, state: ChecklistPaneState, act: ChecklistPaneActions) => {
  const { Box, Text, Button, Input } = el
  const { list, viewingId, columns } = state
  const isWide = columns >= WIDE
  // Wide, the side panel is the task screen: a stale `viewing` (left from before a resize) must not
  // hide the list.
  const viewed = viewingId === null || isWide ? undefined : list.find(one => one.id === viewingId)

  if (viewed) {
    return TaskScreen({ el, state, act, task: viewed })
  }

  const selectedTask = selectedOf(list, state.selectedId)
  const selectedId = selectedTask?.id ?? null
  const done = list.filter(one => one.status === 'done').length
  const doing = list.filter(one => one.status === 'doing').length
  const active = list.filter(one => one.status !== 'cancelled').length
  const selectedAt = list.findIndex(one => one.id === selectedId)
  const hasQuick = !isWide && selectedTask !== undefined
  // The room left for tasks: the pane's rows less what the tree always draws around them (header and
  // gauge, `above`, `below`, the hidden count, the add field with its margin, the hint), what the
  // narrow selected card adds to its one-line row (2 border rows, the title's extra wrapped lines, the
  // chips line) and its quick actions (one row, inside the card, or under the row when the pane is
  // too short for the card). Past the pane's rows the pane scrolls and the arrows stop walking.
  const quick = hasQuick ? 1 : 0
  // The card is roomy while it still leaves ROOMY_LIST rows for the list; a tighter pane gets the compact
  // card, and one too short for that gives the card up: the selected task then stays a plain marked row.
  const isRoomy = !isWide && selectedTask !== undefined && state.bodyRows - 8 - cardExtra(state, selectedTask, true) - quick >= ROOMY_LIST
  const extra = isWide || !selectedTask ? 0 : cardExtra(state, selectedTask, isRoomy)
  const asCard = extra > 0 && state.bodyRows - 8 - extra - quick >= 1
  const room = Math.max(1, state.bodyRows - 8 - quick - (asCard ? extra : 0))
  const view = windowOf(list, selectedAt, state.first, room)

  // The list is only rows, so the arrows go from one task to the next. The actions of a task are on
  // its own screen (Enter), or in the panel beside the list when it is wide; narrow, the selected
  // task's card also lists its quick actions.
  const rows = (
    <Box flexDirection="column" width={isWide ? LIST_WIDTH : undefined}>
      {view.above > 0 && (
        <Box flexShrink={0}>
          <Button
            plain
            key="above"
            label={`▲ ${view.above} above`}
            onPress={() => {
              const target = list[view.rows[view.start - 1] ?? -1]

              return act.scroll(Math.max(0, view.start - (room - 1)), target?.id ?? null)
            }}
          />
        </Box>
      )}
      {view.shown.flatMap(index => {
        const task = list[index] as ChecklistItem

        return [TaskRow({ el, state, act, list, index, isSelected: task.id === selectedId, isBlocked: (state.blockers[task.id] ?? []).length > 0, isCompact: isWide, asCard, isRoomy: asCard && isRoomy, withQuick: hasQuick && task.id === selectedId })]
      })}
      {view.below > 0 && (
        <Box flexShrink={0}>
          <Button
            plain
            key="below"
            label={`▼ ${view.below} below`}
            onPress={() => {
              const target = list[view.rows[view.start + view.shown.length] ?? -1]

              return act.scroll(view.start + room - 1, target?.id ?? null)
            }}
          />
        </Box>
      )}
      {view.hidden > 0 && <Text dimColor>{`${view.hidden} finished hidden`}</Text>}
      {Input && (
        <Box marginTop={1}>
          <Box flexShrink={0}>
            <Text color="suggestion">{'+ '}</Text>
          </Box>
          <Input key={ADD_FIELD} value={state.adding} placeholder="Add a task" submitLabel="add" onInput={(value: string) => act.typeAdd(value)} onSubmit={(value: string) => act.add(value)} />
        </Box>
      )}
    </Box>
  )

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Box flexShrink={0}>
          <Text color={COLORS.accent} bold>
            Checklist
          </Text>
        </Box>
        <Box flexShrink={0}>
          <Text dimColor>{`${done}/${active}${doing > 0 ? ` · ${doing} doing` : ''}`}</Text>
        </Box>
      </Box>
      <Gauge el={el} done={done} total={active} />
      {list.length === 0 && <Text dimColor>No tasks yet. Add the first one below.</Text>}
      {isWide ? (
        <Box>
          {rows}
          <Box flexDirection="column" flexGrow={1} flexShrink={1} marginLeft={1} {...(selectedTask ? cardProps(colorOf(selectedTask, (state.blockers[selectedTask.id] ?? []).length > 0), state.isFocused) : {})}>
            {selectedTask ? TaskScreen({ el, state: { ...state, columns: columns - LIST_WIDTH - 7 }, act, task: selectedTask, withNav: false, isPadded: false }) : <Text dimColor>No task selected.</Text>}
          </Box>
        </Box>
      ) : (
        rows
      )}
      <Text dimColor wrap="truncate-end">
        {isWide ? '↑↓ pick · sorted by priority' : '↑↓ pick · ⏎ open · sorted by priority'}
      </Text>
    </Box>
  )
}
