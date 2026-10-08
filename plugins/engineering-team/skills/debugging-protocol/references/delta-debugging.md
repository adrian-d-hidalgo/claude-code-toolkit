# Delta debugging — minimise failure-inducing input

Source: Andreas Zeller and Ralf Hildebrandt, "Simplifying and Isolating Failure-Inducing Input", IEEE Transactions on Software Engineering (2002); origin in Zeller's earlier work (1999).

## When to use

When the symptom is triggered by a specific input (a file, a config, a request, a state), but the input is large or complex and you don't know which part of it actually causes the failure.

**Example situations**:

- "This 50 MB JSON file crashes the importer. Which field causes it?"
- "The user reports the bug only happens when they have these 47 settings enabled. Which combination matters?"
- "The failing test passes when I delete random lines from the test setup — which line is load-bearing?"

## The idea

Treat the input as a set of "deltas" — atomic pieces you can keep or remove. The algorithm:

1. Try removing half the deltas. If the bug STILL occurs → that half is irrelevant; remove it permanently. If the bug DISAPPEARS → that half contains the cause; keep it.
2. Repeat on the remaining half, splitting further.
3. Stop when removing any one remaining delta makes the bug disappear — the remaining set is **1-minimal**: every part of it is necessary for the failure.

Complexity: O(log n) in the best case, O(n²) worst case. Almost always much faster than guessing.

## Worked example — narrowing a JSON-import crash

50 MB JSON file → crash. Manual investigation impossible.

Cycle:

- Delete first half of the records → bug GONE. Cause is in first half.
- Delete first quarter of remaining → bug PERSISTS. Cause is in last quarter (between record 25%–50%).
- Continue bisecting until you have 1 record that crashes.
- Now bisect the FIELDS of that record:
  - Delete half the fields → bug GONE. Cause is in deleted half.
  - Recursively narrow down.
- End state: one specific field in one specific record reliably crashes. Inspect that field.

Result: the field is a 200 KB string containing an unescaped Unicode surrogate that the JSON-parser can't handle.

## Automated tools

- `creduce` — for C / C++ source-input minimisation.
- `picireny` / `picire` — Python implementations for arbitrary input formats.
- `git bisect run` — applies the same idea to commit history (different domain, same algorithm).
- DIY: any input where you can write a deterministic reproduce script can be delta-debugged with ~30 lines of Bash.

## Manual delta-debugging when no tool fits

If automation isn't feasible:

1. Define the "atoms" of the input (lines, records, fields, settings, requests, …).
2. Maintain two sets: **kept** (proven necessary) and **candidates** (under test).
3. Test set = kept ∪ half(candidates). Run reproduce.
4. If bug present: candidates ← that half. Else: candidates ← other half.
5. Stop when |candidates| == 1 or removing it eliminates the bug.

Time-box: if the manual loop takes more than ~30 minutes, write the automation. The investigation is bottlenecked on you, not the system.

## When delta-debugging is the wrong tool

- **Non-deterministic bug**: needs many runs per candidate → cost balloons.
- **Bug depends on environment, not input**: minimise the environment instead (see `git-bisect.md` for commit-level environment).
- **No atomic decomposition possible**: if the input is monolithic and indivisible, find a different angle.
- **You already have a strong hypothesis from observability**: test the hypothesis directly instead.

## Anti-patterns

- **No reproduce script**: delta-debugging needs a deterministic "did the bug happen?" check. Without it, the loop is unreliable.
- **Skipping the minimisation step**: a 50 MB input is hard to share, hard to attach to a bug report, hard to use as a regression test. Minimising it produces a tiny reproducer worth including in the test suite forever.
- **Stopping at "smaller, but still fails"**: 1-minimality is the contract. Keep removing until removing anything makes the bug disappear.

## Output integration

If used in `debugging-protocol`, record:

- Original input size.
- Final minimal input.
- Number of test runs taken.
- The minimal input as evidence: `E-NN: 80-byte JSON `{"items":[{"name":"…"}]}` reliably reproduces the crash [Verified — automated delta-debugging, 22 test runs]`.

The minimal reproducer should become a regression test, recommended in the `bug-analysis` output.

## Cross-reference

- For commit-history bisection: [`git-bisect.md`](./git-bisect.md).
- For production debugging without input access: [`observability-first.md`](./observability-first.md).
- Zeller original paper: "Yesterday, my program worked. Today, it does not. Why?" (1999).
