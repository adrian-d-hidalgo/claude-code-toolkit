# claude-code-core

Meta-skills for authoring Claude Code extensions. Each skill scaffolds, refactors, validates, and audits one type of component, aligned with the current official conventions (May 2026).

## What it ships

| Skill | Triggers on |
|---|---|
| [`claude-code-skill`](./skills/claude-code-skill/SKILL.md) | Authoring or refactoring a Claude Code skill. |
| [`claude-code-sub-agent`](./skills/claude-code-sub-agent/SKILL.md) | Authoring or refactoring a sub-agent. |
| [`claude-code-slash-command`](./skills/claude-code-slash-command/SKILL.md) | Authoring slash commands or deciding command-vs-skill. |
| [`claude-code-plugin`](./skills/claude-code-plugin/SKILL.md) | Authoring plugin manifests and marketplaces. |
| [`claude-code-hook`](./skills/claude-code-hook/SKILL.md) | Configuring lifecycle hooks. |
| [`claude-code-claude-md`](./skills/claude-code-claude-md/SKILL.md) | Authoring CLAUDE.md memory files at any scope. |

Each skill includes:

- A focused `SKILL.md` (≤500 lines) — modes, workflow, scope.
- `references/section-guide.md` — exhaustive per-field reference for the component the skill scaffolds: purpose, required/optional, allowed values, what to put in, what NOT to put in, good/bad examples, when to set vs leave default.
- `references/CURRENT-DOCS-INDEX.md` — snapshot of the upstream Anthropic docs the skill mirrors.
- `references/anti-patterns.md` — common authoring mistakes.
- `assets/templates/` — commented templates for every artifact.
- `scripts/` — `init_*.py|sh` scaffolders and `validate_*.py` validators.
- `tests/activation-evals.json` — canonical positive + negative + edge case corpus (consumed by the eval runner).
- `tests/activation-tests.md` — short human-readable companion that points at the JSON corpus.

## Install

```bash
claude plugin marketplace add github:adrian-d-hidalgo/claude-code-toolkit
# Or, from a local checkout:
# claude plugin marketplace add file:///path/to/claude-code-toolkit
claude plugin install claude-code-core@claude-code-toolkit
```

After installation, each skill appears as `claude-code-core:<skill-name>` in `/skills` and auto-activates on matching user intent.

## Shared resources

`shared/` holds resources cross-referenced by multiple skills. Reference from a skill via `${CLAUDE_PLUGIN_ROOT}/shared/...`.

```
shared/
├── protocols/
│   └── skills/
│       ├── activation-protocol.md
│       └── validation-protocol.md
├── references/
│   └── skills/
│       ├── activation-examples.md
│       ├── best-practices-comprehensive.md
│       ├── security-checklist.md
│       ├── testing-guide.md
│       └── troubleshooting.md
└── scripts/                              # plugin-internal validators
    ├── validate_agent.py
    ├── validate_command.py
    ├── validate_skill.py
    ├── validate_plugin.py
    └── validate_hooks.py
```

The activation-eval runner lives at the repo root (`scripts/run_activation_evals.py`), not inside the plugin — it is dev / CI tooling that operates across all plugins, not user-facing tooling the plugin should ship.

## Validation tools

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_skill.py <path>/
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_agent.py <path>.md
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_command.py <path>.md
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_plugin.py <plugin-root> [--marketplace <marketplace-root>]
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_hooks.py <path-to-hooks.json>
```

## Activation evaluation

Every meta-skill ships a `tests/activation-evals.json` corpus and is exercised through `scripts/run_activation_evals.py`:

```bash
# Offline corpus shape check across every skill in this plugin.
python3 scripts/run_activation_evals.py --all ${CLAUDE_PLUGIN_ROOT}

# Live evaluation against the local `claude` binary (skills + any sub-agent corpora the plugin ships).
python3 scripts/run_activation_evals.py --all ${CLAUDE_PLUGIN_ROOT} --live --judge

# Single skill only.
python3 scripts/run_activation_evals.py \
  --skill plugins/claude-code-core/skills/claude-code-hook --live --judge

# Single sub-agent (target may be in another plugin).
python3 scripts/run_activation_evals.py \
  --agent <path>/agents/<name>.md --live --judge
```

The harness reports two independent metrics per case:

- **Routing accuracy** — did Claude pick the right tool / skill / sub-agent? Captured via stream-json parsing of every `tool_use` event (Skill, Agent, plus domain-path tool_uses for skills).
- **Outcome quality** (with `--judge`) — separate `claude --print` invocation acts as judge; structured rubric of `understood_intent`, `action_appropriate`, `meta_skill_was_correct_route`.

For **skills** the pass gate is routing accuracy (target ≥ 0.90). For **sub-agents** the pass gate is the judge outcome — sub-agent delegation in headless `--print` mode is conservative by design (Claude often handles small coding tasks inline), so routing is reported as informational with a separate `delegation_rate` field.

The plugin discovers corpora at:
- `skills/*/tests/activation-evals.json` (skill corpora, `kind: "skill"`)
- `tests/*/activation-evals.json` (sub-agent corpora, `kind: "subagent"`)

## Architectural notes

Three patterns in this plugin are **ahead of the current official conventions** (May 2026). They work today but carry maintenance risk if Anthropic changes the plugin loader:

1. **`shared/` directory.** Anthropic's `plugin-dev` plugin keeps each skill fully self-contained — no `shared/`. We centralise validators and cross-skill references here for DRY at the cost of being slightly off the canonical pattern. If the official plugin loader ever rejects non-default plugin subdirectories, the `shared/` layout will need to move into the skill that uses it most (claude-code-skill is the natural home).
2. **`references/section-guide.md`** — a per-field exhaustive reference for every frontmatter field of the component the meta-skill scaffolds. This pattern does not exist in official repos as of May 2026 but fills the gap identified in [anthropics/skills issue #37](https://github.com/anthropics/skills/issues/37). It requires active maintenance when Anthropic changes the schema; the companion `CURRENT-DOCS-INDEX.md` is dated so drift is visible.
3. **`references/CURRENT-DOCS-INDEX.md`** — a dated snapshot pointing at the upstream Anthropic docs each meta-skill mirrors. Novel; no precedent in the ecosystem. Refresh the date whenever the skill is verified against current upstream docs.

## Troubleshooting

**A skill is not activating** — verify it appears under `/skills`, then check that the description's trigger phrases match what the user actually says. Inspect with `claude --debug`.

**A plugin won't load** — validate `plugin.json` and confirm no duplicate `hooks/hooks.json` declaration; hooks are auto-loaded in Claude Code 2.1+.

## Links

- [Marketplace README](../../README.md)
- [Claude Code documentation](https://code.claude.com/docs)

## License

MIT — see [LICENSE](../../LICENSE).
