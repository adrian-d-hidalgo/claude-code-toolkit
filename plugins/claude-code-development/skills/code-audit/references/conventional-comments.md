# Conventional Comments — severity-tagged review labels

Source: open-source convention launched by Pavel Vass and contributors at conventionalcomments.org (2019).

## The labels

| Label        | Meaning                                                                                  | When to use                                                                         |
| ------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `blocking`   | Must be addressed before merge / release / sign-off. Non-negotiable.                     | Correctness bug, security vulnerability, missing required test, contract violation. |
| `required`   | Must be addressed; severity below blocking. Should be done before merge unless deferred. | Important quality issue, missing documentation for new public API.                  |
| `suggestion` | Improvement the reviewer recommends. Reviewee can accept or decline with rationale.      | Refactoring opportunity, naming, alternative approach.                              |
| `question`   | Reviewer wants to understand something; not a request to change.                         | Clarifying the design intent, asking why X.                                         |
| `nitpick`    | Cosmetic / style. Optional. The reviewer notes it but does not block.                    | Whitespace, minor naming, formatting that linter doesn't catch.                     |
| `praise`     | Reinforces good practice. Optional but valuable for team culture.                        | "Nice refactor", "good test naming".                                                |
| `thought`    | Reviewer's own reflection; not directed at the reviewee.                                 | "I wonder if we should have a fitness function for this".                           |

## Additional decorators

Conventional Comments supports decorators to refine intent:

- `non-blocking` — explicitly non-blocking even if otherwise might seem so.
- `if-minor` — only address if it's a minor change to make.

Example: `**suggestion (non-blocking):** Extract this into a helper.`

## How `code-audit` uses these

For each finding in the audit, attach a label:

- `blocking` — correctness, security, compliance violations.
- `required` — significant maintainability / coverage / observability gaps.
- `suggestion` — refactoring opportunities, alternative designs.
- `nitpick` — cosmetic. Generally omit from audit reports; not worth audit-doc real estate.

The label drives the prioritisation in the remediation plan:

- All `blocking` go in the top tier regardless of effort.
- `required` follow, sorted by Impact × Effort.
- `suggestion` go in the lower tier; they're for the team to consider when capacity allows.
- `nitpick` rarely appears in audit reports.

## Difference vs `code-review-checklist` use

In `code-review-checklist`, Conventional Comments labels appear per-finding in a PR review. In `code-audit`, they appear per-finding in a codebase audit. Same vocabulary, different scope:

- PR review: 5–20 findings, focused on the diff.
- Codebase audit: 20–100 findings, covering modules / patterns / architecture.

Both skills cite the same canonical convention; this file is the shared reference.

## Anti-patterns

- **Severity inflation** — every finding labelled `blocking`. Erodes the signal.
- **Using `question` to block** — questions are not blockers; if you need a change, use `required` or `blocking`.
- **`thought` directed at the reviewee** — `thought` is reflective; if you want action, use `suggestion`.
- **`nitpick`-heavy audit reports** — nits are review-time, not audit-time. Audit reports should focus on high-leverage findings.

## Cross-reference

- For per-PR review use: `../../code-review-checklist/SKILL.md`.
- For prioritising via 2×2: [`impact-effort.md`](./impact-effort.md).
