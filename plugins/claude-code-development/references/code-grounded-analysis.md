# Code-grounded analysis — transversal convention

Every engineering-team agent in `claude-code-development` produces **claims grounded in the actual code or artefact**, not in plausible-sounding generalities. Before opining, recommending, or designing, the agent reads the relevant files and resolves named symbols to concrete `file:line` locations.

This convention is symmetric with [`evidence-rule.md`](./evidence-rule.md): grounding produces `[Verified]` claims; failing to ground produces `[Inference]` or `[Unverified]` claims that must be tagged as such.

## What grounding means

Three concrete behaviours, all required:

1. **Read before opining.** Before recommending a change, refactor, fix, or design, read the file the recommendation acts on — at least the relevant function, class, or section. Reading a path string from a description is not reading the code.
2. **Resolve symbols to `file:line`.** When naming a function, class, table, endpoint, or config key, cite where it lives: `src/auth/session.ts:42`, `db/migrations/0042_users.sql:8`, `config/app.yaml:line 17`. Names without locations are unverifiable.
3. **Check neighbouring code for invariants.** Before changing a function, scan the surrounding module for invariants the change might violate (concurrency assumptions, validation expected from the caller, error-handling protocols, retry semantics).

## When grounding is most important

Grounding scales with risk:

| Task type | Minimum grounding |
|---|---|
| Code review | Read the diff + the surrounding ±20 lines + any function the diff calls |
| Architecture decision | Read the modules the decision affects + any prior ADRs on the same surface |
| Bug analysis / RCA | Read the failing code path end-to-end + the test that exposed it + recent commits in the area |
| Test strategy | Read the public API surface being tested + any contract / acceptance criteria |
| Threat modelling | Read entry points (controllers, handlers, listeners) + auth + data-store interfaces |
| Implementation planning | Read every file the plan claims a sub-task will touch |
| Refactor proposal | Read every caller of the symbol being refactored (use codegraph or grep) |

A claim made without the minimum grounding for its task type is `[Inference]` or `[Unverified]` — and must be tagged that way per [`evidence-rule.md`](./evidence-rule.md).

## How to ground efficiently

Order operations cheapest-first to avoid wasted reads:

1. **Codegraph first when available.** `codegraph_search`, `codegraph_callers`, `codegraph_impact` answer structural questions in one call. Falling through to grep is wasted budget if codegraph is present.
2. **Grep for literal strings, comments, log messages, error texts.** Codegraph indexes symbols, not free-form text.
3. **Read targeted ranges.** When a structural query points to `file:line`, read a tight window around it (typically 30–60 lines). Reading whole files is rarely required.
4. **Walk recent history when the symptom is "this changed recently".** `git log --oneline -20 -- <path>`, `git log -S "<token>"`, `git blame -L <range> <file>` reveal the commit that introduced the surface in question.
5. **Read prior ADRs / specs when the surface is design-sensitive.** If an ADR already decided X, do not re-open it; cite it and proceed.

## Spec-vs-reality drift

When the plan, PRD, ADR, or spec under review **contradicts the code as it actually exists**, the agent surfaces the contradiction explicitly — it does not silently improvise or assume the spec is right.

Surfacing the drift:

- Cite both sides: `[Verified — src/auth/session.ts:88 stores token in cookie] vs [Verified — PRD §4 states token stored in Authorization header]`.
- State what the agent observed and what the document claims.
- Stop and ask. Do not improvise the resolution.

This rule is symmetric with the developer's "No silent plan drift" hard rule and the code-planner's intake-triage protocol. Every agent flags drift on its surface; the integration point for resolution is the code-planner.

## Anti-patterns

- **Recommending changes to a function not yet read** — the recommendation describes the agent's mental model, not the code.
- **Naming a symbol without `file:line`** — readers cannot verify; reviewers cannot navigate; the claim is not grounded.
- **"Looks like X" without showing X** — pattern-matching against language conventions without consulting the file.
- **Citing line numbers from a stale read** — if the file was edited in the same session by another tool, re-read before citing.
- **Trusting type names over actual behaviour** — a function called `validateInput` may not validate; read the body before relying on the name.
- **Ground once, opine forever** — for sustained work, re-ground when entering a new module; the assumptions that held in module A do not hold in module B.
- **Skipping the recent-commits scan when the symptom is "it suddenly broke"** — uncommitted changes and recent commits are the most common cause and the cheapest to check.

## How each agent applies this

| Agent | Grounding mandate |
|---|---|
| code-reviewer | Read every file the diff touches + immediate neighbours; cite findings with `file:line`. |
| debugger | Inventory available tools, read git timeline, read the failing path before hypothesising. |
| quality-engineer | Read the public surface under test + the acceptance criteria; cite AC IDs that map to tests. |
| security-engineer | Read entry points and trust-boundary code before drawing the DFD; cite each finding with `file:line`. |
| software-architect | Read affected modules + prior ADRs; cite the modules each ADR option would impact. |
| software-developer | Read the relevant code and its tests before writing the first line (engineering rule #1). |
| code-planner | Triage by reading the code against the PRD/spec; cite contradictions; do not assume the spec is right. |
| data-engineer | Read existing schema, migrations, query call sites; cite consumers of any dataset being modeled. |

## Cross-reference

- [`tool-surface-inventory.md`](./tool-surface-inventory.md) — the paired convention covering *which tools to run* to obtain structural signal (linter, type-check, codegraph, MCPs, profiler). Code-grounded analysis defines *what to read*; tool-surface inventory defines *which tools produce the read-worthy signal*. Apply both together.

Each agent body has a short section pointing to this file, not duplicating the convention. Specific reading patterns per task type live in agents' own bodies.
