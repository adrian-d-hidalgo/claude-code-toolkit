# Wiegers' peer review process

Source: Karl E. Wiegers, _Peer Reviews in Software: A Practical Guide_ (Addison-Wesley, 2002). Foundational academic + practitioner text on review process.

## Why this matters in 2026

Wiegers' work pre-dates GitHub-style async reviews and is rooted in formal inspection meetings (Fagan inspections). Most teams today use lighter-weight async reviews. Still, Wiegers' research findings inform good practice:

- **Defects found at design / review time cost 10-100× less than defects found in production.**
- **Optimal review pace**: ~150-200 lines per hour. Faster → defect-detection drops; slower → reviewer fatigues.
- **Optimal PR size**: < 400 lines for max defect detection (per SmartBear empirical study confirming Wiegers' earlier findings).
- **Two reviewers** find 80% more defects than one; three reviewers find marginally more.
- **Author preparation time matters**: PRs with clear descriptions get reviewed faster and more thoroughly.

## Review roles

Wiegers identifies six roles (formal inspection); modern async review typically collapses to two:

- **Author** — the engineer who wrote the change.
- **Reviewer(s)** — engineer(s) reviewing.

For high-stakes changes, additional roles can be borrowed from Wiegers' formal model:

- **Moderator** — runs the (synchronous) review meeting. Async equivalent: the senior reviewer who synthesises feedback from multiple reviewers.
- **Reader** — paraphrases the change to reveal misunderstandings (synchronous only).
- **Scribe** — records findings (in async: the PR review comments themselves are the record).

## The Wiegers checklist categories (his Table 7-1, abridged)

Applied here to software code review:

1. **Correctness** — does the code do what it should?
2. **Completeness** — are edge cases / error paths handled?
3. **Consistency** — does it match conventions / existing patterns?
4. **Feasibility** — can this realistically be maintained / extended?
5. **Modifiability** — is it easy to change?
6. **Testability** — is it testable / are tests present?
7. **Robustness** — does it handle unexpected inputs?
8. **Traceability** — does it map to requirements / AC?

The skill's 10-category checklist subsumes these and adds modern concerns (Security via OWASP, Concurrency, Dependencies).

## Review tone (Wiegers' "review etiquette")

Wiegers spends significant text on the human dynamics of review:

- Critique the work, not the person.
- Assume good intent; ask why before flagging.
- Praise good work explicitly.
- Don't dominate the review (in synchronous settings); in async, don't pile-on findings — choose the most important.
- Authors: don't defend reflexively; understand the feedback before responding.

These principles map directly to Conventional Comments + Google's "be kind" stance.

## Empirical findings worth applying

From Wiegers' research and subsequent industry studies:

- **Limit review session to ~60-90 min**. After that, defect detection drops by ~50%.
- **Take breaks between sessions**. Successive PR reviews benefit from a clear mind.
- **Don't review your own code**. Have someone else look. Self-review catches bugs (and the skill encourages it), but is not a substitute for peer review.
- **Defect-detection rate plateaus around 150 LoC/hr for code; faster review misses defects**. If a 1500-line PR arrives, schedule multiple sessions or push back on size.

## Application in the skill output

The skill doesn't run formal Wiegers inspections (those are synchronous meetings). It applies the empirical findings:

- If the PR is > 400 lines, the review output flags it: "PR size exceeds optimal range; recommend splitting per `work-splitting` skill or requesting senior reviewer attention".
- If many concerns, the skill surfaces the top 5-10, not all 25, to respect reviewer + reviewee attention budget.
- Praise is included when warranted, reflecting Wiegers' point about review tone.

## Anti-patterns (from Wiegers + practitioner experience)

- **Review without preparation**: skim, approve. Defects pass through.
- **Review of code without context**: not reading the surrounding architecture / requirements. Findings are shallow.
- **All-or-nothing approvals**: forcing every comment to be resolved before approving. Conventional Comments severity solves this.
- **Personal attacks dressed as code review**: "this code is awful" — wrong tone. Critique the code: "this method has multiple responsibilities; recommend Extract Class".
- **Trying to be exhaustive on one big PR**: better to split into multiple reviewable PRs (see `work-splitting`).

## Cross-reference

- For Google's lighter-weight modern practice: [`google-guide.md`](./google-guide.md).
- For security depth: [`owasp-security-checks.md`](./owasp-security-checks.md).
- For splitting big PRs to make them reviewable: `../../work-splitting/SKILL.md`.
