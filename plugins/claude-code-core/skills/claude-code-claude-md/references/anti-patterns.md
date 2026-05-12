# Anti-patterns — CLAUDE.md authoring

Mistakes that turn CLAUDE.md from operative configuration into noise. Each entry: pattern → why it hurts → fix. Severity tagged where the literature quantifies the damage.

## Architectural overviews (single most harmful)

**Pattern**: "Our system uses Event Sourcing because of scalability concerns. The write path emits domain events to Kafka; read models are materialized in PostgreSQL…"

**Why wrong**: Empirically increases inference cost by 20%+ AND reduces task success rates (arxiv:2602.11988, ETH Zurich, Feb 2026). Primes the agent to over-explore the codebase; it tries to validate the overview against reality, which is broader file traversal without behavior improvement.

**Fix**: delete entirely. Move to `docs/adr/<NNNN>-event-sourcing.md`. If the agent genuinely needs the context for one type of work, add an active pointer:

```markdown
## When modifying write paths

Read `docs/adr/0007-event-sourcing.md` first.
```

## File-tree maps

**Pattern**: "`src/api/` contains controllers. `src/services/` contains domain services. `src/utils/` contains helpers…"

**Why wrong**: Goes stale immediately. Encourages broader traversal without improving outcomes. Augment Code's term: "context file landmines."

**Fix**: delete. The agent discovers structure as it works. If a specific path matters (generated code, vendored deps, build artifacts), include only that pointer:

```markdown
## File-tree notes

- `dist/` — generated; never edit.
- `vendor/` — vendored; treat as binary.
```

## Passive pointers

**Pattern**: "See `docs/style-guide.md` for our coding style."

**Why wrong**: alexop.dev empirical analysis: passive pointers are ignored ~56% of the time. The agent skips them because there's no trigger telling it when to read.

**Fix**: add the trigger condition.

```markdown
## When adding a new module

Read `docs/style-guide.md` before naming files or organizing exports.
```

## Always-Apply overloading

**Pattern**: 10+ universal "always do X" rules of varying priority.

**Why wrong**: Cursor docs explicitly: when too many rules apply at once, the model satisfies them all simultaneously and produces "average" output that partially violates most.

**Fix**: scope rules to when they apply. Use the "When X" pattern for non-universal rules. Reserve the always-on first-20-lines slot for true universals (security invariants, fail-loud rules).

## Linter-redundant rules

**Pattern**:

```markdown
- Use 2-space indentation
- Prefer single quotes
- Always add trailing commas
- Max line length 100
```

**Why wrong**: Prettier / Biome / Ruff / Rubocop enforce these deterministically. Recording them in CLAUDE.md doubles the token cost AND creates a divergence risk if the linter config changes.

**Fix**: delete. Reference the source of truth in one line:

```markdown
Style enforced by `biome.json`.
```

## Vague modifiers

**Pattern**: "Write clean code." "Use modern JavaScript." "Apply best practices."

**Why wrong**: Zero operative value. The agent has no measurable criterion. Test: "Would a competent senior engineer disagree with this rule, or need clarification to follow it?" If yes, it's vague.

**Fix**: make concrete or delete.

```markdown
- For new public functions: write a unit test covering happy path + 2 edge cases before implementation.
- Use ES2022+ syntax (top-level await, `.at()`, `structuredClone()`).
```

## Prescribing what the model already knows

**Pattern**: "Use TypeScript interfaces before implementing." "Write the function signature before the body."

**Why wrong**: Speculative rule with no failure backing. Addy Osmani's principle: "Every line in a good AGENTS.md should be traceable back to a specific thing that went wrong."

**Fix**: delete. Only add rules earned from observed failures.

## README-style content

**Pattern**: "## About This Project — MyApp is a SaaS platform that helps marketing teams…"

**Why wrong**: Zero behavioral signal. Burns tokens every session forever. The most common "becomes a README" failure mode.

**Fix**: delete. Move to README.md. Trust the agent to read README when asked.

## Negation without alternative

**Pattern**:

```markdown
- Never use `any` in TypeScript
- Don't use default exports
- Avoid console.log
```

**Why wrong**: Tells the agent what NOT to do without telling it what to do instead. When the legitimate need arises, it has no positive direction.

**Fix**: rewrite as constraints-with-alternatives.

```markdown
- No `any`; use `unknown` + type narrowing or explicit generics.
- Named exports only; default exports break refactoring tooling.
- Use `src/lib/logger.ts`; never `console.*`.
```

## Duplicated content across scopes

**Pattern**: Project CLAUDE.md repeats lines from global `~/.claude/CLAUDE.md`. Or `src/CLAUDE.md` repeats lines from project root CLAUDE.md.

**Why wrong**: Scopes concatenate. Duplicate content burns tokens twice per session. One copy will go stale.

**Fix**: keep each rule at the most general scope where it still applies. Subdirectory files only contain _differences_ from the project level.

## Rules you don't enforce

**Pattern**: CLAUDE.md says "always run tests before marking done" — but the user routinely skips it.

**Why wrong**: MindStudio: silent credibility killer. The agent learns the rule is optional, which erodes confidence in _all_ other rules.

**Fix**: only write rules you actually enforce. If aspirational, delete until enforcement is real (a hook, CI gate, pre-commit check).

## Auto-memory duplication

**Pattern**: CLAUDE.md re-states things Claude has already saved to `~/.claude/projects/<name>/memory/MEMORY.md`.

**Why wrong**: Auto-memory loads automatically. Duplicating doubles the token cost without adding new behavior.

**Fix**: trust auto-memory. CLAUDE.md is for rules Claude needs reinforced even when memory is cleared or has not yet learned them.

## Buried critical rules

**Pattern**: "All API keys via env vars" appears on line 120 of a 180-line file.

**Why wrong**: Primacy/recency bias. The model attends most to the first ~20 and last ~10 lines. Buried-middle rules get followed less often.

**Fix**: move security/compliance invariants to the first 20 lines.

## Stale file references

**Pattern**: "Run tests with `pnpm test:legacy`" — but `package.json` no longer has that script.

**Why wrong**: Misleads the agent. It tries the command, fails, improvises.

**Fix**: validate periodically (the validator script flags references that don't resolve).

## Mixed authoring voice

**Pattern**: Long prose paragraphs explaining intent + bullet lists of imperatives + section-long examples, all mixed.

**Why wrong**: Makes the file unscannable for the agent. Imperative content is diluted by narrative.

**Fix**: bullets of imperatives only. Move examples to pointer-referenced files. Prose belongs in README or docs.

## First-person voice ("we", "our")

**Pattern**: "We use Conventional Commits because…"

**Why wrong**: Inconsistent with the imperative voice the agent best follows. Sounds like marketing/team self-description, not configuration.

**Fix**: imperative or third-person.

```markdown
Conventional Commits 1.0.0: `type(scope): subject`.
```

## AGENTS.md / CLAUDE.md mismatch

**Pattern**: project ships both files with diverging content.

**Why wrong**: confuses multi-tool workflows; the agent reads conflicting rules depending on which tool fired.

**Fix**: designate one file authoritative; the other is a copy or symlink. Or document the divergence explicitly: "AGENTS.md is the canonical source; CLAUDE.md adds Claude-Code-specific rules below the divider."
