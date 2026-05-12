<!-- last-reviewed: YYYY-MM-DD -->

<!--
Template: <project-root>/CLAUDE.md (project-level)

Identity: persistent system prompt loaded EVERY session in this project. Concatenated with
the user's global CLAUDE.md. Don't repeat global content.

The six categories of operative value (Part B of section-guide):
  1. Operative commands       2. Non-lintable conventions     3. Constraints with alternatives
  4. Active pointers          5. Escalation/stop rules         6. Workflow rules earned by failure

Target: ≤ 150 lines, 150–800 words. Every line should change Claude's behavior on a task
it would otherwise get wrong.

DO NOT include:
- Architectural overviews ("we chose Event Sourcing because…") — empirically the single
  most harmful content type (arxiv:2602.11988).
- File-tree maps ("`src/api/` contains controllers…") — go stale, prime over-exploration.
- README-style content (product description, history, features).
- Passive pointers ("see `docs/X`" without a trigger).
- Rules a linter already enforces.

Replace TODOs.
-->

## Security invariants

<!-- First 20 lines. Absolute, non-negotiable rules. -->

- TODO: project-specific security constraints (e.g., "No PII in logs", "All write paths validate input via `src/lib/validate.ts`").

## Commands

- Build: TODO `pnpm build`
- Test all: TODO `pnpm test`
- Test one file: TODO `pnpm test -- <path>`
- Lint: TODO `pnpm lint` (note which linter; omit ones not installed)
- Type check: TODO `pnpm typecheck`
- Format: TODO `pnpm format`

## Conventions (only what linters don't enforce)

- TODO: domain-object naming (e.g., `{Aggregate}Service`, `{Entity}Repository`).
- TODO: module boundary rules (e.g., `packages/api` may import from `packages/shared`; not the reverse).
- TODO: API response shape (e.g., `{ data, error, meta }` always).

## Constraints

- TODO: no `any`; use `unknown` + narrowing.
- TODO: named exports only; default exports break refactoring tooling.
- TODO: logging via `src/lib/logger.ts`; never `console.*`.

## When writing migrations

<!-- Example of an active pointer. Replace with relevant domain. -->

Read `docs/db-conventions.md` first. Test cycle: `pnpm db:migrate && pnpm db:rollback`.

## When to stop and ask

- TODO: project-specific escalation triggers (e.g., schema changes >1 table, billing flow changes, `.env*` edits).
- Adding any new npm dependency.

<!--
DELETE-BEFORE-COMMIT checklist:
- [ ] No README content (product description, history, marketing).
- [ ] No architectural overview ("we chose X because…").
- [ ] No file-tree map describing repo layout.
- [ ] No rules a linter already enforces.
- [ ] Every TODO replaced or deleted.
- [ ] File length ≤ 200 lines.
- [ ] Run validator:
      python3 plugins/claude-code-core/skills/claude-code-claude-md/scripts/validate_claude_md.py CLAUDE.md
-->
