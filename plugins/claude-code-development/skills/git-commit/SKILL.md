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
- Adds `Co-authored-by: Claude`, `Generated with Claude Code`, `🤖`, or any AI attribution. **Hard rule** — see `references/non-goals.md` for the rationale. Never propose AI attribution even when asked.
- Proposes gitmoji or emoji-prefixed subjects. See `references/non-goals.md`.

This skill **does propose** (when applicable):

- Human `Co-authored-by: Real Person <email>` for pair/mob programming when the user names a collaborator. The AI ban above does not extend to legitimate human co-authors.

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
git log --no-merges -25 --pretty=format:"%h%n%s%n%b%n---"
git rev-parse --abbrev-ref HEAD
```

For diffs over 200 lines, also run:

```
git diff --cached -M --find-renames --name-status
```

The recent log reveals: subject length norms, scope vocabulary, body style (bullets vs prose vs none), whether `(#NN)` PR suffixes are used, **which trailers the repo uses** (Signed-off-by, Refs, Closes, Reviewed-by, Co-authored-by), **the dominant body language** (English vs Spanish vs other), and whether the repo uses squash-merge predominantly. The branch name (`git rev-parse --abbrev-ref HEAD`) reveals issue IDs for linkage. **Match what the repo actually does — do not impose external dogma.**

Detection thresholds (applied to the 25-commit sample, ignoring merge commits and `chore(deploy):` bumps):

| Signal                         | Threshold | Action                                                              |
| ------------------------------ | --------- | ------------------------------------------------------------------- |
| Trailer present in commits     | ≥70%      | Include in Option 2 and Option 3. See `references/trailers.md`.     |
| Body language (en/es/other)    | ≥70%      | Generate bodies in that language. Subject stays Conventional Commits English-style. |
| `(#NN)` PR suffix              | ≥70%      | Repo uses squash-merge; subject must work as PR title; do NOT add `(#NN)` manually (squash adds it). |
| Issue-reference format in log  | ≥70%      | Use the dominant form (`Closes #N`, `Refs: KEY-N`, `[KEY-N]`). See `references/issue-linkage.md`. |

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

### Scope clustering & cardinality (critical)

Stuffed scopes are the second most common subject pathology after stuffed descriptions. The classic failure mode is listing a parent domain side by side with its own children (`fix(childA,parent,childB):`) or chaining 4+ unrelated scopes. Apply these four rules in order — they are designed to degrade gracefully across repo layouts (feature-folder, layer-organized, scattered).

**Rule A — `git log` is the universal scope dictionary**

Before evaluating any candidate, build the dictionary of valid scopes from history:

```
git log --no-merges --pretty=format:"%s" -50
```

Parse the `type(scope):` prefixes; the set of distinct `scope` tokens is the dictionary. Any candidate scope outside this dictionary is either a typo, a new domain (confirm with the user), or path-shaped (reject). This step is universal — it works regardless of how the repo organizes files.

**Rule B — Parent/child collapse (opt-in, driven by the diff)**

Hierarchy collapse only fires when the diff's file paths actually exhibit parent/child structure:

1. Build candidate scopes by intersecting diff path-prefixes against the dictionary from Rule A.
2. If two candidates in the dictionary share a path prefix where one is an ancestor of the other in the file tree, **AND** the diff touches multiple sibling children under that ancestor, collapse to the ancestor. The body names which sub-areas changed.
3. **Ceiling**: never collapse above the highest path segment that the dictionary has used as a scope. Without this ceiling, recursive collapse terminates at the repo root — which is exactly the "everything is `(root)`" failure mode.
4. **No-hierarchy fallback**: if the diff's paths don't share scope-meaningful prefixes — repos organized by layer (`models/`, `controllers/`, `services/`) or features scattered across many folders — there is no hierarchy to collapse. Stay on the dictionary + cardinality cap; do not force a collapse.

**Rule C — Cardinality cap (soft)**

Independent of layout, the cap applies to the final subject:

| Scope count | Action                                                                                                                  |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| 1           | Normal case.                                                                                                            |
| 2           | Allowed when both are genuinely distinct roots in the dictionary.                                                       |
| 3           | **Warning**, not rejection. Mark the header as a smell; one of the 3 proposals must offer a 2-scope alternative (collapsed or dominant-only). Let the user choose. |
| 4+          | Always rewrite. Pick the dominant by change volume, or pick a dictionary-blessed umbrella; the body covers the rest.    |

**Rule D — Paths are never scopes (existing reinforcement)**

A scope is a segment, never a route. `parent/child` → the scope is `parent` or `child`, never `parent/child`. Already covered above; called out here so the four rules read as a complete procedure.

## Active diff analysis — breaking changes and atomicity

After scope selection but before drafting the subject, the skill scans the staged diff for two classes of signal that change the proposed message structure: **breaking-change indicators** and **atomicity smells**. Heuristics fail sometimes — the user is the ground truth — so findings are surfaced as preamble warnings, not silent mutations. Full pattern catalogue in `references/active-diff-analysis.md`.

### Breaking-change detection

Scan the diff for any of these signals:

- **Removed or renamed public exports** without a re-export alias (`-export ` in TS/JS, removed `__all__` entries in Python, removed `pub fn` in Rust, removed capitalised top-level identifiers in Go).
- **Changed signature of a public symbol**: arity, parameter types, return type, removed required parameter, added required parameter without default.
- **API / contract changes**: removed routes, changed HTTP method or path, removed required fields in OpenAPI / gRPC `.proto` / GraphQL schema, removed proto fields.
- **Schema breaks** in migration files: `DROP COLUMN`, `DROP TABLE`, `ALTER COLUMN ... TYPE`, `SET NOT NULL` against previously-nullable column, renamed columns without aliases or backwards-compat views.
- **Removed CLI flags or required env variables** in arg parsers or `.env.example`.

When any signal fires, the skill:

1. Adds `!` after type/scope: `feat(api)!:`.
2. Adds a `BREAKING CHANGE:` footer naming what broke and how consumers should adapt.
3. Surfaces the detection in the output preamble (`⚠ Possible breaking change detected: ...`). If the user contradicts, drop the marker.

### Atomicity smell detection

Scan the diff for these smells (the skill does NOT recommend splitting — that is out of scope — but it surfaces them):

- Diff touches 3+ top-level domains from the scope dictionary where the dominant has <50% of the changed lines.
- Concurrent competing change types (e.g. `test:` for unrelated features + `feat:` for new work; `ci:` + production source; `build:` + `feat:` + migration).
- Migration + feature surface + dep bump in the same commit (almost always belongs in 2-3 commits for clean `git bisect`).

When a smell fires, the skill emits a preamble (`⚠ Possible atomicity smell: ...`) and **one of the three proposals is the dominant-only variant** — subject + body covering only the dominant domain, as if the secondary files weren't staged. The user can choose that proposal and re-stage to commit narrower.

## Trailers (per-repo detection)

After the body, the message may carry trailers — structured `Key: Value` metadata parseable by `git interpret-trailers`. The skill detects the repo's trailer conventions from the 25-commit sample and replicates them. It never imposes a trailer the repo isn't already using.

Common trailers:

- `Signed-off-by:` — DCO attestation. Mandatory in Linux Foundation projects (100% adoption); generated by `git commit -s`.
- `Refs:` — lightweight reference to an issue without closing it.
- `Closes #N` / `Fixes #N` / `Resolves #N` — auto-close keywords parsed by GitHub and GitLab on merge to default branch.
- `Reviewed-by:` — reviewer attestation; standard in kernel and large OSS projects.
- `Co-authored-by:` — **human** pair/mob collaborator. **Never** an AI; see Scope and boundaries.

Composition with Conventional Commits: when both `BREAKING CHANGE:` footer and trailers are present, `BREAKING CHANGE:` goes first (it is part of the Conventional Commits envelope), then trailers follow in the order the repo's log uses.

Full guidance: `references/trailers.md`.

## Issue linkage

When a commit advances or closes tracked work, the message references the ticket so the platform auto-links or auto-closes. The skill derives the right reference from two signals:

1. **Branch name parsing**: `git rev-parse --abbrev-ref HEAD`, then match against common patterns (`<type>/<KEY>-<num>-<slug>`, `<num>-<slug>`, `<KEY>-<num>`, etc.). The full pattern table lives in `references/issue-linkage.md`.
2. **Repo convention from log**: detect which form of issue reference the repo uses most (`Closes #N` footer, `Refs: KEY-N` footer, `[KEY-N]` in subject for Jira-style smart commits, etc.).

The skill **never invents a reference format** the repo isn't already using. If the log shows the repo doesn't link issues at all, neither does the proposal. If a branch encodes a key but the repo has no convention, the skill mentions the key in the body once (`Advances <KEY>`) without inventing a `Closes`/`Refs` trailer.

Platform reference (GitHub `close/fix/resolve` keywords, GitLab equivalents, Jira smart commits) lives in `references/issue-linkage.md`.

## PR-title vs commit-subject alignment

If the log's `(#NN)` PR suffix appears in ≥70% of commits, the repo uses squash-merge predominantly. In that mode:

- **Do not** add `(#NN)` manually to the proposed subject — GitHub appends it automatically on squash.
- The subject must **work standalone as a PR title** because some teams configure "default to PR title for squash merge" (GitHub setting introduced May 2022). Subject must be self-contained — readers may never see the body if the squash dialog drops it.
- This pushes toward slightly tighter subjects than non-squash repos.

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

### Repo language adaptation

The body is written in the **dominant language** of the repo's recent log bodies (detected from the 25-commit sample with the ≥70% threshold). If most recent bodies are in Spanish, the proposed body is in Spanish; if English, English; if mixed, prefer the most recent non-merge commit's language.

The **subject** is unaffected — it follows Conventional Commits' English-by-convention type vocabulary (`feat`, `fix`, etc.) regardless of repo body language. Only the body (and the trailers' free-text values) adapts.

## Self-check checklist (apply to every proposal)

- [ ] Type matches observed git flags per the mapping table.
- [ ] Subject passes Beams imperative test.
- [ ] Subject length matches the repo's observed distribution (no arbitrary 50-char trim).
- [ ] No period at end of subject.
- [ ] Lowercase after colon.
- [ ] Scope is a domain/module name observed in `git log`, never a folder/file path.
- [ ] Multi-scope uses comma + no space.
- [ ] Scopes do not list a parent next to its children when the diff exhibits that hierarchy in paths; collapsed to the highest dictionary-blessed ancestor when multiple siblings are touched.
- [ ] Cardinality: ≤2 scopes preferred; at 3 scopes one of the proposals offers a 2-scope alternative; 4+ scopes always rewritten to the dominant or to an umbrella.
- [ ] Body style matches the repo (bullets vs prose vs empty).
- [ ] **Zero** mentions of file or line counts.
- [ ] **Zero** granular inventories of internal content (parenthetical lists of doc sections, ToC dumps).
- [ ] **Zero** AI attribution (`Co-authored-by: Claude`, `Generated with Claude Code`, etc.).
- [ ] **Zero** blacklisted vague verbs (full list in `references/blacklist.md`).
- [ ] If type is `refactor:`, diff confirms zero behavior change.
- [ ] Breaking changes marked with `!` or `BREAKING CHANGE:` footer.
- [ ] `(#NN)` PR suffix only if the repo's log uses it consistently — and never added manually in squash-merge repos (GitHub adds it).
- [ ] Trailers in the footer match the repo's convention (Signed-off-by, Refs, Closes, Reviewed-by) when detected at ≥70%.
- [ ] Issue references (Closes #N, Refs: KEY-N) use the repo's convention, derived from branch name + log.
- [ ] If breaking-change signals were detected in the diff, subject carries `!` and footer carries `BREAKING CHANGE:`. If user contradicted, marker removed.
- [ ] If atomicity smell was detected, one of the three proposals is the dominant-only variant.
- [ ] In squash-merge repos (`(#NN)` ≥70%), subject works as a standalone PR title.
- [ ] Body language matches the repo's dominant body language.
- [ ] `Co-authored-by:` is only proposed for named human collaborators; **never** for AI.
- [ ] No gitmoji or emoji prefix in subject.

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
2. Read staged diff + run the LOG-FIRST commands. Detect:
   - Subject length distribution, body style, scope vocabulary, PR suffix usage.
   - Trailers present at ≥70% (Signed-off-by, Refs, Closes, Reviewed-by).
   - Dominant body language at ≥70% (en/es/other).
   - Issue-reference format convention.
   - Squash-merge predominance (`(#NN)` at ≥70%).
   - Branch name (`git rev-parse --abbrev-ref HEAD`) for issue ID extraction.
3. Build flag map per file.
4. Pick type from semantics (priority: `fix` > `feat` > `perf` > `refactor` > scope-specific > `chore`).
5. Pick scope(s) using the four-rule procedure: (A) extract the scope dictionary from `git log`; (B) build candidates from diff path prefixes intersected with that dictionary, collapsing parent/child to the highest dictionary-blessed ancestor **only** when multiple siblings are touched and **only** as high as the dictionary allows; (C) prefer ≤2 scopes, offer a 2-scope alternative when proposing 3, rewrite at 4+; (D) never use a path as a scope. In repos where paths don't encode scope (layer-organized or scattered features), skip the collapse step and stay on dictionary + cap.
6. **Active diff analysis**:
   - Scan for breaking-change signals (removed exports, signature changes, schema breaks, CLI flag removal). If any fire, add `!` + `BREAKING CHANGE:` footer and surface in preamble.
   - Scan for atomicity smells (3+ unrelated domains, competing change types). If any fire, surface in preamble and reserve one proposal as the dominant-only variant.
7. Draft subject; run Beams test; verify imperative; verify length matches the repo's distribution.
8. Decide whether body is needed; pick body style from repo norms (bullets/prose/empty); write in the dominant body language.
9. Write body without granular inventories, file counts, mechanical bullets, or AI attribution.
10. Build footer: trailers detected at ≥70%, issue references per the repo's convention, human `Co-authored-by:` only when the user named a collaborator.
11. Build 3 proposals (subject, +brief body, +full body).
12. Run full self-check on each; regenerate any that fail.
13. Present output in the specified format. Do not execute. Wait for user choice.

## Reference index

- [`references/blacklist.md`](./references/blacklist.md) — forbidden subjects, body anti-patterns, granular content inventories, cross-layer restating, wrong-verb errors, AI attribution ban. The deep guide to what must be rejected.
- [`references/examples.md`](./references/examples.md) — good and bad examples bank: long subject + multi-scope + bullets, short prose body, subject-only patterns, multi-action commits, cross-layer and stuffed-subject failure modes, human-coauthor commits, trailer-bearing commits, breaking-change detection.
- [`references/squash-mode.md`](./references/squash-mode.md) — squash workflow for collapsing a branch's commits into a single message. Net diff (`<base>...HEAD`, three-dot) as source of truth; reuses intermediate commit text only where the net diff confirms it; handles reverted-in-branch churn and re-touched names.
- [`references/trailers.md`](./references/trailers.md) — full trailer guide: `git interpret-trailers` semantics, 70% detection threshold, per-trailer guidance (Signed-off-by / Refs / Closes / Reviewed-by / Co-authored-by humano), composition with Conventional Commits.
- [`references/issue-linkage.md`](./references/issue-linkage.md) — branch name parsing patterns, GitHub auto-close keywords, GitLab equivalents, Jira smart commits, decision tree for picking the right reference form.
- [`references/active-diff-analysis.md`](./references/active-diff-analysis.md) — breaking-change signals (removed exports, signature changes, schema breaks, CLI flag removal) and atomicity smells (multi-domain, competing types) detection heuristics with per-language patterns.
- [`references/non-goals.md`](./references/non-goals.md) — explicit "we don't do this" list: gitmoji, AI attribution, auto-execute, staged-content scanning, PR description generation. Includes rationale for each.
