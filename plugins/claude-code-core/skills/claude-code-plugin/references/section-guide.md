# Plugin & Marketplace Section Guide

Authoritative per-field reference for `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, and the plugin directory layout.

Mirrors the official docs at <https://code.claude.com/docs/en/plugins-reference> and <https://code.claude.com/docs/en/plugin-marketplaces>. Snapshot date: see `CURRENT-DOCS-INDEX.md`.

---

## Part A — `plugin.json` Fields

Lives at `<plugin-root>/.claude-plugin/plugin.json`. **The manifest itself is optional.** If absent, Claude Code auto-discovers components from default folders (`skills/`, `commands/`, `agents/`, `hooks/`) and derives the plugin name from the enclosing directory. When the manifest exists, `name` is the only required field within it.

### `name`

- **Purpose** — Plugin identifier. **Sets the namespace prefix** for every component (`<plugin-name>:<component-name>` in `/agents`, `/skills`).
- **Required?** — **Yes.**
- **Allowed values** — Kebab-case. Lowercase letters, digits, hyphens.
- **What to put in it** — A stable, descriptive name. Examples: `claude-code-core`, `claude-code-development`.
- **What NOT to put in it** — Spaces, uppercase, underscores, version suffixes (`my-plugin-v2`).
- **When to change** — Almost never. Renaming a plugin is a MAJOR version bump and breaks installations.

### `version`

- **Purpose** — Semver version of the plugin.
- **Required?** — Optional but strongly recommended for distributed plugins.
- **Allowed values** — Semver string: `MAJOR.MINOR.PATCH`.
- **What to put in it** — Start at `1.0.0` for a stable release, or `0.x.y` for pre-release. Bump MAJOR for breaking changes, MINOR for new components, PATCH for fixes / body edits.
- **What NOT to put in it** — `latest`, dates, prose.
- **Critical cache gotcha** — Claude Code keys its plugin cache on this string. If `version` is set and you push new commits **without bumping** it, users see the cached copy and miss the update. **Bump on every change users should receive.** When iterating quickly during development, leave `version` unset entirely — Claude Code falls back to the git commit SHA, which always changes. Source: <https://code.claude.com/docs/en/plugins>.

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

### `skills`

- **Purpose** — Declare additional skill directories beyond the auto-discovered `skills/` at the plugin root.
- **Required?** — Optional.
- **Allowed values** — String (single path) or array of relative paths.
- **Merge rule** — **Additive.** Entries here are loaded **alongside** the auto-discovered `skills/`, not instead of it.
- **When to set it** — Only when shipping skills outside the default folder.

### `commands` / `agents` / `outputStyles`

- **Purpose** — Declare component paths.
- **Required?** — Optional.
- **Allowed values** — String or array of relative paths.
- **Merge rule** — **Replace.** Declaring this key turns off auto-discovery for that component type. To keep the default folder and also add extras, list `"./commands/"` (or `"./agents/"`) explicitly in the array.
- **v2.1.140+ warning** — When this key is set AND the matching default folder still exists, Claude Code emits a warning at load time flagging the ignored folder. Either commit to the manifest path or delete the folder.

### `lspServers`

- **Purpose** — Path to LSP config file.
- **Required?** — Optional.
- **Allowed values** — Relative path to an LSP config file (e.g. `"./.lsp.json"`).
- **Merge rule** — Distinct per-file merge with project-level LSP config; not enumerated in public docs.

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

- **Purpose** — Declare other plugins required for this one to work. Available since Claude Code **v2.1.110**.
- **Required?** — Optional.
- **Allowed values** — **Array** of entries. Each entry is either a bare string (depends on whatever version the marketplace provides) or an object `{ "name": "...", "version": "..." }`. `version` is a Node `semver` range expression (`^`, `~`, hyphen range, comparator chain).
- **Example**:
  ```json
  "dependencies": [
    "audit-logger",
    { "name": "secrets-vault", "version": "~2.1.0" }
  ]
  ```
- **Git tag resolution** — Marketplace git tags must follow the format `{plugin-name}--v{version}`. Claude Code lists tags, filters by the semver range, and resolves to the highest match. The resolved tag's semver is recorded separately from `plugin.json`'s `version`. The cache directory name includes a 12-char commit-SHA suffix; force-moved tags get a fresh cache directory.
- **Pre-releases** — Excluded by default. Opt in by including a pre-release suffix in the range, e.g. `^2.0.0-0`.
- **Failure mode** — If no matching tag exists for a constraint, the dependent plugin is **disabled with an error** listing the available versions.
- **npm caveat** — For npm-backed sources, the `version` constraint does NOT control which npm version is fetched. Tag-based resolution applies to git-backed sources only.
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
- `source` — where to fetch the plugin. Accepted formats:
  - **Relative path** from the marketplace root (e.g. `./plugins/claude-code-core`) — same-repo bundling, our case.
  - **GitHub shorthand** `owner/repo` (e.g. `anthropics/claude-code`).
  - **Git URL** (https or ssh) for GitLab / Bitbucket / self-hosted.
  - **npm package name** for npm-backed sources.
  - **Local filesystem path** for development.
  - **Direct URL** to a `marketplace.json`.
    Optional `@branch-name` or `#tag-name` suffix when adding pins a ref.
- `category` — taxonomy slot for filtering (e.g. `development`, `productivity`, `security`).
- `tags` — array of free-form keywords for search.
- `strict` — boolean. When `true`, validation errors during install block installation.

**Per-entry `description` MUST NOT contain**:

- Behavioral instructions.
- "Do not confuse with X" disambiguation.
- Internal wiring.

---

## Part B.1 — Marketplace persistence via `settings.json`

To make a marketplace survive across sessions (rather than re-running `/plugin marketplace add` every time), declare it under `marketplaces` in `settings.json`:

```json
{
  "marketplaces": [
    {
      "name": "my-custom-plugins",
      "source": "https://github.com/your-org/custom-plugins",
      "sourceType": "git",
      "branch": "main",
      "autoUpdate": true
    }
  ]
}
```

`sourceType` accepts `github`, `git`, `npm`, `local`, `url`. `autoUpdate: true` causes Claude Code to periodically re-fetch the marketplace and pick up new plugin versions.

For team-wide deployments, use `extraKnownMarketplaces` in `.claude/settings.json` (project-scoped) so every contributor sees the marketplace without manually adding it.

---

## Part B.2 — Plugin manager CLI

```
/plugin                                       # open the plugin manager UI (Discover / Manage / etc.)
/plugin marketplace add <source>              # add by GitHub owner/repo, git URL, local path, or direct URL
/plugin marketplace list                      # list added marketplaces
/plugin marketplace update [<name>]           # refresh all or one
/plugin marketplace remove <name>             # remove marketplace (also uninstalls its plugins)
/plugin install <name>@<marketplace>          # install specific plugin from named marketplace
/plugin disable <name>                        # disable without removing
/plugin enable <name>                         # re-enable
/plugin uninstall <name>                      # remove entirely
/reload-plugins                               # activate newly installed plugins in current session
```

`/plugin market` is an alias for `/plugin marketplace`.

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
