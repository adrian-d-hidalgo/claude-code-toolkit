---
name: work-splitting
description: Use when the user asks to split a work item into smaller pieces that each deliver value — story, task, bug, spike, chore, enabler, any unit of backlog work. Trigger phrases include "split this story", "split this task", "split this bug", "this is too big", "divide esta historia", "divide esta tarea", "vertical slice this", "break into smaller deliverables", "SPIDR", "hamburger method", "elephant carpaccio", "story too big to fit a sprint".
allowed-tools:
  - Read
  - Grep
  - Glob
---

# work-splitting skill

Splits a too-big work item into smaller pieces that each pass INVEST individually — each is independently shippable and delivers value (or is an explicit Spike with time-box and exit criterion). Generic across **story, task, bug, spike, chore, enabler** — splitting techniques originally written for user stories generalise to any backlog item.

## Methodology anchor

- **Richard Lawrence — _Patterns for Splitting User Stories_** (2009). The 9 canonical patterns: workflow steps, business-rule variations, happy/unhappy path, input options & platform, data types & variations, defer performance, operations (CRUD), browser compatibility, simple/complex. Reference: [`lawrence-patterns.md`](./references/lawrence-patterns.md).
- **Mike Cohn — SPIDR** (~2017, refinement within Agile Estimating & Planning lineage): Spike / Path / Interface / Data / Rules — 5-letter mnemonic. Reference: [`spidr.md`](./references/spidr.md).
- **Gojko Adzic — Hamburger Method** (~2013). Identify layers crossed by the story, slice each layer thinly, stack the thinnest cross-section as the first ship. Reference: [`hamburger-method.md`](./references/hamburger-method.md).
- **Alistair Cockburn — Elephant Carpaccio** (~2013). Split into ~8 ultra-thin slices each shippable in ~30 minutes. Reference: [`elephant-carpaccio.md`](./references/elephant-carpaccio.md).
- **Mark Denne & Jane Cleland-Huang — Minimum Marketable Feature (MMF, 2004)**. Economic framing of the smallest shippable value increment.
- **INVEST quality bar** (Bill Wake, 2003). Each resulting slice passes Independent, Negotiable, Valuable, Estimable, Small, Testable. Canonical reference lives in the canonical INVEST reference inside the `development-plan` skill (decomposition reference §2) — not duplicated here.

## Scope and boundaries

This skill handles:

- Splitting one over-large work item into N smaller items that each pass INVEST.
- Naming the technique used per split (Lawrence pattern, SPIDR letter, Hamburger layer) so the rationale is auditable.
- Ordering the resulting items so each prior item does not block deployment of the next.

This skill does not handle:

- Authoring the original work item (use `prd-writer`, `user-story`, or domain-specific tools).
- Producing a full development plan from a spec (use `development-plan`).
- Diagnosing a bug to understand it before splitting (use `bug-analysis`).
- Writing code or tests for the resulting items.

## When to split — triggers (ANY-of)

A work item is too big if any of these apply:

- Estimate exceeds L (or > 3 ideal days of work).
- Touches > 2 subsystems / bounded contexts.
- Traces > 2 acceptance criteria.
- Requires > 1 feature flag or > 1 rollout gate to ship.
- Estimated PR diff > ~400 LoC.
- Has > 1 unknown that would need its own spike to estimate confidently.

Any trigger → split. Don't wait for all of them.

## Technique selection

| Situation                                                               | Default technique                   | Reference                                                         |
| ----------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| Work item maps onto a multi-step user workflow                          | Lawrence — workflow steps           | [`lawrence-patterns.md`](./references/lawrence-patterns.md) §1    |
| Multiple business rules bundled in one item                             | Lawrence — business-rule variations | [`lawrence-patterns.md`](./references/lawrence-patterns.md) §2    |
| Happy path + edge / error / unhappy variants                            | Lawrence — happy/unhappy path       | [`lawrence-patterns.md`](./references/lawrence-patterns.md) §3    |
| Multiple input types, platforms, or browsers                            | Lawrence — input options / platform | [`lawrence-patterns.md`](./references/lawrence-patterns.md) §4–§8 |
| Performance hardening atop functional work                              | Lawrence — defer performance        | [`lawrence-patterns.md`](./references/lawrence-patterns.md) §6    |
| Unknown blocks estimation                                               | SPIDR — Spike                       | [`spidr.md`](./references/spidr.md) §1                            |
| Same path used multiple ways (URL flow, API endpoints, query params)    | SPIDR — Path                        | [`spidr.md`](./references/spidr.md) §2                            |
| Different interfaces (UI / API / CLI) for the same capability           | SPIDR — Interface                   | [`spidr.md`](./references/spidr.md) §3                            |
| Multiple data shapes / formats / sources                                | SPIDR — Data                        | [`spidr.md`](./references/spidr.md) §4                            |
| Combined business rules                                                 | SPIDR — Rules                       | [`spidr.md`](./references/spidr.md) §5                            |
| Story crosses many architectural layers; need thinnest end-to-end first | Hamburger Method                    | [`hamburger-method.md`](./references/hamburger-method.md)         |
| Need to demonstrate continuous flow of small shippable increments       | Elephant Carpaccio                  | [`elephant-carpaccio.md`](./references/elephant-carpaccio.md)     |

When in doubt: **Lawrence workflow-steps** + **Hamburger Method** are the workhorse defaults.

## Workflow

1. **Confirm the trigger fires.** State which trigger(s) apply. If none fire, the item likely doesn't need splitting — push back.
2. **Identify the work-item type** (story / task / bug / spike / chore / enabler) — adjusts which technique fits best.
3. **Select the technique** with a one-sentence rationale.
4. **Produce sub-items**, each with:
   - Title (actionable verb + entity).
   - Description (what's IN, what's OUT for this slice).
   - The splitting-technique tag used (Lawrence pattern name, SPIDR letter, Hamburger layer, or `N/A` if it's a Spike).
   - Estimate (S / M / L; if any sub-item is still > S, recurse).
   - Order for shippability (sequence so each prior item does not block deploying the next).
5. **Self-check** against INVEST per sub-item. Drop or merge any sub-item that fails.
6. **Emit** the structured list. The caller decides storage / how to materialise.

## Output structure

The skill emits a structured list. Suggested shape (caller adapts):

```markdown
## Split rationale

Trigger(s) that fired: <list>.
Technique selected: <name> (Lawrence §N | SPIDR letter | Hamburger layer | Carpaccio).
Rationale: <one sentence>.

## Sub-items

### S-01 — <Title>

**Type**: Story | Spike | Chore | Infra | Migration
**Splitting technique applied**: <Lawrence pattern N> / <SPIDR letter> / <Hamburger layer> / N/A
**Description**: <scope-bounded>
**Estimate**: S / M / L
**INVEST self-check**: I ✓ · N ✓ · V ✓ · E ✓ · S ✓ · T ✓

### S-02 — …
```

The caller decides whether these go into a tasks list, a Jira board, a wiki page, or any other store. The skill imposes no file paths.

## Self-check (mandatory before emission)

- [ ] Each sub-item passes INVEST individually (Spike sub-items pass IS T at minimum + have a time-box + exit criterion).
- [ ] Each sub-item carries the splitting technique used (or `N/A` with rationale).
- [ ] No sub-item is a protocol artifact (triage, ADR, test plan, threat model are _outputs of planning_, not work items).
- [ ] No sub-item is a pure horizontal slice ("build the DB", "build the API", "build the UI" as separate items without a justification).
- [ ] Sub-items are ordered for shippability — each prior item does not block deploying the next.
- [ ] If any sub-item is still > S estimate, recurse (split again).
- [ ] Every claim about size, dependency, or unknown carries an evidence level per the engineering-team evidence-rule convention (at the plugin-root references directory).

## Anti-patterns to reject

See [`anti-patterns.md`](./references/anti-patterns.md) for the full list. Highlights:

- Horizontal slicing as default (DB → API → UI as separate stories without justification).
- "Easy parts first" — leaves the risky core for last.
- Mock-only splits (sub-item delivers nothing usable to anyone).
- Untestable sub-items.
- Splits that don't reduce risk — same number of unknowns, just spread across more tickets.

## Communication

- Lead with the **trigger that fired** and the **technique chosen**, not with the list of sub-items. The reader needs to see _why_ before _what_.
- Cite the methodology by name (`Lawrence §1 workflow steps`, `SPIDR S — Spike`, etc.) so the rationale is auditable.
- If the item is genuinely small and shouldn't be split, say so — don't fabricate splits to satisfy a request.

## Reference index

- [`references/lawrence-patterns.md`](./references/lawrence-patterns.md) — 9 patterns with one worked example each.
- [`references/spidr.md`](./references/spidr.md) — Cohn's 5 techniques, when to use each.
- [`references/hamburger-method.md`](./references/hamburger-method.md) — Adzic's layer-stacking with example.
- [`references/elephant-carpaccio.md`](./references/elephant-carpaccio.md) — Cockburn's ultra-thin slicing exercise.
- [`references/anti-patterns.md`](./references/anti-patterns.md) — common bad splits with the corrections.
