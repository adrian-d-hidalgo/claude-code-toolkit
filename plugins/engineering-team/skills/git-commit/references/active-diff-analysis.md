# Active diff analysis

Before proposing the subject, the skill scans `git diff --cached` for two classes of signal: **breaking-change indicators** (which force the `!` marker + `BREAKING CHANGE:` footer) and **atomicity smells** (which trigger a warning + alternative option without the secondary changes).

This analysis is heuristic — it is wrong sometimes, and the user can override. Surface findings; do not silently mutate the proposal.

## Breaking-change detection

A change is breaking when a consumer (caller, dependent service, downstream system) must update to remain compatible. The skill scans for these signals in the staged diff:

### Signal 1 — Removed or renamed public exports

| Language       | Pattern in diff                                                            |
| -------------- | -------------------------------------------------------------------------- |
| TypeScript/JS  | Lines starting `-export ` (function, class, const, interface, type)        |
| TypeScript     | Removed members from `.d.ts` declaration files                             |
| Python         | Removed symbols from `__all__`, or removed top-level `def`/`class` in `__init__.py` of a package |
| Rust           | Removed `pub fn`, `pub struct`, `pub enum`, `pub trait`, `pub mod` lines   |
| Go             | Removed top-level identifiers starting with capital letter                 |
| Java/Kotlin    | Removed `public` declarations                                              |

Rename without an alias = breaking. A pure rename with a re-export alias is **not** breaking on its own — the skill checks for an added alias line nearby before deciding.

### Signal 2 — Changed signature of a public symbol

A change in arity, parameter types, return type, or generic constraints of a public symbol breaks callers. Detect via:

- Lines like `-export function foo(a: number)` followed by `+export function foo(a: number, b: string)`.
- Removed required parameters even when new ones are added.
- Changed return type.
- Added required parameters without defaults.

Adding an **optional** parameter (with default or `?`) is non-breaking; the skill does not flag it.

### Signal 3 — API route or contract change

Files matching:

- `routes/`, `controllers/`, `handlers/`, `api/`
- OpenAPI / Swagger YAML
- gRPC `.proto` files
- GraphQL schema files

Signals:

- Removed routes or RPC methods.
- Changed HTTP method or path.
- Removed required fields.
- Tightened validation (a previously-accepted payload now rejected).
- Removed proto fields (NOT renumbering — that is a proto-level break).

### Signal 4 — Schema breaks in migrations

In migration files (`migrations/`, `db/migrations/`, `prisma/migrations/`, files matching `*.sql` under a migrations directory):

- `DROP COLUMN`
- `DROP TABLE`
- `ALTER COLUMN <name> TYPE` (type change)
- `ALTER COLUMN <name> SET NOT NULL` (if previous state was nullable and data may be NULL)
- Renamed columns/tables without aliases or views
- Removed indexes that consumers may have relied on (queryable surface)

Adding a column, adding a table, adding an index → non-breaking.

### Signal 5 — Removed CLI flags or env variables

- `argparse`, `click`, `commander`, `clap`, `cobra` flag removal.
- Removed required env vars in `*.env.example`, config loaders, deployment manifests.

### Action when any signal fires

1. Add `!` after type/scope: `feat(api)!:`, `fix(db,api)!:`.
2. Add a `BREAKING CHANGE:` footer that names what broke and how consumers should adapt:

   ```
   BREAKING CHANGE: <symbol or contract> is removed. Callers should migrate to <alternative>.
   ```

3. Surface the detection in the output preamble:

   ```
   ⚠ Possible breaking change detected: <signal description>.
     Included `!` marker and BREAKING CHANGE footer.
     If this is intentional but non-breaking (e.g. internal symbol), say so and I'll remove the marker.
   ```

If the user contradicts the detection, retract the marker in the next iteration. Do not stop offering breaking-change framing in future runs — heuristics fail; the user is the ground truth.

## Atomicity smell detection

A commit should encapsulate **one logical change**. Bundles of unrelated work make `git bisect` and `git revert` painful. The skill detects smells without recommending a split (out of scope).

### Smell 1 — Multi-domain spread without a thread

The diff touches 3+ top-level domains from the scope dictionary (see SKILL.md) with no shared narrative. Example:

```
src/auth/...        ← auth work
src/billing/...     ← billing work
src/reporting/...   ← reporting work
docs/CHANGELOG.md   ← unrelated changelog
```

If the dominant domain has <50% of the changed lines and the others are similarly sized, that is a smell.

### Smell 2 — Competing change types

The diff signals multiple high-priority types competing:

| Concurrent signals                                | Smell                                       |
| ------------------------------------------------- | ------------------------------------------- |
| New tests **for unrelated existing features**     | `test:` work mixed with `fix:`/`feat:` work |
| Dep bump + feature work + migration               | `build:` + `feat:` + db change              |
| `.github/workflows/*` + production source         | `ci:` + `feat:`/`fix:`                      |
| Lint config change + behavior change              | `chore:` + `fix:`/`feat:`                   |

The type-priority table picks the dominant. The smell warning surfaces the others.

### Smell 3 — Migration + feature surface + deps in one commit

This combination almost always belongs in 2-3 commits (migration on its own; feature surface depending on migration; deps separately) so that `git bisect` can land on a single concern. Flag it explicitly.

### Action when a smell fires

Add a preamble to the output:

```
⚠ Possible atomicity smell: this diff spans <N> domains (<list>) and <M> change types (<list>).
  Dominant: <dominant scope/type>.
  Consider whether the secondary changes belong in separate commits.

  Option 3 (below) excludes the secondary changes — if you want, stage only the dominant
  and re-invoke me.
```

One of the three proposals must be the **dominant-only** variant: subject and body covering only the dominant domain, as if the secondary files weren't staged.

The skill never says "you should split this commit" — that is an out-of-scope action. It only surfaces the smell and offers the option to commit narrower.

## Calibration

These heuristics produce false positives. Track which ones the user contradicts most often and tune. Initial defaults:

- Breaking-change detection: high-precision signals (removed exports, DROP COLUMN) trigger automatically; medium-precision (signature changes) trigger with hedging language ("Possibly breaking — check whether <symbol> is consumed externally").
- Atomicity smells: surface as warnings, never as blockers. The user committing wide is their choice; the skill just notes the shape.
