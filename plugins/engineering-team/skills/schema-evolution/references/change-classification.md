# Change classification — strategy and rollback per change type

Every schema change falls into one of the categories below. The classification determines the strategy (single-phase vs expand/contract) and the rollback path.

## Reading the table

- **Compatibility** — backward (old consumers keep working), forward (new consumers can read old data), both, neither.
- **Strategy** — single-phase or expand/contract (E/C).
- **Rollback** — what reverts the change if it fails mid-way.

## Schema changes

### Add nullable column

- Compatibility: backward + forward.
- Strategy: single-phase.
- Rollback: drop the column.
- Notes: trivially safe. No consumer is affected because the column is nullable and consumers ignore unknown columns by default.

### Add NOT NULL column

- Compatibility: breaking on existing rows.
- Strategy: E/C — add nullable → backfill → enforce NOT NULL → done.
- Rollback per phase:
  - Expand: drop the column.
  - Backfill: halt; column has partial data but consumers ignore it.
  - Enforce NOT NULL: drop the constraint (column stays).
- Notes: if a default value is acceptable, the backfill is one statement. If derived, the backfill is the standard idempotent batch loop.

### Drop column

- Compatibility: breaking.
- Strategy: E/C — stop writes → verify zero reads → drop.
- Rollback:
  - Stop writes: resume writes (column still exists).
  - Drop: irreversible without backup restore.
- Notes: the underrated risk is forgotten readers. Use query logs / proxy logs to confirm zero recent reads before the drop.

### Rename column

- Compatibility: breaking.
- Strategy: E/C — add new column → backfill → dual-write → migrate readers → stop writes to old → drop old.
- Rollback per phase: see the worked example in [`expand-contract-playbook.md`](./expand-contract-playbook.md).
- Notes: never use the engine's atomic `RENAME COLUMN` for a production schema with active consumers — it is breaking even when atomic.

### Change column type — widening (e.g., INT → BIGINT, VARCHAR(50) → VARCHAR(255))

- Compatibility: usually backward.
- Strategy: single-phase if the engine supports online widening; otherwise E/C.
- Rollback: depends on engine. If single-phase widening was online, rollback usually means restoring from backup (narrowing is breaking).
- Notes: confirm the engine supports the widening online before treating as single-phase. Some engines rewrite the table for some widening operations.

### Change column type — narrowing or semantic change (e.g., TEXT → INT, normalise case, unit change)

- Compatibility: breaking.
- Strategy: E/C with explicit transformation in the dual-write phase.
- Rollback per phase: standard expand/contract rollbacks.
- Notes: the equivalence check must apply the transformation when comparing old and new shapes.

### Add foreign key

- Compatibility: breaking on existing data that violates the constraint.
- Strategy: validate existing data first → add constraint (engines often support NOT VALID + VALIDATE).
- Rollback: drop the constraint.
- Notes: VALIDATE may require a full-table scan; plan for the lock or use the engine's online validation if available.

### Drop foreign key

- Compatibility: non-breaking (no consumer code relies on the constraint's enforcement at the DB layer — but verify).
- Strategy: single-phase.
- Rollback: re-add the constraint (validation cost applies).
- Notes: verify no application code depends on the constraint's specific error code for behaviour.

### Add CHECK constraint

- Compatibility: breaking on existing rows that violate.
- Strategy: validate existing data → fix violators → add constraint.
- Rollback: drop the constraint.
- Notes: similar to NOT NULL; same handling.

### Add UNIQUE constraint

- Compatibility: breaking on existing duplicates.
- Strategy: deduplicate existing rows → add constraint.
- Rollback: drop the constraint.
- Notes: deduplication is its own data-cleanup project; plan it before treating the constraint as ready.

### Add index

- Compatibility: non-breaking; operationally expensive.
- Strategy: build concurrently / online if engine supports; otherwise schedule in a low-write window.
- Rollback: drop the index.
- Notes: indexes are part of the schema, not late tuning. Plan them with the schema in `data-modeling`.

### Drop index

- Compatibility: non-breaking but readers may slow down dramatically if a query relied on it.
- Strategy: confirm no query depends on the index (read execution plans); then drop.
- Rollback: re-add the index (build cost applies).
- Notes: use the engine's index-usage statistics to confirm zero recent uses before the drop.

### Rename table

- Compatibility: breaking.
- Strategy: ghost-table — create new → backfill → dual-write → migrate readers → stop writes to old → drop old.
- Rollback per phase: standard expand/contract rollbacks at table granularity.
- Notes: most engines' `RENAME TABLE` is atomic but still breaking for active consumers.

### Drop table

- Compatibility: breaking.
- Strategy: E/C — stop writes → verify zero reads → drop.
- Rollback: irreversible without backup restore once dropped.
- Notes: same forgotten-reader risk as drop column, amplified.

### Restructure JSON / document shape

- Compatibility: consumer-dependent. Often breaking.
- Strategy: treat as semantic change — version the shape; expand/contract via a shape-version field.
- Rollback: per phase, similar to column changes.
- Notes: document stores are not schemaless — they have a read-time schema enforced by consumers. Treat shape changes with the same discipline as DDL.

## Event-stream / message-broker changes

### Add a new event field (optional)

- Compatibility: backward + forward (consumers ignore unknown fields).
- Strategy: single-phase.
- Rollback: stop producing the new field.
- Notes: use a schema-registry-aware serialisation (Avro, Protobuf) to enforce evolution rules at the broker layer.

### Add a new event field (required)

- Compatibility: breaking (existing consumers fail).
- Strategy: E/C — add field optional → migrate consumers → enforce required.
- Rollback per phase: per the playbook.
- Notes: most schema registries treat "required" as the breaking change; the strategy is the same as relational NOT NULL.

### Remove an event field

- Compatibility: breaking.
- Strategy: E/C — stop consuming the field (every consumer) → producer stops emitting → remove from schema.
- Rollback: re-emit the field (producers retain code for one version).
- Notes: schema-registry compatibility checks (BACKWARD, FORWARD, FULL) enforce this.

### Change event-field type

- Compatibility: breaking.
- Strategy: add the new field beside the old → dual-write → migrate consumers → drop old. Mirror of column rename.

## What does not belong in this table

Operational concerns (replication, partitioning rebalance, capacity planning) are not schema changes. They live in the SRE / platform runbook, not in the schema-evolution plan.

## How to apply

When planning a migration, use this table to:

1. Find the row that matches the change.
2. Apply the listed strategy as a default; deviate only with explicit justification.
3. Confirm the rollback path for each phase.
4. Cross-reference [`expand-contract-playbook.md`](./expand-contract-playbook.md) for the canonical six-phase sequence when E/C is the strategy.
