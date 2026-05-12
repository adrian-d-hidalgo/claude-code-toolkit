# Current Docs Index — claude-code-claude-md

**Snapshot date:** 2026-05-12
**Anthropic docs version:** Claude Code v2.1.x (May 2026)

## Primary sources (Claude Code)

| Topic                                                             | URL                                                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Best practices for Claude Code                                    | <https://code.claude.com/docs/en/best-practices>                                    |
| Memory — how Claude remembers your project                        | <https://code.claude.com/docs/en/memory>                                            |
| Settings (incl. CLAUDE.md loading + `disableSkillShellExecution`) | <https://code.claude.com/docs/en/settings>                                          |
| Context-engineering for AI agents (Anthropic Engineering)         | <https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents> |
| Claude Code CHANGELOG                                             | <https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md>                  |
| Claude Managed Agents: "dreaming" memory updates (May 6, 2026)    | <https://claude.com/blog/new-in-claude-managed-agents>                              |

## Cross-tool standard (AGENTS.md)

| Topic                              | URL                                                    |
| ---------------------------------- | ------------------------------------------------------ |
| AGENTS.md official spec            | <https://agents.md/>                                   |
| AGENTS.md reference implementation | <https://github.com/agentsmd/agents.md>                |
| OpenAI Codex AGENTS.md guide       | <https://developers.openai.com/codex/guides/agents-md> |
| OpenAI Codex example AGENTS.md     | <https://github.com/openai/codex/blob/main/AGENTS.md>  |

The lessons in `section-guide.md` apply equally to CLAUDE.md and AGENTS.md. Claude Code does not natively read AGENTS.md as of May 2026 (feature request open).

## Adjacent tool conventions

| Tool                                 | URL                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Cursor Rules (`.cursor/rules/*.mdc`) | <https://cursor.com/docs/rules>                                                                     |
| GitHub Copilot custom instructions   | <https://docs.github.com/copilot/customizing-copilot/adding-custom-instructions-for-github-copilot> |
| Aider conventions                    | <https://aider.chat/docs/usage/conventions.html>                                                    |
| Devin knowledge base                 | <https://docs.devin.ai/product-guides/knowledge>                                                    |
| Factory AGENTS.md                    | <https://docs.factory.ai/cli/configuration/agents-md>                                               |

## Empirical evidence (peer-reviewed, 2026)

| Paper                                                                                            | URL                                | Finding                                                         |
| ------------------------------------------------------------------------------------------------ | ---------------------------------- | --------------------------------------------------------------- |
| On the Impact of AGENTS.md Files on the Efficiency of AI Coding Agents                           | <https://arxiv.org/abs/2601.20404> | −28.64% runtime, −16.58% output tokens with operative content   |
| Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents? (ETH Zurich) | <https://arxiv.org/abs/2602.11988> | +20% cost, ↓ task success with architectural / file-map content |

## Community-validated sources

| Topic                                                                        | URL                                                                                                                          |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Writing a good CLAUDE.md (HumanLayer)                                        | <https://www.humanlayer.dev/blog/writing-a-good-claude-md>                                                                   |
| Getting Claude to actually read your CLAUDE.md (HumanLayer)                  | <https://www.humanlayer.dev/blog/stop-claude-from-ignoring-your-claude-md>                                                   |
| Stop Bloating Your CLAUDE.md — progressive disclosure (alexop.dev, Jan 2026) | <https://alexop.dev/posts/stop-bloating-your-claude-md-progressive-disclosure-ai-coding-tools/>                              |
| How Claude Code Builds a System Prompt (dbreunig, Apr 2026)                  | <https://www.dbreunig.com/2026/04/04/how-claude-code-builds-a-system-prompt.html>                                            |
| Agent Harness Engineering (Addy Osmani)                                      | <https://addyosmani.com/blog/agent-harness-engineering/>                                                                     |
| Self-Improving Coding Agents (Addy Osmani)                                   | <https://addyosmani.com/blog/self-improving-agents/>                                                                         |
| Rules file for AI agents (MindStudio)                                        | <https://www.mindstudio.ai/blog/rules-file-ai-agents-standing-orders-claude-code>                                            |
| Token usage guidance (MindStudio)                                            | <https://www.mindstudio.ai/blog/how-to-manage-claude-code-token-usage>                                                       |
| Progressive disclosure (MindStudio)                                          | <https://www.mindstudio.ai/blog/progressive-disclosure-ai-agents-context-management>                                         |
| How to Build Your AGENTS.md (Augment Code)                                   | <https://www.augmentcode.com/guides/how-to-build-agents-md>                                                                  |
| The Agent-Native Repo (Harness.io)                                           | <https://www.harness.io/blog/the-agent-native-repo-why-agents-md-is-the-new-standard>                                        |
| AGENTS.md Patterns (Blake Crosley)                                           | <https://blakecrosley.com/blog/agents-md-patterns>                                                                           |
| AGENTS.md vs CLAUDE.md (Blink blog)                                          | <https://blink.new/blog/agents-md-vs-claude-md>                                                                              |
| Cursor Rules 5-level system (Medium, Apr 2026)                               | <https://medium.com/@vibecodingdirectory/how-to-structure-cursor-rules-in-2026-the-5-level-system-cursor-rules-eaf0df16e8e7> |

## Real-world example files

| Project                                                     | URL                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| anthropics/claude-code-action CLAUDE.md                     | <https://github.com/anthropics/claude-code-action/blob/main/CLAUDE.md>          |
| openai/codex AGENTS.md                                      | <https://github.com/openai/codex/blob/main/AGENTS.md>                           |
| shanraisshan/claude-code-best-practice CLAUDE.md            | <https://github.com/shanraisshan/claude-code-best-practice/blob/main/CLAUDE.md> |
| hesreallyhim/awesome-claude-code (curated index)            | <https://github.com/hesreallyhim/awesome-claude-code>                           |
| Addy Osmani agent-skills (CLAUDE.md + skills as curriculum) | <https://addyosmani.com/blog/agent-skills/>                                     |

## Known issues

| Issue                                               | URL                                                     |
| --------------------------------------------------- | ------------------------------------------------------- |
| `@~/.claude/file.md` global-path import reliability | <https://github.com/anthropics/claude-code/issues/8765> |
| `@file` import edge cases                           | <https://github.com/anthropics/claude-code/issues/1041> |

## Linter tooling

| Tool                      | URL                                         |
| ------------------------- | ------------------------------------------- |
| AgentLinter (web)         | <https://agentlinter.com/>                  |
| cclint (Carl Rannaberg)   | <https://github.com/carlrannaberg/cclint>   |
| cclint (Felix Geelhaar)   | <https://github.com/felixgeelhaar/cclint>   |
| agentlinter (Seojoon Kim) | <https://github.com/seojoonkim/agentlinter> |

## Coverage in `section-guide.md`

Identity (what CLAUDE.md is and is not; AGENTS.md as adjacent standard), six categories of value (operative commands, non-lintable conventions, constraints with alternatives, active pointers with triggers, escalation/stop rules, workflow rules earned by failure), thirteen anti-patterns with severity-tagged sources, token economics with empirical cost data, scope hierarchy (global / project / directory), versioning + lifecycle (last-reviewed convention, three update modes), concrete good/bad examples, validation checklist, the "instruction surface" three-layer mental model.
