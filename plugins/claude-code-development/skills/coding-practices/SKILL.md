---
name: coding-practices
description: Use to apply, consult, or audit the universal coding practices any agent writing code should follow — developers, security engineers patching code, devops authoring pipelines or IaC, scripts, or any future language- or domain-specific developer agent. Contains ~25 tech-agnostic principles across 7 categories (read & scope, abstraction & coupling, state & error design, change management, operations & evolution, API & collaboration, naming) plus a strict comment philosophy (default = no comment; four taxative exceptions; explicit delete-on-sight list). Trigger phrases include "apply coding practices", "review against coding rules", "rule-of-three", "YAGNI", "audit comment style", "fail-fast or graceful", "make illegal states unrepresentable", "deep modules", "tell don't ask", "least astonishment", "parse don't validate", "explicit over implicit", "AHA programming". Each rule carries imperative, reason, optional exception, and source.
allowed-tools:
  - Read
---

# coding-practices skill

Anchors the universal, tech-agnostic coding practices that **any agent writing code** applies — regardless of language, framework, or domain (application, infrastructure, pipelines, scripts, glue code). Each rule is **imperative + reason + (optional) exception + source citation** so it generalises to edge cases — the rules are guidance to reason from, not keywords to pattern-match.

This skill is **preloaded** by any agent whose responsibility includes writing or editing source code, configuration, or executable artifacts — currently `software-developer` (application code) and `security-engineer` (when patching code as part of a fix recommendation). It is intended to be preloaded by any future agent that produces code, including:

- Language- or framework-specific developer agents (e.g., a `python-developer`, `react-developer`).
- DevOps / SRE / platform agents when they author pipelines, IaC modules (Terraform, Pulumi, CDK), Kubernetes manifests, Helm charts, or operational scripts — these are "code" in every sense relevant to this skill.
- Data engineering agents when they author transformation jobs, DAGs, or ETL scripts.

Other engineering-team agents (architect, reviewer, code-planner, etc.) may consult it situationally when they need to cite a specific rule.

## Coding rules

Apply uniformly across languages and frameworks. Organised by category. Each rule = imperative + reason + (optional) exception + source.

### A. Read & scope discipline

1. **Read first.** Read the relevant code and its tests before writing the first line.
   Reason: "done" is not knowable without seeing "already there".
   Source: _Software Engineering at Google_ ch. 8.

2. **YAGNI.** Implement only what the current requirement asks for.
   Reason: speculative code is a maintenance surface for a need that may never arrive.
   Source: _The Pragmatic Programmer_ Topic 8; Martin Fowler, <https://martinfowler.com/bliki/Yagni.html>.

3. **Boy Scout rule, bounded.** Improve the module being touched, but stop when cleanup would expand the change's blast radius.
   Reason: unbounded cleanup obscures the intent of the change and complicates revert.
   Source: _Clean Code_ ch. 1; _Software Engineering at Google_ ch. 22.

### B. Abstraction & coupling

4. **Rule of three / AHA.** Two similar pieces of code may diverge; abstract on the third instance, not the second. When in doubt, prefer duplication over a premature wrong abstraction.
   Reason: premature abstraction picks the wrong joints and is harder to remove than to delay. The cost of a wrong abstraction is greater than the cost of duplication.
   Source: _Clean Code_ ch. 17; _The Pragmatic Programmer_ Topic 30; Kent C. Dodds, "AHA Programming" — <https://kentcdodds.com/blog/aha-programming>.

5. **Deep modules over shallow ones.** Maximise the ratio of functionality hidden to interface exposed. A module that delegates straight through to another (pass-through method) is shallow and adds no value.
   Reason: shallow modules shift complexity to callers; deep modules absorb it. Indirection without abstraction is overhead.
   Source: John Ousterhout, _A Philosophy of Software Design_ ch. 4.
   Exception: microservice boundaries deliberately favour many small services over depth — that is an architectural trade-off, not a coding-discipline override.

6. **Information hiding.** Every module hides one design decision from the rest of the system. Public surface exposes intent; private surface hides mechanism.
   Reason: hidden decisions can be changed without cascading effects; exposed decisions cannot.
   Source: David Parnas, "On the Criteria to Be Used in Decomposing Systems into Modules", _CACM_ 15(12), 1972.

7. **Tell, don't ask + Law of Demeter.** Talk only to immediate collaborators; issue commands instead of querying state to make decisions on a collaborator's behalf.
   Reason: deep call chains and external decision logic couple callers to internals multiple layers away.
   Source: Martin Fowler, <https://martinfowler.com/bliki/TellDontAsk.html>; Karl Lieberherr, Northeastern 1987.
   Exception: fluent APIs (builder chains) and pure functional pipelines deliberately violate it — judgment call.

8. **Composition over inheritance.** Assemble behaviour from composable units rather than deriving it through deep class hierarchies. Applies outside OO too: HOFs in FP, embedding in Go, mixins/traits.
   Reason: deep hierarchies couple subclasses to parent implementation; composed units are swappable.
   Source: Gang of Four, _Design Patterns_ (1994), ch. 1; _Effective Java_ Item 18.

### C. State & error design

9. **Make illegal states unrepresentable / Parse, don't validate.** Encode domain rules in types so invalid values cannot be constructed. At trust boundaries, parse raw input into a type that cannot represent invalid values; never validate the same constraint twice downstream.
   Reason: a compile-time impossibility is infinitely cheaper than a runtime check; scattered validation creates invisible coupling and inconsistent enforcement.
   Source: Yaron Minsky, Jane Street "Effective ML" (2010); Alexis King, "Parse, don't validate" (2019).
   Exception: dynamically typed languages and very small scripts may rely on convention; the discipline still applies at module boundaries.

10. **Fail fast in libraries; degrade gracefully in user-facing services.**
    Reason: a library should refuse corrupt state; a user-facing service should preserve experience and signal degradation. The correct behaviour depends on who handles the error.
    Source: _The Pragmatic Programmer_ Topic 23 ("Dead programs tell no lies"); _Site Reliability Engineering_ ch. 26.

11. **Enumerate failure modes before shipping.** For each new code path: empty input, huge input, malformed input, concurrent callers, partial failure. Write a test for each that matters.
    Reason: resilience is a correctness property, not an add-on.
    Source: _Software Engineering at Google_ ch. 11; _Site Reliability Engineering_ ch. 17.

12. **Idempotency by default for retryable operations.** Non-retryable operations fail loudly with a clear marker.
    Reason: networks fail, processes restart, exactly-once delivery is not guaranteed in any distributed system.
    Source: _Site Reliability Engineering_ ch. 21.

13. **Explicit over implicit.** Make dependencies, side effects, and assumptions visible in the code path. Prefer named arguments, explicit imports, and surfaced effects over auto-magic.
    Reason: implicit behaviour is the primary source of "magic" bugs and onboarding confusion.
    Source: _Zen of Python_ ("Explicit is better than implicit"); Django design philosophy.

### D. Change management

14. **Estimate blast radius; prefer reversibility.** Ship reversible changes (feature flags, additive interfaces) before irreversible ones (schema drops, breaking protocol changes). Defer irreversible decisions until the last responsible moment.
    Reason: the cost of a bad irreversible decision is orders of magnitude higher than a bad reversible one.
    Source: _The Pragmatic Programmer_ Topic 39 ("Reversibility"); Lean Software Development (Poppendieck).

15. **Conventional Commits.** Write commit messages in `type(scope): subject` form; body follows Problem → Solution → Impact when relevant.
    Reason: commit history is the only audit trail that survives renames and deletions.
    Source: <https://www.conventionalcommits.org/en/v1.0.0/>; kernel.org commit format (Beams).

16. **Self-review the diff before claiming done.** Read it as if reviewing it; run the relevant tests, type-check, lint.
    Reason: self-review is free; reviewer time is not, and catches ~20% of issues that account for ~80% of review comments.
    Source: Google Engineering Practices — reviewer's guide.

### E. Operations & evolution

17. **Log-level contract.** debug = developer context; info = expected lifecycle milestone; warn = recoverable anomaly; error = actionable failure; fatal = unrecoverable.
    Reason: on-call engineers triage by level; polluted levels degrade mean-time-to-detect.
    Source: _Site Reliability Engineering_ ch. 6; sre.google/workbook.

18. **Config as data; secrets out of source.** All configuration loads from outside the binary; secrets live in a secrets manager, never in version control.
    Reason: these two patterns prevent the most common production incidents and security breaches respectively.
    Source: 12factor.net Factors III & XIV.

19. **Test that fails first.** Write the failing test before the code that passes it.
    Reason: a test written after the fix cannot prove the fix was necessary; red-green-refactor is the minimal cycle that produces both coverage and specification.
    Source: _Software Engineering at Google_ ch. 11; Testing Trophy (Dodds, 2018).

20. **Measure before optimising.** Optimise only after a profiler identifies the bottleneck.
    Reason: intuited performance improvements are wrong more than half the time; readability cost is paid for no measured gain.
    Source: _Code Complete 2_ §25.6; Knuth (1974) citing Hoare.

### F. API & collaboration

21. **Principle of Least Astonishment (POLA).** Behave in the way users and callers least expect to be surprised. Match conventions of the surrounding language, framework, and codebase before introducing novelty.
    Reason: surprising behaviour increases cognitive overhead and error rates more than any micro-optimisation can recover.
    Source: Eric S. Raymond, _The Art of Unix Programming_ (2003), ch. 1; Saltzer & Kaashoek, _Principles of Computer System Design_.

22. **Hyrum's Law: be explicit about contracts.** With enough users, every observable behaviour of an API becomes someone's implicit contract. Document what is guaranteed, mark what is incidental, and prefer narrow surfaces over broad ones.
    Reason: users depend on behaviour you never intended to expose; any change breaks someone unless guarantees are explicit.
    Source: Hyrum Wright (Google) — <https://hyrumslaw.com>.

23. **Surface risks and blockers at the start, not at the deadline.**
    Reason: information withheld until the deadline removes all options for mitigation.
    Source: Tanya Reilly, _The Staff Engineer's Path_ ch. 3.

### G. Naming

24. **Intention-revealing names.** Every symbol's name answers what it is, why it exists, and how it is used — with no comment needed. If the name requires a comment to be understood, rename until the comment is redundant, then delete the comment.
   Reason: a name is read orders of magnitude more often than it is written; identifiers are checked by compilers and refactoring tools, comments are not.
   Source: _Clean Code_ ch. 2.

25. **Deep names + ubiquitous language.** Choose names with rich semantic content relative to their length. Avoid generic stems (`Manager`, `Helper`, `Util`, `Data`, `Info`, `Handler`) that force readers into the implementation. Use identical terms for the same concept from the domain model through API through database.
    Reason: generic names hide intent; concept drift across layers generates translation bugs and slows onboarding.
    Source: John Ousterhout, _A Philosophy of Software Design_ ch. 14; Eric Evans, _Domain-Driven Design_ (2003) — ubiquitous language.

## Comment philosophy

**Default: do not write a comment.** Self-documenting code is the goal — well-named identifiers, small functions, and clear control flow carry the *what*. A comment is warranted only when the code cannot express something the reader must know.

The Martin (*Clean Code* ch. 4) vs. Ousterhout (*A Philosophy of Software Design* chs. 12–15) debate (2024–2025) resolved in practice toward McConnell's synthesis: **comment intent, not mechanism**. We adopt that synthesis. Source: Steve McConnell, _Code Complete 2_ §32 ("Self-Documenting Code"); aposd-vs-clean-code (<https://github.com/johnousterhout/aposd-vs-clean-code>).

### The only legitimate reasons to write a comment

1. **Public API contract.** Doc-block on every public function, class, or module describing inputs, outputs, errors, side effects, and pre/post-conditions.
   Reason: callers cannot read the implementation — the doc-block is the contract.
   Source: PEP 257; Rust API Guidelines C-FAILURE.

2. **Invariant the code cannot express.** Concurrency rule, security boundary, performance budget, ordering constraint, regulatory constraint, safety-critical assumption.
   Reason: invariants live in the reader's head, not in the syntax; they are not derivable from the implementation.
   Source: Google Documentation Best Practices; Addy Osmani, _Beyond Vibe Coding_ (2025).

3. **Counter-intuitive decision.** Workaround for a specific bug (link the issue), deliberate violation of a usual pattern, browser/spec quirk, deliberate "this looks wrong but it isn't because…".
   Reason: the next reader (human or AI) will "fix" the apparent oddity otherwise.
   Source: _Clean Code_ ch. 4 ("Clarification") — narrow exception.

4. **Structured TODO / FIXME.** `TODO(owner, ticket, trigger)` only — must name an owner, link a tracked ticket, and state an actionable trigger (date, condition, milestone). Without all three, delete on sight.
   Reason: ownerless TODOs are never resolved and rot into archaeology.
   Source: _The Pragmatic Programmer_ Topic 4 ("Don't leave broken windows.").

### Delete on sight (these are noise, not signal)

- Comments that restate what the next line does (`// increment counter`, `// returns the user's name`).
- Tombstones, changelogs, in-source PR/issue references on closed work, `// added by X`, `// fixed in PR #N`, author names, dates.
- Commented-out code (version control is the archive).
- Doc-blocks on trivial internal helpers (single call-site, short, internal — they are noise).
- Section headers inside a function body (`// ===== validation =====`) — extract a named helper instead.
- Block comments (`/* */`) mid-code — use line comments; they survive editor reflow and individual toggling.
- Comments that explain what a poorly named symbol does — rename the symbol; delete the comment.
- Stale comments that no longer match the code (inaccurate comments are worse than absent ones).
- Narrative comments aimed at the next reader's emotional state (`// hacky but works`, `// don't ask`) — write the invariant or delete.

### The test before writing any comment

Ask: *"Would a better name, a smaller function, or a clearer type signature remove this need?"* If yes — do that instead and write no comment. If no — write the comment as terse as possible, focused on the **intent** or **invariant**, never the mechanism.

### When writing the comment is warranted, keep it small

- Line comments, not block comments.
- One sentence is almost always enough.
- State the constraint, not the implementation step. ("Must run after `pre_flush` to satisfy ordering invariant X." Not: "Calls `pre_flush` first then does Y.")
- Comments must survive a refactor — if the comment will rot the first time the code shifts, do not write it.

### AI-era addendum

When working with AI agents (writing or reviewing code), comment **invariants the agent cannot derive from implementation** — concurrency, security boundaries, performance budgets, policy. Skip narrative comments: the agent already reads the code; the value-add is constraint and intent.
Source: Addy Osmani, _My LLM coding workflow_ (2024–2025); Cloudflare AI code review architecture.

## Self-check (when auditing code against this skill)

- [ ] Every code addition cites which rule it follows when the choice is non-obvious.
- [ ] No speculative abstraction (rule 4 satisfied — rule-of-three / AHA respected).
- [ ] Modules are deep — no pass-through methods or shallow indirection (rule 5).
- [ ] Each module hides one decision; public surface is intent, not mechanism (rule 6).
- [ ] No `obj.collaborator.collaborator.method()` chains (rule 7 — Law of Demeter).
- [ ] Invalid domain states cannot be constructed; input is parsed at boundaries (rule 9).
- [ ] No silent in-scope drift (rule 3 satisfied — Boy Scout cleanup stayed bounded).
- [ ] Commit message uses Conventional Commits (rule 15).
- [ ] Failure modes enumerated for new paths (rule 11).
- [ ] Retryable operations are idempotent (rule 12).
- [ ] Side effects and dependencies are explicit, not hidden (rule 13).
- [ ] Log levels match the contract (rule 17).
- [ ] No secrets in source; configuration loads from environment (rule 18).
- [ ] Tests fail first, then pass (rule 19).
- [ ] Library code fails fast; user-facing services degrade gracefully (rule 10).
- [ ] Public APIs surface explicit contracts; incidental behaviour is marked (rule 22 — Hyrum's Law).
- [ ] Names answer what/why/how without a comment (rule 24).
- [ ] Domain terms are consistent across model → API → DB (rule 25 — ubiquitous language).
- [ ] No comments restating what the code already shows (default-zero respected).
- [ ] All TODOs have owner + ticket + trigger.
- [ ] No tombstone comments.
- [ ] Inline comments only for invariants the code cannot express.

## Anti-patterns to reject

- **Comment that narrates the next line** (`// increment i`, `// return the result`) — violates default-zero. Delete.
- **Pass-through method** that only delegates to another with no added behaviour — violates rule 5 (deep modules).
- **Type that admits illegal states** (e.g. `User` with both `email` and `phone` optional when the domain requires one) — violates rule 9.
- **API that leaks internal mechanism into its contract** (timestamps with implementation precision, error messages with stack traces) — violates rules 6 and 22 (Hyrum's Law).
- **Catch-all `try/except` / `try/catch` that swallows real errors** — violates rule 10 (fail-fast).
- **"Improving" the codebase opportunistically beyond the task's surface** — violates rule 3 (Boy Scout, bounded).
- **Adding a config knob nobody requested** — violates rule 2 (YAGNI).
- **Optimising code without a profiler reading** — violates rule 20 (measure before optimising).
- **Generic names** (`Manager`, `Helper`, `Data`, `Util`, `process`, `handle`) — violates rule 25.
- **Commit message that is `update.` or `fix stuff`** — violates rule 15 (Conventional Commits).
- **Writing a doc-block that restates the function signature** — violates default-zero.
- **TODO with no owner, no ticket, no trigger** — delete it.
- **In-source `// fixed in PR #1234` comments** — tombstone; delete.
- **Naming a function `process` and writing a comment explaining what it processes** — rule 24 violation: rename, then delete the comment.

## Scope and boundaries

This skill defines the coding-practice rules. It does not:

- Implement code — that is the calling agent's job (developer, security-engineer patching code, devops authoring pipelines/IaC, etc.).
- Author tests — strategy is `test-plan`; implementation is the developer.
- Review another developer's PR — that is `code-reviewer` + `code-review-checklist`.
- Define architecture — that is `software-architect`.
- Govern Claude Code configuration files (skills, agents, plugins) — those have their own meta-skills under `claude-code-core`.

## Cross-reference

- `${CLAUDE_PLUGIN_ROOT}/references/evidence-rule.md` — every claim made while applying these rules carries an evidence level.
- `${CLAUDE_PLUGIN_ROOT}/references/code-grounded-analysis.md` — rule 1 (read-first) is the in-developer expression of the transversal code-grounding convention.
- `git-commit` skill — operationalises rule 15 (Conventional Commits) at commit-message-authoring time.
- `code-review-checklist` skill — uses the comment philosophy in the readability category.
