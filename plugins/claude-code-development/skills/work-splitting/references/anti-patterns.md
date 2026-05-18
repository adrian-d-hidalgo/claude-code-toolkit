# work-splitting — anti-patterns

Patterns the skill rejects (or flags with severity) when reviewing a proposed split.

## §1 — Horizontal slicing as default

**Bad**:

- S-01: Build the database schema.
- S-02: Build the API endpoint.
- S-03: Build the UI.

**Why wrong**: No sub-item delivers user value alone. The system is unshippable until S-03 lands. Feedback only arrives at the end.

**Fix**: Slice vertically. Use Hamburger Method to compose the thinnest end-to-end first slice, then add richness per subsequent slice.

**When horizontal is OK**: when each layer alone delivers value to a real consumer. Example: shipping a public API layer is valuable to integration partners _before_ a UI exists. State the consumer explicitly to justify a horizontal split.

## §2 — "Easy parts first"

**Bad**:

- S-01: Set up the new repo.
- S-02: Add lint config.
- S-03: Add CI pipeline.
- S-04: Actually implement the feature.

**Why wrong**: The risky core is deferred. S-04 carries all the unknowns; if it slips, S-01–S-03 were waste. The team feels "productive" while the actual feature is unshipped.

**Fix**: Tackle the risky core _first_ (as a Spike if there are unknowns). Mechanical setup is fine as a small Enabler before the core, but shouldn't dominate the split.

## §3 — Mock-only slices

**Bad**:

- S-01: Add a UI that calls a hard-coded mock.
- S-02: Add the backend.

**Why wrong**: S-01 ships nothing real to users. It's demo theatre. Velocity looks high; product value is zero.

**Fix**: First slice must hit real infrastructure end-to-end, even if the infrastructure is the thinnest possible (LIKE query on a small table, in-memory store, stub returning hardcoded-but-real data).

**When OK**: occasionally for stakeholder demos where the goal is to validate UX before committing to backend work. Always tag explicitly as `Demo / Stub`, not as a real slice.

## §4 — Untestable sub-items

**Bad**:

- S-01: Refactor the auth module to be "more modular".

**Why wrong**: No verifiable Definition of Done. "More modular" is opinion. Tests don't change. Nothing is observable.

**Fix**: Either reframe with a concrete invariant (extract X interface so that Y caller can swap implementations — verified by adding a fake implementation in tests), or recognise this is not a story and move it to a refactor enabler with explicit DoD (e.g., "tests pass identically; new interface allows mocking in tests T-NN, T-NN").

## §5 — Splits that don't reduce risk

**Bad**: take an L-sized item with 5 unknowns and split into 5 L-sized sub-items each carrying 1 unknown.

**Why wrong**: same total uncertainty, more tickets, more handoff overhead.

**Fix**: a good split **either** (a) defers low-value parts to later, (b) collapses an unknown via a Spike, (c) parallelises independent work, or (d) reduces the unit of risk by making each sub-item smaller and reviewable.

## §6 — Sub-items that are protocol artifacts

**Bad**:

- S-01: Run the triage.
- S-02: Write the ADR.
- S-03: Build the test plan.
- S-04: Implement the feature.

**Why wrong**: Triage, ADRs, and test plans are _outputs of planning_ (or other agents' work), not execution units the developer picks up. Including them as sub-items confuses scope.

**Fix**: Planning artifacts live upstream. Sub-items are developer-actionable execution units. If a planning artifact is missing, surface it in the triage / Open Questions, don't make it a sub-task.

## §7 — Splits that don't pass INVEST

**Bad**: any sub-item failing one of:

- **I**ndependent — depends in a circular or unbreakable way on a sibling.
- **N**egotiable — locked to implementation detail ("uses Redis via lpush").
- **V**aluable — delivers nothing user-perceivable or unblocking.
- **E**stimable — too vague to size.
- **S**mall — > L estimate; needs further splitting.
- **T**estable — no verifiable DoD.

**Fix**: rewrite or merge until each passes. INVEST is the gate; failing it means the split isn't done.

## §8 — Naming the technique without applying it

**Bad**: "Applied SPIDR" with no explanation of _which letter_ and _how the data shape_ mapped to the technique.

**Fix**: cite the letter explicitly (e.g., "SPIDR — D: split by data source"), and show the mapping ("source = CSV / vCard / Google API → three sub-items").

## §9 — Premature carpaccio

**Bad**: splitting a routine story into 8 ultra-thin slices because "we should always carpaccio".

**Why wrong**: ticket overhead overwhelms value. Carpaccio is a training exercise or extreme-uncertainty tool, not a default.

**Fix**: default to Lawrence + Hamburger Method. Use Carpaccio when context warrants (training, high uncertainty, demo cadence required).

## §10 — Splits that ignore code-grounded reality

**Bad**: proposing a split where the named modules / files / endpoints don't exist in the actual repo.

**Why wrong**: the split is fiction. Developers can't pick up sub-items referencing nonexistent files.

**Fix**: read the actual code (`Read`, `Grep`, `Glob`) before proposing splits. Every file / module / symbol named exists in the repo or is explicitly tagged `to create`. Per `../../references/evidence-rule.md`, this falls under `[Verified]` claims.
