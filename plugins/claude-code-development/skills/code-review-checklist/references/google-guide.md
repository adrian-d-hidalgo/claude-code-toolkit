# Google Engineering Practices — key principles

Source: Google's "Code Review Developer Guide" open-sourced at github.com/google/eng-practices (2019). Section "How to do a code review".

The full guide is comprehensive; this reference distills the principles most actionable for the `code-review-checklist` skill.

## §1 — The standard

A reviewer should approve a CL once it is in a state where it **definitely improves the overall code health of the system being worked on**, even if the CL isn't perfect.

This is a key Google principle: there is no "perfect CL". Reviewers can always find improvements. The question is whether the CL **moves the codebase in a good direction**.

**Implications for the skill**:

- Approve CLs that improve code health, even with minor issues that can be follow-up.
- Don't block on perfection.
- Don't reward "approve with no comments" as a goal — the goal is high-quality merged code, not high reviewer throughput.

## §2 — In general, prefer to approve

When in doubt — when the CL is acceptable but could be better — prefer approving with non-blocking suggestions rather than blocking. Engineers learn by shipping and seeing the result.

The exceptions: anything that would degrade code health, anything that's wrong, anything that creates significant risk.

## §3 — Mentoring is part of review

Reviews are opportunities to share knowledge. Explain WHY a change is requested, not just WHAT to change. The reviewee learns; the team's collective skill rises.

In the skill output, every finding's `Recommendation` should explain WHY in addition to WHAT.

## §4 — Principles over rules

Google's guide is principle-based, not a rule-list. Examples:

- "Code review is not the time to enforce style your teammate already prefers a different way" — defer style debates to the team's style guide.
- "Don't ask the reviewee to do unnecessary work" — if a finding is non-critical and would take significant work, mark `suggestion (non-blocking)` and let the reviewee decide.
- "Take into account the reviewee's experience" — a first PR from a new hire gets a different review tone than a senior engineer's PR.

**Implications**: the skill is a checklist, but applying it is judgment. Don't mechanically file findings for every minor issue.

## §5 — Speed of code review

Google's guidance: respond to reviews within one business day. Slow reviews:

- Block the reviewee.
- Compound: PRs queue up.
- Erode review quality (rushed reviewees, rushed reviewers later).

**Implications for the skill**: when generating a review, optimise for **speed of useful feedback**, not exhaustiveness. A fast review with the top 5 findings is more valuable than a slow review with 20 findings split equally between blocking and nitpicks.

## §6 — How to comment

From Google's "How to write code review comments":

- Be kind. Comments are directed at code, not at the person.
- Explain reasoning.
- Balance giving explicit directions with making the reviewee think.
- Encourage reviewees to simplify or add helpful explanations rather than do all the work themselves.
- Label severity (Conventional Comments helps here).

## §7 — Things to look for

Google's standard checklist categories (mirrored in the skill's 10-category checklist):

1. **Design** — is it well-designed? Does it fit the existing architecture?
2. **Functionality** — does it do what the developer intended? Are the changes safe for users?
3. **Complexity** — could it be simpler?
4. **Tests** — are there appropriate tests at the right layer?
5. **Naming** — are names clear?
6. **Comments** — are they necessary? Do they explain WHY?
7. **Style** — does it follow the team's style guide?
8. **Documentation** — are public docs updated as needed?

The skill's 10-category list extends Google's 8 with `Security`, `Performance`, `Concurrency`, `Edge cases`, `Dependencies`, mapping to the same intent at finer granularity.

## §8 — Resolving conflicts

When reviewer and reviewee disagree, Google's principle: **defer to the data**. Cite the principle (style guide, prior decision, performance measurement). When data doesn't resolve, escalate to a third reviewer or the team's tech lead — don't make it personal.

In the skill output, when a finding is opinion-based, mark it `suggestion` not `required`. Save `blocking` and `required` for things you can back with data or principle.

## Cross-reference

- For OWASP-specific security checks: [`owasp-security-checks.md`](./owasp-security-checks.md).
- For Wiegers' more formal process (less aligned to Google's lightweight style): [`wiegers-process.md`](./wiegers-process.md).
- Conventional Comments severity labels: `../../code-audit/references/conventional-comments.md`.
