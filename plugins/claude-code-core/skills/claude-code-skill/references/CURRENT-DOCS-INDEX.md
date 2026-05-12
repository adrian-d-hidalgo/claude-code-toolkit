# Current Docs Index — claude-code-skill

This file maps every section of this skill to its authoritative upstream source. Refresh when the upstream docs change.

**Snapshot date:** 2026-05-11
**Anthropic docs version:** Claude Code v2.1.x (May 2026)

## Primary sources

| Topic | URL |
|---|---|
| Skills overview | <https://code.claude.com/docs/en/skills> |
| Skills (Spanish mirror) | <https://code.claude.com/docs/es/skills> |
| Tools reference | <https://code.claude.com/docs/en/tools-reference> |
| Permissions | <https://code.claude.com/docs/en/permissions> |
| Settings | <https://code.claude.com/docs/en/settings> |
| Hooks (for skill `hooks:` field) | <https://code.claude.com/docs/en/hooks> |
| Sub-agents (for `context: fork` + `agent:` field) | <https://code.claude.com/docs/en/sub-agents> |
| Commands (skills replace many commands) | <https://code.claude.com/docs/en/commands> |

## Schema validators

| Source | URL |
|---|---|
| Unofficial JSON schemas | <https://github.com/hesreallyhim/claude-code-json-schema> |
| Awesome Claude Code (community index) | <https://github.com/hesreallyhim/awesome-claude-code> |

## Reference repos consulted

| Repo | Why |
|---|---|
| <https://github.com/anthropics/claude-plugins-official> | Canonical plugin & skill examples |
| <https://github.com/wshobson/agents> | Plugin-scoped skill layout pattern |
| <https://github.com/addyosmani/agent-skills> | Activation description conventions |
| <https://github.com/Piebald-AI/claude-code-system-prompts> | Extracted Claude Code system prompt for hard rules |

## Fields covered in `section-guide.md`

Frontmatter: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `allowed-tools`, `model`, `effort`, `context`, `agent`, `hooks`, `paths`, `shell`.

String substitutions: `$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, `$name`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}`.

Directory layout: `SKILL.md`, `README.md`, `references/`, `assets/templates/`, `scripts/`, `tests/`.
