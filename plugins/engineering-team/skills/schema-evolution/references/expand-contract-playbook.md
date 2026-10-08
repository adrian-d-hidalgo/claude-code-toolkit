# Expand/contract playbook — Sadalage

Pramod Sadalage's expand/contract pattern (_Refactoring Databases_, 2006) makes every breaking schema change a sequence of additive, reversible steps. The pattern works because no single deploy is breaking — the system runs through a dual-state window where both the old and new shapes are valid.

## The six phases

For any breaking change, the canonical phases:

1. **Expand** — additively introduce the new shape (new column / table / index). Old shape continues. Consumers unchanged.
2. **Backfill** — populate the new shape from existing data, idempotently and resumably.
3. **Dual-write** — every producer writes to both shapes from this deploy forward. Equivalence checked continuously.
4. **Migrate readers** — switch consumers one at a time. Verify per-consumer equivalence.
5. **Stop writing to old shape** — once all consumers are off the old, producers stop maintaining it.
6. **Contract** — drop the old shape (the only irreversible step).

Each phase is a separate deploy; the system is always in a valid state between phases.

## Worked example: rename `user.email_addr` → `user.email`

### Starting state

```text
TABLE user
  id           PK
  email_addr   TEXT NOT NULL
  ... other columns ...

Consumers reading `email_addr`:
- auth-service: SELECT email_addr FROM user WHERE id = ?
- notification-service: SELECT email_addr FROM user JOIN ...
- analytics-pipeline: nightly ETL reads email_addr
- export-tool: weekly customer export
- support-dashboard: search by email_addr LIKE ?
```

### Phase 1 — Expand

Add the new column nullable. Rollback: drop the new column.

```text
ALTER TABLE user ADD COLUMN email TEXT NULL;
```

Verification: column exists; no consumer impact (no consumer reads it yet).

### Phase 2 — Backfill

Populate `email` from `email_addr`. Idempotent. Resumable from a checkpoint. Throttled.

```pseudocode
batch_size = 10_000
checkpoint = load_checkpoint() or 0
while True:
    rows = SELECT id, email_addr FROM user
           WHERE id > checkpoint AND email IS NULL
           ORDER BY id LIMIT batch_size
    if rows is empty: break
    UPDATE user SET email = email_addr WHERE id IN (...)
    checkpoint = max(rows.id); save_checkpoint(checkpoint)
    sleep(throttle_ms)
```

Verification: `SELECT COUNT(*) FROM user WHERE email IS NULL AND email_addr IS NOT NULL` returns 0. Rollback: the new column has data but no consumer relies on it; halt backfill is safe.

### Phase 3 — Dual-write

Update producers to write to both columns. Add an equivalence check that runs continuously.

```pseudocode
# Producer code (in every service that writes to user):
INSERT INTO user (..., email_addr, email) VALUES (..., $new_value, $new_value)
UPDATE user SET email_addr = $new, email = $new WHERE id = ?
```

Continuous equivalence check:

```text
SELECT COUNT(*) FROM user WHERE email_addr <> email AND email IS NOT NULL
-- expected: 0
```

Verification: dual-write deployed to every producer; equivalence check stays at zero over time. Rollback: revert producers to single-write to `email_addr`.

### Phase 4 — Migrate readers

One consumer at a time:

1. auth-service — change query to read `email`; deploy; verify auth still works (login attempts, success rate).
2. notification-service — change query; deploy; verify notification delivery rate unchanged.
3. analytics-pipeline — change ETL; verify next nightly run produces equivalent counts to prior.
4. export-tool — change export query; verify export file equivalence on a sample.
5. support-dashboard — change search query; verify search results match.

Per-consumer verification: side-by-side query comparison on a sample before flipping; observability of the consumer's success metrics after.

Rollback per consumer: revert the consumer's query change. The old shape is still being written, so the consumer keeps working.

### Phase 5 — Stop writing to old shape

After all consumers are confirmed migrated:

```pseudocode
INSERT INTO user (..., email) VALUES (..., $new_value)  -- email_addr no longer written
```

Verification: no recent writes set `email_addr`; old shape becomes stale but is still readable. Rollback: re-enable writes to `email_addr` (still in schema).

### Phase 6 — Contract

Drop the old column. **Irreversible without backup restore.**

```text
ALTER TABLE user DROP COLUMN email_addr;
```

Verification: column gone; no consumer fails (already verified in phase 4); no producer fails (already verified in phase 5). Rollback: NOT POSSIBLE in forward direction; restoration requires backup from before phase 6.

State the backup window in the plan: "snapshot taken at <timestamp>; recovery window 7 days; estimated recovery time 4 hours."

## When to use ghost-table instead of ghost-column

When the change is at the table level (rename, restructure, partition), use ghost-table:

1. Create the new table empty.
2. Backfill from old to new.
3. Dual-write to both.
4. Migrate readers to the new table.
5. Stop writes to the old.
6. Drop the old.

Same six phases, applied at table granularity.

## Common variations

### Variation: change column type (narrowing or semantic)

The dual-write phase includes the transformation:

```text
INSERT INTO user (..., email, email_normalized)
VALUES (..., $new, LOWER(TRIM($new)))
```

The backfill applies the same transformation to existing rows. The equivalence check accounts for the transformation.

### Variation: add NOT NULL to an existing nullable column

1. Expand — add the constraint as NOT VALID (engine-dependent; in engines that support it, the constraint is enforced for new writes but not retroactively validated).
2. Backfill — populate any existing NULLs with a default or backfilled value, in batches.
3. (No dual-write phase needed — same column.)
4. Migrate readers — only relevant if readers must handle the previously-null state.
5. (No stop-write phase.)
6. Contract — VALIDATE the constraint (the engine performs a full-table check; this is online in some engines, offline in others).

Plan for the validation step's cost and lock implications.

### Variation: drop column

1. (No expand.)
2. (No backfill — the column is going away.)
3. Stop writing to the column (every producer).
4. (No reader migration — readers already not using the column, but verify zero recent reads via query logs / proxy logs.)
5. (Stop is the same as 3.)
6. Drop the column.

The risk here is missing a reader. Use the engine's query log or a passive proxy to confirm zero recent reads before the drop.

## Anti-patterns specific to expand/contract

- **Skipping the dual-write phase** because "the backfill is one-shot" — without dual-write, new rows written between backfill and reader migration are missed.
- **Migrating all readers in a single deploy** — robs the safety of per-consumer rollback. One at a time.
- **Performing phase 6 within hours of phase 5** — leave a soak period; bugs surface in production timing, not staging.
- **Treating the equivalence check as setup-only** — run it continuously through dual-write; silent drift is the failure mode.
- **No checkpoint on the backfill** — restart from zero on any partial failure wastes hours and risks duplicate writes.
- **No rollback statement on phase 6** — irreversibility must be acknowledged and the backup-window mitigation stated.

## Reference

- Sadalage & Ambler, _Refactoring Databases: Evolutionary Database Design_ (Addison-Wesley, 2006). Chapters 4–6.
- Stripe Engineering, "Online migrations at scale" (2017).
- GitHub Engineering, "Online schema migrations" (gh-ost).
- PlanetScale documentation on online schema changes.
