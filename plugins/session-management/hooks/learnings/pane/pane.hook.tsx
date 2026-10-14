import type { Learning } from '../../../types'
import { COLORS } from '../../shared/palette/palette.hook'
import { ago } from '../../shared/format/format.hook'
import { linesIn } from '../../questions/pane/pane.hook'
import { effectOf } from '../effect/effect.hook'
import type { Effect } from '../effect/effect.hook'
import { needsReview } from '../kinds/kinds.hook'
import { lintLearning } from '../rules/rules.hook'

export type LearningsPaneState = {
  /** The session's whole ledger in the commands' order (what waits first), so `#n` means the same everywhere. */
  list: Learning[]
  /** The learning the person picked, if any; by default the first one waiting. */
  chosenId: string | null
  /** The learning whose details (what each answer does, its why and how) are revealed. */
  openId: string | null
  /** The learning whose comment box is open, if any. */
  commentingId: string | null
  /** What has been typed in it so far. */
  draft: string
  /** False while another pane holds the focus: the cards draw their borders dim. */
  isFocused?: boolean
  now: number
  columns: number
  bodyRows: number
}

// The pane lists only what waits for the person, like the questions pane: what is in memory or was
// refused is reached with the commands (`/learnings list all`).
export type LearningsPaneActions = {
  choose: (id: string | null) => unknown
  /** Reveals (or hides, with null) the details of a learning. */
  setOpen: (id: string | null) => unknown
  accept: (id: string) => unknown
  reject: (id: string) => unknown
  /** Opens (or closes, with null) the comment box of a learning. */
  setCommenting: (id: string | null) => unknown
  type: (text: string) => unknown
  /** Sends the comment to Claude, which revises the learning; it keeps waiting. */
  comment: (id: string, text: string) => unknown
  /** Puts `/learnings edit <n> text …` in the prompt box. */
  edit: (id: string) => unknown
  /** Accepts everything waiting. */
  acceptAll: () => unknown
}

type Elements = { Box: any; Text: any; Button: any; Input?: any }

// From this many columns the pane shows the list and the selected learning side by side.
export const WIDE = 84
const LIST_WIDTH = 38
// Narrow, the actions inside the selected card: Accept, Reject, Comment and Details, side by side on one row.
const ACTION_ROWS = 1

const capital = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

const effectFor = (one: Learning, list: readonly Learning[]): Effect => effectOf(one, list) ?? { tag: 'new', yes: 'accept', no: 'reject', onYes: '', onNo: '' }

// What the details say, line by line: what each answer does, then where the learning comes from.
const detailsOf = (one: Learning, list: readonly Learning[]): string[] => {
  const effect = effectFor(one, list)
  const broken = lintLearning(one)

  return [
    `If you ${effect.yes}: ${effect.onYes}`,
    `If you ${effect.no}: ${effect.onNo}`,
    `Why: ${one.why === '' ? 'missing, and it is needed to accept' : one.why}`,
    ...(one.how ? [`How to apply: ${one.how}`] : []),
    ...(broken.length > 0 ? [`Breaks the rules: ${broken.join('; ')}`] : []),
  ]
}

// What Details reveals: a bordered sub-card under the selected learning, with Edit to reword it in the
// prompt box. Drawn only while open, so its keys never exist before that. `gap` is the blank row above
// it when the card is roomy.
const Details = ({ el, state, act, one, gap }: { el: Elements; state: LearningsPaneState; act: LearningsPaneActions; one: Learning; gap: number }) => {
  const { Box, Text, Button } = el
  // Roomy, a bordered sub-card; compact (a tight pane), the same area without its frame, which saves 2 rows.
  const frame = gap > 0 ? { flexDirection: 'column', marginTop: gap, borderStyle: 'single', borderColor: COLORS.faint, borderDimColor: state.isFocused === false, paddingX: 1 } : { flexDirection: 'column' }

  return (
    <Box {...frame}>
      <Text color={COLORS.accent} bold wrap="truncate-end">
        Details
      </Text>
      {detailsOf(one, state.list).map((line, position) => (
        <Text key={`detail-${one.id}-${position}`} wrap="wrap" dimColor={position === 1}>
          {line}
        </Text>
      ))}
      <Box flexShrink={0}>
        <Button plain dimColor key={`edit-${one.id}`} hotkey="e" label="Edit in the prompt" onPress={() => act.edit(one.id)} />
      </Box>
    </Box>
  )
}

// What Comment reveals: a box for what Claude should change, sent with Enter. Drawn only while open, so
// its keys never exist before that.
const CommentBox = ({ el, state, act, one, gap }: { el: Elements; state: LearningsPaneState; act: LearningsPaneActions; one: Learning; gap: number }) => {
  const { Box, Text, Button, Input } = el

  if (!Input) {
    return null
  }

  const frame = gap > 0 ? { flexDirection: 'column', marginTop: gap, borderStyle: 'single', borderColor: COLORS.faint, borderDimColor: state.isFocused === false, paddingX: 1 } : { flexDirection: 'column' }

  return (
    <Box {...frame}>
      <Text color={COLORS.accent} bold wrap="truncate-end">
        Comment · Claude revises it
      </Text>
      <Box>
        <Box flexGrow={1} flexShrink={1}>
          <Input key={`comment-box-${one.id}`} autoFocus value={state.draft} placeholder="What should change" submitLabel="send" onInput={(value: string) => act.type(value)} onSubmit={(value: string) => act.comment(one.id, value)} />
        </Box>
        <Box flexShrink={0}>
          <Button plain key={`comment-cancel-${one.id}`} label=" ✕" onPress={() => act.setCommenting(null)} />
        </Box>
      </Box>
    </Box>
  )
}

// The actions every learning waiting has, in this order, named by what they do to it (accept,
// apply, retire…). `prefix` is `qa-` on the narrow actions in the selected card and empty in the wide
// detail; only one of the two is ever drawn, so no letter is bound twice.
const Actions = ({ el, state, act, one, prefix }: { el: Elements; state: LearningsPaneState; act: LearningsPaneActions; one: Learning; prefix: string }) => {
  const { Button } = el
  const effect = effectFor(one, state.list)

  // A plain array, not a fragment: the engine wraps a fragment in a column box of its own.
  return [
    <Button plain key={`${prefix}accept-${one.id}`} hotkey="a" label={capital(effect.yes)} onPress={() => act.accept(one.id)} />,
    <Button plain key={`${prefix}reject-${one.id}`} hotkey="r" label={capital(effect.no)} onPress={() => act.reject(one.id)} />,
    ...(el.Input ? [<Button plain key={`${prefix}comment-${one.id}`} hotkey="c" label="Comment" onPress={() => act.setCommenting(state.commentingId === one.id ? null : one.id)} />] : []),
    <Button plain dimColor key={`${prefix}details-${one.id}`} hotkey="d" label="Details" onPress={() => act.setOpen(state.openId === one.id ? null : one.id)} />,
  ]
}

// Only what the row does not say already: its kind, what it is in the queue, how long ago, how often it came up.
const metaOf = (state: LearningsPaneState, one: Learning): string =>
  [one.kind, effectFor(one, state.list).tag, ago(one.at, state.now), one.seen > 1 ? `seen ${one.seen}×` : ''].filter(Boolean).join(' · ')

const cardProps = (state: LearningsPaneState) => ({
  borderStyle: 'round',
  borderColor: COLORS.accent,
  borderDimColor: state.isFocused === false,
  paddingX: 1,
  flexDirection: 'column',
})

// Narrow, the selected row as a card: its row, the full text, the chips, its actions and, while open,
// the details.
const Expanded = ({ el, state, act, one, index, gap }: { el: Elements; state: LearningsPaneState; act: LearningsPaneActions; one: Learning; index: number; gap: number }) => {
  const { Box, Text } = el

  return (
    <Box {...cardProps(state)}>
      {LearningRow({ el, state, act, one, index, isSelected: true, isCard: true })}
      <Box marginTop={gap}>
        <Text dimColor>{metaOf(state, one)}</Text>
      </Box>
      <Box gap={1} marginTop={gap}>
        {Actions({ el, state, act, one, prefix: 'qa-' })}
      </Box>
      {state.commentingId === one.id && CommentBox({ el, state, act, one, gap })}
      {state.openId === one.id && Details({ el, state, act, one, gap })}
    </Box>
  )
}

// Wide, the selected learning in full beside the list, as a card.
const LearningDetail = ({ el, state, act, one, gap }: { el: Elements; state: LearningsPaneState; act: LearningsPaneActions; one: Learning; gap: number }) => {
  const { Box, Text } = el

  return (
    <Box {...cardProps(state)} flexGrow={1} flexShrink={1}>
      <Text wrap="wrap" bold>
        {one.text}
      </Text>
      <Box marginTop={gap}>
        <Text dimColor>{metaOf(state, one)}</Text>
      </Box>
      <Box gap={2} marginTop={gap}>
        {Actions({ el, state, act, one, prefix: '' })}
      </Box>
      {state.commentingId === one.id && CommentBox({ el, state, act, one, gap })}
      {state.openId === one.id && Details({ el, state, act, one, gap })}
    </Box>
  )
}

// One learning: a single line and a single stop for the arrows; Enter is the same as Details. Unselected
// it is `N text tag`; as the head of the narrow card (`isCard`) its text wraps in full.
const LearningRow = ({ el, state, act, one, index, isSelected, isCard }: { el: Elements; state: LearningsPaneState; act: LearningsPaneActions; one: Learning; index: number; isSelected: boolean; isCard: boolean }) => {
  const { Box, Text, Button } = el
  const tag = effectFor(one, state.list).tag.split(' ')[0] ?? ''

  return (
    <Box>
      {!isCard && (
        <Box flexShrink={0}>
          <Text color={COLORS.accent}>{isSelected ? '▸ ' : '  '}</Text>
        </Box>
      )}
      {/* Its own non-shrinking box: a Button whose label does not fit is dropped by the engine. */}
      <Box flexShrink={0}>
        <Button plain dimColor={!isSelected} key={`row-${one.id}`} label={String(index + 1).padStart(2)} onPress={() => act.setOpen(state.openId === one.id ? null : one.id)} />
      </Box>
      <Box flexGrow={1} flexShrink={1} marginLeft={1}>
        <Text wrap={isCard ? 'wrap' : 'truncate-end'} bold={isSelected}>
          {one.text}
        </Text>
      </Box>
      {!isCard && (
        <Box flexShrink={0} marginLeft={1}>
          <Text dimColor>{tag}</Text>
        </Box>
      )}
    </Box>
  )
}

// The rows of the revealed details for a card `inner` columns wide, without the blank row above them;
// 0 when they are hidden.
const detailsRows = (state: LearningsPaneState, one: Learning, inner: number, isRoomy: boolean): number => {
  if (state.openId !== one.id) {
    return 0
  }

  // The sub-card's border and padding take 4 more columns and 2 rows, when roomy.
  const width = Math.max(4, inner - (isRoomy ? 4 : 0))

  // The border, the title, the lines and Edit.
  return (isRoomy ? 2 : 0) + 1 + detailsOf(one, state.list).reduce((sum, line) => sum + linesIn(line, width), 0) + 1
}

// The rows of the open comment box: its border (roomy), title and field.
const commentRows = (state: LearningsPaneState, one: Learning, hasInput: boolean, isRoomy: boolean): number => (state.commentingId === one.id && hasInput ? (isRoomy ? 3 : 0) + 2 : 0)

// The rows the selected learning takes in the narrow list beyond its own single line: the card's two
// border rows, what its text wraps to, the chips and, while open, the details. Its actions (ACTION_ROWS)
// are counted apart. A roomy card also has a blank row above the chips, the actions and the details.
const expandedRows = (state: LearningsPaneState, one: Learning, hasInput: boolean, isRoomy: boolean): number => {
  // The pane's padding (2), the card's border (2) and its padding (2) leave this width inside the card.
  const inner = Math.max(8, state.columns - 6)
  const wrapped = linesIn(one.text, Math.max(8, state.columns - 11)) - 1
  const meta = linesIn(metaOf(state, one), inner) + 2
  const details = detailsRows(state, one, inner, isRoomy)

  return wrapped + meta + details + commentRows(state, one, hasInput, isRoomy) + (isRoomy ? 2 + (details > 0 ? 1 : 0) : 0)
}

// The wide detail card, in rows: border, text, chips, actions and the details, with its blank rows.
const detailRows = (state: LearningsPaneState, one: Learning, hasInput: boolean, isRoomy: boolean): number => {
  // The pane (2), the list (38), the gap (1) and the card's border and padding (4) leave this width.
  const inner = Math.max(8, state.columns - 45)
  const details = detailsRows(state, one, inner, isRoomy)

  return 2 + linesIn(one.text, inner) + linesIn(metaOf(state, one), inner) + 1 + details + commentRows(state, one, hasInput, isRoomy) + (isRoomy ? 2 + (details > 0 ? 1 : 0) : 0)
}

// Rows the list keeps at least when the selected card is roomy; a tighter pane gets the compact card.
const ROOMY_LIST = 3

export const renderLearningsPane = (el: Elements, state: LearningsPaneState, act: LearningsPaneActions) => {
  const { Box, Text, Button } = el
  const { columns } = state
  // What waits comes first in the ledger's order, so a learning's place here is its `#n` everywhere.
  const waiting = state.list.filter(needsReview)
  const isWide = columns >= WIDE
  const selectedAt = Math.max(0, waiting.findIndex(one => one.id === state.chosenId))
  const selected = waiting[selectedAt]
  const hasInput = el.Input !== undefined
  // Accept all takes a row of its own while more than one waits.
  const header = waiting.length > 1 ? 1 : 0
  // Roomy only while the pane keeps ROOMY_LIST rows for the list (narrow) or holds the whole detail card (wide).
  const isRoomy = selected !== undefined && (isWide ? state.bodyRows - 4 - header >= detailRows(state, selected, hasInput, true) : state.bodyRows - 4 - header - expandedRows(state, selected, hasInput, true) - ACTION_ROWS >= ROOMY_LIST)
  const gap = isRoomy ? 1 : 0
  const room = Math.max(1, state.bodyRows - header - (isWide ? 6 : 4 + (selected ? expandedRows(state, selected, hasInput, isRoomy) + ACTION_ROWS : 0)))
  // The selected row keeps rows of context above it, so Up reaches the previous learning and not the paging line.
  const from = Math.max(0, Math.min(selectedAt - Math.floor(room / 2), waiting.length - room))
  const shown = waiting.slice(from, from + room)
  const below = Math.max(0, waiting.length - from - shown.length)

  const list = (
    <Box flexDirection="column" width={isWide ? LIST_WIDTH : undefined}>
      {from > 0 && (
        <Box flexShrink={0}>
          <Button plain key="older" label={`▲ ${from} older`} onPress={() => act.choose(waiting[from - 1]?.id ?? null)} />
        </Box>
      )}
      {shown.map((one, position) => {
        const isSelected = one.id === selected?.id
        const index = from + position

        return !isWide && isSelected ? Expanded({ el, state, act, one, index, gap }) : LearningRow({ el, state, act, one, index, isSelected, isCard: false })
      })}
      {below > 0 && (
        <Box flexShrink={0}>
          <Button plain key="newer" label={`▼ ${below} more`} onPress={() => act.choose(waiting[from + shown.length]?.id ?? null)} />
        </Box>
      )}
    </Box>
  )

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box justifyContent="space-between">
        <Box flexShrink={0}>
          <Text color={COLORS.accent} bold>
            Learnings to review
          </Text>
        </Box>
        <Box flexShrink={0}>
          <Text dimColor bold>
            {String(waiting.length)}
          </Text>
        </Box>
      </Box>
      {waiting.length > 1 && (
        <Box flexShrink={0}>
          <Button plain key="accept-all" label={`✓ Accept all ${waiting.length}`} onPress={() => act.acceptAll()} />
        </Box>
      )}
      {waiting.length === 0 && <Text color={COLORS.ok}>✓ All caught up</Text>}
      {isWide ? (
        <Box>
          {list}
          <Box flexDirection="column" flexGrow={1} flexShrink={1} paddingLeft={1}>
            {selected ? LearningDetail({ el, state, act, one: selected, gap }) : null}
          </Box>
        </Box>
      ) : (
        list
      )}
      <Text dimColor wrap="truncate-end">
        ↑↓ pick · ⏎ details
      </Text>
    </Box>
  )
}
