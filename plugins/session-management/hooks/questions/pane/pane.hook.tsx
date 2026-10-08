import type { Question } from '../../../types'
import { COLORS } from '../../shared/palette/palette.hook'
import { plural } from '../../shared/diagnosis/diagnosis.hook'
import { ago } from '../../shared/format/format.hook'
import { needsPreview } from '../../shared/draft/draft.hook'
import { partsOf } from '../parts/parts.hook'
import type { Part } from '../parts/parts.hook'

export type QuestionsPaneState = {
  /** This session's open questions. */
  open: Question[]
  /** The question part the person picked (`<id>#<position>`), if any; by default the first. */
  chosenId: string | null
  /** The question part whose answer area (options or text box) is revealed. */
  answeringId: string | null
  /** The part whose options were switched to the text box with Other. */
  typingId: string | null
  /** What has been typed so far. */
  draft: string
  /** Options ticked for a multiple choice, keyed like the part (`<question id>#<position>`). */
  ticked: Record<string, string[]>
  /** How many open tasks wait for each entry, by entry id; an entry nothing waits for has none. */
  blocking?: Record<string, number>
  /** False while another pane holds the focus: the cards draw their borders dim. */
  isFocused?: boolean
  now: number
  columns: number
  bodyRows: number
}

// A message that asked several things is one entry in the store, but the pane lists each thing
// on its own line: that is what the person answers, one by one.
export type QuestionsPaneActions = {
  choose: (mark: Mark | null) => unknown
  /** Reveals (or hides, with null) the answer area of a part and moves the ring to `field` in it. */
  setAnswering: (mark: Mark | null, field?: string) => unknown
  /** Switches a part's revealed options to the text box (null goes back). */
  setTyping: (mark: Mark | null) => unknown
  type: (text: string) => unknown
  tick: (mark: Mark, options: string[]) => unknown
  /** One option picked from a single-choice list. */
  pick: (id: string, text: string, value: string) => unknown
  send: (id: string, text: string, options: string[]) => unknown
  explain: (id: string, text: string) => unknown
  dismiss: (id: string, text: string) => unknown
  reply: (id: string, text: string, value: string) => unknown
}

// What a part is, apart from where it sits: its entry and its wording. The position (`<id>#<slot>`)
// shifts when another part of the entry leaves or the texts are reworded, so state that must
// follow the part, or be dropped with it, is kept under this.
export type Mark = { id: string; text: string }

export const markOf = (part: Part): Mark => ({ id: part.one.id, text: part.text })

export const findPart = (parts: Part[], mark: Mark | null): Part | undefined =>
  mark === null ? undefined : parts.find(part => part.one.id === mark.id && part.text === mark.text)

/** The key the ticks of a part are kept under. */
export const tickKey = (mark: Mark): string => `${mark.id}\u0000${mark.text}`

type Elements = { Box: any; Text: any; Button: any; Input?: any }

// From this many columns the pane shows the list and the focused question side by side.
export const WIDE = 84
const LIST_WIDTH = 38
// Narrow, the actions inside the selected card: Answer, Explain and Dismiss, side by side on one row.
const ACTION_ROWS = 1

export { partsOf }

// The area's title: it names the section as part of Answer, so its buttons are not mistaken for actions.
const revealTitle = (choice: { kind: 'single' | 'multi' } | undefined, isTyping: boolean): string => {
  if (!choice || isTyping) {
    return 'Answer · type it'
  }

  return choice.kind === 'single' ? 'Answer · choose one' : 'Answer · choose any'
}

// What Answer reveals: a bordered sub-card titled Answer · …, holding the options (with Other to switch
// to the box) or the free-text box. Drawn under the focused part only while it is being answered, so its
// keys never exist before that. `gap` is the blank row above it when the card is roomy.
const Reveal = ({ el, state, act, part, gap }: { el: Elements; state: QuestionsPaneState; act: QuestionsPaneActions; part: Part; gap: number }) => {
  const { Box, Text, Button, Input } = el
  const { one, text, key } = part
  const choice = one.choices?.[text]
  const marked = state.ticked[key] ?? []
  const digit = (position: number) => (position < 9 ? String(position + 1) : undefined)
  // Roomy, a bordered sub-card; compact (a tight pane), the same area without its frame, which saves 2 rows.
  const frame = gap > 0 ? { flexDirection: 'column', marginTop: gap, borderStyle: 'single', borderColor: COLORS.faint, borderDimColor: state.isFocused === false, paddingX: 1 } : { flexDirection: 'column' }
  const title = (
    <Text color={COLORS.attention} bold wrap="truncate-end">
      {revealTitle(choice, state.typingId === key)}
    </Text>
  )

  if (choice && state.typingId !== key) {
    return (
      <Box {...frame}>
        {title}
        <Box flexDirection="column" paddingLeft={2}>
          {/* Two options with the same wording would share a key: they are one. */}
          {[...new Set(choice.options)].map((option, position) =>
            choice.kind === 'single' ? (
              <Button plain key={`pick-${key}-${option}`} hotkey={digit(position)} label={`○ ${option}`} onPress={() => act.pick(one.id, text, option)} />
            ) : (
              <Button
                plain
                key={`tick-${key}-${option}`}
                hotkey={digit(position)}
                label={`${marked.includes(option) ? '☑' : '☐'} ${option}`}
                onPress={() => act.tick(markOf(part), marked.includes(option) ? marked.filter(item => item !== option) : [...marked, option])}
              />
            ),
          )}
          {Input && <Button plain dimColor key={`other-${key}`} hotkey="o" label="Other (type your own)" onPress={() => act.setTyping(markOf(part))} />}
        </Box>
        {choice.kind === 'multi' && (
          <Box flexShrink={0}>
            <Button variant="primary" key={`send-${key}`} hotkey="s" label={`Send${marked.length > 0 ? ` (${marked.length})` : ''}`} onPress={() => act.send(one.id, text, marked)} />
          </Box>
        )}
      </Box>
    )
  }

  if (!Input) {
    return null
  }

  return (
    <Box {...frame}>
      {title}
      <Box>
        <Box flexGrow={1} flexShrink={1}>
          <Input
            key={`reply-${key}`}
            autoFocus
            value={state.draft}
            placeholder="Type your answer"
            submitLabel="send"
            onInput={(value: string) => act.type(value)}
            onSubmit={(value: string) => act.reply(one.id, text, value)}
          />
        </Box>
        <Box flexShrink={0}>
          <Button plain key={`reply-${key}-cancel`} label=" ✕" onPress={() => act.setAnswering(null)} />
        </Box>
      </Box>
      {needsPreview(state.draft, state.columns) && (
        <Box flexDirection="column">
          <Text dimColor>Preview</Text>
          <Text wrap="wrap" dimColor>
            {state.draft}
          </Text>
        </Box>
      )}
    </Box>
  )
}

// The three actions every question has, in this order. `prefix` is `qa-` on the narrow actions in the selected card and empty in the wide detail; only one of the two
// is ever drawn, so no letter is bound twice. Answer toggles the area Reveal draws.
const Actions = ({ el, state, act, part, prefix }: { el: Elements; state: QuestionsPaneState; act: QuestionsPaneActions; part: Part; prefix: string }) => {
  const { Button } = el
  const { one, text, key } = part

  // A plain array, not a fragment: the engine wraps a fragment in a column box of its own.
  return [
    <Button plain key={`${prefix}answer-${key}`} hotkey="a" label="Answer" onPress={() => act.setAnswering(state.answeringId === key ? null : markOf(part), firstField(part))} />,
    <Button plain key={`${prefix}explain-${key}`} hotkey="e" label="Explain" onPress={() => act.explain(one.id, text)} />,
    <Button plain dimColor key={`${prefix}dismiss-${key}`} hotkey="d" label="Dismiss" onPress={() => act.dismiss(one.id, text)} />,
  ]
}

// The element the ring goes to when the answer area opens: the first option, or the text box.
const firstField = ({ one, text, key }: Part): string => {
  const choice = one.choices?.[text]
  const option = choice?.options[0]

  return !choice || option === undefined ? `reply-${key}` : `${choice.kind === 'single' ? 'pick' : 'tick'}-${key}-${option}`
}

const metaOf = (state: QuestionsPaneState, part: Part): string => {
  const { one, slot } = part

  // Only what the person cannot tell already: which of the things asked together, how long ago, and how many times it was asked.
  const blocks = state.blocking?.[one.id] ?? 0

  return [one.texts.length > 1 ? `${slot + 1} of ${one.texts.length} asked together` : '', ago(one.at, state.now), one.asks > 1 ? `asked ${one.asks}×` : '', blocks > 0 ? `blocks ${plural(blocks, 'task')}` : ''].filter(Boolean).join(' · ')
}

// The card the selected question sits in: round, in the colour of questions, its border dim while
// the pane does not hold the focus.
const cardProps = (state: QuestionsPaneState) => ({
  borderStyle: 'round',
  borderColor: COLORS.attention,
  borderDimColor: state.isFocused === false,
  paddingX: 1,
  flexDirection: 'column',
})

// Narrow, the selected row as a card: its row (the ring's single stop for the part), the full text,
// the chips, its actions side by side on one row (used by their letters) and, while answering, the
// revealed area.
const Expanded = ({ el, state, act, part, index, gap }: { el: Elements; state: QuestionsPaneState; act: QuestionsPaneActions; part: Part; index: number; gap: number }) => {
  const { Box, Text } = el

  return (
    <Box {...cardProps(state)}>
      {QuestionRow({ el, act, state, part, index, isSelected: true, isCard: true })}
      <Box marginTop={gap}>
        <Text dimColor>{metaOf(state, part)}</Text>
      </Box>
      <Box gap={1} marginTop={gap}>
        {Actions({ el, state, act, part, prefix: 'qa-' })}
      </Box>
      {state.answeringId === part.key && Reveal({ el, state, act, part, gap })}
    </Box>
  )
}

// Wide, the focused part in full beside the list, as a card: what it is, its actions and, once Answer
// is pressed, how to answer it.
const QuestionDetail = ({ el, state, act, part, gap }: { el: Elements; state: QuestionsPaneState; act: QuestionsPaneActions; part: Part; gap: number }) => {
  const { Box, Text } = el
  const { text, key } = part

  return (
    <Box {...cardProps(state)} flexGrow={1} flexShrink={1}>
      <Text wrap="wrap" bold>
        {text}
      </Text>
      <Box marginTop={gap}>
        <Text dimColor>{metaOf(state, part)}</Text>
      </Box>
      <Box gap={2} marginTop={gap}>
        {Actions({ el, state, act, part, prefix: '' })}
      </Box>
      {state.answeringId === key && Reveal({ el, state, act, part, gap })}
    </Box>
  )
}

// One part: a single line and a single stop for the arrows; Enter is the same as Answer. Unselected it
// is `N text (k/n)`; as the head of the narrow card (`isCard`) its text wraps in full.
const QuestionRow = ({ el, act, state, part, index, isSelected, isCard }: { el: Elements; act: QuestionsPaneActions; state: QuestionsPaneState; part: Part; index: number; isSelected: boolean; isCard: boolean }) => {
  const { Box, Text, Button } = el
  const group = part.one.texts.length > 1 ? ` (${part.slot + 1}/${part.one.texts.length})` : ''

  return (
    <Box>
      {!isCard && (
        <Box flexShrink={0}>
          <Text color={COLORS.attention}>{isSelected ? '▸ ' : '  '}</Text>
        </Box>
      )}
      {/* Its own non-shrinking box: a Button whose label does not fit is dropped by the engine. */}
      <Box flexShrink={0}>
        <Button plain dimColor={!isSelected} key={`row-${part.key}`} label={String(index + 1).padStart(2)} onPress={() => act.setAnswering(markOf(part), firstField(part))} />
      </Box>
      <Box flexGrow={1} flexShrink={1} marginLeft={1}>
        <Text wrap={isCard ? 'wrap' : 'truncate-end'} bold={isSelected}>
          {part.text}
        </Text>
      </Box>
      {group !== '' && !isCard && (
        <Box flexShrink={0}>
          <Text dimColor>{group}</Text>
        </Box>
      )}
    </Box>
  )
}

// How many rows a text takes when wrapped at `width` columns. Slightly generous on purpose (a word
// that does not fit moves down whole): an underestimate would make the tree taller than the pane.
const linesIn = (text: string, width: number): number =>
  text.split('\n').reduce((total, line) => {
    let rows = 1
    let used = 0

    for (const word of line.split(' ')) {
      const need = Math.min(word.length, width)

      if (used > 0 && used + 1 + need > width) {
        rows += 1
        used = need
      } else {
        used += (used > 0 ? 1 : 0) + need
      }

      rows += Math.max(0, Math.ceil(word.length / width) - 1)
    }

    return total + rows
  }, 0)

// The rows of the revealed Answer sub-card (border, title and content) for a card `inner` columns wide,
// without the blank row above it; 0 when nothing is revealed.
const revealRows = (state: QuestionsPaneState, part: Part, hasInput: boolean, inner: number, isRoomy: boolean): number => {
  const { one, text, key } = part

  if (state.answeringId !== key) {
    return 0
  }

  // The sub-card's border and padding take 4 more columns and 2 rows, when roomy.
  const width = Math.max(4, inner - (isRoomy ? 4 : 0))
  const frame = isRoomy ? 2 : 0
  const choice = one.choices?.[text]

  if (choice && state.typingId !== key) {
    const marked = state.ticked[key] ?? []
    // Options sit indented by 2, with their marker and the `1: ` the engine adds; then Other and Send.
    const drawn = [...new Set(choice.options)].reduce((sum, option) => sum + linesIn(`1: ${choice.kind === 'multi' ? `${marked.includes(option) ? '☑' : '☐'} ${option}` : `○ ${option}`}`, width - 2), 0)

    return frame + 1 + drawn + (hasInput ? 1 : 0) + (choice.kind === 'multi' ? 1 : 0)
  }

  if (!hasInput) {
    return 0
  }

  const preview = needsPreview(state.draft, state.columns) ? 1 + linesIn(state.draft, width) : 0

  // The border, the title, the field and its preview.
  return frame + 1 + 1 + preview
}

// The rows the selected part takes in the narrow list beyond its own single line: the card's two
// border rows, what its text wraps to, the chips and, while it is answered, the revealed area. Its
// actions (ACTION_ROWS) are counted apart. A roomy card also has a blank row above the chips, the
// actions and the revealed area.
const expandedRows = (state: QuestionsPaneState, part: Part, hasInput: boolean, isRoomy: boolean): number => {
  // The pane's padding (2), the card's border (2) and its padding (2) leave this width inside the card.
  const inner = Math.max(8, state.columns - 6)
  const wrapped = linesIn(part.text, Math.max(8, state.columns - 11)) - 1
  // The chips line, and the card's top and bottom border.
  const meta = linesIn(metaOf(state, part), inner) + 2
  const reveal = revealRows(state, part, hasInput, inner, isRoomy)

  return wrapped + meta + reveal + (isRoomy ? 2 + (reveal > 0 ? 1 : 0) : 0)
}

// The wide detail card, in rows: border, text, chips, actions and the revealed area, with its blank rows.
const detailRows = (state: QuestionsPaneState, part: Part, hasInput: boolean, isRoomy: boolean): number => {
  // The pane (2), the list (38), the gap (1) and the card's border and padding (4) leave this width.
  const inner = Math.max(8, state.columns - 45)
  const reveal = revealRows(state, part, hasInput, inner, isRoomy)

  return 2 + linesIn(part.text, inner) + linesIn(metaOf(state, part), inner) + 1 + reveal + (isRoomy ? 2 + (reveal > 0 ? 1 : 0) : 0)
}

// Rows the list keeps at least when the selected card is roomy; a tighter pane gets the compact card.
const ROOMY_LIST = 3

export const renderQuestionsPane = (el: Elements, state: QuestionsPaneState, act: QuestionsPaneActions) => {
  const { Box, Text, Button } = el
  const { columns } = state
  const parts = partsOf(state.open)
  const isWide = columns >= WIDE
  // The focused part defaults to the first one. It follows the focus ring, so the arrows are all it
  // takes to pick one.
  const selectedId = parts.some(part => part.key === state.chosenId) ? state.chosenId : (parts[0]?.key ?? null)
  const selectedAt = parts.findIndex(part => part.key === selectedId)
  const selected = parts[selectedAt]
  // The room left for rows: the pane's rows less the header, the paging lines and the hint. Narrow, the
  // selected row expands in place (wrapped text, chips, its three actions, the revealed area); all of
  // it takes rows: counting them keeps the tree inside the pane, so the arrows keep walking.
  const hasInput = el.Input !== undefined
  // Roomy (a blank row between the sections of the selected card) only while the pane keeps ROOMY_LIST
  // rows for the list (narrow) or holds the whole detail card (wide); otherwise the compact layout.
  const isRoomy = selected !== undefined && (isWide ? state.bodyRows - 4 >= detailRows(state, selected, hasInput, true) : state.bodyRows - 4 - expandedRows(state, selected, hasInput, true) - ACTION_ROWS >= ROOMY_LIST)
  const gap = isRoomy ? 1 : 0
  const room = Math.max(1, state.bodyRows - (isWide ? 6 : 4 + (selected ? expandedRows(state, selected, hasInput, isRoomy) + ACTION_ROWS : 0)))
  // The selected row keeps rows of context above it, so Up reaches the previous part and not the
  // paging line.
  const from = Math.max(0, Math.min(selectedAt - Math.floor(room / 2), parts.length - room))
  const shown = parts.slice(from, from + room)
  const below = Math.max(0, parts.length - from - shown.length)

  const list = (
    <Box flexDirection="column" width={isWide ? LIST_WIDTH : undefined}>
      {from > 0 && (
        <Box flexShrink={0}>
          <Button plain key="older" label={`▲ ${from} older`} onPress={() => act.choose(parts[Math.max(0, from - 1)] ? markOf(parts[Math.max(0, from - 1)] as Part) : null)} />
        </Box>
      )}
      {shown.flatMap((part, position) => {
        const isSelected = part.key === selectedId
        const index = from + position

        return !isWide && isSelected ? [Expanded({ el, state, act, part, index, gap })] : [QuestionRow({ el, act, state, part, index, isSelected, isCard: false })]
      })}
      {below > 0 && (
        <Box flexShrink={0}>
          <Button plain key="newer" label={`▼ ${below} more`} onPress={() => act.choose(parts[Math.min(parts.length - 1, from + shown.length)] ? markOf(parts[Math.min(parts.length - 1, from + shown.length)] as Part) : null)} />
        </Box>
      )}
    </Box>
  )

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Box flexShrink={0}>
          <Text color={COLORS.attention} bold>
            Open questions
          </Text>
        </Box>
        <Box flexShrink={0}>
          <Text dimColor bold>
            {String(parts.length)}
          </Text>
        </Box>
      </Box>
      {parts.length === 0 && <Text color={COLORS.ok}>✓ All caught up</Text>}
      {isWide ? (
        <Box>
          {list}
          <Box flexDirection="column" flexGrow={1} flexShrink={1} paddingLeft={1}>
            {selected ? QuestionDetail({ el, state, act, part: selected, gap }) : null}
          </Box>
        </Box>
      ) : (
        list
      )}
      <Text dimColor wrap="truncate-end">
        ↑↓ pick · ⏎ answer
      </Text>
    </Box>
  )
}
