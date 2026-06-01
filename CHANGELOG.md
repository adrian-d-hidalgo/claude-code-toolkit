# Changelog

All notable changes to this toolkit. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html) per plugin.

## [Unreleased]

(empty)

## [2.0.0] — claude-code-development — 2026-06-01

### Changed (BREAKING)

- Rename `tech-lead` → `code-planner` (scope reframed as a function — code-planning — not a real-world role with broader responsibilities). Update any user `CLAUDE.md`/`AGENTS.md`, scripts, or test corpora referencing the old name. Agent behavior is unchanged (same preloaded skills, same workflow). "Tech Lead" labels in shared templates (RACI, owners, DoD) renamed to "Code Planner" for consistency.

### Added

- `debugger` sub-agent — read-only RCA with hypothesis-driven investigation, git-timeline-first, observability-MCP-aware tool-surface inventory; exits at root cause + minimal reproduction.
- `data-engineer` sub-agent — stack-agnostic data modeling (Kimball / Codd / access-pattern-first), schema evolution with expand/contract and consumer-driven contracts; read-only design and review.
- `coding-practices` skill — ~25 tech-agnostic coding rules across 7 categories + strict comment philosophy (4 taxative exceptions; delete-on-sight list). Source of truth for `software-developer` and any code-writing agent.
- `data-modeling` skill — access-pattern-first design, normalization (Codd 1NF–BCNF), dimensional modeling (Kimball: business process → grain → dimensions → facts), workload decision tree, storage-engine-agnostic.
- `schema-evolution` skill — expand/contract playbook (Sadalage 2006), idempotent backfills, consumer-driven evolution, rollback per phase, data-contract spec.
- `external-research` skill — source-priority pyramid (official docs > release notes > issue tracker > RFCs > comparative analyses > forums), triangulation, `[Verified-external]` citation discipline.
- `references/` transversal layer: `evidence-rule.md`, `code-grounded-analysis.md`, `risk-scoring.md`, `tool-surface-inventory.md`, `destructive-operations.md` — shared across all agents.
- `[Verified-external]` as 4th evidence level in `references/evidence-rule.md` for sources outside the repo (docs, RFCs, vendor advisories) with URL + access-date + version discipline.
- Object-level authorization (OWASP API1 / BOLA) explicit coverage in `security-engineer`'s application security baseline.
- `git-commit` skill substantially expanded: breaking-change detection from staged diff signals, atomicity smell detection, scope clustering with parent/child collapse and cardinality cap, trailer detection at ≥70% threshold, dominant body-language detection, PR-title-vs-commit-subject alignment for squash-merge repos, AI-attribution hard rule, gitmoji ban. New references: `active-diff-analysis.md`, `issue-linkage.md`, `non-goals.md`, `trailers.md`.

### Changed

- `software-developer` refactored to preload `coding-practices` skill instead of inlining ~25 rules + comment philosophy; `model: sonnet` + `effort: high` pinned per the new model-effort tier matrix.
- All 8 agents decoupled from sibling agent names in scope/frontier sections; replaced with function labels (architecture, code-planning, data-engineering, quality-engineering, security-engineering) for LEGO portability when an agent is installed standalone.
- `code-reviewer` body: removed misleading claim of `Edit` availability (frontmatter does not grant Edit; anti-pattern says "review suggests, never applies").
- All 8 agents now share a uniform set of transversal practices (evidence levels, code-grounded analysis, tool-surface inventory, risk scoring, destructive-ops protocol, no-silent-drift, output-shape-varies, LEGO discipline) via the new `references/` layer.
- Root `README.md` rewritten for humans (current 8-agent inventory, install/verify, platform note for the MCP plugin sub-agent bug anthropics/claude-code#13605); root `CLAUDE.md` rewritten for agents (meta-skill routing table, security invariants in primacy slot, scoped strictly to working on the project).

### Removed

- `Edit` tool from `security-engineer` frontmatter — agent designs and recommends; does not implement mitigation code (matching its own anti-pattern).

## [1.2.0] — claude-code-core — 2026-06-01

### Added

- `claude-code-sub-agent/references/model-effort-matrix.md` — cognitive-load tier rubric (A strategic / B heavy analysis / C intelligence-sensitive execution / D mechanical) with `model:` + `effort:` pairing decision tree, effort-level compatibility per model, and evidence from Anthropic docs + benchmark data. Authoritative source for picking the right model and effort when authoring or auditing a sub-agent.
- New anti-patterns in `claude-code-sub-agent/references/anti-patterns.md`: no tool-surface inventory before opining, fabricating MCP / vendor tool names not registered in session, defaulting `effort:` to `max`, pairing `effort: xhigh` with `model: inherit` or `model: sonnet`, demoting intelligence-sensitive execution to `effort: medium`.
- New anti-patterns in `claude-code-skill/references/anti-patterns.md`.
- `claude-code-sub-agent/references/improvement-workflows.md` Sub-Workflow 2F for model+effort auditing.

### Changed

- `claude-code-sub-agent/SKILL.md` references the new model-effort-matrix.
- `claude-code-sub-agent/references/section-guide.md` and `validation-checklist.md` updated with model + effort pairing checks.
- `claude-code-slash-command/scripts/init_command.py` rewritten — cleaner implementation aligned with `section-guide.md` and `assets/templates/` as source of truth.
- `claude-code-slash-command/assets/templates/command-template.md` and `minimal-template.md` trimmed.
- `shared/scripts/validate_command.py` rewritten — cleaner implementation aligned with `section-guide.md` and `anti-patterns.md` as source of truth.

## [1.3.0] — claude-code-development — 2026-05-18

### Added

- `tech-lead` sub-agent — explicit intake-triage protocol (inputs check, scope-size verdict, task-too-big triggers), developer-actionable sub-task contract, Direct-Value-vs-Enabler classification per SAFe 6.0, bounded opportunistic-refactor discipline for code-grounded planning. (Renamed to `code-planner` in 2.0.0.)
- 7 methodology-anchored skills: `work-splitting` (Lawrence patterns, Cohn SPIDR, Adzic Hamburger Method, Cockburn Elephant Carpaccio, Wake INVEST), `bug-analysis` (Toyoda 5 Whys, Ishikawa fishbone, Bell Labs FTA, Allspaw blameless postmortem), `threat-model` (Howard & Lipner STRIDE, UcedaVelez PASTA, Shostack trust boundaries), `tech-spec` (migrated from user level; Brown C4, arc42, IEEE 1016), `debugging-protocol` (Zeller hypothesis-driven, Majors observability-first, git-bisect, delta debugging), `code-audit` (Letouzey SQALE, Fowler code smells, Conventional Comments), `code-review-checklist` (Google Engineering Practices, Wiegers, OWASP code-review-guide).
- Shared `references/evidence-rule.md` (3 evidence levels) referenced from every agent's transversal section.
- Activation-eval corpora for the 7 new skills (19–21 cases each across positive, negative, edge); 6 agent corpora gained cases for code-grounded planning, intake triage, output-shape-varies, and no-silent-drift.

### Changed

- All 6 sub-agents bake in transversal practices: evidence levels, code-grounded analysis with real-name resolution, output-shape-varies, no-silent-drift, outputs-as-content, no-agent-invokes-another.
- `development-plan`, `adr`, `test-plan`, `mermaid` skills reframed: outputs are content the caller persists wherever — drop `Status:` fields, drop imposed filenames (`plan.md`, `tasks.md`), drop `Write`/`Edit` tool grants.
- Plugin description, README, marketplace tags refreshed.

## [1.1.0] — claude-code-core — 2026-05-16

### Changed

- Refreshed all 6 meta-skills against Claude Code v2.1.140+ docs.
- `claude-code-hook` meta-skill section-guide split into focused companion references to keep SKILL.md readable.

## [1.1.0] — claude-code-development — 2026-05-16

### Added

- `software-architect`, `code-reviewer`, `quality-engineer`, `security-engineer` sub-agents — each with single-responsibility scope and least-privilege tooling, declining work outside its role.
- 4 methodology-anchored skills bundled in the plugin: `adr` (Nygard), `test-plan` (ISO 29119-3), `git-commit` (Conventional Commits 1.0.0), `mermaid`.
- Activation-eval corpus per new component covering positive, negative, edge routing.

### Changed

- `software-developer` gained a Large-change protocol for migrations and large refactors needing batch-level discipline.
- Skill preload wired onto agents that use a skill on every invocation; the rest left as runtime discovery.
- Plugin README rewritten to describe the full team and skills; marketplace description and tags resynced.

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
