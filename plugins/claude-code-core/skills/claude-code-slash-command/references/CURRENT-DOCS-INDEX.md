# Current Docs Index — claude-code-slash-command

**Snapshot date:** 2026-05-11
**Anthropic docs version:** Claude Code v2.1.x (May 2026)

## Primary sources

| Topic                                          | URL                                               |
| ---------------------------------------------- | ------------------------------------------------- |
| Commands reference                             | <https://code.claude.com/docs/en/commands>        |
| Skills (commands and skills share frontmatter) | <https://code.claude.com/docs/en/skills>          |
| Tools reference                                | <https://code.claude.com/docs/en/tools-reference> |
| Permissions                                    | <https://code.claude.com/docs/en/permissions>     |
| Settings (for `disableSkillShellExecution`)    | <https://code.claude.com/docs/en/settings>        |

## Reference repos consulted

| Repo                                                      | Why                           |
| --------------------------------------------------------- | ----------------------------- |
| <https://github.com/anthropics/claude-plugins-official>   | Canonical command examples    |
| <https://github.com/wshobson/agents>                      | Plugin-scoped command layout  |
| <https://github.com/hesreallyhim/claude-code-json-schema> | Frontmatter schema validators |

## Fields covered in `section-guide.md`

Frontmatter: `name`, `description`, `argument-hint`, `arguments`, `allowed-tools`, `model`, `disable-model-invocation`, `context`, `agent`, `effort`, `hooks`, `paths`, `shell`.

Substitutions: `$ARGUMENTS`, `$N`, `$ARGUMENTS[N]`, `$name`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}`.

Body structure: one-paragraph statement, dynamic context block, instructions, output format.

Decision: command vs skill — see `command-vs-skill.md`.
