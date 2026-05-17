# Hook JSON Contract

Authoritative reference for the JSON shapes hooks consume on stdin and produce on stdout. Mirrors <https://code.claude.com/docs/en/hooks>. Snapshot date: see `CURRENT-DOCS-INDEX.md`.

---

## Part A — stdin JSON

### Universal fields (every event)

```json
{
  "hook_event_name": "<EventName>",
  "session_id": "<string>",
  "transcript_path": "<absolute path to .jsonl>",
  "cwd": "<current working directory>",
  "permission_mode": "default | plan | acceptEdits | auto | dontAsk | bypassPermissions",
  "effort": { "level": "low | medium | high | xhigh | max" }
}
```

### Sub-agent context (when fired inside a sub-agent)

Adds two fields to the universal set:

```json
{
  "agent_id": "<uuid>",
  "agent_type": "<sub-agent name>"
}
```

Available whenever the hook fires inside a sub-agent invocation (Task tool spawn, `--agent` CLI flag, plugin sub-agent).

### Per-event additions

#### `PreToolUse`

```json
{
  "tool_name": "Bash | Edit | Write | Read | ...",
  "tool_input": {
    /* tool-specific fields */
  },
  "tool_use_id": "<uuid>"
}
```

#### `PostToolUse` / `PostToolUseFailure`

```json
{
  "tool_name": "<string>",
  "tool_input": {
    /* tool-specific */
  },
  "tool_response": {
    /* tool output / result */
  },
  "tool_use_id": "<uuid>"
}
```

#### `UserPromptSubmit` / `UserPromptExpansion`

```json
{
  "prompt": "<user-typed text>"
}
```

#### `Stop`

```json
{
  "stop_hook_active": true,
  "last_assistant_message": "<string>"
}
```

#### `SubagentStop`

```json
{
  "agent_id": "<uuid>",
  "agent_transcript_path": "<path>",
  "tool_use_id": "<uuid>",
  "stop_hook_active": true,
  "last_assistant_message": "<string>"
}
```

#### `PreCompact`

```json
{
  "trigger": "manual | auto",
  "custom_instructions": "<string>"
}
```

#### `SessionStart`

```json
{
  "source": "startup | resume | clear | compact"
}
```

#### `FileChanged` / `CwdChanged`

```json
{
  "path": "<absolute path>",
  "kind": "create | modify | delete | move"
}
```

(Field set may vary by Claude Code minor version.)

### Reading stdin defensively

```bash
# Bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
SESSION=$(echo "$INPUT" | jq -r '.session_id')
```

```python
# Python
import json, sys
data = json.load(sys.stdin)
command = data.get("tool_input", {}).get("command", "")
session = data.get("session_id", "")
```

Always handle missing fields. Schema changes between minor versions and stdin should be treated as untrusted, schema-versioned input.

---

## Part B — stdout JSON (structured output, exit 0 only)

When a hook exits 0, Claude Code parses stdout as JSON for structured control. Non-JSON stdout is treated as plain text (and for `UserPromptSubmit` / `SessionStart`, **appended to Claude's context** as plain text).

### Universal stdout fields (every event)

```json
{
  "continue": false,
  "stopReason": "<message shown when continue=false>",
  "suppressOutput": false,
  "systemMessage": "<warning shown to the user>",
  "terminalSequence": "<terminal escape sequences>"
}
```

- `continue: false` halts Claude entirely for the rest of the turn.
- `stopReason` is displayed to the user when `continue: false`.
- `suppressOutput: true` omits the script's stdout from the debug log.
- `systemMessage` is a one-line warning shown to the user (separate from blocking — informational).
- `terminalSequence` allows emitting terminal escape codes (bell, color reset).

### Top-level `decision` (block / approve)

Available on `UserPromptSubmit`, `UserPromptExpansion`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `Stop`, `SubagentStop`, `ConfigChange`, `PreCompact`:

```json
{
  "decision": "block",
  "reason": "<text fed to Claude as the blocking reason>"
}
```

### Per-event `hookSpecificOutput` shapes

#### `UserPromptSubmit` / `UserPromptExpansion`

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "<string appended to the prompt Claude receives>",
    "sessionTitle": "<update the session title in the UI>"
  }
}
```

#### `PreToolUse`

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow | deny | ask | defer",
    "permissionDecisionReason": "<string shown to user or Claude>",
    "additionalContext": "<string appended to Claude's tool-call context>",
    "modifiedInput": {
      /* replaces tool_input before the tool runs */
    }
  }
}
```

- `permissionDecision`:
  - `allow` — let the tool run with current input (or `modifiedInput` if set).
  - `deny` — block the tool call.
  - `ask` — prompt the user (default behavior if Claude was already going to ask).
  - `defer` — fall through to normal permission resolution (treat hook as no-op for this decision).
- `modifiedInput` — replace the tool input. Powerful (and dangerous): use to sanitize commands, redact secrets, rewrite paths.

#### `PermissionRequest`

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PermissionRequest",
    "decision": {
      "behavior": "allow | deny",
      "updatedInput": {
        /* modified tool_input */
      },
      "applyPermissionRule": "Rule(...)"
    }
  }
}
```

- `applyPermissionRule` — persist the decision as a rule so subsequent matching calls don't re-trigger the prompt. Use sparingly; you're writing to the user's permission set.

#### `SessionStart` / `Setup`

```json
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "<string added to Claude's session context>"
  }
}
```

Use to inject org-level context, current branch, environment state, recently-merged PRs, etc.

#### `PostToolUse` / `PostToolUseFailure`

```json
{
  "decision": "block",
  "reason": "<reason>",
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "<string appended to Claude's view after the tool result>"
  }
}
```

---

## Part C — Exit Code Semantics

| Exit             | Effect                                       | stdout                                                                                                                  | stderr                                              |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `0`              | Allow (or apply structured decision if JSON) | Parsed as JSON contract above; for `UserPromptSubmit` / `SessionStart`, plain-text stdout injects into Claude's context | Typically informational; not shown unless `verbose` |
| `2`              | **Block** the action                         | Ignored                                                                                                                 | Fed back to Claude as the blocking reason           |
| Other (e.g. `1`) | Non-blocking error                           | Ignored                                                                                                                 | Shown to user; execution continues                  |

**Critical**: `exit 1` does NOT block. Only `exit 2` halts. Scripts using `exit 1` for security enforcement are silently ineffective. Confirmed in <https://github.com/anthropics/claude-code/issues/24327> and <https://github.com/anthropics/claude-code/issues/34600>.

When you need structured control (decision, additional context, permission rewrites), prefer **exit 0 with JSON stdout** over `exit 2` — the JSON contract is more expressive and more debuggable than a stderr message.

---

## Part D — Quick reference for common patterns

### Pattern: block destructive Bash commands

```bash
#!/usr/bin/env bash
set -euo pipefail
INPUT=$(cat)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')

if echo "$CMD" | grep -qE '^\s*(rm -rf|sudo|chmod 777)'; then
  echo "Refusing to run: $CMD" >&2
  exit 2
fi
exit 0
```

### Pattern: inject branch + cwd into every prompt

```bash
#!/usr/bin/env bash
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "no-git")
jq -n --arg branch "$BRANCH" --arg cwd "$(pwd)" '{
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: "Current branch: \($branch)\nCWD: \($cwd)"
  }
}'
```

### Pattern: rewrite tool input to redact secrets

```bash
#!/usr/bin/env bash
INPUT=$(cat)
TOOL_INPUT=$(echo "$INPUT" | jq '.tool_input')
REDACTED=$(echo "$TOOL_INPUT" | jq 'walk(if type == "string" then gsub("sk-[A-Za-z0-9]{20,}"; "<REDACTED>") else . end)')
jq -n --argjson modified "$REDACTED" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "allow",
    modifiedInput: $modified
  }
}'
```

These patterns illustrate the contract; do not deploy without adapting to your security model.
