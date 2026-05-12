---
name: claude-code-hook
description: Use IMMEDIATELY when the user wants to author, create, scaffold, configure, set up, add, design, refactor, improve, validate, audit, or troubleshoot a Claude Code hook — specifically `hooks/hooks.json` files and their companion shell/python scripts. Covers all lifecycle events (PreToolUse, PostToolUse, UserPromptSubmit, Stop, Notification, SessionStart, SessionEnd, PreCompact, SubagentStart, SubagentStop), exit-code semantics, and stdin JSON handling. Fire even when no specific hook file is named. This skill OWNS hook authoring (writing hook scripts, structuring hooks.json) — prefer over `/update-config` which only edits settings.json. Do not use for skills, sub-agents, slash commands, or plugin manifests; those component types have their own meta-skills in this plugin.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash(jq *)
---

# claude-code-hook

End-to-end authoring toolkit for Claude Code hooks. Covers creating new hooks, validating configuration, and auditing for security since hooks run with user privileges.

## What this skill does

| Intent | Mode |
|---|---|
| "create / configure / set up a new hook" | **Create** — scaffold `hooks/hooks.json` or add to `settings.json`. |
| "refactor / improve a hook" | **Refactor** — tighten matcher, harden the script. |
| "validate / check this hook" | **Validate** — schema + matcher + exit-code conventions. |
| "audit / review this hook" | **Audit** — security review; hooks run with full user privilege. |
| "debug why this hook isn't firing / is firing wrong" | **Troubleshoot** — use `references/troubleshooting.md`. |

## Authoritative field reference

`references/section-guide.md` documents every hook event, every matcher field, every shape of the `command` entry, and every exit-code semantic. Read it before authoring or editing any hook entry.

## Mode: Create

1. **Pick the event.** See `references/section-guide.md` Part A for the full list. Most common:
   - `PreToolUse` — validate a tool call; block with exit 2 to stop the call.
   - `PostToolUse` — react after a tool call (lint, format, log).
   - `UserPromptSubmit` — inject context into the user's prompt.
   - `Stop` / `SubagentStop` — react when Claude or a sub-agent finishes.

2. **Author the entry**. Minimal shape:
   ```json
   {
     "hooks": {
       "PreToolUse": [
         {
           "matcher": "Bash",
           "hooks": [
             { "type": "command", "command": "./scripts/validate-bash.sh" }
           ]
         }
       ]
     }
   }
   ```

3. **Decide location**:
   - **In a plugin**: `<plugin-root>/hooks/hooks.json` — auto-loaded.
   - **User-level**: `~/.claude/settings.json` under `"hooks": { … }`.
   - **Project-level**: `.claude/settings.json`.
   - **Scoped to a single sub-agent**: in the agent's frontmatter `hooks:` field.
   - **Scoped to a single skill**: in the skill's frontmatter `hooks:` field.

4. **Write the script** that the hook invokes. It:
   - Reads JSON from stdin (`tool_input`, `tool_response`, etc.).
   - Returns exit 0 to continue, exit 2 to block, any other exit code for a non-blocking error.
   - Writes user-facing messages to stderr.

5. **Validate** before sign-off.

## Mode: Refactor

When an existing hook:

- Uses a regex matcher when an exact tool name would do → simplify.
- Has a script with hardcoded absolute paths → use relative or `${CLAUDE_PLUGIN_ROOT}`.
- Performs network calls in a `PreToolUse` hook → relocate to async work; hooks block.
- Swallows non-zero exits silently → propagate them so the user sees failures.

Apply `references/best-practices.md` and `references/security-checklist.md`.

## Mode: Validate

Schema validation:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_hooks.py <path-to-hooks.json>
```

Use `references/validation-checklist.md` for the human checklist.

## Mode: Audit

**Hooks run with full user privilege.** Audit aggressively.

1. **Security** — `references/security-checklist.md`. Check that scripts: don't `chmod 777`, don't pipe to bash, don't read secrets to stdout, don't write outside the workspace.
2. **Exit codes** — exit 2 must be reserved for genuine blocks; non-blocking warnings should use exit 0 + stderr message.
3. **Matchers** — overly broad matchers (e.g. matching all Bash commands when only `git push` matters) waste cycles and surface area.
4. **Idempotency** — `PostToolUse` hooks should be safe to run multiple times.

## Mode: Troubleshoot

`references/troubleshooting.md` covers:

- Hook configured but not firing.
- Hook firing but command silently exiting.
- Exit-code 2 not blocking when expected.
- stdin JSON not parseable.
- Duplicate-detection error from declaring `hooks/hooks.json` in `plugin.json`.

## Scope & boundaries — what this skill is NOT for

This skill authors hook configurations and the scripts they invoke. It does not author:

- **Skills** — use the skill meta-skill.
- **Sub-agents** — use the sub-agent meta-skill.
- **Slash commands** — use the slash-command meta-skill.
- **Plugin manifests** — use the plugin meta-skill.
- **Application source code** — out of scope entirely.

## Reference index

Local:
- `references/section-guide.md` — every hook event + every field, exhaustively.
- `references/CURRENT-DOCS-INDEX.md` — upstream doc snapshot.
- `references/anti-patterns.md` — authoring mistakes.
- `references/best-practices.md` — production-grade hooks.
- `references/security-checklist.md` — security review.
- `references/troubleshooting.md` — common failure modes.
- `references/validation-checklist.md` — pre-ship checklist.
- `references/examples/` — worked examples by use case (validation, formatting, logging).

Templates:
- `assets/templates/hooks-json-template.json` — annotated `hooks.json` skeleton.
- `assets/templates/hook-script-template.sh` — annotated bash script skeleton.
- `assets/templates/hook-script-template.py` — annotated Python script skeleton.

Scripts:
- `scripts/init_hook.py` — scaffold a new hook + script pair.
