# code-audit — anti-patterns

## §1 — "Find everything" reports

**Bad**: 200-finding audit with 180 nitpicks.

**Why wrong**: signal-to-noise crashes; the reader skims past the actual blockers. The team gets fatigued and ignores the report.

**Fix**: prioritise ruthlessly. Drop nitpicks unless they cluster into a meaningful style-debt finding. Aim for 10–30 findings with clear severities.

## §2 — Rewrite-as-remediation

**Bad**: "Recommendation: rewrite this service from scratch."

**Why wrong**: rewrites are almost always more expensive and riskier than incremental refactor. The audit doesn't have the rigour to justify a rewrite (no architecture analysis, no NFR comparison).

**Fix**: recommend incremental refactoring with named techniques (Fowler) and a sequencing strategy (strangler-fig via `development-plan/references/pr-sequencing.md`). If a rewrite is genuinely needed, recommend an architect-led decision (ADR), not a direct rewrite.

## §3 — Severity inflation

**Bad**: every finding labelled `blocking`.

**Why wrong**: erodes the meaning of `blocking`. Real blockers get lost.

**Fix**: reserve `blocking` for correctness / security / contract violations. Most findings are `required` or `suggestion`.

## §4 — Audit without analyser evidence

**Bad**: claiming complexity, coverage, or security findings without running the tools that measure them.

**Why wrong**: opinion, not evidence. Per `../../references/evidence-rule.md`, claims without tool output are `[Inference]` or `[Unverified]`, not `[Verified]`.

**Fix**: run the analysers (`eslint`, `ruff`, `bandit`, `semgrep`, `gocyclo`, `nyc`, etc.) and cite their output. Tag findings `[Verified — <tool> output]`.

## §5 — Recommendations without estimates

**Bad**: "Improve test coverage."

**Why wrong**: unactionable. To 80%? On which modules? In how long?

**Fix**: every recommendation is **concrete** (named refactoring or specific test target) + **measurable** (current state → target state) + **estimated** (S/M/L or hours).

## §6 — Status field in the output

**Bad**: `**Status:** Draft / Final / Approved` in the audit content.

**Why wrong**: lifecycle is the project tracker's responsibility.

**Fix**: drop the field. The audit is a deliverable; the org wraps it with whatever lifecycle metadata it uses.

## §7 — Audit scope undefined

**Bad**: "Audit our codebase" → analyser run on everything, output is a 500-finding pile.

**Why wrong**: too broad. The team can't act on it; the document collects dust.

**Fix**: bound scope explicitly. "Audit the `payments/` module" or "audit cross-cutting security concerns across all services". Out-of-scope items listed.

## §8 — Smells listed without refactoring techniques

**Bad**: "`OrdersController` has Large Class smell." (period)

**Why wrong**: tells the reader there's a problem without telling them what to do.

**Fix**: name the Fowler refactoring technique (Extract Class, Move Method, etc.) and how it applies.

## §9 — Smells overstated for code that's working

**Bad**: flagging "Switch Statements" smell in a state machine where the switch is the clearest expression of the model.

**Why wrong**: smells are heuristics, not laws. Stable, working code that uses a "smell" pattern intentionally isn't broken.

**Fix**: apply judgment. If the smell pattern is the intentional best expression of the model, omit or annotate "intentional — best expression here".

## §10 — Audit prioritisation by author preference

**Bad**: the audit prioritises items the author finds personally interesting.

**Why wrong**: bias drives wrong decisions. Items that drive incidents / customer pain / unblock features should top the list, not items the author wants to fix.

**Fix**: prioritise by Impact × Effort with verifiable rationale per finding. The 2×2 is the prioritisation; author taste is constrained by it.

## §11 — No "Thankless" quadrant

**Bad**: every finding ends up in Quick Wins, Major Projects, or Fill-Ins; nothing in Thankless.

**Why wrong**: real codebases have low-impact-high-effort cleanup work that should NOT be done. An audit that recommends every finding for action is over-ambitious.

**Fix**: be willing to explicitly defer or reject some findings. "F-NN — Thankless — defer indefinitely unless circumstances change" is a valid output.

## §12 — Tool output not actually read

**Bad**: linking to a SonarQube dashboard / ESLint report and saying "see attached findings" without analysing.

**Why wrong**: that's a tool output dump, not an audit. The value of the audit is the human (or LLM) interpretation: which findings matter, in what priority, with what rationale.

**Fix**: the audit synthesises tool outputs + manual code reading into a curated, prioritised list with strategic recommendations. Tool dumps without analysis are not audits.

## §13 — Missing strategic recommendations

**Bad**: audit lists 25 findings without commentary on patterns.

**Why wrong**: when findings cluster (e.g. 8 Feature Envy smells between `orders/` and `payments/`), the cluster suggests architectural action (extract a bounded context, draw a clearer boundary). Missing that loses the most-valuable insight.

**Fix**: after listing findings, surface 1–3 strategic recommendations that address clusters. Link to `adr` for major decisions, `development-plan` for execution sequencing.
