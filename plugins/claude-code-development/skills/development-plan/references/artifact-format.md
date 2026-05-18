# Output structure — Plan + Sub-tasks

The `development-plan` skill emits **two structured content blocks**: a **Plan** (strategy + sequencing) and **Sub-tasks** (ordered, classified, developer-actionable). The caller decides how to persist (one file, two files, Jira parent + subtasks, Notion page, wiki, Slack thread — anywhere). The skill does **not** impose filenames or storage paths.

## Why two blocks

| Block     | Audience                                  | Cadence of update                                 |
| --------- | ----------------------------------------- | ------------------------------------------------- |
| Plan      | All stakeholders (PM, architect, QE, sec) | Stable — updated when scope or sequencing shifts. |
| Sub-tasks | Developers + tech lead                    | Living — caller's tracker tracks per-item state.  |

Keep the Plan short (1–2 pages of content). Keep Sub-tasks exhaustive (one entry per shippable unit). Neither carries a `Status:` lifecycle field — that lives in the project's tracker.

## Plan — full structure

```markdown
# Development plan — <Feature / Epic name>

**Spec source**:

- PRD: <link>
- Tech-spec: <link>
- ADRs: ADR-NNNN <title>, ADR-NNNN <title>
- Test plan: <link or _N/A — explain_>
- Threat model: <link or _N/A — explain_>

**Owners suggestion**: Tech Lead <name> · Architect <name> · QE <name> · Security <name> · Product <name>
**Target dates** (informational, not authoritative — tracker is): Start YYYY-MM-DD · Target done YYYY-MM-DD

## 1. Scope summary

One paragraph. What is being built, what is the business outcome (link to PRD's North Star or success metric), and what is explicitly OUT of scope for this plan.

## 2. Decomposition technique

Chosen technique: **Story Mapping** | **Vertical Slicing** | **WBS** | **Hybrid (specify)**.
Rationale: one sentence.

## 3. Sequencing strategy

Primary strategy: **Expand–Contract** | **Feature Flag** | **Strangler-Fig** | **Branch-by-Abstraction** | **Big-Bang**.
Rationale: one sentence tied to blast radius and reversibility.

Rollout gates:

- Gate G1 — `<condition>` → unlocks `<next step>`.
- Gate G2 — …
- Final gate — `<condition>` → 100% rollout.

Rollback path: explicit — e.g. "Flip flag `<key>` OFF; readers fall back within 30 seconds; the contract sub-task is deferred until incident resolved."

## 4. Risks & spikes

Spikes are unknowns that must produce evidence before downstream sub-tasks can commit. Each spike has a time-box and an objective exit criterion.

| ID    | Spike                                               | Time-box | Owner | Exit criterion                                             |
| ----- | --------------------------------------------------- | -------- | ----- | ---------------------------------------------------------- |
| SP-01 | Validate index strategy hits p95 < 200 ms at 5k RPS | 2 days   | <eng> | Load-test report in `perf` env with results in dashboard X |
| SP-02 | Confirm vendor SDK supports streaming on plan tier  | 1 day    | <eng> | Working prototype at `/tmp/sp02` with timing log           |

Risks to the plan itself:

| Risk                                         | Likelihood | Impact | Mitigation                                            |
| -------------------------------------------- | ---------- | ------ | ----------------------------------------------------- |
| Late PRD change to AC-3 (still under review) | M          | H      | Freeze AC-3 by D+5 or scope it out                    |
| Staging env unstable last 2 sprints          | H          | M      | Pre-allocate fixes in T-00 environment-readiness task |

## 5. Dependency graph

Mermaid `flowchart LR` for non-trivial graphs (5+ items); indented list for small plans. Task-to-task dependencies only — no org-chart noise.

\`\`\`mermaid
flowchart LR
SP01[SP-01 perf spike] --> T03[T-03 index migration]
T03 --> T05[T-05 read path swap]
T05 --> T08[T-08 flag default ON]
T08 --> T10[T-10 drop old column]
\`\`\`

## 6. Plan-level Definition of Done

The plan is complete when:

- [ ] All sub-tasks complete with their per-task DoD met.
- [ ] All PRD acceptance criteria (AC-1 … AC-N) covered by ≥ 1 sub-task and verified.
- [ ] Rollout reached the stated 100% gate without rollback.
- [ ] No P0/P1 escapes within <N> days of full rollout (escape budget).
- [ ] Postmortem written if any P1+ escape occurred.

## 7. Communication plan (informational)

- Daily / weekly / per-gate cadence suggestions — caller's project decides exactly.

## 8. Open questions

- Q1 — <question> — Owner suggestion <name> — Needed by <date>.
- Q2 — …

## 9. Sign-off matrix (informational — actual sign-off lifecycle is the caller's)

| Role      | Name | Decision rendered when ready |
| --------- | ---- | ---------------------------- |
| Product   |      |                              |
| Architect |      |                              |
| QE        |      |                              |
| Security  |      |                              |
| Tech Lead |      |                              |
```

**No `Status:` field** anywhere in the Plan block. Lifecycle is the project tracker's domain.

## Sub-tasks — full structure

The Sub-tasks block is a list of individually structured items. Each carries the field contract below.

```markdown
# Sub-tasks — <Feature / Epic name>

> Conventions
>
> - One sub-task = one PR by default. Exceptions are explicitly noted in the sub-task's `Notes`.
> - Sub-task IDs (T-NN) are local references for dependency-graph use; the caller's tracker assigns canonical IDs (Jira keys, Linear identifiers, etc.) on materialisation.

## T-01 — <Short imperative title — "Add X", "Migrate Y", "Wire Z">

**Class**: Direct Value | Enabler / Architecture | Enabler / Infrastructure | Enabler / Exploration | Enabler / Compliance
**AC traced**: PRD §<section> / AC-<id>, AC-<id> (Direct Value only)
**Enables**: T-NN, T-NN (Enabler only — DV sub-tasks unblocked by this enabler)
**Depends on**: T-NN, SP-NN (or — for none)
**Type**: Story | Spike | Chore | Infra | Migration | Doc
**Files / modules**: <concrete paths and symbols from code-grounded reading; `to create` for new ones>
**Estimate**: S / M / L
**Splitting technique applied**: <Lawrence pattern name / SPIDR letter / Hamburger layer / N/A>

**Description**: <what to do, what is OUT of scope for this slice — keep terse>

**Definition of Done**:

- [ ] Behavior: matches AC-<id> (DV) or unblocks T-NN (Enabler); no scope drift; missing scope opens a new sub-task.
- [ ] Tests: <layer> test `<test-id>` added per test plan §<ref>; passes locally + CI.
- [ ] Telemetry: `<metric-or-log-or-trace-name>` emitted with `<tags>`.
- [ ] Feature flag: `<flag-key>` wired; default <OFF | N/A — explain>.
- [ ] Security: <threat-model row mitigated | DPIA tag | headers | N/A — explain>.
- [ ] Rollback: <flag flip-OFF | revert PR | N/A — explain how this remains reversible>.
- [ ] PR description: `Closes PRD AC-<id>` (DV) or `Enables T-NN` (Enabler); linked test IDs.

**Notes**: implementation hints, gotchas. Keep ≤ 5 lines.

---

## T-02 — …
```

**No `Status:` field** on any sub-task. The caller's tracker (Jira / Linear / Notion / GitHub Issues) owns lifecycle.

## Section-by-section field guidance

### Title

Imperative verb + concrete object. Bad: "Database stuff". Good: "Add `is_redeemable` column to `discount_codes`". The title is what a reviewer scans in the queue.

### Class — Direct Value vs Enabler (SAFe 6.0)

Mandatory. One of:

- `Direct Value` — sub-task delivers user-perceived value; traces ≥ 1 AC.
- `Enabler / Architecture` — refactor / abstraction / design change.
- `Enabler / Infrastructure` — platform / CI / observability / scaffolding.
- `Enabler / Exploration` — spike / research / POC (often `Type: Spike`).
- `Enabler / Compliance` — regulatory / audit / certification.

### AC traced (DV only)

Required for `Class: Direct Value`. List AC IDs verbatim from the PRD. If no AC applies, the sub-task is probably an Enabler — re-classify.

### Enables (Enabler only)

Required for `Class: Enabler / ...`. List DV sub-task IDs this enabler unblocks. Enabler without `Enables:` is suspect — flag with rationale or remove.

### Depends on

Explicit sub-task IDs or spike IDs that must close first. Empty (`—`) means no dependencies. Do not rely on implicit "T-04 obviously comes before T-05" ordering.

### Type

| Type      | Meaning                                                                                                              |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| Story     | Vertically sliced unit of user-facing value. Default for AC-traced work (typically Class: DV).                       |
| Spike     | Time-boxed investigation. Output = decision + evidence. Class: Enabler / Exploration.                                |
| Chore     | Internal-only change with no user-visible value (rename, dep bump). Class: Enabler / Architecture or Infrastructure. |
| Infra     | Platform / pipeline / environment work. Class: Enabler / Infrastructure.                                             |
| Migration | Schema / API / contract change. Almost always sequenced with expand–contract.                                        |
| Doc       | Documentation-only PR. Often paired with a story rather than standalone.                                             |

### Files / modules

Concrete paths and symbols from code-grounded reading (use `Read`, `Grep`, `Glob`). `to create` tag for files / symbols that don't exist yet. Example: `src/auth/session.ts (existing), src/auth/redeemable.ts (to create)`.

### Estimate

S / M / L (consistent within the output) — or story points, or hours. Sub-tasks > L should be split via `claude-code-development:work-splitting`.

### Splitting technique applied

If the sub-task came from a split: cite the technique (Lawrence pattern name, SPIDR letter, Hamburger layer). Else `N/A`.

### Definition of Done

The DoD template is the spine. Every checkbox is **verifiable** — no "code looks good" boxes. See [`definition-of-done.md`](./definition-of-done.md) for full anti-patterns and the Enabler DoD variant.

### Notes

Hints to the implementer. Keep terse (≤ 5 lines). If you're tempted to write more, the information belongs in the tech-spec — link it instead.

## Lite-plan variant

When the spec is not fully approved, or the work is small (< 5 sub-tasks, no migrations, no flag), emit only a condensed Plan block (no Sub-tasks block). Sections retained: Scope summary · Decomposition technique · Sequencing strategy · Spike list · Stub sub-task outline · Open questions. State explicitly: "This is a lite plan; full sub-task breakdown follows once <missing input> is approved."

## Worked example (excerpt)

### Plan excerpt

```markdown
# Development plan — Discount-code redemption v2

**Spec source**: PRD `<link>` · Tech-spec `<link>` · ADR-0042

## 2. Decomposition technique

**Vertical Slicing** — feature is a single user-facing capability; each sub-task should ship a thin end-to-end slice through DB → service → API → UI.

## 3. Sequencing strategy

**Expand–Contract** for the schema change + **Feature Flag** `discount-redeem-v2` for the rollout.

Rollout gates:

- G1 — All integration tests green in staging → enable flag for internal users.
- G2 — Internal-user redemption shows zero parity divergence over 48 h → 10% canary.
- G3 — Canary clean for 72 h → 100%.

Rollback: flip flag OFF; defer contract sub-task until incident resolved.
```

### Sub-tasks excerpt — DV + Enabler refactor pairing

```markdown
## T-04 — Add `is_redeemable` derived column to `discount_codes`

**Class**: Direct Value
**AC traced**: PRD §3.2 / AC-5
**Depends on**: SP-02 (confirmed pg-jsonb performance acceptable)
**Type**: Migration
**Files / modules**: `src/migrations/202605_add_is_redeemable.ts (to create)`, `src/models/discount.ts (existing)`
**Estimate**: M
**Splitting technique applied**: N/A

**Description**: Add the derived `is_redeemable` column with computed default; wire the read path behind feature flag `discount-redeem-v2`. Out of scope: deprecate the old computation path (that's T-07, a separate contract sub-task).

**Definition of Done**:

- [ ] Behavior: matches AC-5; migration adds column with computed default; runs within 5-minute window on staging copy of 50M rows.
- [ ] Tests: integration test `discount-redeem-parity` asserts old + new paths return identical results for seeded corpus.
- [ ] Telemetry: `discount_redeem.column_read_total{path={old|new}}` counter emitted.
- [ ] Feature flag: `discount-redeem-v2` wired; default OFF.
- [ ] Security: N/A — internal computation only, no new external surface.
- [ ] Rollback: flag flip-OFF restores prior behavior; column kept until T-07 contract sub-task.
- [ ] PR: title is Conventional Commit; description references `Closes PRD AC-5`.

**Notes**: Postgres pgvector not involved; pure pg14 column add.

---

## T-03 — Refactor `discount.ts` to isolate computation behind an interface

**Class**: Enabler / Architecture
**Enables**: T-04, T-05 (the read-path swap)
**Depends on**: —
**Type**: Chore
**Files / modules**: `src/models/discount.ts (existing)`, `src/models/discount-computer.ts (to create)`
**Estimate**: S
**Splitting technique applied**: N/A

**Description**: Extract the discount-computation logic into a `DiscountComputer` interface. No behavior change — tests pass identically before and after. This simplifies T-04 + T-05 by giving them a stable seam to swap implementations behind.

**Definition of Done**:

- [ ] Behavior: tests pass identically before/after — no functional change.
- [ ] Tests: existing test suite unchanged + added one contract test asserting interface compliance.
- [ ] Telemetry: N/A — no runtime change.
- [ ] Feature flag: N/A — internal refactor.
- [ ] Security: N/A.
- [ ] Rollback: pure revert — no schema or contract change.
- [ ] PR: title `refactor(discount): extract DiscountComputer interface`; description references `Enables T-04, T-05`.

**Notes**: Opportunistic in-scope refactor surfaced by code-grounded reading during planning; bounded to S per the tech-lead opportunistic-refactor discipline.
```

## Anti-pattern callout

Protocol artifacts (Triage, ADR, Tech-spec, Test plan, Threat model, the Plan itself) are **outputs of planning** — NOT sub-tasks. Never include sub-tasks like "Run triage" or "Write the ADR" — those are upstream agents' work, not developer execution units.

Similarly, no sub-task should carry a `Status:` field. Lifecycle tracking is the caller's tracker (Jira / Linear / Notion / GitHub).
