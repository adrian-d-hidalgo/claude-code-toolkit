<!-- last-reviewed: YYYY-MM-DD -->

<!--
Template: ~/.claude/CLAUDE.md (global / user-level)

Identity: persistent system prompt loaded into EVERY Claude Code session, in every project.
Every byte costs tokens forever. Include only rules that apply UNIVERSALLY across your work.
Aim for ≤ 80 lines.

The six categories of operative value (Part B of section-guide):
  1. Operative commands       2. Non-lintable conventions     3. Constraints with alternatives
  4. Active pointers          5. Escalation/stop rules         6. Workflow rules earned by failure

Delete any section that doesn't apply. Replace TODOs.
-->

## Security invariants

<!-- Always in the first 20 lines. Absolute constraints. -->
- Never commit secrets, `.env` files, API keys, or credentials.
- No destructive shortcuts: never `--no-verify`; never `git push --force` on shared branches; never `git reset --hard` on uncommitted work; never `rm -rf` on unknown paths.

## Commit & branch conventions

- Conventional Commits 1.0.0: `type(scope): subject` (subject ≤72 chars, imperative).
- Body uses Problem → Solution → Impact when relevant.
- Never amend a published commit; never force-push to `main`/`master`.

## Tool-use preferences

- Prefer ripgrep (`rg`) for content search; `find` for path search.
- Prefer `pnpm` over `npm` when both are available.
- Read the relevant file section before editing it.

## Communication

- Concise. No filler. Match register to the user's request.
- State assumptions before non-trivial decisions.
- Do not narrate completed work — diff is the record.

<!--
Optional sections only if they apply universally to all your projects:

## When asked to commit
- Run lint + type-check before staging.
- Generate the message with the commit-message skill if available.

## Privacy
- Never include personal data (names, emails, addresses) in commits or logs.

Delete anything narrative, explanatory, or already enforced by a tool.
-->
