---
name: git-commit
description: Use when the user asks to draft, propose, suggest, generate, compose, optimize, improve, refine, review, critique, or rewrite the text of a git commit message — subject or body. Trigger phrases include "commit message", "commit subject", "commit body", "commit msg please", "what should the commit message say", "what to put as the commit subject", "mensaje del squash", "mensaje para el commit", and elliptical references. Applies for staged, hypothetical, or prospective changes.
allowed-tools:
  - Read
  - Bash(git status:*)
  - Bash(git diff:*)
  - Bash(git log:*)
  - Bash(git show:*)
  - Bash(git diff-index:*)
  - Bash(git rev-parse:*)
  - Bash(git ls-files:*)
  - Bash(git config:*)
  - Bash(git shortlog:*)
  - Bash(git blame:*)
---

# git-commit skill

Proposes value-focused commit messages by reading the actual diff AND the repo's recent git log, then matching that repo's real format. Anchored to **Conventional Commits 1.0.0** but explicitly rejects the over-strict "Tim Pope 50/72" interpretation when the repo's history shows the team uses a different style. **The repo's history is the source of truth for format.**

## Methodology anchor

- **Specification**: Conventional Commits 1.0.0 (spec finalized 2018). The `type(scope[,scope...])[!]: description` envelope and the breaking-change marker come from here.
- **Subject discipline**: Beams imperative-mood litmus ("If applied, this commit will \_\_\_") + AngularJS commit conventions for type vocabulary.
- **Body discipline**: per repo; the skill detects from `git log` whether the repo uses bullets / Problem-Solution-Impact / terse one-liner.
- **Rejected dogma**: Tim Pope's 50/72-char rule when the repo's actual median subject length disproves it. Modern teams routinely run 70–120 char subjects; the skill calibrates the cap from `git log`.

## Scope and boundaries

This skill **only**:

- Reads staged diff + recent git log to learn the repo's real format.
- Produces 3 message proposals (subject-only, +brief body, +full body).
- Validates each proposal against a self-check list before showing.
- Returns the proposals as text.

This skill **never**:

- Runs `git add` (no staging).
- Runs `git commit` (no execution).
- Performs `git rebase`, `git squash`, or splits commits.
- Suggests breaking changes into multiple commits (out of scope).
- Adds `Co-authored-by: Claude`, `Generated with Claude Code`, or any AI attribution.

If the user wants execution, they handle it themselves.

## Activation precondition

Before doing anything else, run:

```
git rev-parse --is-inside-work-tree
git diff --cached --name-status --diff-filter=ACDMRT
git log --oneline -20
```

**Abort cases**:

- Not a git repo → tell the user, stop.
- Empty staged diff → tell the user "no hay cambios staged. Haz `git add <archivos>` primero y vuelve a invocarme." Do not propose anything.

## DIFF-FIRST + LOG-FIRST protocol (core rule)

The skill never writes a subject before reading **both** the diff and the recent log.

```
git diff --cached --name-status --diff-filter=ACDMRT
git diff --cached --stat
git log --oneline -20
```

For diffs over 200 lines, also run:

```
git diff --cached -M --find-renames --name-status
```

The recent log reveals: subject length norms, scope vocabulary, body style (bullets vs prose vs none), whether `(#NN)` PR suffixes are used, whether trailers are used. **Match what the repo actually does — do not impose external dogma.**

## Flag → allowed verb mapping (strict)

| Git flag                                    | Meaning                               | Allowed verb / type                                 | Forbidden               |
| ------------------------------------------- | ------------------------------------- | --------------------------------------------------- | ----------------------- |
| `A`                                         | New file with no prior existence      | `add` / `feat:`                                     | "update", "modify"      |
| `M`                                         | Existing file modified in place       | `update`, `fix`, `refactor`, `perf` (per semantics) | "add"                   |
| `D`                                         | File deleted                          | `remove` / `chore: remove`                          | "update"                |
| `R{score≥90}`                               | Pure rename, content nearly identical | `rename` or `move`                                  | "add", "update", "feat" |
| `R{score 70-89}`                            | Rename + minor modification           | `rename and update <X>`                             | "add", "feat"           |
| `R{score<70}` + significant `M`             | Rename + substantial change           | Describe both: rename + what changed                | "add"                   |
| `D` old + `A` new path with high similarity | Move without git rename detection     | `move <X> to <Y>`                                   | "add", "feat", "remove" |
| `C`                                         | File copied                           | `add <X>` (note "copied from Y" in body)            | "update"                |

**Master rule**: if the flag for a file cannot be determined, run more git commands. Never assume.

## Type semantics

| Type       | When to use                                      | Diff signal                                             |
| ---------- | ------------------------------------------------ | ------------------------------------------------------- |
| `feat`     | Net-new capability visible to user/caller        | New exports, new routes, new UI, new public methods     |
| `fix`      | Corrects wrong behavior                          | Modifies existing logic paths                           |
| `refactor` | Structural improvement, **zero** behavior change | Move/rename/extract; no new test for new behavior       |
| `perf`     | Measurable throughput/latency improvement        | Algorithm change, batching, caching; behavior preserved |
| `docs`     | Documentation only                               | `.md`, comments, README changes only                    |
| `style`    | Whitespace, formatting, lint                     | No semantic change                                      |
| `test`     | Adds/corrects tests only                         | Files under `test/`, `__tests__/`, `*.spec.*`           |
| `build`    | Build process, deps, packaging                   | `package.json`, `pyproject.toml`, `Makefile`            |
| `ci`       | CI/CD config                                     | `.github/workflows`, `.gitlab-ci.yml`                   |
| `chore`    | Maintenance not fitting above                    | Tooling setup, config alignment, deploy bumps           |
| `revert`   | Reverts previous commit                          | Format: `revert: <subject of reverted commit>`          |

**Type priority on mixed diffs**: `fix` > `feat` > `perf` > `refactor` > scope-specific (`docs`/`test`/`build`/`ci`/`style`) > `chore`. Pick highest-priority type and let the body cover secondary changes.

## Subject rules

Format: `type[(scope[,scope...])][!]: description`.

- **No hard char limit, but a hard envelope**. Match the length distribution observed in `git log --oneline -20`. Many teams use 70–120 char subjects routinely. Reject the "50-char rule" if the repo's history disproves it. BUT: if the draft subject is >1.5× the repo's median non-deploy subject length, the body is being stuffed into the subject — cut it down.
- **Imperative mood**: "add", "fix", "remove", "introduce" — never "added", "fixes", "fixing".
- **Lowercase post-colon**, no period at end.
- **Scope = domain or module** (e.g. `aria`, `crm`, `paid-media`, `agui`, `tooling`, `design-system`, `agents`). Never a folder/file path (`.project`, `src/`, `node_modules`).
- **Multi-scope** with comma + no space: `feat(crm,data-ingestion):`. Use when the change cuts across domains the repo's log already names.
- **Breaking change marker**: `!` after type/scope, e.g. `feat(api)!:`.
- **`(#NN)` PR suffix**: only if the repo's log shows it consistently — it usually arrives via squash-merge, not direct commits. Do not add speculatively.

**Beams litmus test (mandatory)**: the subject must complete "If applied, this commit will \_\_\_." If it does not parse as a sentence, reject and rewrite.

### Subject envelope — one idea, not a comma-chained list (critical)

The subject names the change **at the highest level of abstraction the reader needs to pick this commit out of a log**. The body explains the moving parts. If the subject contains a comma-chained list of independent ideas, the body is being written in the subject — wrong layer.

**Hard rule**: if removing any comma-separated clause from the subject still leaves a meaningful subject, that clause belongs in the body, not the subject. The subject must collapse to one coherent idea.

**Mechanical guard**: count the commas in the subject _after_ the `type(scope):` prefix. **0 or 1 comma is fine. 2+ commas is almost always a stuffed subject**, even when each clause is technically related. The exception is when commas are part of a single phrase, not separators between ideas ("rename foo, bar and baz to X" is one idea — a rename — even with two commas).

**"AND" is also a separator**. "split X **and** drop Y" = two ideas. Keep the dominant one in the subject, move the other to a bullet. If both are genuinely co-equal, the commit probably should be two commits — but this skill never recommends splitting (out of scope), so pick the dominant idea and let the body cover the rest.

### Length cap derived from the repo

Before writing the subject:

1. Compute `median_len` = median length of subjects in `git log --no-merges --pretty=format:"%s" -25`, ignoring the recurring `chore(deploy):` bump pattern (those are short and bias low).
2. Set `subject_cap ≈ 1.5 × median_len`.
3. If the draft subject exceeds `subject_cap`, rewrite. The extra content goes to the body.

Example: in a repo where most subjects sit at 80–110 chars (median ~100), `subject_cap ≈ 150`. A 200+ char subject is a rewrite signal, no exceptions.

### Picking the scope

1. List candidate scopes from the diff (which domains/modules are touched).
2. Cross-reference with scope vocabulary observed in `git log --oneline -20`.
3. Choose the scope(s) that name the **value/domain** of the change, not where files happen to live.

Examples of right vs wrong:

- ✓ `docs(agents,docs):` — change is about agent guidance + general docs structure.
- ✗ `docs(.project):` — `.project` is a folder, not a domain.
- ✓ `chore(tooling):` — change adds lint/format tooling.
- ✗ `chore(scripts):` — "scripts" is a package.json field, not a domain.
- ✓ `feat(crm,data-ingestion):` — value spans CRM and ingestion domains.
- ✗ `feat(src/crm):` — path-shaped, not a domain.

## Body rules

Match the repo's body style observed in `git log -20 --no-merges --pretty=format:"%h %s%n%b%n---"`.

If the repo uses **bullets with `-`** (common): use bullets. Each bullet describes one outcome or piece of value. Keep order: most important first.

If the repo uses **Problem→Solution→Impact prose**: use that.

If the repo's bodies are **terse / one line / empty**: do not pad.

**No rigid 72-char wrap unless the repo's history shows that wrap.** Most modern teams do not.

**Body required when**:

- Change is non-obvious from the subject.
- Multiple coherent pieces of work bundle together.
- A breaking change needs explanation.

**Body optional when**:

- Subject is fully self-explanatory and the diff is single-purpose.

## Self-check checklist (apply to every proposal)

- [ ] Type matches observed git flags per the mapping table.
- [ ] Subject passes Beams imperative test.
- [ ] Subject length matches the repo's observed distribution (no arbitrary 50-char trim).
- [ ] No period at end of subject.
- [ ] Lowercase after colon.
- [ ] Scope is a domain/module name observed in `git log`, never a folder/file path.
- [ ] Multi-scope uses comma + no space.
- [ ] Body style matches the repo (bullets vs prose vs empty).
- [ ] **Zero** mentions of file or line counts.
- [ ] **Zero** granular inventories of internal content (parenthetical lists of doc sections, ToC dumps).
- [ ] **Zero** AI attribution (`Co-authored-by: Claude`, `Generated with Claude Code`, etc.).
- [ ] **Zero** blacklisted vague verbs (full list in `references/blacklist.md`).
- [ ] If type is `refactor:`, diff confirms zero behavior change.
- [ ] Breaking changes marked with `!` or `BREAKING CHANGE:` footer.
- [ ] `(#NN)` PR suffix only if the repo's log uses it consistently.

## Output contract

Produce exactly **3 proposals** with increasing detail:

1. **Option 1** — Subject only. Minimum viable for obvious changes.
2. **Option 2** — Subject + brief body (1–4 bullets or 1–2 prose lines, matching repo style).
3. **Option 3** — Subject + full body in repo style.

Format:

```
Staged changes:
- file1.ts (M)
- file2.ts (A)
- old.ts → new.ts (R95)

Detected repo format (from git log):
- Subject style: <short / long-descriptive>
- Body style: <bullets with "-" / prose / empty>
- Scope vocabulary: <observed scopes>
- PR suffix `(#NN)`: <yes / no>
- Trailers: <yes / no>

Proposed commit messages:

──────── Option 1: subject only ────────
<message 1>

──────── Option 2: subject + brief body ────────
<message 2>

──────── Option 3: subject + full body ────────
<message 3>
```

Then ask: "¿Cuál prefieres, o ajusto algo?"

## Workflow summary

1. Verify git repo + staged diff exists (else abort with clear message).
2. Read staged diff + run `git log --oneline -20`. Detect repo's subject length, body style, scope vocabulary, PR suffix usage, trailer usage.
3. Build flag map per file.
4. Pick type from semantics (priority: `fix` > `feat` > `perf` > `refactor` > scope-specific > `chore`).
5. Pick scope(s) from the repo's observed vocabulary, naming domains not paths. Multi-scope when value cuts across domains.
6. Draft subject; run Beams test; verify imperative; verify length matches the repo's distribution.
7. Decide whether body is needed; pick body style from repo norms (bullets/prose/empty).
8. Write body without granular inventories, file counts, mechanical bullets, or AI attribution.
9. Build 3 proposals (subject, +brief body, +full body).
10. Run full self-check on each; regenerate any that fail.
11. Present output in the specified format. Do not execute. Wait for user choice.

## Reference index

- [`references/blacklist.md`](./references/blacklist.md) — forbidden subjects, body anti-patterns, granular content inventories, cross-layer restating, wrong-verb errors. The deep guide to what must be rejected.
- [`references/examples.md`](./references/examples.md) — good and bad examples bank covering long subject + multi-scope + bullets, short prose body, subject-only patterns, one-bullet body for multi-action commits, plus the cross-layer and stuffed-subject failure modes.
- [`references/squash-mode.md`](./references/squash-mode.md) — squash workflow for collapsing a branch's commits into a single message. Uses net diff (`<base>...HEAD`, three-dot) as source of truth, reuses intermediate commit text only where the net diff confirms it, handles reverted-in-branch churn and re-touched names correctly.
