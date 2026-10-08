# Current Docs Index — claude-code-hook

**Snapshot date:** 2026-05-16
**Anthropic docs version:** Claude Code v2.1.140+ (May 2026)

## Local references

- [`section-guide.md`](./section-guide.md) — per-field reference (matcher, hooks[], type, command, timeout, shell) + placement + script conventions + best practices.
- [`events-catalog.md`](./events-catalog.md) — full catalog of 31 lifecycle events.
- [`handler-types.md`](./handler-types.md) — 5 handler types (command, http, mcp_tool, prompt, agent) with schema.
- [`json-contract.md`](./json-contract.md) — stdin / stdout JSON shapes, exit codes, worked patterns.
- [`anti-patterns.md`](./anti-patterns.md), [`best-practices.md`](./best-practices.md), [`security-checklist.md`](./security-checklist.md), [`troubleshooting.md`](./troubleshooting.md), [`validation-checklist.md`](./validation-checklist.md).

## Primary sources

| Topic                                   | URL                                               |
| --------------------------------------- | ------------------------------------------------- |
| Hooks reference                         | <https://code.claude.com/docs/en/hooks>           |
| Hooks (Spanish)                         | <https://code.claude.com/docs/es/hooks>           |
| Settings                                | <https://code.claude.com/docs/en/settings>        |
| Tools reference                         | <https://code.claude.com/docs/en/tools-reference> |
| Sub-agents (hooks in agent frontmatter) | <https://code.claude.com/docs/en/sub-agents>      |
| Skills (hooks in skill frontmatter)     | <https://code.claude.com/docs/en/skills>          |

## Reference repos consulted

| Repo                                                      | Why                          |
| --------------------------------------------------------- | ---------------------------- |
| <https://github.com/anthropics/claude-plugins-official>   | Canonical hook examples      |
| <https://github.com/wshobson/agents>                      | Plugin-scoped hook patterns  |
| <https://github.com/hesreallyhim/claude-code-json-schema> | hooks.json schema validators |

## Coverage in `section-guide.md`

Events: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `Notification`, `SessionStart`, `SessionEnd`, `PreCompact`.

Entry fields: `matcher`, `hooks[]` with `type`, `command`, `timeout`, `shell`.

Script conventions: stdin JSON shape, exit-code semantics (0 / 2 / other), stdout/stderr meaning per event, portability rules.

Placement: plugin auto-load, project settings, user settings, managed settings, sub-agent frontmatter, skill frontmatter.
