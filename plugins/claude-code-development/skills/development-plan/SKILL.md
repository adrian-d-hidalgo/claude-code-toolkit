---
name: development-plan
description: Use when the user asks to turn a PRD, tech-spec, or approved design into an executable development plan — ordered tasks, dependencies, PR sequencing, spikes for unknowns, Definition of Done per task. Trigger phrases include "development plan", "implementation plan", "plan de desarrollo", "plan de ejecución", "task breakdown", "break this spec into tasks", "WBS", "story map", "how do we sequence the PRs for [X]", "what's the rollout for [feature]", "split this epic into stories with dependencies".
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(ls *)
---

# Development plan skill

Produces the bridge between **spec** (PRD + tech-spec + ADRs) and **code** (developer execution). Output is two structured content blocks — a **Plan** (strategy + sequencing) and **Sub-tasks** (ordered, classified, developer-actionable). Caller decides storage (file, ticket, wiki, anywhere). Decomposition follows **story mapping** (Patton, 2014), **vertical slicing** (Cohn, 2004 / INVEST), or **WBS** (PMBOK 7) per fit; "done" criteria trace back to **acceptance criteria** from the PRD; **Direct Value vs Enabler** classification per SAFe 6.0.

## Methodology anchor

- **Artifact format**: GitHub spec-kit conventions (`plan` strategy block + ordered `tasks` block). Compatible with Kiro (AWS) and any spec-driven workflow.
- **Decomposition**: Story Mapping (Patton 2014) for journey-shaped features · Vertical Slicing (Cohn 2004) with INVEST quality bar (Wake 2003) — default · WBS (PMBOK 7, 2021) for structured / regulated / dependency-heavy work.
- **Task too big?** Invoke `claude-code-development:work-splitting` (Lawrence patterns / SPIDR / Hamburger / Carpaccio).
- **Work item is a bug?** Invoke `claude-code-development:bug-analysis` BEFORE planning — you can't plan a fix you haven't analysed.
- **Sequencing**: expand–contract (schema/API migrations) · feature flags (risky rollouts) · strangler-fig (replacements) · branch-by-abstraction (internal refactors) — detail in [`references/pr-sequencing.md`](./references/pr-sequencing.md).
- **Classification**: Direct Value vs Enabler (SAFe 6.0, Scaled Agile Inc. 2023) — every sub-task carries a `Class:` field.
- **Quality bar**: every sub-task is developer-actionable, independently testable + deliverable, traces an AC (or `Enables:` a DV sub-task), vertically sliced.

## What a development plan is — and is not

A development plan **is**:

- Scoped to a specific approved spec (one PRD / one tech-spec / one epic).
- Ordered — sub-tasks have explicit dependencies, not a flat list.
- Sliced vertically — each sub-task delivers thin end-to-end value (or is an explicit enabler with rationale).
- Traceable — every sub-task references at least one AC from the PRD (or an Enabler enables a Direct Value sub-task).
- Reviewable — a developer + architect + QE + security can read it and agree before code starts.
- **Content the caller persists wherever** — no filenames imposed by the skill.

A development plan **is not**:

- A PRD (PM owns that — answers _what_ and _why_).
- A tech-spec (architect owns that — answers _how architecturally_).
- A test plan (QE owns that — answers _what we verify_).
- A sprint plan (engineering manager / scrum master owns that — answers _who, when, at what cadence_).
- A backlog (backlog is broader; the plan is the ordered execution of one approved scope).
- Carrying a lifecycle `Status:` field — that belongs in the project tracker, not in the emitted content.

## Required inputs (state which are missing)

| Input                                 | Owner     | If missing                                                                                |
| ------------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| Approved PRD with acceptance criteria | PM        | **Block** — without AC there is no traceability anchor. Ask the user for the PRD.         |
| Tech-spec (architecture decided)      | Architect | **Block** for non-trivial work — the plan would be guessing. For tiny work, proceed.      |
| Relevant ADRs                         | Architect | Note as N/A if no decisions are architecturally significant.                              |
| Test plan                             | QE        | **Soft block** — propose tasks-for-tests anyway, flag that the plan should be cross-read. |
| Threat model                          | Security  | **Soft block** if the feature is auth/PII/financial — flag explicitly.                    |
| NFR targets                           | Architect | Note as TBD; the plan cannot define performance/load tasks without them.                  |

If any required input is missing, **say so first** before drafting. Do not invent acceptance criteria — escalate to the PM.

## Output structure

The skill emits two structured content blocks. The caller decides whether to save them as `plan.md` + `tasks.md` files, as Jira parent + subtasks, as a Notion page, as a Slack thread, or anywhere else. The skill does **not** impose filenames or storage paths.

### Block 1 — Plan (strategy + sequencing)

```markdown
# Development plan — <Feature / Epic name>

**Spec source**: <link to PRD> · <link to tech-spec> · <ADR-NNNN, ADR-NNNN>
**Owners suggestion**: Tech Lead <name>, Architect <name>, QE <name>, Security <name>
**Target dates** (informational): Start YYYY-MM-DD · Target done YYYY-MM-DD

## 1. Scope summary

[One paragraph: what's being built, the business outcome, and the boundary (what is OUT of scope).]

## 2. Decomposition technique

Chosen technique: Story Mapping | Vertical Slicing | WBS | Hybrid — and the one-sentence reason.

## 3. Sequencing strategy

Expand–contract | Feature flag | Strangler-fig | Branch-by-abstraction | Big-bang — and rollback path explicitly.

Rollout gates: e.g. "Sub-task T-12 unlocks staging; T-18 unlocks 10% canary; T-22 unlocks 100%".

## 4. Risks & spikes

Time-boxed unknowns with exit criteria.

| ID    | Spike | Time-box | Exit criterion                                     |
| ----- | ----- | -------- | -------------------------------------------------- |
| SP-01 | …     | 2 days   | Bench under target RPS with results in dashboard X |

## 5. Dependency graph

Mermaid `flowchart LR` for 5+ items; indented list for small plans. Task-to-task dependencies only.

## 6. Plan-level Definition of Done

The plan is complete when:

- [ ] All sub-tasks complete with their per-task DoD met.
- [ ] All PRD acceptance criteria covered by ≥1 sub-task and verified.
- [ ] Rollout reached stated 100% gate without rollback.
- [ ] Escape budget respected (define).

## 7. Open questions

What's still unknown and needs escalation.
```

**No `Status:` field anywhere.** The plan is a deliverable; lifecycle tracking is the project tracker's job.

### Block 2 — Sub-tasks (ordered, classified, developer-actionable)

Full sub-task field contract lives in [`references/artifact-format.md`](./references/artifact-format.md). Summary:

```markdown
## T-NN — <imperative verb + entity>

**Class**: Direct Value | Enabler / Architecture | Enabler / Infrastructure | Enabler / Exploration | Enabler / Compliance
**AC traced**: PRD §X / AC-N (Direct Value only)
**Enables**: T-NN, T-NN (Enabler only — DV unblocked)
**Depends on**: T-NN, SP-NN (or — for none)
**Type**: Story | Spike | Chore | Infra | Migration | Doc
**Files / modules**: <concrete paths and symbols, or `to create`>
**Estimate**: S / M / L
**Splitting technique applied**: <Lawrence pattern / SPIDR letter / Hamburger layer / N/A>

**Description**: <what to do, what is OUT of scope for this slice>

**Definition of Done**: <verifiable checklist — tests, telemetry, flag, rollback, PR refs>

**Notes**: <implementation hints; keep terse>
```

Hard rules on every sub-task:

- **Developer-actionable** — executable from description alone, no re-asking.
- **Independently testable + deliverable** — DoD includes test obligation + rollout step.
- **Vertically sliced** — horizontal sequencing (DB → API → UI as separate sub-tasks) is the exception with justification.
- **Ordered for shippability** — each prior sub-task does not block deploying the next.
- **Never protocol artifacts as sub-tasks** — triage, ADRs, test plans, threat models, plans themselves are _outputs of planning_, not units of execution.

## Decomposition — choosing the technique

| Situation                                                                 | Technique                       | Reference                                                         |
| ------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------- |
| Feature is a user journey across multiple roles / steps                   | **Story Mapping** (Patton 2014) | [`references/decomposition.md`](./references/decomposition.md) §1 |
| Stories must each ship thin end-to-end value                              | **Vertical Slicing** (INVEST)   | [`references/decomposition.md`](./references/decomposition.md) §2 |
| Regulated, structured, or heavily dependent work (migrations, compliance) | **WBS** (PMBOK 7)               | [`references/decomposition.md`](./references/decomposition.md) §3 |
| Large epic combining journey + structural infrastructure spine            | **Hybrid** (Story map + WBS)    | both                                                              |
| Sub-task in your plan triggers the "too big" criteria                     | Invoke `work-splitting` skill   | `../work-splitting/SKILL.md`                                      |
| Work item is a bug                                                        | Invoke `bug-analysis` FIRST     | `../bug-analysis/SKILL.md`                                        |

Default when in doubt: **vertical slicing**.

## Direct Value vs Enabler (SAFe 6.0)

Every sub-task carries `Class:`. Two top-level classes:

- **Direct Value (DV)** — work that delivers user-perceived value. Traces ≥1 PRD AC. Default for `Type: Story`.
- **Enabler** — necessary work that does NOT directly produce user value; unblocks future DV. Mandatory subtype (SAFe 6.0):
  - `Enabler / Architecture` — refactor / abstraction / design change.
  - `Enabler / Infrastructure` — platform / CI / observability / scaffolding.
  - `Enabler / Exploration` — spike / research / POC.
  - `Enabler / Compliance` — regulatory / audit / certification.

Discipline:

- Every Enabler links ≥1 DV via `Enables:`, or has documented standalone rationale.
- A plan that is > 50% Enablers is suspect — flag in `Open questions`.

## PR sequencing patterns

Detail in [`references/pr-sequencing.md`](./references/pr-sequencing.md). Decision tree:

- Schema or API contract change with live readers/writers? → **Expand–Contract**.
- Risky rollout / A/B / kill-switch desirable? → **Feature Flag** (with scheduled cleanup sub-task).
- Replacing legacy path incrementally? → **Strangler-Fig**.
- Internal refactor with many callers? → **Branch-by-Abstraction**.
- Small, isolated, fully reversible change? → **Big-Bang**.

Every plan states **rollback path explicitly**.

## Definition of Done — per task

Full template + Enabler-DoD variant + worked examples + anti-patterns in [`references/definition-of-done.md`](./references/definition-of-done.md).

Minimum content of every per-task DoD:

- AC trace (which PRD acceptance criteria — DV only) or `Enables:` reference (Enabler).
- Test obligations (per the test plan, by layer + ID where possible).
- Observability hooks (metric/log/trace names + tags).
- Feature-flag and rollout state (default value, ramp gates).
- Security/privacy obligation if the task touches AuthN/AuthZ, PII, or money.
- Rollback path (which prior PR / flag flip restores prior behavior).

## Workflow

1. **Verify inputs** — PRD with AC, tech-spec, relevant ADRs. State which are missing and whether to proceed.
2. **Work-item type triage** — if the input is a bug, invoke `bug-analysis` first; if a feature/enabler, proceed.
3. **Code-grounded reading** — read the actual code paths the plan will touch (`Read`, `Grep`, `Glob`). Every file/module/symbol named in the output exists in the repo or is tagged `to create`.
4. **Pick decomposition technique** — story mapping / vertical slicing / WBS / hybrid — and say why in one sentence.
5. **Decompose** — produce the ordered sub-task list. Each vertically sliced; each tied to AC IDs (DV) or `Enables:` (Enabler); each with concrete files/modules.
6. **Apply "too big" triggers per sub-task** — if any sub-task triggers, invoke `work-splitting` skill before emitting.
7. **Identify spikes** — unknowns with time-boxes and exit criteria.
8. **Choose sequencing strategy** — expand–contract / flag / strangler / branch-by-abstraction / big-bang — and the rollout gates.
9. **Build the dependency graph** — Mermaid `flowchart LR` or short list.
10. **Author DoD per task** — verifiable, AC-traced (DV) or `Enables:` (Enabler), telemetry + flag + rollback explicit.
11. **Surface risks** to the plan itself (env, late changes, unknowns).
12. **Self-check** before emission.

If exploring (no approved spec yet), produce a **lite plan** — sequencing + spike list only — and flag what's missing.

## Self-check (mandatory before emission)

- [ ] Plan is scoped to a single approved spec (or marked "lite, pre-approval").
- [ ] Required inputs (PRD, tech-spec, ADRs) are present or explicitly noted as missing.
- [ ] Decomposition technique is named with a one-sentence rationale.
- [ ] Every DV sub-task references ≥1 AC ID from the PRD.
- [ ] Every Enabler sub-task links to ≥1 DV via `Enables:`, or has documented standalone rationale.
- [ ] Every sub-task cites concrete files / modules (or `to create` tag) from code-grounded reading.
- [ ] No sub-task is a protocol artifact (triage / ADR / test plan / threat model).
- [ ] No sub-task triggers a "too big" criterion without an applied splitting technique cited inline.
- [ ] Vertical slicing — no horizontal sequencing without justification.
- [ ] Dependencies are explicit (not implicit ordering by file position).
- [ ] Spikes are time-boxed with exit criteria — not open-ended "research" tasks.
- [ ] Sequencing strategy is named (expand–contract / flag / strangler / branch-by-abstraction / big-bang).
- [ ] DoD per task is verifiable — not "code looks good".
- [ ] Risks to the plan itself surfaced (env, late change, unknowns).
- [ ] Plan-level DoD ties closure to AC coverage and rollout success.
- [ ] No `Status:` field appears anywhere in the output.
- [ ] No filename / storage path imposed by the skill.
- [ ] Every load-bearing claim tagged with evidence level per the engineering-team evidence-rule convention (at the plugin-root references directory).

## Output expectations

Two structured content blocks (Plan + Sub-tasks) or — for explicit "lite plan" / "no approved spec yet" — a single condensed Plan block with sequencing strategy, spike list, and a stub sub-task outline, flagging what's missing for the full version.

For regulated environments (medical, finance, aerospace), extend each sub-task's DoD with the regulation's traceability fields. The skill keeps the structure; the user's compliance officer owns the field list.

## Reference index

- [`references/artifact-format.md`](./references/artifact-format.md) — full Plan + Sub-tasks structure, sub-task field contract, worked example with DV + Enabler refactor, protocol-artifact anti-pattern.
- [`references/decomposition.md`](./references/decomposition.md) — story mapping / vertical slicing / WBS with selection guide; canonical INVEST reference.
- [`references/pr-sequencing.md`](./references/pr-sequencing.md) — expand-contract / flag / strangler / branch-by-abstraction / big-bang with rollback paths.
- [`references/definition-of-done.md`](./references/definition-of-done.md) — DoD template, AC traceability, Enabler DoD section, anti-patterns.
