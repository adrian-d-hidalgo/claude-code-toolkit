# Claude Code Toolkit

A personal marketplace of Claude Code plugins. Each plugin is a self-contained set of skills, sub-agents, slash commands, or hooks aligned with the current official Claude Code conventions (May 2026).

## Plugins

| Plugin                      | What it ships | Description                                                                                                                                                 |
| --------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **claude-code-core**        | 6 meta-skills | Authoring toolkit for Claude Code extensions: scaffold, validate, and audit skills, sub-agents, slash commands, plugins, hooks, and CLAUDE.md memory files. |
| **claude-code-development** | 1 sub-agent   | Opinionated senior `software-developer` agent that enforces Think-Before-Coding, Simplicity-First, Surgical-Changes, and Goal-Driven Execution.             |

### claude-code-core — meta-skills

| Skill                       | Triggers on                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `claude-code-skill`         | Authoring or refactoring a Claude Code skill (`SKILL.md`, references, templates, scripts, tests).                                |
| `claude-code-sub-agent`     | Authoring or refactoring a sub-agent (`.claude/agents/*.md`).                                                                    |
| `claude-code-slash-command` | Authoring or refactoring a slash command (`.claude/commands/*.md`); deciding between command and skill.                          |
| `claude-code-plugin`        | Authoring a plugin manifest, marketplace, or plugin directory layout.                                                            |
| `claude-code-hook`          | Configuring lifecycle hooks (`hooks.json`, agent/skill `hooks:` frontmatter).                                                    |
| `claude-code-claude-md`     | Authoring / refactoring / optimizing CLAUDE.md (the agent's persistent instruction file) at global, project, or directory scope. |

Each skill ships a `references/section-guide.md` that exhaustively documents every frontmatter field, body section, and directory of the artifact it scaffolds.

### claude-code-development — agents

| Agent                | Triggers on                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------- |
| `software-developer` | Whenever the user asks to write, modify, refactor, debug, implement, or fix code in any language or framework. |

## Install

### Add the marketplace

```bash
# Local checkout
claude plugin marketplace add file:///path/to/claude-code-toolkit

# From GitHub
claude plugin marketplace add github:adrian-d-hidalgo/claude-code-toolkit
```

### Install plugins

```bash
claude plugin install claude-code-core@claude-code-toolkit
claude plugin install claude-code-development@claude-code-toolkit
```

### Verify

```bash
claude plugin marketplace list   # marketplace appears
claude plugin list               # both plugins appear
/agents                          # claude-code-development:software-developer listed
/skills                          # claude-code-core:claude-code-skill (etc.) listed
```

## Validate and evaluate

The core plugin ships validators and an activation-evaluation harness.

```bash
# Validate every plugin manifest.
python3 plugins/claude-code-core/shared/scripts/validate_plugin.py plugins/claude-code-core --marketplace .
python3 plugins/claude-code-core/shared/scripts/validate_plugin.py plugins/claude-code-development

# Validate every meta-skill body.
for d in plugins/claude-code-core/skills/*/; do
  python3 plugins/claude-code-core/shared/scripts/validate_skill.py "$d"
done

# Validate the sub-agent.
python3 plugins/claude-code-core/shared/scripts/validate_agent.py \
  plugins/claude-code-development/agents/software-developer.md

# Run activation evals (offline corpus shape check across the plugin).
python3 scripts/run_activation_evals.py --all plugins/claude-code-core

# Live skill evaluation with LLM-as-judge. Auto-writes a report to
# .eval-runs/.eval-plugin-claude-code-core-<UTC-timestamp>.json (filename describes scope).
python3 scripts/run_activation_evals.py \
  --all plugins/claude-code-core --live --judge

# Single skill (auto-report .eval-runs/.eval-skill-<name>-<timestamp>.json).
python3 scripts/run_activation_evals.py \
  --skill plugins/claude-code-core/skills/claude-code-hook --live --judge

# Sub-agent (auto-report .eval-runs/.eval-agent-<name>-<timestamp>.json; gated by judge outcome).
python3 scripts/run_activation_evals.py \
  --agent plugins/claude-code-development/agents/software-developer.md --live --judge

# Override the report path explicitly if needed.
python3 scripts/run_activation_evals.py \
  --all plugins/claude-code-core --live --judge \
  --report-json .eval-runs/baseline-pre-iter4.json
```

## Repository layout

```
claude-code-toolkit/
├── .claude-plugin/
│   └── marketplace.json
├── .eval-runs/                            # gitignored — auto-generated eval reports + logs
└── plugins/
    ├── claude-code-core/
    │   ├── .claude-plugin/plugin.json
    │   ├── README.md
    │   ├── shared/                        # shared protocols, scripts, references
    │   └── skills/
    │       ├── claude-code-skill/
    │       │   └── tests/                 # canonical activation-evals.json (committed)
    │       ├── claude-code-sub-agent/
    │       ├── claude-code-slash-command/
    │       ├── claude-code-plugin/
    │       ├── claude-code-hook/
    │       └── claude-code-claude-md/
    └── claude-code-development/
        ├── .claude-plugin/plugin.json
        ├── README.md
        └── agents/
            └── software-developer.md
```

Two different `tests/` concerns deliberately live in different places:

- **`plugins/*/skills/*/tests/activation-evals.json`** — the actual test corpus per skill. Tracked in git.
- **`.eval-runs/`** at repo root — the auto-generated reports and live logs from running the harness. Gitignored, regenerated on every run.

## Versioning

Per-plugin semver. `plugins/<plugin>/.claude-plugin/plugin.json` `version`:

- MAJOR — breaking renames, removed components.
- MINOR — new components, expanded capabilities.
- PATCH — body edits, references updates.

The root `marketplace.json` carries no `version` (treated as vestigial by Anthropic).

## License

MIT — see `LICENSE`. Each plugin may carry its own license file.
