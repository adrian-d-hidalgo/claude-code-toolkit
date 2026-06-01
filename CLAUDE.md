<!-- last-reviewed: 2026-06-01 -->

# Operating instructions — claude-code-toolkit

Directives for any agent working in this repository (main Claude, sub-agents, scripts invoking Claude).

## Security invariants

- Secrets stay out of git — use env vars or a secret manager; never commit `.env`, API keys, or credentials.
- Pause and ask for explicit approval before any destructive shortcut: `--no-verify`, `git push --force` on shared branches, `git reset --hard` on uncommitted work, `rm -rf` on unknown paths, or DDL outside migration tooling. When a pre-commit hook fails, fix the underlying issue rather than skipping it.
- Commit messages may include human `Co-authored-by:` trailers; never include AI co-authorship lines (`Co-authored-by: Claude`, `🤖 Generated with Claude Code`).

## Path constraints

- `.eval-runs/` — gitignored runtime artifacts. Read OK; regenerate via the eval harness if needed (never edit or commit directly).
- `.claude-plugin/marketplace.json` — single root manifest. Edit only this root copy; plugins do not carry their own marketplace.json.
- `plugins/<plugin>/.claude-plugin/plugin.json` — per-plugin manifest. Each carries its own semver.

## Authoring rule — always delegate to the matching meta-skill

To **create, modify, refactor, validate, or audit** any Claude Code component, **invoke the matching meta-skill in `claude-code-core`** rather than editing the file directly:

| Component | Meta-skill to invoke |
|---|---|
| Skill (`SKILL.md`, references, templates) | `claude-code-core:claude-code-skill` |
| Sub-agent (`.claude/agents/*.md`) | `claude-code-core:claude-code-sub-agent` |
| Slash command (`.claude/commands/*.md`) | `claude-code-core:claude-code-slash-command` |
| Plugin manifest (`.claude-plugin/plugin.json`) or marketplace | `claude-code-core:claude-code-plugin` |
| Hook (`hooks/hooks.json` + scripts) | `claude-code-core:claude-code-hook` |
| CLAUDE.md / AGENTS.md (any scope) | `claude-code-core:claude-code-claude-md` |

The meta-skills own the conventions, the validators, and the section-guides. Manual edits drift; meta-skill-driven edits stay aligned with the upstream Anthropic spec and pass the validators.

## Read meta-skills from the repo, not from the cache

When the meta-skill references its own files (`${CLAUDE_PLUGIN_ROOT}/...` or `~/.claude/plugins/cache/...`), translate any cache path to its `plugins/<plugin>/...` equivalent before reading — the repo is the source of truth, the cache is a snapshot.

## Validators (run after any component edit)

```bash
python3 plugins/claude-code-core/shared/scripts/validate_plugin.py plugins/<plugin> --marketplace .
python3 plugins/claude-code-core/shared/scripts/validate_skill.py <skill-dir>/
python3 plugins/claude-code-core/shared/scripts/validate_agent.py <agent>.md
python3 plugins/claude-code-core/shared/scripts/validate_hooks.py <hooks.json>
```

## Activation evals (run only on explicit user request)

```bash
python3 scripts/run_activation_evals.py --all plugins/<plugin> --live --judge
```

Reports auto-write to `.eval-runs/.eval-<scope>-<UTC-timestamp>.json`. Wait for an explicit user yes before re-running — evals cost API calls.

## Propagate learnings back to the meta-skills

If debugging, eval, or refactor work uncovers a NEW rule, anti-pattern, trigger pattern, or eval-design insight about a component type, **propagate it to the matching meta-skill before closing the task**. Order of preference:

1. `plugins/claude-code-core/skills/claude-code-X/references/` (anti-patterns, activation-optimization, section-guide).
2. `plugins/claude-code-core/skills/claude-code-X/SKILL.md` — only for fundamental authoring principles (≤1 paragraph).
3. `plugins/claude-code-core/shared/references/` — when the learning generalizes across component types.

Each propagated learning includes: pattern observed, why it's right/wrong, fix, and ideally an empirical anchor ("May 2026, routing dropped from 0.94 to 0.68 across 6 skills when X").

Learnings that live only in chat or commit messages die the next session. The meta-skills are the institutional memory.

## Commit conventions

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/): `type(scope): subject` (subject ≤72 chars, imperative).
- Body uses Problem → Solution → Impact when relevant.
- Create a new commit for fixes; never amend a published commit or force-push to `main`.
- Run validators before committing.

## When in doubt

- Component-type question? Read the matching meta-skill's `references/section-guide.md`.
- Spec-vs-reality gap? Surface it explicitly with file:line evidence; do not improvise alignment.
- Authoring a brand-new artifact type with no meta-skill? Stop and ask the user.
