# Claude Code Toolkit

A personal marketplace of Claude Code plugins. Each plugin is self-contained, aligned with the current official Claude Code conventions (June 2026), and ships with validators + activation-evaluation tooling.

## What ships

| Plugin                      | Version | What it gives you                                                                                                                                                                                                          |
| --------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **claude-code-core**        | 1.2.0   | 6 meta-skills to **author Claude Code itself**: scaffold, refactor, validate, and audit skills, sub-agents, slash commands, plugins, hooks, and CLAUDE.md files. Each meta-skill ships an exhaustive `section-guide.md`.   |
| **claude-code-development** | 2.0.0   | 8 senior engineering sub-agents + 16 methodology-anchored skills + 5 transversal references. Composable LEGO pieces with single-responsibility scope and least-privilege tooling. **No orchestration baked in** — you wire it. |

### `claude-code-core` — meta-skills

| Skill                       | Triggers on                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `claude-code-skill`         | Authoring or refactoring a Claude Code skill (`SKILL.md`, references, templates, scripts, tests).                                |
| `claude-code-sub-agent`     | Authoring or refactoring a sub-agent (`.claude/agents/*.md`).                                                                    |
| `claude-code-slash-command` | Authoring or refactoring a slash command; deciding between command and skill.                                                    |
| `claude-code-plugin`        | Authoring a plugin manifest, marketplace, or plugin directory layout.                                                            |
| `claude-code-hook`          | Configuring lifecycle hooks (`hooks.json`, agent/skill `hooks:` frontmatter).                                                    |
| `claude-code-claude-md`     | Authoring / refactoring / optimizing CLAUDE.md at global, project, or directory scope.                                           |

Each meta-skill ships `references/section-guide.md` that exhaustively documents every frontmatter field, body section, and directory of the artifact it scaffolds — a per-field reference rare in the ecosystem.

### `claude-code-development` — engineering team

| Agent                | Role                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `software-developer` | Writes, refactors, debugs application code. Enforces ~25 universal coding rules + strict comment philosophy.                               |
| `software-architect` | System design, NFRs, ADRs, modernization patterns. Reads-only; emits artifacts the implementing team uses.                                 |
| `code-planner`       | Turns approved spec into ordered tasks with PR sequencing, spikes, AC traceability. Covers the **code-planning function** — not capacity allocation, mentoring, or cross-feature roadmap (those stay human). |
| `code-reviewer`      | Pre-merge review with severity tags + tech-debt scoring. Runs analyzers before opining.                                                    |
| `quality-engineer`   | Test strategy, layers, gates. Risk × ISO 25010 attribute, not coverage %.                                                                  |
| `security-engineer`  | STRIDE threat modeling, OWASP, AuthN/AuthZ, compliance scoping.                                                                            |
| `debugger`           | Read-only RCA + reproduction. Hypothesis-driven; exits at root cause + suggested next step.                                                |
| `data-engineer`      | Schema modeling, evolution, contracts. Stack-agnostic (relational / document / columnar / streaming).                                      |

16 bundled skills (methodology-anchored — Nygard ADR, ISO 29119-3, STRIDE, Kimball, Sadalage expand/contract, Conventional Commits, etc.) + 5 transversal references (evidence levels, code-grounded analysis, risk scoring, tool-surface inventory, destructive-ops).

The team works in **two modes**:

- **Independently**: invoke any agent directly for a single-discipline task. Each one is self-sufficient with its own preloaded methodology.
- **Collaboratively**: chain them via your project's `CLAUDE.md` / `AGENTS.md`. The agents *suggest consults* but never invoke each other — orchestration is yours. This matches Anthropic's [orchestrator-worker multi-agent pattern](https://www.anthropic.com/engineering/multi-agent-research-system).

## Install

```bash
# From a local checkout
claude plugin marketplace add file:///path/to/claude-code-toolkit

# From GitHub
claude plugin marketplace add github:adrian-d-hidalgo/claude-code-toolkit

# Install one or both plugins
claude plugin install claude-code-core@claude-code-toolkit
claude plugin install claude-code-development@claude-code-toolkit
```

Verify:

```bash
claude plugin marketplace list   # marketplace appears
claude plugin list               # plugins listed
/agents                          # claude-code-development:* agents listed
/skills                          # claude-code-*:* skills listed
```

## Validate and evaluate

The core plugin ships validators (no install — pure Python 3 stdlib):

```bash
python3 plugins/claude-code-core/shared/scripts/validate_plugin.py plugins/<plugin> --marketplace .
python3 plugins/claude-code-core/shared/scripts/validate_skill.py <skill-dir>/
python3 plugins/claude-code-core/shared/scripts/validate_agent.py <agent>.md
python3 plugins/claude-code-core/shared/scripts/validate_hooks.py <hooks.json>
```

Activation evals (offline shape check + optional live + LLM-as-judge):

```bash
# Offline corpus shape across a plugin.
python3 scripts/run_activation_evals.py --all plugins/claude-code-core

# Live evaluation against your local `claude` binary, with LLM-as-judge.
python3 scripts/run_activation_evals.py --all plugins/claude-code-development --live --judge

# Single skill / single sub-agent.
python3 scripts/run_activation_evals.py --skill plugins/claude-code-core/skills/claude-code-hook --live --judge
python3 scripts/run_activation_evals.py --agent plugins/claude-code-development/agents/code-planner.md --live --judge
```

Reports auto-write to `.eval-runs/.eval-<scope>-<UTC-timestamp>.json` (gitignored). Skills are gated on routing accuracy; sub-agents are gated on outcome quality (delegation rate is informational — Claude rationally inlines small tasks).

## Platform note (June 2026)

Plugin-installed sub-agents currently cannot access MCP server tools — see [anthropics/claude-code#13605](https://github.com/anthropics/claude-code/issues/13605). This applies to any plugin in this toolkit that ships sub-agents (currently only `claude-code-development`; future plugins may also). When an agent body references MCPs (`mcp__codegraph__*`, `mcp__sentry__*`, etc.), treat that as "prefer if available" guidance for the orchestrating main agent, not for the sub-agent itself. The sub-agents' file-based / bash fallbacks already cover this case.

## Repository layout

```
claude-code-toolkit/
├── .claude-plugin/marketplace.json     # single root manifest, never duplicated per-plugin
├── .eval-runs/                         # gitignored — auto-generated eval reports + logs
├── CLAUDE.md                           # operating instructions for any agent working here
├── scripts/run_activation_evals.py     # eval harness (cross-plugin)
└── plugins/
    ├── claude-code-core/
    │   ├── .claude-plugin/plugin.json
    │   ├── README.md
    │   ├── shared/                     # validators + shared references
    │   └── skills/                     # 6 meta-skills, each with references/, templates/, tests/
    └── claude-code-development/
        ├── .claude-plugin/plugin.json
        ├── README.md
        ├── agents/                     # 8 engineering sub-agents
        ├── references/                 # 5 transversal references (evidence, code-grounded, etc.)
        ├── skills/                     # 16 methodology-anchored skills
        └── tests/                      # activation-eval corpora per agent + per skill
```

`tests/` lives in two places by design:
- `plugins/*/skills/*/tests/activation-evals.json` and `plugins/*/tests/<agent>/activation-evals.json` — the committed test corpus.
- `.eval-runs/` at repo root — the auto-generated reports + live logs. Gitignored.

## Versioning

Per-plugin semver in `plugins/<plugin>/.claude-plugin/plugin.json`:

- **MAJOR** — breaking renames, removed components, incompatible behavior.
- **MINOR** — new components, expanded capabilities.
- **PATCH** — body edits, references updates.

Root `marketplace.json` carries no `version` field (treated as vestigial by Anthropic).

## License

MIT — see `LICENSE`. Each plugin may carry its own license file.
