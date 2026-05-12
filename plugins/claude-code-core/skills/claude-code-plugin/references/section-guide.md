# Plugin & Marketplace Section Guide

Authoritative per-field reference for `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and the plugin directory layout.

Mirrors the official docs at <https://code.claude.com/docs/en/plugins-reference> and <https://code.claude.com/docs/en/plugin-marketplaces>. Snapshot date: see `CURRENT-DOCS-INDEX.md`.

---

## Part A — `plugin.json` Fields

Lives at `<plugin-root>/.claude-plugin/plugin.json`. Only `name` is required.

### `name`

- **Purpose** — Plugin identifier. **Sets the namespace prefix** for every component (`<plugin-name>:<component-name>` in `/agents`, `/skills`).
- **Required?** — **Yes.**
- **Allowed values** — Kebab-case. Lowercase letters, digits, hyphens.
- **What to put in it** — A stable, descriptive name. Examples: `claude-code-core`, `claude-code-development`.
- **What NOT to put in it** — Spaces, uppercase, underscores, version suffixes (`my-plugin-v2`).
- **When to change** — Almost never. Renaming a plugin is a MAJOR version bump and breaks installations.

### `version`

- **Purpose** — Semver version of the plugin.
- **Required?** — Optional but strongly recommended.
- **Allowed values** — Semver string: `MAJOR.MINOR.PATCH`.
- **What to put in it** — Start at `1.0.0` for a stable release, or `0.x.y` for pre-release. Bump MAJOR for breaking changes, MINOR for new components, PATCH for fixes / body edits.
- **What NOT to put in it** — `latest`, dates, prose.

### `description`

- **Purpose** — User-facing summary shown in the marketplace UI and in plugin-loader output.
- **Required?** — Optional but strongly recommended.
- **Allowed values** — One or two sentences.
- **What to put in it** — What the plugin **adds** to Claude Code (agents, skills, commands, hooks, MCP). User-facing capability summary.
- **What NOT to put in it** — Component counts, intra-plugin disambiguation, "do not confuse with X", internal wiring.
- **Good example**: `"description": "Meta-skills for authoring Claude Code skills, sub-agents, slash commands, plugins, and hooks."`
- **Bad example**: `"description": "Contains 5 skills. The skill-builder skill should not be confused with the skill-optimizer skill. Uses Python validators internally."`

### `author`

- **Purpose** — Plugin authorship info.
- **Required?** — Optional.
- **Allowed values** — Object with `name`, `email?`, `url?`.
- **What to put in it** — Real name (or org name) and optionally a contact email and homepage.
- **When to set it** — Always for plugins distributed publicly.

### `homepage`

- **Purpose** — Marketing URL.
- **Required?** — Optional.
- **What to put in it** — A URL where users can learn more.

### `repository`

- **Purpose** — Source repository URL.
- **Required?** — Optional.
- **Allowed values** — **String URL** (not an object). The npm-style `{type, url}` shape is wrong here.
- **What to put in it** — Direct https URL: `"https://github.com/me/my-plugin"`.

### `license`

- **Purpose** — SPDX license identifier.
- **Required?** — Optional but recommended for distributed plugins.
- **Allowed values** — SPDX expression: `MIT`, `Apache-2.0`, `BSD-3-Clause`, etc.

### `keywords`

- **Purpose** — Discovery keywords.
- **Required?** — Optional.
- **Allowed values** — Array of strings.
- **What to put in it** — 3–10 lowercase terms users would search for.

### `skills` / `commands` / `agents` / `outputStyles` / `lspServers`

- **Purpose** — Override the default auto-discovery of these component types.
- **Required?** — Optional. By default, Claude Code auto-discovers components at `skills/`, `commands/`, `agents/`, etc. at the plugin root.
- **Allowed values** — Array of relative paths to specific files.
- **What to put in it** — Only set when you want to load components from non-default paths or skip some.
- **When to set it** — Rarely. Trust the default discovery.

### `hooks`

- **Purpose** — Declare hook configuration files.
- **Required?** — Optional.
- **Pitfall** — `hooks/hooks.json` at the plugin root is **auto-loaded** in Claude Code 2.1+. Declaring it again in `plugin.json` triggers a duplicate-detection error. Only declare custom paths here.
- **What to put in it** — Array of relative paths to hook JSON files outside the auto-loaded location, or omit entirely.

### `mcpServers`

- **Purpose** — Declare MCP servers the plugin ships.
- **Required?** — Optional.
- **Allowed values** — Object keyed by server name; each value is a server definition (`stdio` / `http` / `sse` / `ws` shape).
- **What to put in it** — Inline MCP server definitions the plugin should expose when activated.

### `channels`

- **Purpose** — Declare MCP-backed channels that inject content into conversations.
- **Required?** — Optional.
- **When to set it** — When the plugin exposes a channel-based integration.

### `experimental`

- **Purpose** — Container for experimental features (`themes`, `monitors`).
- **Required?** — Optional.
- **When to set it** — Only when adopting an experimental Claude Code feature.

### `dependencies`

- **Purpose** — Declare other plugins required for this one to work.
- **Required?** — Optional.
- **Allowed values** — Object keyed by plugin name → version constraint.
- **When to set it** — When the plugin truly depends on another's components.

---

## Part B — `marketplace.json` Fields

Lives at `<repo-root>/.claude-plugin/marketplace.json`. Distributes one or more plugins.

### `$schema`

- **Purpose** — Schema URL for IDE validation.
- **What to put in it** — `https://json.schemastore.org/claude-code-marketplace.json` (working schema URL as of May 2026).
- **What NOT to put in it** — Any `anthropic.com` URL — none currently serves this schema.

### `name`

- **Purpose** — Marketplace identifier.
- **Required?** — Yes.
- **Allowed values** — Kebab-case.

### `description`

- **Purpose** — User-facing summary of what the marketplace bundles.
- **Required?** — Recommended.
- **What to put in it** — One or two sentences.
- **What NOT to put in it** — Per-plugin disambiguation (each plugin entry has its own `description`).

### `owner`

- **Purpose** — Marketplace owner.
- **Required?** — Yes.
- **Allowed values** — `{name, email?}`.

### `version`

- **Purpose** — Marketplace version.
- **Required?** — Optional. In practice, Anthropic never bumps this; treat as vestigial. Per-plugin `version` carries the actual semver.

### `plugins[]`

Array of plugin entries. Each entry:

- `name` (required, kebab-case) — must match the plugin's `plugin.json` `name`.
- `description` — discovery copy for the marketplace UI. One to two sentences, user-facing.
- `source` — relative path from the marketplace root to the plugin directory, e.g. `./plugins/claude-code-core`.
- `category` — taxonomy slot for filtering (e.g. `development`, `productivity`, `security`).
- `tags` — array of free-form keywords for search.
- `strict` — boolean. When `true`, validation errors during install block installation.

**Per-entry `description` MUST NOT contain**:

- Behavioral instructions.
- "Do not confuse with X" disambiguation.
- Internal wiring.

---

## Part C — Directory Layout

```
<plugin-root>/
├── .claude-plugin/
│   └── plugin.json          # REQUIRED
├── README.md                # strongly recommended
├── skills/                  # auto-discovered if present
│   └── <skill-name>/SKILL.md
├── agents/                  # auto-discovered if present
│   └── <agent-name>.md
├── commands/                # auto-discovered if present
│   └── <command-name>.md
├── hooks/                   # auto-loaded if hooks.json present
│   └── hooks.json
├── bin/                     # optional — added to PATH while plugin is active
├── settings.json            # optional — default settings applied on activation
├── .mcp.json                # optional — MCP servers shipped by the plugin
└── shared/                  # optional — cross-component shared resources
    └── …
```

**Rules:**

- Components live at the **plugin root**, not inside `.claude-plugin/`. Only `plugin.json` belongs in `.claude-plugin/`.
- `hooks/hooks.json` is auto-loaded — do NOT also declare it in `plugin.json` `hooks:`.
- Empty component directories are harmless but messy; delete them before shipping.
- Cross-component shared content lives in `shared/`; reference via `${CLAUDE_PLUGIN_ROOT}/shared/…`.

---

## Part E — Best Practices (May 2026)

### E.1 — Components live at the plugin root, not under `.claude-plugin/`

Only `plugin.json` lives in `.claude-plugin/`. `skills/`, `agents/`, `commands/`, `hooks/` go at the plugin root.
Reason: putting them under `.claude-plugin/` causes silent load failure — Claude Code discovers components only from the plugin root.
Source: <https://github.com/anthropics/claude-plugins-official/blob/main/plugins/plugin-dev/skills/plugin-structure/SKILL.md?plain=1>.

### E.2 — `$schema` in `marketplace.json` uses `json.schemastore.org`, never `anthropic.com`

The canonical URL is `https://json.schemastore.org/claude-code-marketplace.json`. Several early blog posts circulate an `anthropic.com` URL that does not exist.
Reason: a missing schema URL causes `claude plugin validate` to fail.
Source: <https://github.com/anthropics/claude-plugins-official/blob/main/.claude-plugin/marketplace.json>.

### E.3 — `hooks/hooks.json` auto-loads; do NOT re-declare it in `plugin.json`

Claude Code 2.1+ auto-loads `hooks/hooks.json` when the plugin activates. Declaring it again in `plugin.json` `hooks:` triggers a duplicate-detection error.
Reason: the duplicate registration is silently rejected in some builds and loud in others — neither is desirable.
Source: <https://code.claude.com/docs/en/hooks>; <https://ice-ice-bear.github.io/posts/2026-04-03-claude-code-plugin-marketplace/>.

### E.4 — `name` is immutable post-publish

The `name` field doubles as namespace key and marketplace identity. Changing it after publication breaks every `claude plugin install` invocation referencing the old name and breaks namespaced component references (`<plugin>:<component>`).
Reason: there is no rename-aware migration in Claude Code's plugin loader.
Source: <https://pierce-lamb.medium.com/what-i-learned-while-building-a-trilogy-of-claude-code-plugins-72121823172b>.

### E.5 — `commands:` / `agents:` / `skills:` arrays in `plugin.json` extend (not replace) the auto-discovered set

Default behavior: Claude Code auto-discovers components under the default directories. Listing these arrays in `plugin.json` is additive — items in the array are included alongside the auto-discovered set, not instead of them.
Reason: omitting the field is the simplest correct configuration; only set it when extending from non-default subdirectories.
Source: <https://code.claude.com/docs/en/plugins-reference>.

### E.6 — `repository` is a string URL, not an object

Use `"repository": "https://github.com/me/x"`. The npm-style `{type, url}` shape is wrong here and fails validation.
Reason: schema-divergent shape from neighboring ecosystems.
Source: <https://github.com/hesreallyhim/claude-code-json-schema>.

---

## Part D — Pre-ship Checklist

### plugin.json

- [ ] `name` is kebab-case, stable, no version suffix.
- [ ] `version` is semver, bumped correctly for the change type.
- [ ] `description` is user-facing capability summary, ≤2 sentences, no internal wiring.
- [ ] `author` set for distributed plugins.
- [ ] `license` set for distributed plugins.
- [ ] No duplicate `hooks/hooks.json` declaration.
- [ ] `repository` is a string URL.
- [ ] Validator passes.

### marketplace.json

- [ ] `$schema` is `https://json.schemastore.org/claude-code-marketplace.json`.
- [ ] Each `plugins[].name` matches the actual plugin's `name`.
- [ ] Each `plugins[].source` resolves to a real directory.
- [ ] Per-entry `description` is user-facing discovery copy, no disambiguation.
- [ ] `category` and `tags` set for searchability.
- [ ] Validator passes.

### Directory layout

- [ ] Components at plugin root, not inside `.claude-plugin/`.
- [ ] README.md present and lists components.
- [ ] No empty placeholder component directories.
- [ ] Bundled scripts use `${CLAUDE_PLUGIN_ROOT}` for cross-installation portability.
