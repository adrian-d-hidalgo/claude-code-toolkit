# git bisect — binary search for the introducing commit

When a regression is suspected, `git bisect` finds the introducing commit in O(log n) steps — much faster than reading 200 commits.

## Basic flow

```bash
# Start the bisect
git bisect start

# Mark current state as bad (regression present)
git bisect bad

# Mark a known-good commit (regression absent)
git bisect good <known-good-sha>

# Git checks out a commit halfway between good and bad
# Test the regression. Then mark:
git bisect bad   # if the regression is present at this commit
# or
git bisect good  # if the regression is absent at this commit

# Repeat until git identifies the first bad commit
# At the end:
git bisect reset
```

## Automated bisect

If you have a test that reliably reproduces the bug:

```bash
git bisect start
git bisect bad
git bisect good <known-good-sha>
git bisect run ./scripts/reproduce-bug.sh
```

The script should:

- Exit `0` if the commit is GOOD (no regression).
- Exit `1`–`124` (NOT `125`) if the commit is BAD (regression present).
- Exit `125` if the commit is UNTESTABLE (skip — e.g. build failed for unrelated reason).

`git bisect run` will automatically walk the bisection and stop on the first bad commit.

## Reproduce script template

```bash
#!/usr/bin/env bash
# scripts/reproduce-bug.sh
set -e

# Build (skip if build fails for unrelated reasons)
if ! npm install --frozen-lockfile && npm run build; then
  exit 125
fi

# Run the specific test that reproduces the regression
if npm test -- --grep "the failing test"; then
  exit 0   # GOOD — regression absent
else
  exit 1   # BAD — regression present
fi
```

## Edge cases

### Flaky tests

If the test is flaky (passes sometimes, fails sometimes), bisect points to wrong commits. Fix:

- Run the test 3–5 times per commit in the reproduce script; mark BAD only if ALL fail (or majority).
- Increase confidence — flaky-test bisects are slow but still better than blind reading.
- Better: stabilise the test first if possible.

### Merge commits

When the regression is introduced by a merge (rare), bisect can land on the merge commit and you need to dig into the merged branch. Use `git bisect log` to see the path; use `git bisect skip` if a commit is unbuildable.

### Refactor commits in the range

If part of the range was a major refactor (file renames, large reorg), the reproduce script may fail for unrelated reasons. Mark those commits as `git bisect skip` so bisect doesn't get stuck.

### Range too wide

If known-good is months old, bisect range is huge. Narrow first:

- Ask: when did anyone last see the working behavior? Use that timestamp as known-good.
- For long-lived bugs: feature flags often introduce them at flag-flip rather than at code merge. Check the flag-flip date instead.

## When NOT to bisect

- **No deterministic reproduction** — bisect needs a clear good / bad signal per commit. Without reproduction, bisect is futile.
- **The bug is in the environment, not the code** — e.g. a vendor update broke things. Bisecting code won't help.
- **The range is < ~10 commits** — just read them.
- **You already have a hypothesis with stronger evidence** — bisect when you DON'T have a hypothesis; when you have one, test the hypothesis directly.

## Tagging the result

Once bisect identifies commit `<sha>`:

- Use `git show <sha>` to inspect the change.
- Use `git log -p <sha>` for context.
- Cross-reference the commit's PR (if your team uses GitHub / GitLab) to read review comments.
- Hand the finding to `bug-analysis` for systemic RCA — "what about the system allowed this commit to land".

## Anti-patterns

- **Bisecting without a reproduce script** when you have one — running the test manually 50+ times is wasteful.
- **Marking commits BAD without testing carefully** — wrong marks send bisect to wrong commits.
- **Stopping at the first BAD commit and calling it the cause** — sometimes the introducing commit is "compatible" and the real bug was already latent; check whether the commit's changes interact with prior code, not just whether `<sha>` is "the commit".
- **Forgetting to `git bisect reset`** — leaves you in a detached-HEAD limbo.
