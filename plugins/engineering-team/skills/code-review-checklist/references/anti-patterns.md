# code-review-checklist — anti-patterns

## §1 — Nitpick storm

**Bad**: review with 30 findings, 28 of them `nitpick`.

**Why wrong**: signal-to-noise crashes. Reviewee feels attacked; real blockers get lost.

**Fix**: minimise `nitpick` in async review. If you can auto-format / auto-lint the issue, just say "consider running the linter" once. Reserve manual nitpicks for cases where automation can't catch.

## §2 — Severity inflation

**Bad**: marking every finding `blocking` because "I want it fixed".

**Why wrong**: erodes the meaning of `blocking`. Reviewees lose ability to distinguish must-fix from nice-to-have.

**Fix**: reserve `blocking` for: correctness, security, missing required tests, contract violations. Use `required` and `suggestion` more.

## §3 — Style debate without team convention

**Bad**: arguing for tabs vs spaces / single vs double quotes / arrow function vs function expression — when the team has a style guide.

**Why wrong**: bikeshedding. The team decided. Move on.

**Fix**: cite the team's style guide. If it's a gap in the style guide, propose adding it as a separate ADR — don't relitigate per PR.

## §4 — Approve without reading

**Bad**: clicking Approve to clear the queue.

**Why wrong**: defeats the entire purpose. Bugs pass through. Team norms erode.

**Fix**: if you don't have time to review properly, decline and ask someone else, or push back on the PR size. "I can't review 1500 lines today; please split or get someone with more bandwidth".

## §5 — Approve a PR that lacks tests

**Bad**: PR introduces new behavior with no tests; review approves to "ship faster".

**Why wrong**: short-term velocity, long-term debt. The next time the behavior breaks, no test catches it.

**Fix**: missing tests is `required` or `blocking` per category #2. Push back unless there's a written exception (e.g. "this is a one-time data migration; manual verification is the test").

## §6 — Block on `question:`

**Bad**: filing a question and blocking the PR until the reviewee answers.

**Why wrong**: questions are clarification requests, not change requests. Blocking on questions creates ping-pong delays.

**Fix**: if you NEED a change, use `required` or `blocking`. Use `question` only for clarification that doesn't gate merge.

## §7 — "LGTM" without categories walked

**Bad**: "Looks good to me, approving" with no evidence the checklist was walked.

**Why wrong**: rubber-stamp. Useful only if the reviewer is genuinely qualified to assess and DID assess.

**Fix**: even for simple PRs, mention what was checked. "Walked correctness, tests, security categories. Tests cover AC-1 and AC-3. Approve." This is short but informative.

## §8 — Personal critique

**Bad**: "This is messy" / "Did you actually think about this?" / "I don't trust this".

**Why wrong**: critique the code, not the person. Erodes trust + creates defensive responses.

**Fix**: every finding is about the code. "This method has multiple responsibilities; recommend Extract Class per Fowler" — not "you wrote a god class".

## §9 — Approval without diff context

**Bad**: reviewing only the changed lines, missing how they interact with surrounding code.

**Why wrong**: a change that looks correct in isolation can violate invariants in the broader code (e.g. a new branch that doesn't release a resource the surrounding code expects to be cleaned up).

**Fix**: read the diff IN CONTEXT — surrounding functions, callers, callees. For non-trivial changes, browse the affected files locally, not just the diff view.

## §10 — Status field in output

**Bad**: including `**Status:** Reviewing / Approved / Changes Requested` in the review content.

**Why wrong**: the PR's review state is tracked by the platform (GitHub / GitLab / Gerrit). Duplicating in the content is noise.

**Fix**: drop the field. Use the platform's approval mechanism for state; the review content is the substance.

## §11 — Reviewing too large a PR

**Bad**: walking a 2000-line PR end-to-end in one session.

**Why wrong**: defect detection drops sharply above ~400 lines per session. The reviewer's attention budget is limited.

**Fix**: push back on PR size. "This is too large to review well; please split (use `work-splitting` skill for technique) or schedule multiple review sessions." Reviewing 2000 lines in one go produces shallow review and missed bugs.

## §12 — Forgetting praise

**Bad**: review with 10 findings and no positive call-outs.

**Why wrong**: code review culture sours when only critique appears. Praise reinforces good behavior and signals you're paying attention.

**Fix**: when you see genuinely good work — a clean refactor, a useful test, a good comment, a well-handled edge case — call it out with `praise:`. Costs nothing; matters a lot for team culture.

## §13 — Recommending without explaining

**Bad**: "Use a Set instead" — no explanation of why.

**Why wrong**: reviewee may comply without learning. Next PR repeats the issue.

**Fix**: explain the rationale. "Use a Set instead — current code has O(n²) membership check via `.includes()` on a 10k-item list; Set lookups are O(1)." Now the reviewee understands and won't repeat.

## §14 — Reviewing without running analysers

**Bad**: manual review only; CI didn't run linters / type checks / tests on this branch.

**Why wrong**: humans miss what analysers catch. Free signal left on the table.

**Fix**: ensure CI ran before reviewing. If CI isn't set up, file a `required` finding for adding CI checks. Cite analyser outputs as `[Verified]` evidence in findings.
