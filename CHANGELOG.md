# Changelog

All notable changes to this toolkit. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) per plugin.

## [Unreleased]

Pre-publication; both plugins start at `1.0.0` once published. Subsequent changes will be tracked here per plugin.

## [1.0.0] — claude-code-core — 2026-05-12

First release.

### Components
- `claude-code-skill` — author / refactor / validate / audit Claude Code skills.
- `claude-code-sub-agent` — author / refactor / validate / audit sub-agents.
- `claude-code-slash-command` — author slash commands and decide command-vs-skill.
- `claude-code-plugin` — author plugin manifests and marketplaces.
- `claude-code-hook` — configure lifecycle hooks.
- `claude-code-claude-md` — author CLAUDE.md memory files at global, project, or directory scope.

### Each skill ships
- `SKILL.md` body in imperative voice, rule + reason + (optional) exception format. Generic negative scope inline in `description`. No all-caps directives.
- `references/section-guide.md` exhaustively documenting every frontmatter field and directory.
- `references/CURRENT-DOCS-INDEX.md` dated snapshot of upstream Anthropic docs.
- `references/anti-patterns.md` with common authoring mistakes + fixes.
- `assets/templates/` with commented placeholders.
- `tests/activation-evals.json` corpus (positive + negative + edge cases).

### Shared tooling
- `shared/scripts/validate_skill.py`, `validate_agent.py`, `validate_command.py`, `validate_plugin.py`, `validate_hooks.py` — per-component-type linters.
- `scripts/run_activation_evals.py` — activation eval runner with LLM-as-judge.
- `shared/scripts/` validators run as part of every meta-skill workflow.

## [1.0.0] — claude-code-development — 2026-05-12

First release.

### Components
- `software-developer` sub-agent encoding 4 core rules (Think-Before-Coding, Simplicity-First, Surgical-Changes, Goal-Driven Execution), 15 tech-agnostic engineering rules, and 12 comment-philosophy rules. All in imperative voice; rule + reason + exception format with citations to authoritative sources (Software Engineering at Google, SRE book, Pragmatic Programmer, Clean Code, Linux Kernel Coding Style, Rust API Guidelines, 12factor.net, Conventional Commits, Tanya Reilly's Staff Engineer's Path, Addy Osmani's 2026 LLM coding workflow).

### Evaluation
- `tests/software-developer/activation-evals.json` corpus integrated into the eval harness; gated by judge outcome (not routing — sub-agent delegation is conservative by design in headless `--print` mode).
