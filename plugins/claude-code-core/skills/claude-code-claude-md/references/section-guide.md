# CLAUDE.md Section Guide

Authoritative reference for authoring CLAUDE.md files. Distilled from Anthropic official docs, the AGENTS.md cross-tool open standard (60k+ public repos as of May 2026), two peer-reviewed empirical studies, and high-signal community guidance.

CLAUDE.md is **not a document**. It is part of an _instruction surface_: a root file containing only universal operative rules, plus a retrieval layer (pointers, skills, scoped rules) that loads context on demand. Authoring discipline = token discipline + operational efficiency.

---

## Part A — Identity

### What CLAUDE.md IS

- A persistent system prompt loaded into every Claude Code session. First **200 lines or 25 KB** are honored; the rest is silently truncated.
- Equivalent in role to a `.eslintrc` or `Makefile`: deterministic, mechanical, operative.
- Concatenated across scopes: global (`~/.claude/CLAUDE.md`) + project (`./CLAUDE.md`) + every directory CLAUDE.md from cwd up to project root.
- Part of an _instruction surface_ — a layered system, not a single artifact.

### What CLAUDE.md is NOT

- Not a README. README is for humans deciding whether to use / contribute to / maintain the project.
- Not an architecture document. Architecture overviews are the **single most empirically harmful** type of content (per arxiv:2602.11988): they encourage broader file traversal without improving outcomes, increasing inference cost by 20%+.
- Not a place to map the file tree. File maps go stale the moment the codebase changes and prime the agent to over-explore.
- Not a place to duplicate linter rules, type-check rules, or anything a deterministic tool already enforces.
- Not auto-memory (`~/.claude/projects/.../memory/`) — Claude Code manages auto-memory itself.

### AGENTS.md as adjacent convention

AGENTS.md is the cross-tool open standard (Linux Foundation / Agentic AI Foundation; OpenAI, Cursor, Codex, Copilot, Devin natively support it). Claude Code does not natively read AGENTS.md (feature request open). If a project ships both CLAUDE.md and AGENTS.md:

- Keep them aligned in content; differing rules confuse multi-tool workflows.
- Author the canonical version in one file; the other is a copy or symlink with one line at top: "Authoritative source: CLAUDE.md."
- All the rules in this guide apply to both files equally.

### Identity test

Of every line, ask: _"Would removing this line cause Claude to do the wrong thing on a task it currently handles correctly?"_ If no, delete it.

---

## Part B — The Six Categories of Value

Synthesizing across all sources (arxiv papers, Anthropic, AGENTS.md spec, Cursor docs, Devin docs, Copilot docs), CLAUDE.md delivers value in **exactly six categories**. Each line in your CLAUDE.md should fit one of these. If it doesn't fit any, it's noise.

### 1. Operative commands

Exact shell invocations the agent will run verbatim. Highest empirical ROI (arxiv:2601.20404: ~29% runtime reduction).

```markdown
## Commands

- Build: `pnpm build`
- Test all: `pnpm test`
- Test one file: `pnpm test -- src/auth/login.test.ts`
- Lint: `pnpm lint` (Biome only; ESLint not installed)
- Type check: `pnpm typecheck`
```

Why it works: non-discoverable from code, directly executable, zero ambiguity.

### 2. Non-lintable conventions

Naming patterns, architectural invariants, implicit team agreements that no linter catches.

```markdown
## Conventions

- Domain objects: `{Aggregate}Service`, `{Entity}Repository`.
- API responses always: `{ data, error, meta }`.
- Module boundary: `packages/api` may import from `packages/shared`; not the reverse.
```

Why it works: distinguishes the instruction file from a linter config. If a tool can enforce it, the tool should enforce it.

### 3. Constraints with alternatives

What the agent must never do, **paired** with what it must do instead. Negation-only instructions are unreliable.

```markdown
## Constraints

- No `console.log`; use `src/lib/logger.ts`.
- No `any` in TypeScript; use `unknown` + type narrowing or explicit generics.
- Never `npm install` without explicit approval; flag the proposed dependency first.
```

Why it works: gives the agent positive direction at the moment of conflict.

### 4. Active pointers with triggers

Where to find domain-specific knowledge, **with explicit conditions** that tell the agent when to retrieve it. Passive pointers ("see docs/") are ignored ~56% of the time (alexop.dev empirical analysis).

```markdown
## When working with the database

Before any migration or schema change, read `docs/db-conventions.md`.

## When touching authentication

Read `docs/security/auth.md` before editing anything under `src/auth/`.
```

Why it works: keeps the file lean while ensuring critical context loads on demand. The trigger condition is **non-optional**; without it, the pointer is dead weight.

### 5. Escalation and stop rules

When to ask the user, when to halt, when to surface uncertainty rather than proceed. Under-documented in most tools, critical for production agentic work.

```markdown
## When to stop and ask

- Schema migrations affecting >1 table.
- Changes to billing / payment flow.
- Anything touching `.env`, secrets manager configs, or production deployment.
- When unsure whether a change is in scope — ask before acting.
```

Why it works: turns "the agent went off the rails" failure modes into "the agent asked first".

### 6. Workflow rules earned by failure

TDD expectations, commit message format, PR checklist — but **only** when traceable to a specific observed failure. Speculative workflow rules are noise.

```markdown
## When fixing a bug

1. Reproduce the failure with a test before any production code change.
2. Run the full test suite before opening a PR.
3. Commit message: `fix(scope): summary` per Conventional Commits 1.0.0.
```

Why it works: rules earned from real incidents survive review. Speculative rules accumulate as cruft.

---

## Part C — Anti-patterns (what NOT to include)

| Anti-pattern                                                                                   | Why it hurts                                                                                                          | Source                            |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Architectural overviews** ("our system uses Event Sourcing because…")                        | Single most harmful content type empirically. Primes the agent to over-explore; +20% cost without improving outcomes. | arxiv:2602.11988                  |
| **File-tree maps** ("`src/api/` contains controllers, `src/services/` contains…")              | Goes stale immediately; encourages broader traversal. "Context file landmines."                                       | Augment Code guide                |
| **Passive pointers** ("see docs/style-guide.md for more")                                      | Agent ignores ~56% of the time without trigger condition.                                                             | alexop.dev (Jan 2026)             |
| **Always-Apply overloading** (10+ universal rules)                                             | Model satisfies all simultaneously → "average" output partially violating most.                                       | Cursor docs                       |
| **Linter-redundant rules** (quote style, indent, trailing commas)                              | Linter is faster, cheaper, deterministic. Duplication risks divergence.                                               | Anthropic best practices          |
| **Vague modifiers** ("write clean code", "be concise", "follow best practices")                | Zero operative value. Test: "would a competent senior disagree or need clarification?"                                | Multiple                          |
| **Prescribing what the model already knows** ("use TypeScript interfaces before implementing") | Speculative rule with no failure backing. Adds noise.                                                                 | Addy Osmani — harness engineering |
| **README-style content** (product description, features, history, marketing)                   | Belongs in README. Zero behavioral signal.                                                                            | All sources                       |
| **Negation without alternative** ("don't use class components")                                | Agent has no positive direction; reverts to default.                                                                  | All sources                       |
| **Duplicating content across scope levels** (project repeats global rules)                     | Concatenation doubles token cost without adding signal.                                                               | Claude Code docs                  |
| **Rules you don't enforce**                                                                    | Model learns rules are optional; credibility erodes across all rules.                                                 | MindStudio                        |
| **Auto-memory duplication**                                                                    | Auto-memory loads automatically; restating it doubles cost.                                                           | Anthropic memory docs             |

The unifying test: **every line should be traceable to a specific observed failure**. Lines not traceable to failure are speculative; cut them.

---

## Part D — Token Economics + Empirical Cost

| Number                                     | Source                                                               | Meaning                                                                                                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **200 lines**                              | Anthropic, _Best practices for Claude Code_                          | Hard cap; content past line 200 is silently dropped at session start.                                                                                                                                                                               |
| **25 KB**                                  | Anthropic                                                            | Hard cap; whichever fires first between this and the line limit.                                                                                                                                                                                    |
| **150–800 words**                          | MindStudio (May 2026), calibrated against May-2026 real-world corpus | Production sweet spot. Below 150 with no delegation: probably too thin. Above 800: rule-following degrades. Dense bullet/table files run shorter than prose; brevity-by-delegation (forwarding to AGENTS.md or `.handbook/`) is fine at any length. |
| **150–200 instructions**                   | HumanLayer                                                           | Frontier models' effective instruction window. Past this, marginal rule is nearly invisible.                                                                                                                                                        |
| **~4 chars/token**                         | OpenAI tokenizer                                                     | Crude proxy: `len(file_bytes) // 4` ≈ tokens.                                                                                                                                                                                                       |
| **−28.64% runtime, −16.58% output tokens** | arxiv:2601.20404 (Jan 2026, peer-reviewed)                           | Empirical improvement when AGENTS.md contains operative info.                                                                                                                                                                                       |
| **+20% inference cost, ↓ task success**    | arxiv:2602.11988 (Feb 2026, ETH Zurich)                              | Empirical degradation when AGENTS.md contains architectural overviews / file maps.                                                                                                                                                                  |
| **~56% ignore rate**                       | alexop.dev                                                           | How often passive pointers are ignored without explicit trigger conditions.                                                                                                                                                                         |

The reconciliation: instruction files improve agent performance **only when their content is operative** (commands, conventions, constraints, triggered pointers). Descriptive content (architecture, file structure, intent) makes performance worse.

### Primacy + recency

LLMs attend more to the beginning and end. Place security/compliance invariants in the first 20 lines; "before finishing" workflow rules in the last 10. The middle is for grouped reference content (commands, conventions) where order matters less.

---

## Part E — Scope Hierarchy

Claude Code loads CLAUDE.md by walking from cwd up to project root, then loading `~/.claude/CLAUDE.md`. All matching files are **concatenated** in order (not merged or overridden).

| Scope         | Location                   | Loaded when                               | Purpose                                                                                                         |
| ------------- | -------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Global**    | `~/.claude/CLAUDE.md`      | Every session, every project              | Identity defaults, commit conventions, security invariants, personal behavioral overrides — applies universally |
| **Project**   | `<project-root>/CLAUDE.md` | Every session in the project              | Stack-specific commands, project conventions, architectural invariants — checked into git                       |
| **Directory** | `<subdir>/CLAUDE.md`       | When the agent works in that subdirectory | Monorepo per-package rules that differ from project root                                                        |

### Critical behaviors

- **Directory adds to, does not replace, project.** Do not repeat project-level rules in subdirectory files.
- **Concatenation, not override.** Inheritance is additive only. To "override" you must author a _more specific_ rule in the lower scope.
- **`@import` syntax** lets a single CLAUDE.md decompose into focused includes:
  ```
  ## Style
  @docs/style-guide.md
  ```
  The imported file inlines at the import site at load time. Known issue (May 2026): global-path imports `@~/.claude/file.md` have reliability bugs ([anthropics/claude-code #8765](https://github.com/anthropics/claude-code/issues/8765)). Prefer project-relative paths.

### Scope discipline = token savings

Wrong: 5,000-token project CLAUDE.md loaded every session. Right: 1,500-token project CLAUDE.md + 500-token directory CLAUDE.md only when working in that directory. Same coverage, 60% less token cost on average sessions.

---

## Part F — Versioning and Lifecycle

There is no canonical self-dating standard. Practitioner conventions (May 2026):

```markdown
<!-- last-reviewed: 2026-05-12 -->
```

HTML comments are stripped before injection in most parsers, so this costs zero tokens but enables drift detection.

### Update discipline (Addy Osmani)

> "Every line in a good AGENTS.md should be traceable back to a specific thing that went wrong."

The file grows by failure post-mortem, not upfront planning. It also **shrinks** — Anthropic best practices: "ruthlessly prune instructions that Claude already does correctly."

### Three update modes (May 2026)

1. **Human-maintained, git-versioned.** Baseline. Treat as production config: PR review, changelog entry, rollback capability.
2. **Agent-assisted, human-approved.** Claude proposes updates; user reviews and commits.
3. **Autonomous (Anthropic "dreaming", May 6 2026).** Scheduled review of past sessions, pattern extraction, plain-text auto-update. Currently for _Managed Agents memory_, not project CLAUDE.md.

---

## Part G — Concrete Examples

### Good

**Operative command block (project scope, security in first 20 lines):**

```markdown
## Security invariants

- Secrets via env vars only; never hardcode, never log.
- No `eval()` or `Function()` constructor anywhere under `src/`.

## Commands

- Build: `pnpm build`
- Test all: `pnpm test`
- Test one file: `pnpm test -- src/auth/login.test.ts`
- Lint: `pnpm lint` (Biome; ESLint is not installed)
```

**Active pointer with trigger:**

```markdown
## When writing migrations

Read `docs/db-conventions.md` before any schema change.
Test cycle: `pnpm db:migrate && pnpm db:rollback`.
```

**Escalation rule:**

```markdown
## Stop and ask before

- Adding any new npm dependency.
- Schema changes that affect more than one table.
- Anything touching `.env*` files.
```

### Bad

**Architectural overview (single worst pattern):**

```markdown
## About the system

MyApp uses Event Sourcing with CQRS, backed by PostgreSQL for read models
and Kafka for the event stream. We chose this in 2024 to support…
```

Fix: delete. Move to `docs/adr/0007-event-sourcing.md`. The agent will discover the architecture as needed.

**File-tree map:**

```markdown
## Layout

- `src/api/` — REST controllers
- `src/services/` — domain services
- `src/repositories/` — data access
- `src/utils/` — shared utilities
```

Fix: delete. The agent discovers structure by reading. File maps go stale and prime over-exploration.

**Passive pointer:**

```markdown
See `docs/coding-style.md` for our coding style.
```

Fix: add a trigger.

```markdown
## When writing new TypeScript modules

Read `docs/coding-style.md` for naming and module boundary rules.
```

**Vague modifier:**

```markdown
- Write appropriate tests for new features.
- Use modern JavaScript.
```

Fix: be concrete or delete.

```markdown
- For new public functions, write a unit test covering happy path + 2 edge cases.
- Use ES2022+ (top-level await, .at(), structuredClone()).
```

---

## Part H — Validation Checklist

Before sign-off:

**Structure:**

- [ ] File length ≤ 200 lines, size ≤ 25 KB.
- [ ] Word count in 150–800 range (smaller is OK when the file delegates to AGENTS.md / `.handbook/` / sibling docs).
- [ ] Critical security/compliance rules in first 20 lines.
- [ ] `<!-- last-reviewed: YYYY-MM-DD -->` present at top.

**Content categories (Part B):**

- [ ] Every section maps to one of the six categories.
- [ ] No content fits none of the categories.

**Operative quality:**

- [ ] Every prohibition has a positive alternative.
- [ ] Every pointer has a trigger condition.
- [ ] Every command is exact (copy-paste-runnable).
- [ ] No vague modifiers ("appropriate", "modern", "relevant") without measurable criteria.

**Anti-patterns absent:**

- [ ] No architectural overview sections.
- [ ] No file-tree maps.
- [ ] No linter-redundant rules.
- [ ] No README-style content (product description, history, features).
- [ ] No first-person voice in operative sections.

**Scope hygiene:**

- [ ] Project file does not repeat global content.
- [ ] Directory file does not repeat project content.
- [ ] No auto-memory duplication.

**Update discipline:**

- [ ] Every rule traceable to a specific observed failure (or universal invariant).
- [ ] Rules the agent already follows correctly are absent.

**AGENTS.md alignment (if both files exist):**

- [ ] Canonical source identified (one file authoritative; the other a copy/symlink).
- [ ] Content matches between files.

---

## Part I — The "Instruction Surface" Mental Model

The field has moved past "CLAUDE.md as single artifact." In May 2026, the accurate model is a three-layer **instruction surface**:

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Root instruction file (CLAUDE.md / AGENTS.md)      │
│  - Universal operative rules only                            │
│  - ≤200 lines, every line is operative                       │
│  - Categories B.1–B.6 only                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓ activates via trigger
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Triggered docs (docs/, docs/adr/, conventions/)    │
│  - Domain-specific knowledge                                 │
│  - Loaded on demand via pointers in Layer 1                  │
│  - No token cost until referenced                            │
└─────────────────────────────────────────────────────────────┘
                              ↓ invoked by routing
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Skills (SKILL.md) and sub-agents                    │
│  - Task-specific procedures                                  │
│  - Invoked by Claude based on description matching           │
│  - Full procedural content loaded only when fired            │
└─────────────────────────────────────────────────────────────┘
```

When authoring CLAUDE.md, the question is not just "what goes in this file?" but **"which layer does this content belong in?"** Operative rules → Layer 1. Domain knowledge → Layer 2 (with active pointer from Layer 1). Multi-step procedures → Layer 3.

This is the difference between a 5,000-token always-loaded CLAUDE.md and a 1,500-token CLAUDE.md + on-demand layers. Same coverage, ~70% less recurring token cost, better empirical agent performance.
