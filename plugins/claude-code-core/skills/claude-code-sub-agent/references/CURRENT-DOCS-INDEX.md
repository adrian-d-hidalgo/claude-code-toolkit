# Current Docs Index — claude-code-sub-agent

**Snapshot date:** 2026-05-11
**Anthropic docs version:** Claude Code v2.1.x (May 2026)

## Primary sources

| Topic | URL |
|---|---|
| Sub-agents overview | <https://code.claude.com/docs/en/sub-agents> |
| Sub-agents (Spanish mirror) | <https://code.claude.com/docs/es/sub-agents> |
| Tools reference | <https://code.claude.com/docs/en/tools-reference> |
| Permissions | <https://code.claude.com/docs/en/permissions> |
| Permission modes | <https://code.claude.com/docs/en/permission-modes> |
| Hooks (for agent `hooks:` field) | <https://code.claude.com/docs/en/hooks> |
| Skills (for agent `skills:` preload field) | <https://code.claude.com/docs/en/skills> |
| Worktrees (for `isolation: worktree`) | <https://code.claude.com/docs/en/worktrees> |
| MCP (for `mcpServers:` field) | <https://code.claude.com/docs/en/mcp> |

## Schema validators

| Source | URL |
|---|---|
| Unofficial JSON schemas | <https://github.com/hesreallyhim/claude-code-json-schema> |

## Reference repos consulted

| Repo | Why |
|---|---|
| <https://github.com/anthropics/claude-plugins-official> | Canonical agent examples |
| <https://github.com/wshobson/agents> | Plugin-scoped agent layout pattern |
| <https://github.com/Piebald-AI/claude-code-system-prompts> | Built-in agent system-prompt patterns |

## Fields covered in `section-guide.md`

Frontmatter: `name`, `description`, `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation`, `color`, `initialPrompt`.

Body structure: role statement, behavior rules, hard rules, anti-patterns, workflow, scope & boundaries, reporting format.
