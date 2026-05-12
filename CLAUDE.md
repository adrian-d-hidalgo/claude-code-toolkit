<!-- last-reviewed: 2026-05-12 -->

## Security invariants

- Never commit secrets, `.env` files, API keys, or credentials.
- No destructive shortcuts without explicit approval: never `--no-verify`, `git push --force` on shared branches, `git reset --hard` on uncommitted work, or `rm -rf` on unknown paths.

## Path constraints

- `.eval-runs/` — gitignored runtime artifacts. Never edit; never commit.
- `.claude-plugin/marketplace.json` — single root manifest; never duplicate at plugin level.

## Commands

Validators:
```
python3 plugins/claude-code-core/shared/scripts/validate_plugin.py plugins/<plugin> --marketplace .
python3 plugins/claude-code-core/shared/scripts/validate_skill.py <skill-dir>/
python3 plugins/claude-code-core/shared/scripts/validate_agent.py <agent>.md
python3 plugins/claude-code-core/shared/scripts/validate_hooks.py <hooks.json>
```

Activation evals:
```
python3 scripts/run_activation_evals.py --all plugins/claude-code-core --live --judge
```
Reports auto-write to `.eval-runs/.eval-<scope>-<UTC-timestamp>.json`.

## Authoring

To create or modify any component (skill, sub-agent, slash command, plugin, hook, CLAUDE.md), invoke the matching meta-skill in `claude-code-core` — they own the conventions and validation for their component type.

## Propagate learnings back to the meta-skills

This toolkit ships the meta-skills that author Claude Code components. Whenever a debugging, eval, or refactor pass uncovers a NEW rule, anti-pattern, trigger pattern, or eval-design insight about a component type, **propagate that learning back into the corresponding meta-skill before closing the task**. The meta-skills are the institutional memory; if a learning lives only in chat or in a commit message, it dies the next session.

Concretely, when work on a component type X yields a generalizable lesson, add it to (in order of preference):

1. `plugins/claude-code-core/skills/claude-code-X/references/` (anti-patterns, activation-optimization, section-guide) — the deepest, most-referenced source.
2. `plugins/claude-code-core/skills/claude-code-X/SKILL.md` — only if it's a fundamental authoring principle (≤1 paragraph).
3. `plugins/claude-code-core/shared/references/` — when the learning generalizes across multiple component types (e.g. test-corpus authoring).

Each propagated learning should include: the pattern observed, why it's wrong (or right), the fix, and ideally an empirical anchor (e.g. "May 2026, routing dropped from 0.94 to 0.68 across 6 skills when X").

## Commit conventions

- Conventional Commits 1.0.0: `type(scope): subject` (subject ≤72 chars, imperative).
- Body uses Problem → Solution → Impact when relevant.
- Never amend a published commit; never force-push to `main`.
