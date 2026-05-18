# Elephant Carpaccio — ultra-thin slicing

Source: Alistair Cockburn, ~2013. The metaphor: you can eat a whole elephant — one ultra-thin slice at a time.

## The idea

Most teams split a story into 3–5 sub-stories of M–L size each. Carpaccio pushes the technique to the extreme: split into **~8 ultra-thin slices**, each shippable in **~30 minutes**, each exercising end-to-end value flow.

Originally Cockburn used this as an **exercise** to train teams on splitting — most engineers underestimate how far they can take "thin slice". After the exercise, splitting into M-sized chunks feels lazy.

## When to use

- Training context — teams learning to split, especially when they're stuck at "but we need to build the DB first".
- High-uncertainty work where rapid feedback loops are more valuable than throughput.
- Continuous-delivery shops with mature deploy pipelines (each thin slice goes to prod).
- Demos / spikes for stakeholders — show progress every 30 minutes.

## When NOT to use

- Routine sprint work — the overhead of 8 ultra-thin tickets outweighs the value.
- Work where each deploy carries significant overhead (manual QA, release windows) — economics break.
- Brownfield refactors where the unit of value is "merged refactor", not "feature increment".

## The recipe

1. Pick a feature / story.
2. **Force yourself to identify 8 slices**, each one delivering something independently usable.
3. Each slice should be **~30 minutes** of work (rough estimate; the constraint forces creativity).
4. Each slice goes through the full pipeline (commit → CI → deploy / merge).

## Classic worked example — "Sales tax calculator"

Story: "Calculator that computes total + sales tax."

Carpaccio split:

| Slice | Capability                                                    | Time   |
| ----- | ------------------------------------------------------------- | ------ |
| 1     | Hard-coded: prints "100.00" for any input                     | 5 min  |
| 2     | Echoes the input back as the subtotal                         | 5 min  |
| 3     | Adds a fixed 5% tax to whatever the subtotal is               | 10 min |
| 4     | Accepts multiple line items, sums them                        | 15 min |
| 5     | Applies different tax rates by state (table lookup, 2 states) | 20 min |
| 6     | Adds 3rd, 4th, 5th state to the table                         | 5 min  |
| 7     | Persists the calculation to a log file                        | 15 min |
| 8     | Round to 2 decimals; format as currency                       | 10 min |

Each slice ships independently. Each adds capability. The product owner can stop at any slice and still have something useful.

## How to use as a splitting technique (vs as a training exercise)

Even outside training, Carpaccio thinking helps when:

- A team-mate says "this can't be split further" — push them through Carpaccio. They'll find at least 4 slices in a 30-minute exercise.
- The next iteration has a hard deadline and you need to ship _something_ — use Carpaccio to find the slice that ships in the available window.
- Stakeholders are asking for "weekly demos" — Carpaccio cadence matches that.

## Anti-patterns

- **Carpaccio for everything**: the 30-minute target creates ticket overhead that kills routine work. Reserve for training or high-uncertainty contexts.
- **Slices that don't exercise the full path**: a Carpaccio slice that only updates a config file isn't a slice — it's a chore. Each slice must exercise UI → service → data → observability, even if minimally.
- **Slice 1 is a one-line print**: that violates "deliver value end-to-end". Slice 1 should be the thinnest _valuable_ slice, not the thinnest _technically functional_ slice.

## Comparison to Hamburger Method

Hamburger Method:

- 3–6 slices typical.
- Each slice adds richness to specific layers.
- Output: production-ready feature increments.

Elephant Carpaccio:

- ~8 slices.
- Each slice adds _capability_ (not just richness).
- Output: training experience + ultra-fine-grained ticket flow.

Use Hamburger as the default vertical-slicing tool. Pull out Carpaccio for training or extreme uncertainty.

## Source / further reading

- Alistair Cockburn — original exercise documentation (alistair.cockburn.us, ~2013).
- The exercise is run as a 90-minute facilitated workshop in many agile training programs.
