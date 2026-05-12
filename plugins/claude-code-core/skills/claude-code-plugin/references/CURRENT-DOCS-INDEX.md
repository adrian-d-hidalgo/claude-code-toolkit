# Current Docs Index — claude-code-plugin

**Snapshot date:** 2026-05-11
**Anthropic docs version:** Claude Code v2.1.x (May 2026)

## Primary sources

| Topic                        | URL                                                   |
| ---------------------------- | ----------------------------------------------------- |
| Plugins reference            | <https://code.claude.com/docs/en/plugins-reference>   |
| Plugins reference (Spanish)  | <https://code.claude.com/docs/es/plugins-reference>   |
| Plugin marketplaces          | <https://code.claude.com/docs/en/plugin-marketplaces> |
| Discover and install plugins | <https://code.claude.com/docs/en/discover-plugins>    |
| Settings                     | <https://code.claude.com/docs/en/settings>            |

## Schema validators

| Source                  | URL                                                         |
| ----------------------- | ----------------------------------------------------------- |
| Marketplace JSON schema | <https://json.schemastore.org/claude-code-marketplace.json> |
| Unofficial JSON schemas | <https://github.com/hesreallyhim/claude-code-json-schema>   |

## Reference repos consulted

| Repo                                                        | Why                                     |
| ----------------------------------------------------------- | --------------------------------------- |
| <https://github.com/anthropics/claude-plugins-official>     | Canonical plugin + marketplace examples |
| <https://github.com/anthropics/claude-code> (plugins/ tree) | Plugin layout conventions               |
| <https://github.com/wshobson/agents>                        | Multi-plugin marketplace at scale       |
| <https://github.com/cathy-kim/skill-semver>                 | Per-plugin semver automation            |

## Fields covered in `section-guide.md`

`plugin.json`: `name`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `skills`, `commands`, `agents`, `outputStyles`, `lspServers`, `hooks`, `mcpServers`, `channels`, `experimental`, `dependencies`.

`marketplace.json`: `$schema`, `name`, `description`, `owner`, `version`, `plugins[]` with `name`, `description`, `source`, `category`, `tags`, `strict`.

Directory layout: `.claude-plugin/`, `skills/`, `agents/`, `commands/`, `hooks/`, `bin/`, `settings.json`, `.mcp.json`, `shared/`.
