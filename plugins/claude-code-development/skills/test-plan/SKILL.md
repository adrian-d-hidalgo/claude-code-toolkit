---
name: test-plan
description: Use when the user asks to write, draft, or scope a test plan for a specific feature, release, or system change. Trigger phrases include "test plan", "plan de pruebas", "QA plan", "test strategy doc", "test approach", "test scope", "release test plan", "what do we test for [feature/release]?", "lite test plan", "release readiness checklist".
allowed-tools:
  - Read
  - Grep
  - Glob
---

# Test plan skill

Produces test plan **content** that is consistent in structure across features and releases. The structure is **ISO/IEC/IEEE 29119-3:2021** (Test plan documentation); risk-based prioritization follows the **ISTQB Foundation Level 4.0** body of knowledge; quality attributes come from **ISO/IEC 25010:2023**. Homologation matters: every test plan in the org should look the same so reviewers find what they need without hunting. Output is content the caller persists wherever (file, ticket, wiki). The skill does **not** write files — caller decides storage and naming.

## Methodology anchor

- **Structure**: ISO/IEC/IEEE 29119-3:2021 (Test Documentation — Part 3: Test plans). Supersedes IEEE 829-2008 (still cited in some regulated environments — see `references/regulated-environments.md` for IEEE 829 / FDA / IEC 62304 / PCI-DSS mappings).
- **Risk-based testing**: ISTQB Foundation Level 4.0 syllabus, "Risk-based testing" chapter. Coverage = f(likelihood × impact).
- **Quality model**: ISO/IEC 25010:2023 — Functional Suitability, Performance Efficiency, Compatibility, Usability, Reliability, Security, Maintainability, Portability, Safety, Flexibility.
- **Compatible companion frameworks**: TMMi (test maturity), Testing Trophy (Kent C. Dodds) for distribution across layers, ATDD / Specification by Example (Gojko Adzic), Heuristic Test Strategy Model (James Bach).

## What a test plan is — and is not

A test plan **is** a scoped commitment about what will be tested, how, when, by whom, and how success is judged — for a specific feature, release, or system change.

A test plan **is**:

- Scoped to a specific change (feature, release, system, milestone).
- Approved before testing starts.
- Living through the test cycle (status updates).
- Closed after exit criteria met (with results summary).

A test plan **is not**:

- Organization-wide test strategy.
- A test case repository (cases live separately; the plan references them).
- A bug list (bugs live in the tracker).
- A status report (status updates are made against the plan, but plan ≠ status).

## Canonical structure

This skill emits the ISO 29119-3 canonical sections. The full template with all 18 sections, RACI matrix, entry/exit checklists, metrics table, and changelog scaffolding lives in [`references/iso-29119-3-template.md`](./references/iso-29119-3-template.md). Read it before authoring a new plan from scratch.

Section list per 29119-3:

1. Introduction (Purpose, Scope, References)
2. Test Items
3. Features to Be Tested
4. Features Not to Be Tested
5. Risk Analysis
6. Test Approach
7. Test Environment
8. Test Data
9. Schedule
10. Roles and Responsibilities (RACI)
11. Entry Criteria
12. Exit Criteria
13. Quality Metrics and Targets
14. Risks to the Test Plan Itself
15. Deliverables
16. Communication Plan
17. Change Control
18. Approvals

For most plans, all 18 sections apply. A "lite plan" (low-risk change) collapses to the minimum 6 — Scope, Risk, Approach, Environment, Entry/Exit, Sign-off. Section list and reduction rules live in the template reference.

## Risk-based prioritization

Score each scenario or component as **likelihood × impact**, each on a 1–5 scale. Coverage scales with score. Full scoring rubric, calibration guidance, and coverage policy per score bucket live in [`references/risk-scoring.md`](./references/risk-scoring.md).

Summary mapping:

| Score | Tier | Coverage                                                          |
| ----- | ---- | ----------------------------------------------------------------- |
| ≥15   | P0   | Full-path coverage + edge cases + load + chaos for critical paths |
| 10–14 | P1   | Full happy path + common edge cases                               |
| 5–9   | P2   | Smoke + happy path                                                |
| <5    | P3   | Visual / smoke only                                               |

## ISO 25010 quality attributes

For each plan, pick the attributes that matter for **this** change. Blanket-covering all attributes is waste; ignoring relevant ones is gap. The 10 attributes with what each means and what test types apply live in [`references/quality-attributes-iso-25010.md`](./references/quality-attributes-iso-25010.md).

## Workflow

1. **Confirm scope is bounded** to a specific feature, release, or change. If the user says "test plan for our system" with no scope, ask: which release / feature?
2. **Read companion artifacts** if available (PRD, tech-spec, ADRs). The test plan must align with the PRD's acceptance criteria — every AC maps to at least one test item.
3. **Pick relevant ISO 25010 attributes** for this change. Skip the irrelevant.
4. **Risk-rank scenarios** using the likelihood × impact rubric. Coverage proportional to risk.
5. **Map acceptance criteria** to features-to-be-tested, with priority per risk.
6. **Pick test types** per quality attribute. Reference the org-wide test strategy if one exists; do not redefine it here.
7. **Define environments + data** with parity considerations and PII-handling rules.
8. **Build schedule + RACI** with realistic estimates.
9. **Define entry + exit criteria** explicitly. Exit criteria are the contract for "done".
10. **Define metrics + targets** — not just coverage; include flake rate, mutation score, escape rate.
11. **Surface risks to the plan itself** (env instability, late changes, flaky tests).
12. **Self-check** before delivery.

## Self-check (mandatory before delivery)

- [ ] Plan is scoped to a specific change (not org-wide).
- [ ] Companion PRD and tech-spec linked (or marked N/A with rationale).
- [ ] Acceptance criteria from the PRD are mapped to test items.
- [ ] Risk analysis present with explicit scoring rubric.
- [ ] Test types tied to ISO 25010 attributes by name.
- [ ] Entry AND exit criteria explicit and measurable.
- [ ] RACI assigned (no implicit ownership).
- [ ] Schedule realistic (compare to similar past plans).
- [ ] Metrics targets cite data, not "TBD" everywhere.
- [ ] Risks to the plan itself surfaced.

## Output contract

Produce the canonical 18-section structure unless the user requests "lite plan" (then: Scope, Risk, Approach, Environment, Entry/Exit, Sign-off — minimum 6 sections).

For mature orgs: emit a "release readiness checklist" variant — same structure, condensed, focused on go/no-go.

For regulated environments (medical, finance, aerospace): expand per the regulation's traceability requirements. See [`references/regulated-environments.md`](./references/regulated-environments.md) for FDA QSR, ISO 13485, IEC 62304, PCI-DSS, and EU AI Act mappings.

## Examples

### Good risk row

> R1 — Discount code reuse via concurrent requests — Likelihood 3 (similar issue last release) × Impact 5 (revenue leak + abuse vector) = 15 → P0; full path + concurrency edge tests + rate-limit tests + load test.

### Bad risk row

> R1 — Bugs in the code — Likelihood 5 × Impact 5 = 25 — Test everything.

(Vague, useless; not actionable for prioritization.)

### Good exit criterion

> Performance SLO validated: checkout p95 latency < 300 ms at 5 000 req/s sustained over 10 minutes (load test in `perf` env on YYYY-MM-DD with results in dashboard X).

### Bad exit criterion

> Performance is acceptable.

(Subjective, unmeasurable.)

## Anti-patterns to reject

- "Test plan" that is actually a status report.
- "Test plan" without entry or exit criteria.
- "Test plan" with TBD coverage and TBD timeline (it is a wish list, not a plan).
- Risk analysis without scoring rubric (adjectives only).
- Test plans that cover "everything" — defeats prioritization.
- 50-page plans nobody reads (favor lite plan + reference the org strategy).
- Plans that ignore quality attributes other than functional (no performance, no security, no accessibility).
- RACI with multiple Accountable per row.
- Schedule without buffer for bug-fix cycles.
- Metrics without targets.
- Plans that do not reference the PRD / tech-spec they implement.

## Communication

- Lead with risk and scope, not test types.
- Cite ISO 29119-3 + 25010 + ISTQB by name when justifying.
- Map every test item to a PRD acceptance criterion (traceability).
- Be concrete about environments, data, schedule.
- Push back on "we do not need a plan, just test stuff" with the cost-of-defect-escape argument.
- For lite plans, do not apologize for being short — match depth to risk.

## Reference index

- [`references/iso-29119-3-template.md`](./references/iso-29119-3-template.md) — full 18-section canonical template.
- [`references/risk-scoring.md`](./references/risk-scoring.md) — likelihood × impact rubric, coverage policy per tier.
- [`references/quality-attributes-iso-25010.md`](./references/quality-attributes-iso-25010.md) — 10 ISO 25010 attributes with test-type mapping.
- [`references/regulated-environments.md`](./references/regulated-environments.md) — FDA QSR, ISO 13485, IEC 62304, PCI-DSS, EU AI Act extensions.
