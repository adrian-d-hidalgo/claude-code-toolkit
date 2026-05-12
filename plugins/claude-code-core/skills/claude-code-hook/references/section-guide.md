# Hook Section Guide

Authoritative per-field reference for Claude Code hooks.

Hooks have **no description field**. The schema is shape-only: events → matchers → command entries. Documentation lives in surrounding files (README, plugin.json), never inside hook entries (comment fields are silently ignored).

Mirrors the official docs at <https://code.claude.com/docs/en/hooks>. Snapshot date: see `CURRENT-DOCS-INDEX.md`.

---

## Part A — Hook Events

Top-level keys under `"hooks": { … }`. Each maps to an array of matcher → command configurations.

### `PreToolUse`

- **When it fires** — Before Claude executes a tool call.
- **Matcher** — Tool name (`Bash`, `Edit`, `Write`, etc.) or pattern.
- **Stdin to script** — `{ tool_name, tool_input: { … }, session_id, transcript_path, cwd }`.
- **Exit 0** — Continue tool call.
- **Exit 2** — **Block** the tool call. stderr is shown to Claude as the reason.
- **Other exit** — Non-blocking error; logged.
- **Use for** — Validation (read-only DB queries only, no `rm -rf`, etc.).

### `PostToolUse`

- **When it fires** — After Claude executes a tool call.
- **Matcher** — Tool name or pattern.
- **Stdin to script** — `{ tool_name, tool_input, tool_response, session_id, transcript_path, cwd }`.
- **Exit codes** — Same semantics as `PreToolUse` (exit 2 blocks the _next_ Claude turn).
- **Use for** — Linting, formatting, logging, follow-up actions.

### `UserPromptSubmit`

- **When it fires** — Before Claude sees the user's typed prompt.
- **Matcher** — None.
- **Stdin to script** — `{ prompt, session_id, transcript_path, cwd }`.
- **stdout** — If non-empty, **appended to the user prompt** before Claude sees it.
- **Exit 2** — Reject the prompt entirely.
- **Use for** — Auto-injecting context (current branch, env state); guard rails.

### `Stop`

- **When it fires** — When Claude finishes its turn.
- **Matcher** — None.
- **Use for** — End-of-turn notifications, sound effects, telemetry.
- **Note** — In a sub-agent's frontmatter `hooks:`, `Stop` is auto-converted to `SubagentStop`.

### `SubagentStop`

- **When it fires** — When a sub-agent finishes.
- **Matcher** — Sub-agent `name`.
- **Use for** — Per-agent post-processing, cleanup.

### `SubagentStart`

- **When it fires** — When a sub-agent starts.
- **Matcher** — Sub-agent `name`.
- **Use for** — Setup specific to an agent (open DB connection, etc.).

### `Notification`

- **When it fires** — When Claude Code surfaces a notification.
- **Use for** — Custom notification handling (e.g., macOS `osascript` sound).

### `SessionStart` / `SessionEnd`

- **When it fires** — At session lifecycle boundaries.
- **Use for** — Setup / teardown.

### `PreCompact`

- **When it fires** — Before Claude Code auto-compacts the conversation.
- **Use for** — Snapshotting state before it's summarized.

---

## Part B — Hook Entry Fields

Each event maps to an array. Each array entry is:

```json
{
  "matcher": "<pattern>",
  "hooks": [
    {
      "type": "command",
      "command": "<shell>",
      "timeout": 5000,
      "shell": "bash"
    }
  ]
}
```

### `matcher`

- **Purpose** — Selects which tool / agent / event matches this configuration. Schema differs per event (see Part A).
- **Required?** — Yes for `PreToolUse`, `PostToolUse`, `SubagentStart`, `SubagentStop`. None for events with no matcher.
- **Allowed values** — Exact name or regex (depends on event).
- **What to put in it** — The narrowest pattern that matches your intent. `"Bash"` for all Bash calls; `"Edit|Write"` for both edit tools.
- **What NOT to put in it** — Overbroad patterns like `".*"` when only a few cases matter.

### `hooks[]`

Array of command entries. Each:

#### `type`

- **Required.** Currently only `"command"` is supported.

#### `command`

- **Purpose** — Shell command to execute.
- **Required?** — Yes.
- **What to put in it** — Path to a script, or an inline command. Use `${CLAUDE_PLUGIN_ROOT}` for portability.
- **What NOT to put in it** — `chmod 777`, `curl … | bash`, anything that mutates state outside the workspace, anything that prints secrets to stdout.

#### `timeout`

- **Purpose** — Maximum wall time in milliseconds before the hook is killed.
- **Required?** — Optional. Default: 60000 (60 s).
- **What to put in it** — A tight cap, e.g. `5000` for a fast validator. Hooks block tool execution; long timeouts hurt UX.

#### `shell`

- **Purpose** — Shell to interpret the command (Windows).
- **Required?** — Optional. Default: `bash` on Unix.
- **Allowed values** — `bash` / `powershell`.
- **When to set it** — Only on Windows.

---

## Part C — Script Conventions

Hook scripts receive JSON on stdin and respond via exit code + stderr/stdout.

### Reading stdin

Bash:

```bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')
```

Python:

```python
import json, sys
data = json.load(sys.stdin)
command = data.get("tool_input", {}).get("command", "")
```

### Exit codes

| Code  | Meaning                                                                             |
| ----- | ----------------------------------------------------------------------------------- |
| 0     | Continue. stdout printed (and for `UserPromptSubmit`, appended to the user prompt). |
| 2     | **Block.** stderr shown to Claude as the reason for blocking.                       |
| Other | Non-blocking error; logged.                                                         |

### What to write where

- **stdout** — For `UserPromptSubmit`: content to inject. For other events: typically empty.
- **stderr** — User-visible messages (errors, warnings). Required for exit 2 to be useful.

### Portability

- Use `${CLAUDE_PLUGIN_ROOT}` to reference bundled assets.
- Don't hardcode absolute paths.
- Quote variables defensively (`"$INPUT"`, `"$COMMAND"`).
- Validate inputs — never `eval` stdin content.

---

## Part D — Placement

| Location                                           | Scope                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| Plugin: `<plugin-root>/hooks/hooks.json`           | Auto-loaded when plugin is active. Do NOT also declare in `plugin.json`. |
| Project: `.claude/settings.json` under `"hooks"`   | Active in this project.                                                  |
| User: `~/.claude/settings.json` under `"hooks"`    | Active in all sessions.                                                  |
| Managed: managed-settings location under `"hooks"` | Enterprise-wide.                                                         |
| Sub-agent frontmatter `hooks:`                     | Scoped to the sub-agent's invocations.                                   |
| Skill frontmatter `hooks:`                         | Scoped to the skill's invocations.                                       |

---

## Part F — Best Practices (May 2026)

### F.1 — Exit codes: 0 allows, 2 blocks, 1 is a non-blocking warning

Exit 0 = allow the tool call. Exit 2 = block, with stderr shown to Claude as the reason. Exit 1 = warning, **does not block**. Any other code is a non-blocking error.
Reason: scripts that try to enforce security with `exit 1` are silently ineffective — `exit 2` is the only code that halts execution.
Source: <https://code.claude.com/docs/en/hooks>; <https://stevekinney.com/courses/ai-development/claude-code-hook-control-flow>.

### F.2 — `UserPromptSubmit` stdout is a prompt-injection vector

Any text written to stdout by a `UserPromptSubmit` hook is appended to the prompt Claude receives. A script that echoes secrets, internal paths, or environment values into stdout leaks those into the model context — and any prompt-injection adversary in the user's input now has them.
Reason: stdout from `UserPromptSubmit` is data Claude treats as user-authored prompt content.
Exception: stdout from `UserPromptSubmit` is the correct channel ONLY for intentional, non-sensitive context injection (current branch name, file count, etc.).
Source: <https://www.truefoundry.com/blog/claude-code-prompt-injection>; <https://github.com/lasso-security/claude-hooks>.

### F.3 — `PostToolUse` fires concurrently for parallel tool calls; hooks must be idempotent

When Claude makes parallel tool calls, `PostToolUse` fires once per tool simultaneously. A hook that appends to a shared log without locking will race. Use atomic writes, advisory locks, or append-safe formats.
Reason: parallel firing is the default Claude Code behavior for independent tool calls.
Source: <https://claudefa.st/blog/tools/hooks/hooks-guide>; <https://gist.github.com/FrancisBourre/50dca37124ecc43eaf08328cdcccdb34>.

### F.4 — Use `${CLAUDE_PLUGIN_ROOT}` for plugin hook scripts

Plugin hooks resolve scripts relative to `${CLAUDE_PLUGIN_ROOT}`. Absolute paths like `/Users/me/...` work only on the author's machine.
Reason: plugin distribution requires portable paths.
Source: <https://code.claude.com/docs/en/hooks>.

### F.5 — `timeout` discipline: minimum viable, not the 60s default

The default `timeout` is 60 seconds. A hook that calls a slow API blocks the agent loop for that full duration. Set `timeout` to the minimum viable value for the operation: 5000 ms for a local linter, 2000 ms for a simple validator. For hooks that depend on remote services, set a short timeout and fail open (`exit 0`) rather than stall.
Reason: hooks block the agent loop; long timeouts degrade interactive feel.
Source: <https://www.pixelmojo.io/blogs/claude-code-hooks-production-quality-ci-cd-patterns>.

### F.6 — Matcher specificity is a security boundary

An overly broad matcher (`matcher: "*"` or empty matcher matching every tool) on a `PreToolUse` hook calls the script on benign reads, expensive operations, every tool invocation. Narrow matchers to specific `tool_name` patterns (`Bash`, `Edit|Write`) and where applicable filter on `tool_input` inside the script.
Reason: broad matchers waste cycles and broaden the surface for hook-side bugs.
Source: <https://github.com/disler/claude-code-hooks-mastery>.

### F.7 — `description`/`comment` keys in hook entries are not in the schema

The hook entry schema is `{ matcher, hooks: [{ type, command, timeout, shell }] }`. Anything else is silently ignored or rejected, depending on the parser.
Reason: there is no documented annotation field — the surrounding README is the place for documentation.
Source: <https://code.claude.com/docs/en/hooks>.

---

## Part E — Pre-ship Checklist

- [ ] Event name is correct (`PreToolUse`, not `PreToolCall`).
- [ ] `matcher` is the narrowest pattern that captures the intent.
- [ ] Script reads stdin defensively (handles missing fields, empty input).
- [ ] Exit code 2 is reserved for genuine blocks; warnings use 0 + stderr.
- [ ] Script uses `${CLAUDE_PLUGIN_ROOT}` for any bundled-asset path.
- [ ] No `chmod 777`, no pipe-to-bash, no secrets-to-stdout.
- [ ] `timeout` set if the script could ever take >5 s.
- [ ] Script is executable (`chmod +x`).
- [ ] If in a plugin, NOT also declared in `plugin.json` `hooks:` (auto-load conflict).
- [ ] Validator passes.
