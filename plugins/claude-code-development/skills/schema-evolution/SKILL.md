---
name: schema-evolution
description: Use to plan a database migration, evolve a schema without breaking consumers, design an expand/contract migration, plan a dual-write strategy, write a backfill plan, ghost a column or table, define a data contract between producer and consumer, audit a proposed migration for breaking changes, or design a rollback for a schema change. Trigger phrases include "plan this migration", "expand contract migration", "how to add this column safely", "dual-write strategy", "backfill plan", "consumer-driven evolution", "data contract", "breaking schema change", "rename a column without breaking", "add NOT NULL safely", "drop this table safely", "planea esta migración", "evolución de schema". The skill enforces expand/contract as default, idempotent backfills, consumer-driven validation, and rollback-first thinking — stack-agnostic; never assumes specific migration tooling, deployment cadence, or storage engine.
allowed-tools:
  - Read
  - Grep
  - Glob
---

# schema-evolution skill

Produces a structured plan for evolving a schema **without breaking consumers**: enumerate consumers → declare the change → expand/contract steps → backfill plan → rollback path → validation strategy. The output is content the caller persists wherever (migration design doc, ADR addendum, runbook). No files imposed; the skill does not execute migrations.

This skill is **stack-agnostic**. It must not assume specific migration tooling, deployment cadence, dual-region setup, or storage engine. Tools-by-stack guidance lives in per-project CLAUDE.md, not here.

## Methodology anchor

- **Expand/contract pattern** (Pramod Sadalage, _Refactoring Databases_, 2006) — every breaking change becomes a three-phase sequence: expand the schema additively, migrate consumers and data, contract by removing the old surface. Reference: [`references/expand-contract-playbook.md`](./references/expand-contract-playbook.md).
- **Parallel-run / dual-write** (Stripe, GitHub, PlanetScale engineering blogs) — write to both the old and new shape during the migration window; verify equivalence before cutting over.
- **Ghost column / ghost table** (Shopify, GitHub) — additively introduce the new shape; copy data; switch reads; drop the old.
- **Consumer-driven contract testing** (Pact, Sanderson _Shift Left Data Manifesto_) — every change validated against the known set of consumers before applying.
- **Backward / forward compatibility** (Kleppmann DDIA ch. 4) — codify what is safe across producer / consumer version skew.

## The four questions before any migration

A migration planned without these will break a consumer the team forgot about. Answer in order:

1. **What changes** — column added, column removed, column type changed, table renamed, semantics altered? Classify per [`references/change-classification.md`](./references/change-classification.md).
2. **Who consumes** — every reader of the affected surface. Include direct queries, ORMs, downstream pipelines, analytical jobs, dashboards, exported reports, third-party integrations. Missing one consumer is the dominant failure mode.
3. **What is the freshness / consistency contract** with each consumer — can they tolerate a dual-state window? For how long?
4. **What is the rollback path** if the migration fails mid-way? A migration without a stated rollback is incomplete.

A migration plan that cannot answer all four is `[Unverified]` at best — refuse to proceed until they are answered.

## Change classification — and the strategy that follows

| Change | Compatibility | Strategy |
|---|---|---|
| Add nullable column | Backward + forward | Single phase: add column. Consumers ignore it. |
| Add NOT NULL column | Breaking | Expand/contract: add nullable → backfill → enforce NOT NULL → contract. |
| Drop column | Breaking | Expand/contract: stop writes to column → confirm zero reads → drop. |
| Rename column | Breaking | Expand/contract: add new column → dual-write → migrate readers → contract by dropping old. |
| Change column type (widening) | Often backward | Single phase if engine supports in-place widening; otherwise expand/contract. |
| Change column type (narrowing or semantic) | Breaking | Expand/contract with explicit cast / transformation in dual-write phase. |
| Rename table | Breaking | Ghost-table: create new → dual-write → migrate readers → contract. |
| Drop table | Breaking | Expand/contract: stop writes → confirm zero reads → drop. |
| Add index | Non-breaking but operationally expensive | Build concurrently / online if engine supports; otherwise schedule in low-write window. |
| Drop index | Non-breaking | Verify no query depends on it (read plans first). |
| Add foreign key | Breaking on invalid existing data | Validate existing data → add constraint; or add NOT VALID and validate in a separate transaction. |
| Add CHECK constraint | Breaking on violating existing data | Same as foreign key. |
| Add NOT NULL to existing column | Breaking on existing nulls | Backfill / cleanup nulls → add NOT NULL. |
| Add UNIQUE constraint | Breaking on duplicates | Deduplicate → add constraint. |
| Reorder / restructure JSON / document shape | Often breaking (consumer-dependent) | Treat as semantic change; expand/contract with versioned shape. |

Reference: [`references/change-classification.md`](./references/change-classification.md) for worked examples per change type.

## Expand/contract — canonical sequence

For any breaking change, the canonical sequence is:

1. **Expand** — add the new shape additively. Old shape continues to work. Consumers unchanged.
2. **Backfill** — populate the new shape with data derived from the old. Idempotent; resumable; verifiable.
3. **Dual-write** — every producer writes to BOTH old and new shapes. Equivalence is verified continuously.
4. **Migrate readers** — switch each consumer to read from the new shape, one at a time. Verify equivalence per consumer.
5. **Stop writing to old shape** — once all consumers are off the old shape, producers stop writing to it.
6. **Contract** — drop the old shape. This is the only irreversible step; all prior steps are reversible by reverting the producer or reader change.

Each step is its own deploy. Between steps, the system is in a valid dual-state — never in a state where a partial failure breaks correctness.

## Backfill design — idempotent, resumable, verifiable

Backfills are the most-likely-to-fail step. Design for failure:

- **Idempotent** — running the backfill twice produces the same result. Use upserts or "if not already migrated" guards.
- **Resumable** — checkpoint progress (last id processed; last timestamp). Restart picks up where it left off.
- **Bounded batches** — process in chunks small enough to fit in one transaction; avoid long-running transactions that bloat locks.
- **Throttled** — backfill rate respects the budget the production workload has spare. Run at low-traffic windows when possible.
- **Verifiable** — produce a per-batch count + checksum so the reader can confirm equivalence with the source.
- **Reversible** — design how to "un-backfill" if the new shape is wrong; usually means leaving the old shape untouched until the contract step.

## Consumer-driven contracts

Before applying any breaking change, enumerate the consumers and produce a contract spec per dataset / column / topic:

```markdown
**Contract [C-NN]: <dataset.column or topic.field>**
- Producer: <service / job / system>.
- Consumers: <list of services / jobs / dashboards / integrations>.
- Schema: <type, nullable, format>.
- Semantics: <what the value means, units, edge cases>.
- Freshness SLA: <data arrives within X minutes of source event>.
- Compatibility commitment: <backward-compatible additive changes only; breaking changes require N days notice>.
- Owner: <role>.
```

A change cannot proceed until every consumer is identified and the change is compatible with the stated commitment OR each consumer has explicitly approved the breaking change with a migration plan.

## Rollback plan — required, not optional

Every migration step has a rollback. State it explicitly per step:

- **Expand** — rollback: drop the new column / table (no consumer depends on it yet).
- **Backfill** — rollback: the new shape is incomplete; halt the backfill; consumers still on the old shape are unaffected.
- **Dual-write** — rollback: producers stop writing to the new shape; the new shape becomes stale but does not corrupt the old.
- **Migrate readers** — rollback: switch the consumer back to the old shape (still being written).
- **Contract** — rollback: NOT POSSIBLE in a forward direction; recovery requires restoring from backup. This is why contract is the last step.

A plan that lacks a rollback per step is incomplete.

## Output structure

Caller adapts to its destination (migration design doc, ADR addendum, runbook). Suggested structure:

```markdown
## Change summary
- What is changing: <e.g., "rename `user.email_addr` to `user.email`">.
- Classification: <per the change-classification table>.
- Why now: <business / technical driver>.
- Evidence level: [Verified | Inference | Unverified | Verified-external — <source>]

## Consumers enumerated
- Producer(s): <list>.
- Consumer(s) with use case: <list with how each uses the surface>.
- Confirmed via: <code search, codegraph impact, ownership registry, stakeholder check>.

## Compatibility analysis
- Backward-compatible: yes / no — <reason>.
- Forward-compatible: yes / no — <reason>.
- If breaking, consumer approval status: <per consumer>.

## Migration plan — stepwise
1. **Expand** — <DDL or DSL agnostic description>. Rollback: <how>.
2. **Backfill** — <strategy, idempotency, batching, verification>. Rollback: <how>.
3. **Dual-write** — <which producers, equivalence check>. Rollback: <how>.
4. **Migrate readers** — <order, per-consumer verification>. Rollback: <how>.
5. **Stop writing old shape** — <when, who confirms>. Rollback: <how>.
6. **Contract** — <DDL to drop old shape>. Rollback: <NOT POSSIBLE; restore from backup window — state the backup window>.

## Verification per step
- Step 1 expand: <how to verify the additive change took effect>.
- Step 2 backfill: <count match, checksum, sample inspection>.
- Step 3 dual-write: <equivalence query, continuous comparison>.
- Step 4 reader migration: <per-consumer canary, traffic comparison>.
- Step 5 stop writes: <monitoring for stale writes>.
- Step 6 contract: <post-drop smoke tests>.

## Data contract update
- Contract version before: <X>.
- Contract version after: <Y>.
- Notice period required by contract: <hours / days>.
- Communication plan: <how consumers were notified>.

## Risks and residuals
- <Risk>: <mitigation>.

## Open questions
- <Questions for the caller / architect / consumer owners>.
```

## Workflow

1. **Answer the four questions** — what, who consumes, freshness/consistency contract, rollback. Refuse to plan without them.
2. **Classify the change** per the table above.
3. **Enumerate consumers** — code search + codegraph impact + ownership registry + explicit stakeholder check. Document who confirmed.
4. **Apply expand/contract** for breaking changes; single-phase for non-breaking. Cite the change-classification table.
5. **Design the backfill** with idempotency, resumability, throttling, verification.
6. **State rollback per step** — including the irreversible last step with its backup-window mitigation.
7. **Define per-step verification** — what evidence proves each step succeeded before proceeding to the next.
8. **Update the data contract** — version bump + notice period + communication.
9. **Tag every claim** per `${CLAUDE_PLUGIN_ROOT}/references/evidence-rule.md`.
10. **Self-check** before emission.

## Self-check (mandatory)

- [ ] All four pre-migration questions answered (what, who, contract, rollback).
- [ ] Change classified per the table.
- [ ] Every consumer enumerated and confirmed (code search + codegraph impact + ownership).
- [ ] Expand/contract applied for any breaking change.
- [ ] Backfill is idempotent, resumable, throttled, verifiable.
- [ ] Rollback stated per step (including the irreversible last step's backup-window mitigation).
- [ ] Per-step verification defined with concrete evidence.
- [ ] Data contract version bump + notice period + comm plan included.
- [ ] No stack assumption baked in (no specific tool, engine, or deployment cadence assumed).
- [ ] Every claim tagged with an evidence level.
- [ ] No `Status:` or other tracker-lifecycle field embedded.

## Anti-patterns to reject

- **Single-phase breaking change** — applying a drop, rename, or NOT NULL in one deploy; consumers fail under any version skew.
- **"We'll deal with the readers later"** — readers must be migrated BEFORE the old shape is dropped; "later" silently breaks them.
- **Non-idempotent backfill** — re-running the backfill on partial failure produces double-writes or skipped rows.
- **Long-running migration transaction** — locks bloat; production performance degrades; rollback is harder.
- **Backfill without throttle** — saturates write capacity; production workload starves.
- **No equivalence check between old and new shape during dual-write** — silent divergence; readers see different answers depending on path.
- **Contract step with no rollback statement** — irreversibility must be acknowledged with the backup-window mitigation.
- **Skipping consumer enumeration because "we know who reads this"** — every team that has done this has forgotten a consumer.
- **Renaming as a one-shot DDL** — `ALTER TABLE ... RENAME COLUMN` is breaking even when the engine supports it in one statement.
- **Adding a NOT NULL without backfilling nulls first** — fails on existing rows.
- **Coupling the plan to a specific migration tool's idioms** — the plan must read correctly without naming the tool.

## Communication

- Lead with **what changes + classification + irreversibility**. The reader needs to know the blast radius first.
- Surface every consumer and how it was confirmed. "We checked" is not enough; cite the search / ownership lookup.
- Per-step rollback is non-negotiable. A plan without rollbacks reads as untested.
- Tag external-source claims (e.g., engine docs, vendor advisories) with `[Verified-external]` per the plugin-root convention.

## Scope and boundaries

This skill handles:

- The plan for a schema change — expand/contract sequencing, backfill, dual-write, reader migration, contraction, rollback.
- Consumer enumeration and data contract update.
- Verification strategy per step.

This skill does not handle:

- Executing the migration — that is `software-developer`.
- Choosing the storage engine — that is `software-architect`.
- Designing the schema from scratch — that is `data-modeling`.
- Application code that consumes the new shape — that is `software-developer`.
- Testing strategy for the application — that is `quality-engineer`. (Data-contract tests for the migration itself live in this plan.)
- Operational runbook for the production rollout — out of scope; the plan is input to the runbook.

## Reference index

- [`references/expand-contract-playbook.md`](./references/expand-contract-playbook.md) — full Sadalage expand/contract walkthrough with worked example.
- [`references/change-classification.md`](./references/change-classification.md) — every change type with the corresponding strategy and rollback.
- `${CLAUDE_PLUGIN_ROOT}/references/evidence-rule.md` (plugin-root) — citation convention.
- `${CLAUDE_PLUGIN_ROOT}/references/code-grounded-analysis.md` (plugin-root) — read the current schema + every consumer before planning the change.
