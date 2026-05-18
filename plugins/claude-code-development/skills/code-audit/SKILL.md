---
name: code-audit
description: Use when the user asks to audit a codebase, identify technical debt, prioritise refactoring, or assess code health. Trigger phrases include "audit this codebase", "tech-debt analysis", "where should we refactor", "code smells in", "SQALE assessment", "audita el código", "deuda técnica", "what's blocking maintainability".
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git log *)
  - Bash(git diff *)
  - Bash(npx *)
  - Bash(uvx *)
  - Bash(npm *)
  - Bash(pnpm *)
---

# code-audit skill

Produces a **full-codebase** (or scoped-module) audit: findings list with severity, tech-debt scoring on impact × effort, prioritised remediation plan. Differs from `code-review-checklist` (per-PR scope). Output is content the caller persists wherever — usually a doc, a Linear epic, an architecture-review attachment.

## Methodology anchor

- **Conventional Comments** — severity-tagged review labels: `blocking`, `required`, `suggestion`, `question`, `nitpick`, `praise`, `thought` (open-sourced by Pavel Vass and contributors, 2019). Used here for finding labels too. Reference: [`conventional-comments.md`](./references/conventional-comments.md).
- **Impact × Effort 2×2** — classic prioritisation matrix (Bain, ~1970s; widely adopted in Lean / Six Sigma). Reference: [`impact-effort.md`](./references/impact-effort.md).
- **SQALE method** — Software Quality Assessment based on Lifecycle Expectations (Jean-Louis Letouzey, 2010). Industry standard for tech-debt index (SonarQube, others implement it). Reference: [`sqale-method.md`](./references/sqale-method.md).
- **Code smells taxonomy** — Martin Fowler, _Refactoring: Improving the Design of Existing Code_ (2nd ed., 2018). The canonical catalog. Reference: [`code-smells.md`](./references/code-smells.md).
- **Architecture fitness functions** — Neal Ford, Rebecca Parsons, Patrick Kua, _Building Evolutionary Architectures_ (O'Reilly, 2017). For NFR-degradation findings.

## Scope and boundaries

This skill handles:

- Full-codebase or scoped-module audit producing structured findings.
- Severity classification per Conventional Comments.
- Tech-debt scoring on Impact × Effort, optionally with SQALE indices.
- Code-smell identification per Fowler taxonomy.
- Prioritised remediation plan (top-N items, owner suggestion, effort estimate).

This skill does not handle:

- Per-PR / per-diff review (use `code-review-checklist`).
- Implementation of the remediations (software-developer).
- Architectural redesign (software-architect).
- Performance load testing (quality-engineer).
- Security vulnerability scanning (security-engineer; this skill may flag obvious patterns and recommend a deeper sec review).

## Output structure

```markdown
## Audit scope

- Modules / paths analysed: <list of concrete repo paths>.
- Modules / paths EXPLICITLY out of scope: <list with rationale>.
- Analysers run: <e.g. `npx eslint`, `ruff`, `bandit`, custom queries>.
- Methodology: Fowler smells + SQALE indices + Conventional Comments severity.
- Evidence levels per claim per the engineering-team evidence-rule convention (at the plugin-root references directory).

## Findings

### F-01 — <descriptive title>

- **Severity**: blocking | required | suggestion | nitpick (Conventional Comments).
- **Category**: correctness | performance | security | maintainability | test-coverage | dependency-hygiene | observability | a11y | i18n.
- **Location**: <file:line — or pattern affecting multiple files>.
- **Description**: <what's wrong>.
- **Smell**: <name from Fowler taxonomy if applicable, e.g. "Shotgun Surgery", "Feature Envy">.
- **Impact**: H / M / L — rationale.
- **Effort**: H / M / L — rationale.
- **Recommendation**: <concrete fix>.
- **Evidence**: [Verified — analyzer output / file:line / Inference — pattern matches typical X / Unverified — needs deeper review].

### F-02 — …

## Tech-debt scoring (Impact × Effort 2x2)
```

              Low Effort     High Effort

High Impact | QUICK WINS | MAJOR PROJECTS |
| F-01, F-03 | F-04 |
Low Impact | FILL-INS | THANKLESS |
| F-02 | F-05 |

```

## SQALE indices (if applicable)
- Technical debt (hours to remediate): <X>.
- SQALE rating: A / B / C / D / E.
- Debt ratio: <X>% (debt / development cost).

## Prioritised remediation plan
1. **F-01** (Quick win, blocking): <one-line action>. Owner suggestion: <team>. Effort: S.
2. **F-04** (Major project, blocking): <one-line action>. Owner suggestion: <team>. Effort: L.
3. …

## Strategic recommendations
- <e.g. "Extract `payments/` as a bounded context — current coupling to `orders/` violates the intended layer boundaries; consider an ADR via the `adr` skill">.
- <e.g. "Add a fitness function for max-cyclomatic-complexity in CI to halt regression">.
```

## Workflow

1. **Confirm scope** — full codebase vs specific modules. Bound it; auditing "everything" produces noise.
2. **Pick analysers** appropriate to the stack and run them (ESLint, ruff, semgrep, gocyclo, etc.). Capture outputs as `[Verified]` evidence.
3. **Read the actual code** in the scope (`Read`, `Grep`, `Glob`). Look for Fowler smells: Duplicated Code, Long Method, Large Class, Feature Envy, Shotgun Surgery, Divergent Change, Primitive Obsession, Switch Statements, Parallel Inheritance Hierarchies, Lazy Class, Speculative Generality, etc.
4. **Run git introspection** — recent churn, hotspots, files with high change frequency × high complexity (Adam Tornhill's _Your Code as a Crime Scene_ approach).
5. **Categorise each finding** by Conventional Comments severity + technical category.
6. **Score each finding** on Impact × Effort (qualitative L/M/H is fine; SQALE indices optional for orgs that consume SQALE).
7. **Plot the 2x2** — Quick Wins / Major Projects / Fill-Ins / Thankless.
8. **Prioritise remediation** — Quick Wins first; then High-Impact Major Projects; defer Low-Impact items.
9. **Surface strategic recommendations** — when findings cluster, propose architectural changes (link to `adr` for major decisions).
10. **Self-check** before emission.

## Self-check (mandatory)

- [ ] Scope is explicit (in / out, with rationale).
- [ ] Analysers were actually run; their outputs are cited (not "ESLint would say…" without running it).
- [ ] Every finding has severity + category + location + impact + effort.
- [ ] Locations are concrete (file:line) — not "in the orders module somewhere".
- [ ] Tech-debt scoring placed every finding in one of the 4 quadrants.
- [ ] Top-N remediation plan is prioritised by Impact × Effort, not by author preference.
- [ ] Strategic recommendations cite where deeper artefacts (ADR / threat model / dev plan) are warranted — but don't author them inline.
- [ ] Every claim tagged with evidence level.
- [ ] No `Status:` field in the output.

## Anti-patterns

- **Find everything**: padding the output with nitpicks lowers the signal-to-noise. Prioritise.
- **Rewrite-as-remediation**: recommending "rewrite this service" without breakdown / risk analysis / cost. Use a strangler-fig plan instead.
- **Severity inflation**: every finding marked `blocking`. Erodes the signal.
- **Audit without analyser evidence**: claims about complexity / coverage / security without running the tools that measure them. Findings without `[Verified]` evidence get the right tag.
- **Recommendations without estimates**: "improve test coverage" is unactionable. Estimate effort to reach a target.
- **Status field in output**: drop.
- **Auditing the wrong unit**: a 50-file audit of a 5-file scope wastes time. Bound tightly.

## Communication

- Lead with the **scope + summary** (number of findings by severity + tech-debt rating + top-3 priorities) — stakeholders scan headlines.
- Cite concrete file:line for every finding; abstract critiques don't drive action.
- Distinguish quick wins from major projects clearly; teams act on quick wins independently and need leadership alignment on major projects.
- Strategic recommendations are suggestions — never invocations. The architect / tech-lead acts on them via their own protocols.

## Reference index

- [`references/conventional-comments.md`](./references/conventional-comments.md) — severity-tag definitions + cross-link to `code-review-checklist`.
- [`references/impact-effort.md`](./references/impact-effort.md) — 2×2 prioritisation with examples.
- [`references/sqale-method.md`](./references/sqale-method.md) — tech-debt index + when worth the rigour.
- [`references/code-smells.md`](./references/code-smells.md) — Fowler taxonomy with worked examples.
- [`references/anti-patterns.md`](./references/anti-patterns.md) — bad audit patterns.
