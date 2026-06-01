# Definition of Done (DoD) — per task

DoD is the **contract** for "this task is shippable". It is the bridge between AC (what the user gets) and code (what the developer wrote). A task without an explicit, verifiable DoD is a wish; a task with a vague DoD is a recipe for scope drift.

## Source

- Scrum Guide 2020 (Schwaber & Sutherland) — formal definition of DoD as a shared, evolving commitment.
- INVEST quality bar (Bill Wake, 2003) — the "T" is "Testable", which DoD operationalises.
- Industry conventions on AC traceability (PMBOK 7 §2.3 on requirements traceability).

## DoD vs AC — never the same thing

| AC (Acceptance Criteria)                                  | DoD (Definition of Done)                                                 |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Lives in the PRD (PM owns it).                            | Lives in `tasks.md` (Code Planner owns it).                              |
| Describes **user-observable behavior** (Given/When/Then). | Describes **engineering completion** (tests, telemetry, flag, rollback). |
| Stable across many tasks if the AC spans them.            | Specific to one task — bespoke, not template-pasted.                     |
| If AC changes, scope changed → escalate.                  | If DoD shifts mid-task, it's usually a re-scope of the task.             |

A good rule: **DoD = "what makes this task safe to ship"**. AC = "what the user gets when shipped".

## Minimum DoD content

Every task's DoD must include:

1. **AC trace** — which PRD acceptance criteria this task satisfies, by ID. Verbatim AC ID (e.g., `AC-5`).
2. **Test obligations** — per the test plan, by layer + test ID where possible.
3. **Observability hooks** — metric, log, or trace names introduced or modified, with their tags / fields.
4. **Feature-flag state** — flag key, default value, rollout gate the task brings the system to.
5. **Security / privacy** — if the task touches AuthN/AuthZ, PII, money, or new external surface — the security obligation (threat-model row mitigated, DPIA tag, headers configured, etc.).
6. **Rollback path reference** — if the task is part of a multi-PR migration, state which prior PR it can roll back to.
7. **PR description hooks** — "Closes PRD AC-N", "Implements ADR-NNNN", linked test IDs.

Optional but encouraged:

- **Documentation update** — runbook, README, internal docs.
- **Performance check** — if the task touches a latency-sensitive path, the measured impact (vs baseline) goes here.
- **Migration verification** — for migrations: parity dashboard link + observation window.

## Template (verbatim, copy and customise per task)

```markdown
**Definition of Done**:

- [ ] Behavior: matches AC-<id> (and AC-<id>) — no scope drift; missing scope opens a new task.
- [ ] Tests: <layer> test `<test-id>` added per test plan §<ref>; passes locally + in CI.
- [ ] Tests: <layer> test `<test-id>` added; covers the negative path described in AC.
- [ ] Telemetry: `<metric-or-log-or-trace-name>` emitted; tags `<tag-list>`; dashboard panel updated (link).
- [ ] Feature flag: `<flag-key>` wired; default OFF; sample size in staging ≥ <N> before considering canary.
- [ ] Security: <threat-model row mitigated | DPIA tag added | headers configured | N/A — explain>.
- [ ] Rollback: flag flip-OFF restores prior behavior within <N> seconds; tested in staging.
- [ ] PR: title is Conventional Commit; description references `Closes PRD AC-<id>` and links test IDs.
- [ ] Docs: <runbook entry added | README updated | N/A>.
```

## Enabler DoD variant (Direct Value vs Enabler — SAFe 6.0)

When a sub-task is `Class: Enabler / ...` (Architecture / Infrastructure / Exploration / Compliance), DoD verifies **technically** rather than via user-observable AC. Enabler DoD substitutes:

- `Enables:` (DV sub-task IDs unblocked) in place of `AC traced`.
- **Build/test/deploy invariants** in place of user-observable behavior checks.
- Observability hooks if relevant (often the enabler IS the observability).
- Rollback path (refactors revert cleanly; infra changes are reversible per the strategy).

### Enabler DoD template

```markdown
**Definition of Done**:

- [ ] Behavior invariant: tests pass IDENTICALLY before and after (no functional change for `Enabler / Architecture` refactors). For `Enabler / Infrastructure`, the new platform component is operational and observable.
- [ ] Enables: T-NN, T-NN downstream sub-tasks (cited in the sub-task header). If no DV is enabled, document why (e.g. `Enabler / Compliance` standing alone for SOX audit).
- [ ] Tests: contract test asserts the new interface / boundary (Architecture); platform smoke test passes (Infrastructure); spike output captured (Exploration); compliance evidence linked (Compliance).
- [ ] Telemetry: <if the enabler instruments observability, what's emitted | N/A>.
- [ ] Feature flag: N/A — internal change.
- [ ] Security: <if the enabler is security-related, the threat-model row addressed | N/A>.
- [ ] Rollback: pure revert (Architecture) or platform tear-down / config flip (Infrastructure).
- [ ] PR: title is Conventional Commit (`refactor:` / `chore:` / `build:` / etc.); description references `Enables T-NN`.
```

### Worked example — `Enabler / Architecture` refactor

```markdown
## T-03 — Refactor `discount.ts` to isolate computation behind an interface

**Class**: Enabler / Architecture
**Enables**: T-04, T-05
**Type**: Chore
**Estimate**: S

**Definition of Done**:

- [ ] Behavior invariant: existing test suite passes identically before and after — no functional change.
- [ ] Enables: T-04 (add `is_redeemable` column) and T-05 (swap read path) — both now have a stable seam to plug into.
- [ ] Tests: contract test `DiscountComputer.parity` asserts old / new implementations return identical results for the seeded corpus.
- [ ] Telemetry: N/A — no runtime change.
- [ ] Feature flag: N/A — internal refactor.
- [ ] Security: N/A.
- [ ] Rollback: pure `git revert`; no schema or contract change.
- [ ] PR: `refactor(discount): extract DiscountComputer interface`; description references `Enables T-04, T-05`.
```

### Enabler DoD anti-patterns (in addition to the general ones below)

- **Enabler that changes behavior**: it's not an Enabler / Architecture anymore — it's a Story. Reclassify or split.
- **Enabler without `Enables:` linkage**: suspect. Either document why it stands alone (compliance, future-plan runway) or remove.
- **`Enabler / Exploration` (Spike) without exit criterion**: open-ended research isn't a sub-task. Add the time-box + exit criterion.
- **Compliance enabler with no audit trail**: the whole point is auditability. Cite the regulation control reference + evidence storage.

## Anti-patterns

| Anti-pattern                                                  | Why it's wrong                                                                      | Fix                                                                |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| "Code looks good"                                             | Non-verifiable; opinion-based.                                                      | Replace with concrete check (test ID, dashboard link).             |
| Same DoD template pasted to every task                        | Pretends every task has identical engineering surface — usually false.              | Customise per task; reuse the structure, not the content.          |
| DoD with no AC trace                                          | Task is unmoored from PRD scope; PM cannot verify completion.                       | Reference at least one AC ID. If none applies, label task `Chore`. |
| DoD missing test obligation                                   | "We'll add tests later" — they won't be added.                                      | Reference the test plan and the test IDs.                          |
| DoD missing telemetry on a user-facing path                   | Production silent failures.                                                         | Add metric/log/trace names with tags.                              |
| DoD that references implementation detail ("uses Redis lock") | DoD should describe what's _true_ when done, not _how_ you got there.               | Move tech detail to `Notes`; keep DoD behavior-level.              |
| DoD without rollback (for migration / flag-gated work)        | Rollback is improvised under pressure → bad outcomes.                               | Add explicit rollback step.                                        |
| DoD with vague "documentation updated"                        | Reader does not know which doc; reviewer cannot verify.                             | Name the doc.                                                      |
| DoD that includes Slack notifications or status-meeting steps | Communication is not engineering completion; track in comms plan, not DoD.          | Move to communication plan.                                        |
| DoD that includes "approved by code planner"                  | Review approval is implicit via merge process; DoD is about the work, not the gate. | Remove.                                                            |

## AC traceability matrix

When the plan has many tasks, maintain a small table in `plan.md` (or in a sibling `traceability.md` for large epics):

```markdown
| AC ID | Description (short)                     | Tasks covering |
| ----- | --------------------------------------- | -------------- |
| AC-1  | Users can apply a discount code on cart | T-02, T-05     |
| AC-2  | Codes expire after configured TTL       | T-03           |
| AC-3  | Codes are one-use per user              | T-06           |
| AC-4  | Audit log records every redemption      | T-07           |
| AC-5  | Reads use the new redeemable column     | T-04, T-05     |
```

Self-check before sign-off: every AC ID from the PRD appears at least once in this matrix.

## Regulated-environment extensions

For regulated work (medical, finance, aerospace), DoD expands to satisfy the regulation's traceability and audit requirements. The structure stays the same; the field list grows.

Common additions:

- **FDA QSR / ISO 13485** — design history file entry ID, traceability to user need + design input + risk control.
- **IEC 62304 (medical software)** — software safety class, hazard mitigation reference, V&V test IDs at Unit / Integration / System.
- **PCI-DSS** — control reference (e.g., 6.5.1), audit trail entry.
- **EU AI Act (high-risk systems)** — model card update, fairness/robustness evidence reference, human-oversight checkpoint.

The skill keeps the structure agnostic; the user's compliance officer owns the specific field list.

## Plan-level DoD (vs task-level DoD)

The **plan** also has a DoD (in `plan.md` §6). It is **not** the union of all task DoDs — it captures the **outcome contract**:

- All task DoDs met.
- All AC covered and verified.
- Rollout reached 100% without rollback.
- Escape budget respected (e.g., zero P0 escapes within N days).
- Postmortem written if any P1+ escape occurred.

Plan-level DoD is the artifact the PM + Code Planner sign off as "delivered". Task-level DoD is the artifact the Code Planner + Reviewer sign off as "merge-able".

## Quick check before delivery

For each task in `tasks.md`:

- [ ] DoD references ≥1 AC ID from the PRD (or is explicitly `Chore` / `Infra` with rationale).
- [ ] DoD includes test obligation by layer + ID.
- [ ] DoD includes telemetry hook (or N/A with rationale).
- [ ] DoD includes flag and default value (or N/A with rationale).
- [ ] DoD includes rollback path (or N/A with rationale — must be truly reversible).
- [ ] DoD has no "code looks good" boxes.
- [ ] DoD is customised, not template-pasted unchanged.
