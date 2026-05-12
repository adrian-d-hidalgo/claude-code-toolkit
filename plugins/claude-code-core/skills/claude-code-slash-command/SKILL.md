---
name: claude-code-slash-command
description: Use IMMEDIATELY when the user wants to create, scaffold, design, refactor, improve, validate, audit, optimize, migrate, convert, or decide between authoring a Claude Code slash command (`.claude/commands/*.md`) versus a skill — including command frontmatter (description, argument-hint, allowed-tools, model), argument substitution, or migrating commands to skills. Fire on these requests EVEN when no specific command file is named; the workflow includes a clarification step. Also fires on prompts mentioning a slash-prefixed name like "/foo" or "/build", on knowledge questions about command authoring, and on "should this be a slash command or a skill?". Do not use for skills, sub-agents, plugin manifests, or hooks; those component types have their own meta-skills in this plugin.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash(python3 *)
---

# claude-code-slash-command

End-to-end authoring toolkit for Claude Code slash commands. Covers creating new commands, refactoring existing ones, validating frontmatter, and deciding when to author a command versus a skill (they now overlap in Claude Code 2.x).

## What this skill does

| Intent | Mode |
|---|---|
| "create / scaffold / build a new slash command" | **Create** — generate `.claude/commands/<name>.md` with valid frontmatter and body. |
| "refactor / improve / clean up an existing command" | **Refactor** — restructure the body, tighten description, audit arguments. |
| "validate / lint / check this command" | **Validate** — schema + frontmatter + argument substitution check. |
| "audit / review / assess command quality" | **Audit** — UX clarity, tool security, when-skill-is-better evaluation. |
| "migrate this command to a skill" / "should this be a command or a skill?" | **Decide** — see `references/command-vs-skill.md`. |

## Authoritative field reference

`references/section-guide.md` documents every slash-command frontmatter field exhaustively. **Important difference from skills**: a slash command's `description` is a **UX label** for the `/` menu, not a routing trigger — the slash is the trigger. Read the section guide before authoring.

## Mode: Create

1. **Scaffold** the command file:
   ```bash
   python3 plugins/claude-code-core/skills/claude-code-slash-command/scripts/init_command.py <command-name> --path ~/.claude/commands/
   ```
   Creates a `.md` file with frontmatter placeholders and body skeleton.

2. **Decide command vs skill** using `references/command-vs-skill.md`. If the work benefits from auto-activation, supporting files, or references, write a skill instead.

3. **Author the frontmatter** using `references/section-guide.md`. Key rules:
   - `description` is a short imperative phrase displayed in the `/` menu. Under 20 words. Don't write "Use when…"; the slash IS the trigger.
   - `argument-hint` for positional input visibility.
   - `allowed-tools` follows least privilege.

4. **Author the body**:
   - Use `$ARGUMENTS`, `$N`, or named `$arg` substitutions inserted before Claude reads the body.
   - Use `` !`command` `` injection for live shell output Claude should see (git diff, gh pr view, etc.).
   - Keep the body focused — a slash command is typically one task.

5. **Validate** before sign-off.

## Mode: Refactor

When an existing command:

- Reads like a mini-skill with supporting files → migrate to a skill (use `references/command-vs-skill.md`).
- Has a description that's a sentence instead of an imperative phrase → tighten.
- Has unused `$ARGUMENTS` slots → remove or document.
- Uses absolute paths in scripts → swap to `${CLAUDE_SKILL_DIR}` / `${CLAUDE_PLUGIN_ROOT}`.

Apply `references/command-patterns.md` and `references/improvement-workflows.md`.

## Mode: Validate

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_command.py <path-to-command>.md
```

Validator checks frontmatter, argument-hint placeholders, allowed-tools format, and shell-injection patterns.

## Mode: Audit

Apply `references/security-patterns.md` (especially when commands run shell), `references/error-patterns.md` (failure handling), and `references/reincidence-protocol.md` (recurring mistakes).

## Mode: Decide

For "should this be a command or a skill?", see `references/command-vs-skill.md`. Quick rules:

- One-shot deterministic task with explicit args → command.
- Pattern-matched intent, supporting files, references → skill.
- Both — write as a skill, it gets `/skill-name` invocation for free.

## Scope & boundaries — what this skill is NOT for

This skill authors slash commands. It does not author:

- **Skills** — use the skill meta-skill (and prefer skill over command for new work).
- **Sub-agents** — use the sub-agent meta-skill.
- **Plugin manifests** — use the plugin meta-skill.
- **Hooks** — use the hook meta-skill.
- **Application source code** — out of scope entirely.

## Reference index

Local:
- `references/section-guide.md` — every frontmatter field, exhaustively.
- `references/CURRENT-DOCS-INDEX.md` — upstream doc snapshot.
- `references/anti-patterns.md` — authoring mistakes.
- `references/command-vs-skill.md` — decision guide.
- `references/command-patterns.md` — body structures.
- `references/context-detection.md` — picking dynamic-context injection patterns.
- `references/error-patterns.md` — failure handling in commands.
- `references/security-patterns.md` — shell-injection awareness.
- `references/optimization-patterns.md` — slimming down commands.
- `references/improvement-workflows.md` — refactor playbook.
- `references/reincidence-protocol.md` — preventing repeat mistakes.
- `references/research-integration.md` — patterns for commands that fetch live data.
- `references/validation-checklist.md` — pre-ship checklist.

Shared:
- `${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_command.py`

Templates:
- `assets/templates/`

Scripts:
- `scripts/init_command.py` — scaffold a new command.
