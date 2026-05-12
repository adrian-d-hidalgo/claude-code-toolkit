---
name: claude-code-plugin
description: Use when the user wants to create, scaffold, set up, design, refactor, improve, validate, audit, document, version, bump, release, or distribute a Claude Code plugin — including `.claude-plugin/plugin.json`, `marketplace.json`, plugin directory layout, plugin READMEs, semver bumps, or marketplace publication. Also fires on "why won't my plugin install" troubleshooting. Do not use for authoring individual skills, sub-agents, slash commands, or hook entries inside a plugin; those component types have their own meta-skills in this plugin.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash(python3 *)
  - Bash(bash *)
---

# claude-code-plugin

End-to-end authoring toolkit for Claude Code plugins. Covers creating new plugins, refactoring existing ones, validating manifests, and building marketplaces that distribute them.

## What this skill does

| Intent | Mode |
|---|---|
| "create / scaffold / build a new plugin" | **Create** — generate `.claude-plugin/plugin.json` + directory layout + README. |
| "create a marketplace to distribute plugins" | **Marketplace** — generate `.claude-plugin/marketplace.json` and plugin entries. |
| "refactor / improve an existing plugin's structure" | **Refactor** — reorganize components, audit manifest, namespace correctly. |
| "validate / lint / check this plugin" | **Validate** — schema validation against current Anthropic + community schemas. |
| "audit / review the plugin" | **Audit** — security, namespacing, README completeness, version hygiene. |

## Authoritative field reference

`references/section-guide.md` exhaustively documents every field of both `plugin.json` and `marketplace.json`, plus the recommended directory layout. Read it before authoring or editing any manifest.

## Mode: Create (single plugin)

1. **Scaffold** the plugin:
   ```bash
   bash plugins/claude-code-core/skills/claude-code-plugin/scripts/init_plugin.sh <plugin-name>
   ```
   Creates:
   ```
   <plugin-name>/
   ├── .claude-plugin/plugin.json
   ├── README.md
   ├── skills/        (optional — remove if unused)
   ├── agents/        (optional — remove if unused)
   ├── commands/      (optional — remove if unused)
   └── hooks/         (optional — auto-loaded when present)
   ```

2. **Author `plugin.json`** field-by-field using `references/section-guide.md`. Only `name` is strictly required; in practice always set `version`, `description`, `author`.

3. **Author `README.md`** following `assets/templates/plugin-readme-template.md`:
   - One-sentence purpose.
   - What it ships (table of components).
   - Install command.
   - Required env vars / MCP config (if any).

4. **Validate** before sign-off (see Validate mode).

## Mode: Marketplace

1. **Scaffold** the marketplace:
   ```bash
   bash plugins/claude-code-core/skills/claude-code-plugin/scripts/init_marketplace.sh
   ```
   Creates `.claude-plugin/marketplace.json` at the repo root.

2. **Author** following `references/marketplace.md`:
   - `$schema: https://json.schemastore.org/claude-code-marketplace.json` (do NOT use any `anthropic.com` URL — it does not exist for this schema).
   - `name`, `description`, `owner{name, email?}`.
   - `plugins[]` — one entry per plugin with `name`, `description`, `source` (relative path), `category`, `tags`.

3. **Validate** the marketplace JSON.

## Mode: Refactor

When an existing plugin has:

- Components inside `.claude-plugin/` instead of at the plugin root → move to root.
- Duplicate `hooks/hooks.json` declaration in `plugin.json` → remove (auto-loaded; declaring it again triggers a duplicate-detection error).
- Stale references to removed sibling components → strip.
- `description` field that explains internals → rewrite as user-facing capability summary.

Apply `references/plugin-best-practices.md` and `references/marketplace-best-practices.md`.

## Mode: Validate

Validator (uses community JSON schemas from `hesreallyhim/claude-code-json-schema`):

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_plugin.py <plugin-root>
```

Use `references/validation.md` for the human checklist.

## Mode: Audit

1. **Security** — `references/security-checklist.md`. Verify hooks don't `chmod 777`, scripts don't pipe-to-bash, no real credentials in `.env.example`.
2. **Namespacing** — every component is prefixed automatically via the plugin's `name`. Confirm no inter-plugin collisions in `/agents` and `/skills`.
3. **README** — table of components, install command, env requirements.
4. **Version hygiene** — semver. Bump MAJOR for breaking renames, MINOR for new components, PATCH for body edits.

## Scope & boundaries — what this skill is NOT for

This skill authors plugins and marketplaces. It does not author:

- **Skills** — use the skill meta-skill.
- **Sub-agents** — use the sub-agent meta-skill.
- **Slash commands** — use the slash-command meta-skill.
- **Hook entries themselves** — use the hook meta-skill.
- **Application source code** — out of scope entirely.

## Reference index

Local:
- `references/section-guide.md` — every plugin.json + marketplace.json field, exhaustively.
- `references/CURRENT-DOCS-INDEX.md` — upstream doc snapshot.
- `references/anti-patterns.md` — authoring mistakes.
- `references/plugin-schema.md` — schema specifics + validators.
- `references/plugin-best-practices.md` — distribution-grade plugin guidance.
- `references/marketplace.md` — marketplace authoring.
- `references/marketplace-best-practices.md` — marketplace quality bar.
- `references/individual-plugin.md` — single-plugin distribution.
- `references/management.md` — lifecycle: install, update, uninstall.
- `references/validation.md` — validation workflow.
- `references/security-checklist.md` — security review.
- `references/documentation.md` — README conventions.
- `references/plugin-examples.md` — worked examples.
- `references/troubleshooting-guide.md` — common failure modes.
- `references/analysis.md` — audit workflow.

Templates:
- `assets/templates/plugin-json-template.json`
- `assets/templates/marketplace-json-template.json`
- `assets/templates/plugin-readme-template.md`
- `assets/templates/plugin-structure-individual.md`
- `assets/templates/marketplace-structure.md`

Scripts:
- `scripts/init_plugin.sh` — scaffold a new plugin.
- `scripts/init_marketplace.sh` — scaffold a marketplace.
