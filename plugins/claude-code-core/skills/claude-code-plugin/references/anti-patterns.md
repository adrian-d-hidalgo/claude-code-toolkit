# Anti-patterns — plugin & marketplace authoring

## Components inside `.claude-plugin/`

**Pattern**: `<plugin-root>/.claude-plugin/skills/my-skill/SKILL.md`.

**Why wrong**: Only `plugin.json` belongs in `.claude-plugin/`. Components placed there won't be discovered.

**Fix**: Move to `<plugin-root>/skills/my-skill/SKILL.md`.

## Duplicate `hooks/hooks.json` declaration

**Pattern**: `plugin.json` lists `"hooks": ["hooks/hooks.json"]`.

**Why wrong**: `hooks/hooks.json` at the plugin root is **auto-loaded** in Claude Code 2.1+. Declaring it again raises a duplicate-detection error.

**Fix**: Remove the redundant entry from `plugin.json`. Only declare non-default paths.

## `repository` as an object

**Pattern**: `"repository": {"type": "git", "url": "https://github.com/me/x"}`.

**Why wrong**: Claude Code expects `repository` to be a **string URL**, not the npm-style object.

**Fix**: `"repository": "https://github.com/me/x"`.

## Wrong marketplace `$schema` URL

**Pattern**: `"$schema": "https://anthropic.com/schemas/marketplace.json"`.

**Why wrong**: That URL does not exist. Some community blog posts circulate it incorrectly.

**Fix**: `"$schema": "https://json.schemastore.org/claude-code-marketplace.json"`.

## Version suffix in name

**Pattern**: `"name": "my-plugin-v2"`.

**Why wrong**: Version belongs in the `version` field. A suffix in the name pollutes the namespace and ages badly.

**Fix**: `"name": "my-plugin"`, `"version": "2.0.0"`.

## Counts and disambiguation in `description`

**Pattern**: `"description": "Contains 5 skills and 2 agents. Don't confuse with the plugin-helpers plugin."`.

**Why wrong**: The marketplace UI shows the description as discovery copy. Counts age; cross-plugin disambiguation belongs in the README.

**Fix**: `"description": "Meta-skills for authoring Claude Code extensions: skills, sub-agents, slash commands, plugins, and hooks."`.

## Bumping marketplace `version`

**Pattern**: Treating `marketplace.json` `version` as the authoritative semver.

**Why wrong**: Anthropic itself never bumps the marketplace `version`. Per-plugin `version` in each `plugin.json` is what installers use.

**Fix**: Bump each plugin's `plugin.json` `version`. Treat the marketplace `version` as vestigial.

## Real credentials in `.env.example`

**Pattern**: Plugin ships `.env.example` with `OPENAI_API_KEY=sk-real-key-here`.

**Why wrong**: Anyone who installs the plugin gets a real key.

**Fix**: Use obvious placeholders: `OPENAI_API_KEY=sk-your-key-here` or `OPENAI_API_KEY=...`.

## Empty placeholder component directories shipped

**Pattern**: Plugin contains empty `skills/`, `agents/`, `commands/`, `hooks/` directories.

**Why wrong**: Clutters the repo; suggests components that don't exist; some discovery walks fail noisily on empties.

**Fix**: Delete directories that don't contain at least one real component.

## Marketplace entry `description` that names other entries

**Pattern**: `"description": "Use this plugin instead of the basic-tools plugin for advanced workflows."`

**Why wrong**: Couples discovery copy to specific peers. Bad UX.

**Fix**: Describe the plugin on its own merits.

## README that lists no components

**Pattern**: README.md says "A plugin for Claude Code" and nothing else.

**Why wrong**: Users can't discover what the plugin ships without browsing the source tree.

**Fix**: Include a components table: name | type | one-line purpose | how to invoke.

## Hardcoded paths in shipped scripts

**Pattern**: Plugin script does `python3 /home/user/.claude/skills/my-skill/scripts/validate.py`.

**Why wrong**: Breaks for every other installation.

**Fix**: Use `plugins/claude-code-core/skills/<name>/scripts/validate.py`.

## Skipping semver discipline

**Pattern**: Version bumped from `1.0.0` directly to `1.0.5` after a breaking rename.

**Why wrong**: Installers and dependency declarations expect MAJOR bumps for breaking changes.

**Fix**: Breaking change → MAJOR bump (`2.0.0`). New component without breaks → MINOR (`1.1.0`). Body edits → PATCH (`1.0.1`).
