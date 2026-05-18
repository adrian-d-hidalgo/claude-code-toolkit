# PR sequencing patterns

How to order PRs so the system stays green through delivery and rollback stays cheap. Choose by **blast radius** and **reversibility** — never default to "merge in the order I wrote the tasks".

## Quick selection table

| Strategy              | Blast radius     | Reversibility   | Use when                                                                  |
| --------------------- | ---------------- | --------------- | ------------------------------------------------------------------------- |
| Expand–Contract       | Low if disciplined | High           | Schema or API migration with live readers/writers                          |
| Feature Flag          | Low (flag OFF)    | Very high      | Risky rollout, A/B, kill-switch desirable                                  |
| Strangler-Fig         | Medium            | High per slice  | Replacing a legacy path incrementally                                     |
| Branch-by-Abstraction | Low–Medium        | High            | Internal refactor; swap implementations behind an interface                |
| Big-Bang              | High              | Low             | Small, isolated, fully reversible change (rare — be honest about scope)    |

## §1 — Expand–Contract (schema / API migration)

The pattern: never simultaneously change reads and writes. Split into three phases.

1. **Expand** — Add the new shape alongside the old. Writes go to both (or new is derived from old). Reads still come from old.
2. **Migrate** — Backfill historical data; switch reads to the new shape behind a flag; verify parity.
3. **Contract** — Once new is canonical and stable for the required window, remove the old.

### PR ordering

```
PR-1  Expand: add new column / new endpoint / new field (no writers / readers using it yet)
PR-2  Dual-write: writers populate old + new. Readers untouched.
PR-3  Backfill (one-shot job or migration). Verify parity dashboard.
PR-4  Flagged read swap: readers use new behind flag (default OFF).
PR-5  Flip flag ON for canary → 100% over N days.
PR-6  Contract: remove old writers. Old column / endpoint deprecated, not yet removed.
PR-7  Contract: remove old column / endpoint after deprecation window (often weeks later).
```

### Rollback

At any phase before PR-7, you can flip the flag OFF and the old path remains functional. PR-7 is the only **non-reversible** step — only run it after the deprecation window.

### Anti-patterns

- "Add new, drop old" in one PR (Big-Bang masquerading as a migration).
- Skipping the parity verification step (backfill rolled but reads diverged silently).
- Contracting before the deprecation window expires (you may have stragglers).
- Dual-write without a tag distinguishing source — debugging parity issues becomes impossible.

## §2 — Feature Flag (rollout control)

Conventions roughly aligned with LaunchDarkly / Statsig flagging discipline (2024+).

### PR ordering

```
PR-1  Add flag definition (default OFF) — pure wiring, no behavior change.
PR-2  Implement new behavior behind flag. Tests cover both branches (flag-on, flag-off).
PR-3  Enable for internal users in staging (e.g. `userId in [internal-team]`).
PR-4  Gate G1: parity / smoke checks pass → 1% production canary.
PR-5  Gate G2: canary metrics green for N days → 10% → 50% → 100%.
PR-6  Cleanup: remove flag + dead branches once stable. (DO NOT SKIP.)
```

### Flag-cleanup is non-optional

Flags that linger become liability. Each flag added to `plan.md` must have a **scheduled cleanup task** (`T-NN — Remove flag <key>`) with a date or condition gate. Plans that ship flags without cleanup tasks fail self-check.

### Anti-patterns

- "Temporary" flags that survive 6+ months without cleanup.
- Flags whose state is a global mutable variable (test pollution risk).
- Flags used as feature toggles when an actual config / capability check is more appropriate.
- Flag default `ON` at PR merge (defeats the kill-switch property).
- Untested flag-off branch (only the flag-on path runs in CI).

## §3 — Strangler-Fig (legacy replacement)

Source: Martin Fowler, _StranglerFigApplication_ (2004).

The pattern: route requests through a façade. Incrementally re-implement individual capabilities behind the new system. Each capability becomes "strangled" — moved from old to new — one at a time. When all are moved, the old system is removed.

### PR ordering (high level)

```
PR-1  Introduce façade in front of legacy. All traffic still routed to legacy.
PR-2  Re-implement capability A in new system. Façade routes A to new; everything else to old.
PR-3  Re-implement capability B. Façade routes A + B to new.
…
PR-N  Last capability moved. Façade routes everything to new.
PR-N+1  Remove legacy.
```

### Anti-patterns

- "Stranglering" without a façade — direct caller migration that requires every consumer to update.
- Trying to strangle the database too. Keep one source of truth per capability during transition.
- Strangler-fig as marketing for a Big-Bang rewrite — if PR-N+1 is two weeks after PR-1, it's not strangler, it's a rewrite.

## §4 — Branch-by-Abstraction

Source: Paul Hammant (2007). Refined in Jez Humble's _Continuous Delivery_ (2010).

The pattern: introduce an abstraction (interface, port) over the thing you want to replace. Migrate callers to the abstraction. Swap the implementation behind the abstraction. Remove the abstraction (or keep, if it adds value).

### PR ordering

```
PR-1  Add abstraction (interface) wrapping current implementation.
PR-2  Migrate caller 1 to use abstraction.
PR-3  Migrate caller 2 to use abstraction.
…
PR-N  Add new implementation behind abstraction (selected via config / flag).
PR-N+1  Flip default to new implementation.
PR-N+2  Remove old implementation (and optionally the abstraction).
```

### Use this over strangler when

The change is **internal** (callers are inside your codebase, not external systems) and you want to avoid network indirection.

## §5 — Big-Bang

The pattern: one PR changes everything; revert is the only rollback.

### Use only when

- Scope is small (< 5 files, < 1 PR-day of work).
- No live consumers depend on the old shape.
- Rollback by `git revert` is genuinely sufficient (no data migration in the way).
- The team has explicit alignment that the change is "atomic on purpose".

### Anti-patterns

- Defaulting to Big-Bang because "it's simpler". Expand–contract is the safer default for any change touching schema, API, or shared contracts.
- Big-Bang on Friday afternoon.
- Big-Bang for any change with an irreversible data migration.

## Choosing strategy — decision tree

```
Is the change to a shared schema or external API contract?
├── Yes → Expand–Contract (regardless of rollout method)
└── No
    └── Is there real risk of bad rollout (perf, correctness, UX)?
        ├── Yes → Feature Flag (default OFF), with a canary plan
        └── No
            └── Is this replacing a legacy path incrementally?
                ├── Yes → Strangler-Fig
                └── No
                    └── Is this an internal refactor with multiple callers?
                        ├── Yes → Branch-by-Abstraction
                        └── No  → Big-Bang only if small, isolated, fully reversible
```

## Rollback path is mandatory

Every plan's §3 "Sequencing strategy" must state the rollback path explicitly. "We'll figure it out" is not a rollback path. Examples of valid rollback statements:

- "Flip flag `discount-redeem-v2` to OFF; readers fall back to old path within 30 seconds (flag SDK refresh interval)."
- "Re-route façade to legacy capability A; new implementation remains deployed but receives no traffic."
- "Revert PR-7 and re-deploy. Schema is forward-compatible; no data migration needed."

If you cannot write the rollback path, you do not understand the change well enough to ship it — escalate before merging.
