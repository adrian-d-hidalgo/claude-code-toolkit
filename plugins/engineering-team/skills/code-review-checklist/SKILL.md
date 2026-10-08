---
name: code-review-checklist
description: Use when the user explicitly invokes the per-PR review checklist methodology — walking the 10 categories (correctness / tests / security / readability / performance / maintainability / edge-cases / concurrency / dependencies / documentation), applying Conventional Comments severity tags, or specifically requesting Google Engineering Practices / Wiegers / OWASP code-review-guide-v2 review style. Trigger phrases include "walk the review checklist", "per-PR review categories", "Google code-review style", "Conventional Comments review", "severity-tagged findings on this PR", "review with the 10-category checklist", "OWASP code review on this diff", "Wiegers-style peer review". Generic "review this PR" requests route to the `code-reviewer` sub-agent (which preloads this skill); fire directly only when the caller invokes the skill explicitly or when no agent is available.
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git diff *)
  - Bash(git show *)
  - Bash(git log *)
---

# code-review-checklist skill

Per-PR / per-diff code review using a structured checklist across categories: Correctness · Tests · Security · Readability · Performance · Maintainability · Edge cases · Concurrency · Dependencies · Documentation. Output is content the caller persists wherever (GitHub PR review, GitLab MR comment, Slack thread). No filenames imposed.

Complements `code-audit` (full-codebase scope). Same Conventional Comments severity vocabulary; different scope.

## Methodology anchor

- **Google Engineering Practices — Code Review Developer Guide** (open-sourced 2019). The de facto industry standard for what good code review looks like (small CLs, fast turnaround, balance principles with practicality). Reference: [`google-guide.md`](./references/google-guide.md).
- **Karl E. Wiegers — _Peer Reviews in Software_** (Addison-Wesley, 2002). Foundational academic source on review process. Reference: [`wiegers-process.md`](./references/wiegers-process.md).
- **OWASP Code Review Guide v2** (2017). Security-focused checks aligned to OWASP Top 10. Reference: [`owasp-security-checks.md`](./references/owasp-security-checks.md).
- **SmartBear — "11 Best Practices for Peer Code Review"** (~2014). Empirical study basis (LOC limits per review, time-per-review, defect-detection rates).
- **Conventional Comments** — severity labels (Pavel Vass et al., 2019). Cross-referenced from the canonical Conventional Comments reference inside the `code-audit` skill.

## Scope and boundaries

This skill handles:

- Per-PR / per-diff structured review against the 10-category checklist.
- Severity classification per Conventional Comments.
- Concrete recommendations with file:line citations.
- Approve / Request Changes / Block verdict with rationale.

This skill does not handle:

- Full-codebase audit (use `code-audit`).
- Architecture decisions (architect; the review may flag that an ADR is needed).
- Test strategy design (quality-engineer).
- Deep threat modeling (threat-model skill; the review may flag a security concern needing modelling).
- Implementing fixes (software-developer; review suggests, doesn't apply).

## The 10-category checklist

For each PR, walk through each category. Skip any that genuinely don't apply (state explicitly), but don't pad with N/A.

### 1. Correctness

- Does the code do what the PR description claims?
- Does it match the AC traced in the PR body?
- Are there obvious logic errors (off-by-one, inverted conditions, unhandled return values)?
- Are exceptions / errors handled at appropriate boundaries?

### 2. Tests

- Are new tests added for the new behavior?
- Are tests at the appropriate layer (unit / integration / E2E per `quality-engineer` Testing Trophy)?
- Are AC ↔ test traceability links present in the PR description?
- Do tests cover the negative / edge / failure paths, not only the happy path?
- Are existing tests modified to match (or are they preserving old behavior that's been removed)?

### 3. Security

- New input from external sources → validation at the boundary? See `owasp-security-checks.md`.
- New AuthN/AuthZ paths → checks in place?
- Secrets / credentials → not in code, in env / vault?
- SQL injection / XSS / CSRF / SSRF / deserialisation / path traversal vectors → considered?
- New external surface → if non-trivial, recommend invoking `threat-model` skill.

### 4. Readability

- Names are intention-revealing (function / variable / class / module).
- No commented-out code.
- No dead code.
- Comments explain WHY, not WHAT (per typical comment-philosophy rules).
- Functions are reasonable length (no Long Method smell).
- File structure follows existing conventions in the repo.

### 5. Performance

- New N+1 query risk?
- New synchronous calls on a hot path?
- Memory allocations in inner loops?
- Cache invalidation patterns sound?
- If a perf-sensitive area: benchmark numbers cited?

### 6. Maintainability

- Rule of three: is this the 3rd duplication? If yes, time to extract.
- New coupling: does this introduce dependencies that violate existing layer boundaries?
- New public surface: justified, or speculative generality?
- Code-smell patterns from Fowler taxonomy? See the canonical Fowler-code-smells reference inside the `code-audit` skill.

### 7. Edge cases & error handling

- Empty input / null / undefined / 0 / negative numbers.
- Concurrent calls.
- Network failures (timeouts, partial responses).
- Resource exhaustion.
- Time-zone / locale boundaries.
- Boundaries of supported ranges (max int, max string length, max payload).

### 8. Concurrency & state

- Race conditions in shared state?
- Idempotency on mutating endpoints?
- Resource cleanup on error paths (connections, file handles, locks)?
- Transactional boundaries appropriate?

### 9. Dependencies

- New library added: justified? Maintained? License-compatible?
- Version bumped: read the changelog for breaking changes?
- Transitive deps acceptable (lockfile diff)?

### 10. Documentation

- Public API changes: docs updated?
- Runbook / README / architecture doc affected: updated?
- Migration guide needed?

## Output structure

```markdown
## Review of <PR title> (<PR link>)

- Diff size: <N> files / <M> LoC.
- Scope (PR description summary): <one-line>.
- Time invested in review: <approximate>.
- Methodology: Google Engineering Practices + OWASP code-review-guide-v2 + Fowler smells (per categories below).
- Evidence levels per finding per the engineering-team evidence-rule convention (at the plugin-root references directory).

## Verdict

**<Approve | Approve with changes | Request changes | Block>** — rationale.

## Findings

### F-01 — <descriptive title>

- **Severity**: blocking | required | suggestion | nitpick (Conventional Comments).
- **Category**: correctness | tests | security | readability | performance | maintainability | edge-cases | concurrency | dependencies | documentation.
- **Location**: `src/path/to/file.ts:42`.
- **Description**: <what's wrong>.
- **Recommendation**: <concrete fix — code suggestion or refactor name>.
- **Evidence**: [Verified — read at file:line | Inference — pattern matches | Unverified — needs runtime test].

### F-02 — …

## Praise (Conventional Comments `praise:`)

- <Positive call-outs — useful for team culture>.
```

## Workflow

1. **Read the PR description** — AC traced, scope, expected behavior, linked issues.
2. **Skim the diff** to size: a 50-line PR is reviewed differently from a 500-line one. Per SmartBear: optimal review is < 400 LoC; defect detection drops sharply above.
3. **Run analysers** if not already in CI: `eslint`, `ruff`, `bandit`, `semgrep` for security, type-check, etc. Cite outputs as `[Verified]`.
4. **Walk the checklist** category by category. For each, scan the diff for issues; for each issue, capture as a finding with severity + location + recommendation.
5. **Cross-check tests** — are they at the right layer? Cover the AC?
6. **Read the diff IN CONTEXT** — the surrounding code, not just the changed lines. A change that looks fine in isolation may violate invariants in the surrounding code.
7. **Form verdict** — Approve / Approve with changes / Request changes / Block. Verdict follows from findings:
   - Any `blocking` → Block (or Request changes).
   - Several `required` → Request changes.
   - Mostly `suggestion` → Approve with changes.
   - All clean / nits → Approve.
8. **Praise where due** — Conventional Comments `praise:` reinforces good behavior.
9. **Self-check** before emission.

## Self-check (mandatory)

- [ ] PR description was read; AC trace verified or flagged as missing.
- [ ] All 10 categories were considered (skip with rationale, don't silently omit).
- [ ] Every finding has severity + category + location + recommendation.
- [ ] Locations are file:line, not vague.
- [ ] Analysers were run if not in CI; outputs cited.
- [ ] Diff was read IN CONTEXT (not only the changed lines).
- [ ] Praise included for non-trivial good work.
- [ ] Verdict follows from findings (no `blocking` + Approve).
- [ ] Every claim tagged with evidence level.
- [ ] No `Status:` lifecycle field in output.

## Anti-patterns

See [`anti-patterns.md`](./references/anti-patterns.md). Highlights:

- **Nitpick storm** — drowning the reviewee in cosmetic comments while missing real blockers.
- **Severity inflation** — labeling everything `blocking`.
- **Style debate without team convention** — bikeshedding instead of citing the team's style guide.
- **Approve without reading** — rubber-stamping; defeats the purpose of review.
- **Approve a PR that lacks tests** — let it through "to ship faster"; debt compounds.
- **Block on `question:`** — questions are not blockers; if you need a change, use `required` or `blocking`.

## Communication

- **Lead with the verdict** — reviewees scan for it first.
- **Group findings by severity** — blocking first, then required, then suggestion. Praise at the end.
- **Cite file:line** for every finding. Abstract critiques don't drive action.
- **Be specific in recommendations** — name the refactor (Extract Method, Pull Up, etc.) per Fowler; cite the test layer per Testing Trophy.
- **Praise when warranted** — costs nothing, reinforces culture.

## Reference index

- [`references/google-guide.md`](./references/google-guide.md) — key principles from Google's open-source review guide.
- [`references/owasp-security-checks.md`](./references/owasp-security-checks.md) — security-focused checklist aligned to OWASP Top 10.
- [`references/wiegers-process.md`](./references/wiegers-process.md) — Wiegers' formal peer-review process.
- [`references/anti-patterns.md`](./references/anti-patterns.md) — nitpick storm, severity inflation, etc.
