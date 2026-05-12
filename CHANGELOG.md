# Changelog

All notable changes to this toolkit. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) per plugin.

## [Unreleased]

Pre-publication; both plugins start at `1.0.0` once published. Subsequent changes will be tracked here per plugin.

## [1.0.1] — claude-code-core — 2026-05-12

### Fixed

- `shared/scripts/validate_skill.py`: folded-scalar descriptions (`description: >`) are now measured correctly via `yaml.safe_load` (was reporting 71 chars on 430-char descriptions when PyYAML was available; added a fallback parser that folds block scalars per the YAML spec when PyYAML is absent).
- `shared/scripts/validate_skill.py`: `allowed-tools` patterns like `Bash(git status:*)` and `mcp__server__tool` no longer raise false-positive "potentially invalid" warnings (added `_base_tool_name` + `_is_valid_tool` helpers and `MCP_TOOL_PATTERN`).
- `shared/scripts/validate_skill.py`: file-existence check now skips references prefixed with `${CLAUDE_PLUGIN_ROOT}/` (or any `${VAR}/shared/`), and resolves `assets/templates/foo.md` against `assets/templates/` instead of falling through to `references/` when the filename lacks the substring "template".
- `shared/scripts/validate_skill.py`: third-person check now excises double-quoted spans and backtick code spans before scanning, so quoted user-prompt examples like `"how do I make Claude follow our conventions?"` no longer trigger a false-positive "should use third person" warning.
- `claude-code-skill` meta-skill: documentation now consistently points at `tests/activation-evals.json` (canonical, consumed by the eval runner) instead of `tests/activation-tests.md` (which was the old artifact name).
- `claude-code-skill/scripts/init_skill.py`: scaffolds a real `tests/activation-evals.json` skeleton (1 positive + 1 negative + 1 edge) and no longer generates TODO-only `example-*.py`, `example-guide.md`, `example-template.md` stubs.
- `.claude-plugin/marketplace.json`: `claude-code-core` description now says "latest official conventions" to match its own `plugin.json` (was "current").

### Added

- `claude-code-skill/references/routing-detection.md`: explains how `run_activation_evals.py` detects routing via two signals (`Skill(<name>)` tool_use OR `DOMAIN_PATTERNS` path/command match), with a decision tree on when a skill needs an entry. Cross-referenced from SKILL.md Mode: Create step 6 and from `anti-patterns.md`.
- `claude-code-skill/assets/templates/activation-evals-template.json`: canonical eval-corpus skeleton (5 positive + 5 negative + 3 edge placeholders) replacing the old Markdown test-suite template.
- `claude-code-hook/references/`: `best-practices.md`, `security-checklist.md`, `validation-checklist.md`, `troubleshooting.md` — production-grade docs that were previously referenced from SKILL.md but did not exist.
- `claude-code-hook/assets/templates/`: `hooks-json-template.json` (annotated, all 10 lifecycle events), `hook-script-template.sh` (with `set -euo pipefail` + `jq` stdin parsing), `hook-script-template.py` (stdin JSON parsing + exit code conventions).
- `claude-code-hook/SKILL.md`: example hooks under `assets/examples/` (`code-formatter-hook.json`, `file-protection-hook.json`) are now listed explicitly in the resource index.
- `claude-code-plugin/assets/templates/marketplace-json-template.json`: now includes `$schema`, root-level `description`, `owner.url`, and per-plugin `category`/`tags` to match the canonical marketplace shape.

### Removed

- `claude-code-slash-command/scripts/validate_command.py` and `claude-code-sub-agent/scripts/validate_agent.py`: redundant per-skill copies of shared validators (slash-command was an exact duplicate; sub-agent had drifted). SKILL.md resource indices updated.
- `claude-code-hook/assets/templates/pre-tool-use-hook-template.json` and `post-tool-use-hook-template.json`: redundant with the new `hooks-json-template.json` that covers all 10 lifecycle events.
- `claude-code-skill/assets/templates/test-suite-template.md`: replaced by `activation-evals-template.json` (canonical JSON corpus).
- `claude-code-slash-command/` and `claude-code-plugin/`: 5 TODO-only scaffolding stubs (`example-template.md`, `example-guide.md`, `example.py`) that `init_skill.py` was generating for every new skill and that nobody ever filled in.

## [1.0.1] — claude-code-development — 2026-05-12

### Changed

- Version bump aligned with `claude-code-core@1.0.1`. No functional changes to the `software-developer` sub-agent body; this release captures Markdown formatting passes across `references/`, `assets/templates/`, and `agents/software-developer.md` from the toolkit-wide doc-quality pass.

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
