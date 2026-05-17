# Squash workflow — net diff vs staged diff

The default skill protocol reads the **staged diff** (`git diff --cached`). That is correct when the user is about to commit. But when the user is about to **squash a branch** (squash-merge a PR, collapse N commits into one), the source of truth is different: the **net diff between the base branch and HEAD**, not any individual staged change.

## Activation

Enter squash mode when ANY of these is true:

- The user says "squash", "compactar", "aplastar", "colapsar commits", "merge de la branch", "squash commit for this PR/branch", "mensaje para el squash".
- The user says "mensaje que resuma estos N commits" or refers to multiple commits as one unit.
- The user says "commit message que unifique todos los commits de esta branch vs <X>", "mensaje que compare la branch <A> contra <B>", "diff entre <A> y <B>", or any phrasing that names two refs to compare.
- The current branch has >1 non-merge commit ahead of its base AND the user is asking for a single message (not for a per-commit message).

If unsure between regular and squash mode, default to squash mode when the branch is ahead of base by >1 commit. Tell the user one line: "leí el net diff `<base>...HEAD`, no los commits intermedios — corrige si querías otra cosa."

## Identifying the two refs

The user controls which two branches/refs to compare. Do **not** silently assume `main` or `develop` as the base.

Resolve the pair in this order:

1. **User-specified pair**: if the user names two refs ("esta branch vs main", "feature/x vs develop", "compare HEAD against release-2024-10"), use exactly those. Do not normalize them (do not swap `feature/x...main` to `main...feature/x` — that flips the direction of the diff and changes the message).
2. **User-specified base only**: if the user says only "vs main" or "contra develop" without naming the other side, use `<base>...HEAD`.
3. **No refs specified**: detect the base from `git symbolic-ref refs/remotes/origin/HEAD` (origin's default branch) and use `<base>...HEAD`. If that fails, ask the user: "¿contra qué branch comparo? (`main`, `develop`, otra?)" — do **not** guess.

The skill always uses the **three-dot** form `<base>...<head>` (merge-base diff) for squash, **not** `<base>..<head>` (range). Three-dot gives the diff of what `<head>` introduces relative to where it forked from `<base>`, ignoring changes that landed on `<base>` after the fork. That is what a squash-merge produces.

Always state which pair you used in one line above the proposal: "comparé `<resolved-base>...<resolved-head>`."

Example phrasings and how to resolve:

| User says                                             | Resolves to                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------- |
| "commit que unifique esta branch vs main"             | `main...HEAD`                                                          |
| "mensaje del squash para feature/auth contra develop" | `develop...feature/auth`                                               |
| "compara HEAD con release-2024-10"                    | `release-2024-10...HEAD`                                               |
| "squash de esta rama"                                 | detect base via `origin/HEAD`, then `<base>...HEAD`; if ambiguous, ask |
| "mensaje para el PR"                                  | base = PR's target branch if known (ask if not), then `<base>...HEAD`  |

## Why net diff, not commit log — but the log is still useful

The **net diff `<base>...HEAD` is the source of truth for WHAT changed**. The **intermediate commit subjects + bodies are reusable raw material for HOW to describe it** — they already name things in the team's voice and you do not have to re-derive every bullet from scratch.

The trick is using both correctly:

1. Read the intermediate commit messages (`git log <base>..HEAD --pretty=format:"%h %s%n%b%n---"`). Treat each bullet/subject as a _candidate_ line for the squash body.
2. Validate each candidate against the net diff. **A candidate survives only if the change it describes is still present in `<base>...HEAD`.** Drop the rest.
3. When the same logical change was touched multiple times across commits, keep one candidate that matches the final state — drop the older drafts.

Intermediate commits lie about the final state in three predictable ways. Cross-check each before reusing any text:

- **Reverted change**: commit A adds class `Foo`, commit B deletes class `Foo`. If `Foo` did not exist in `<base>`, net diff is empty for it. The "add Foo" bullet from commit A is invalid for the squash — drop it. `Foo` never existed for the base branch's POV.
- **Re-touched same thing**: commit A renames `foo` to `bar`, commit C renames `bar` to `baz`. Net diff shows `foo → baz`. The "rename to bar" bullet is invalid; the "rename to baz" bullet is the one that survives. Or replace both with one bullet at the final state: `rename foo to baz`.
- **Add-then-remove inside the branch**: commit A adds a debug `console.log`, commit B removes it. Net diff for that line is zero. The "add debug log" bullet is invalid — drop it. Same for any file touched and then untouched (e.g. import added then removed).
- **Refactor undone**: commit A extracts helper `doX`, commit C inlines it back. If `doX` does not exist in net diff, the extract bullet is invalid even though commit A "really happened" mid-branch.

The squash commit is what lands on `main`. It must describe **what main gains**, derived from the diff `main` actually receives — not the path the branch took. The intermediate messages help you write faster; the net diff tells you what is true.

## Reuse algorithm

```
candidates = collect_bullets_from(git log <base>..HEAD)
for each candidate:
  thing_it_describes = parse(candidate)   # e.g. "add Foo class", "rename foo to bar"
  if thing_it_describes is NOT visible in `git diff <base>...HEAD`:
    drop candidate
  elif a later candidate supersedes it (same target, different final state):
    drop candidate, keep the later one
  else:
    keep candidate (possibly rewording to match the final state)

# Then apply the regular skill rules: collapse cross-layer restating,
# enforce subject envelope, drop no-op qualifiers, etc.
```

If two surviving candidates describe the same domain-level change from different layers, collapse per the cross-layer restating rule. If a surviving candidate uses an intermediate name (`bar`) but net diff shows the final name (`baz`), rewrite it with the final name.

## Protocol

```
# 1. Resolve the pair per "Identifying the two refs" above.
#    Let BASE = the user-specified or detected base ref.
#    Let HEAD = the user-specified or implicit head ref (defaults to HEAD).

# 2. Net diff between the two refs (NOT staged, NOT individual commits)
git diff --name-status <BASE>...<HEAD>
git diff --stat <BASE>...<HEAD>
git diff -M --find-renames --name-status <BASE>...<HEAD>   # detect renames

# 3. Format detection: use the base side, since that is where the squash will land
git log <BASE> --oneline -20

# 4. Reusable text: read the journey for candidate bullets — validate each against the net diff
git log <BASE>..<HEAD> --no-merges --pretty=format:"%h %s%n%b%n---"
```

Note the difference between steps 2 and 4:

- Step 2 uses **three-dot** (`<BASE>...<HEAD>`) — merge-base diff, the actual squash payload.
- Step 4 uses **two-dot** (`<BASE>..<HEAD>`) — list of commits unique to `<HEAD>`, used only to harvest candidate text.

The flag map, type semantics, subject envelope, body rules, blacklist and self-check from the regular workflow ALL apply identically — only the _input diff_ changes.

## Forbidden in squash mode

- **Listing intermediate commit subjects**: "fixes commit A, addresses review in commit B, then refactors per commit C". The reader of the squash does not see those commits. Describe the end state only.
- **Mentioning reverted-and-re-added churn**: if file X was touched 4 times mid-branch but the net diff shows one coherent change, describe that one change.
- **"Per code review"-style meta-commentary** referencing intra-branch iterations.
- **Net-zero changes**: if a file appears in the journey but not in the net diff, it does not exist for the message.

## Self-check additions for squash mode

- [ ] Net diff `<base>...HEAD` was the source of truth for WHAT changed.
- [ ] Intermediate commit messages were used as candidate text, then each candidate was validated against the net diff.
- [ ] Reverted changes (added-then-removed inside the branch) do not appear, even if an intermediate commit message described them.
- [ ] When the same thing was touched twice (rename → rename, extract → inline), only the final state is described.
- [ ] Intermediate names (`bar` when the final is `baz`) are rewritten to the final name.
- [ ] No reference to intermediate commits, reviewer rounds, or branch journey.
- [ ] Net-zero file touches do not appear in the message.

## Example — reusing intermediate text, filtered by net diff

Branch journey (6 commits):

```
abc111 feat(utils): add foo helper
def222 fix(utils): typo in foo
ghi333 refactor(utils): rename foo to bar
jkl444 fix(utils): handle null in bar
mno555 chore(utils): add debug log to bar
pqr666 chore(utils): remove debug log from bar
```

Candidates parsed from those subjects/bodies:

| Candidate text              | Survives net diff? | Why                                                                                              |
| --------------------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| `add foo helper`            | ❌ no              | `foo` does not exist in net diff (renamed to `bar` later) — replaced                             |
| `typo in foo`               | ❌ no              | `foo` does not exist; typo lives inside `bar` now and is invisible in net diff anyway            |
| `rename foo to bar`         | ⚠ partial          | Final name is `bar`, but in `<base>` there was no `foo` to rename from — this is really an "add" |
| `handle null in bar`        | ✓ yes              | Null handling is present in net diff                                                             |
| `add debug log to bar`      | ❌ no              | Removed by next commit; net-zero                                                                 |
| `remove debug log from bar` | ❌ no              | Pair-zero with previous; net diff does not show it                                               |

After filtering and collapsing to the net state:

Wrong (lists the journey, includes net-zero churn):

```
feat(utils): add foo, fix typo, rename to bar, handle null, add and remove debug log
```

Wrong (kept "rename foo to bar" even though `foo` never existed in base):

```
feat(utils): rename foo to bar with null handling
```

Right (final state only, intermediate text reused where it survives):

```
feat(utils): add bar helper with null handling
```

The bullet `handle null in bar` from commit `jkl444` was reused as-is (rewritten into the subject form). Everything else was dropped because the net diff invalidated it.
