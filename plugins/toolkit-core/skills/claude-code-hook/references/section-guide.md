# Hook Section Guide

Authoritative per-field reference for Claude Code hooks.

Hooks have **no description field**. The schema is shape-only: events → matchers → handler entries. Documentation lives in surrounding files (README, plugin.json), never inside hook entries (comment fields are silently ignored).

Mirrors the official docs at <https://code.claude.com/docs/en/hooks>. Snapshot date: see `CURRENT-DOCS-INDEX.md`.

**Companion references in this directory:**

- [`events-catalog.md`](./events-catalog.md) — every lifecycle event (31 total), grouped by stage, with when-fires / matcher / stdin / stdout per event.
- [`handler-types.md`](./handler-types.md) — the five handler types (`command`, `http`, `mcp_tool`, `prompt`, `agent`) with schema and selection guidance.
- [`json-contract.md`](./json-contract.md) — full stdin / structured-stdout JSON shapes, exit-code semantics, and worked patterns.

---

## Part A — Hook Events (Summary)

Claude Code documents **31 lifecycle events** as of May 2026. The full catalog with stdin/stdout details, matchers, and use-cases per event lives in [`events-catalog.md`](./events-catalog.md). The table below is a quick orientation; use the catalog for authoring.

| Event                                                  | Matcher?              | Can block?                                                  | Typical use                                                         |
| ------------------------------------------------------ | --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------- |
| `SessionStart` / `Setup` / `SessionEnd`                | No                    | No                                                          | Lifecycle setup / teardown; `SessionStart` stdout injects to Claude |
| `UserPromptSubmit` / `UserPromptExpansion`             | No                    | Yes (exit 2 or `decision: block`)                           | Auto-context injection; prompt guardrails                           |
| `PreToolUse`                                           | `tool_name` regex     | Yes (or rewrite via `permissionDecision` + `modifiedInput`) | Validation; sanitization; policy enforcement                        |
| `PermissionRequest` / `PermissionDenied`               | tool / rule           | Yes                                                         | ABAC; auto-allow signed users; audit log                            |
| `PostToolUse` / `PostToolUseFailure` / `PostToolBatch` | `tool_name` regex     | Yes (blocks next turn)                                      | Linting; formatting; indexing; failure logging                      |
| `Notification`                                         | Notification type     | No                                                          | Custom routing (Slack, sound)                                       |
| `InstructionsLoaded`                                   | No                    | No                                                          | Debug which CLAUDE.md / AGENTS.md / files loaded                    |
| `ConfigChange`                                         | optional              | Yes                                                         | Policy on settings changes                                          |
| `SubagentStart` / `SubagentStop`                       | Sub-agent `name`      | Yes (on Stop)                                               | Per-agent setup / cleanup                                           |
| `TeammateIdle`                                         | Teammate name         | No                                                          | Detect stuck teammates                                              |
| `TaskCreated` / `TaskCompleted`                        | Task type / ID        | No                                                          | External task tracker mirroring                                     |
| `Stop` / `StopFailure`                                 | No                    | Yes (`Stop` only)                                           | End-of-turn notifications / cleanup                                 |
| `CwdChanged` / `FileChanged`                           | Path glob             | No                                                          | Reload config; re-typecheck on change                               |
| `WorktreeCreate` / `WorktreeRemove`                    | Agent name            | No                                                          | Worktree setup / teardown                                           |
| `PreCompact` / `PostCompact`                           | No                    | Yes (on `PreCompact`)                                       | Snapshot before / restore after compaction                          |
| `Elicitation` / `ElicitationResult`                    | Elicitation type / ID | No                                                          | Auto-answer prompts; log responses                                  |

**Frontmatter rewrite rule**: a `Stop` hook declared inside a sub-agent's `hooks:` frontmatter is automatically rewritten to `SubagentStop` at load time. Author as `Stop`; understand the rewrite when debugging.

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

- **Required.** Picks the handler type. Five options as of May 2026:

  | Type       | Runs                     | Use for                               |
  | ---------- | ------------------------ | ------------------------------------- |
  | `command`  | Shell command            | Default; most flexible                |
  | `http`     | POST to URL              | Remote policy service                 |
  | `mcp_tool` | MCP server tool          | Policy logic already in an MCP server |
  | `prompt`   | Single-turn LLM          | Judgmental decisions (Haiku-class)    |
  | `agent`    | Sub-agent (experimental) | Genuinely agentic decisions           |

  Schema and trade-offs per type live in [`handler-types.md`](./handler-types.md). Most events accept all five; `SessionStart` and `Setup` are restricted to `command` and `mcp_tool`.

#### `command`

- **Purpose** — Shell command to execute. Applies when `type: "command"`.
- **Required?** — Yes (when `type: "command"`).
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

Hook scripts receive JSON on stdin and respond via exit code + stderr/stdout. The **full JSON stdin/stdout contract** (universal fields, per-event additions, structured `decision` / `hookSpecificOutput`, `permissionDecision` rewrites) lives in [`json-contract.md`](./json-contract.md). This section covers the conventions that apply to all hook scripts.

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

Always handle missing fields. Schema changes between minor versions; stdin should be treated as schema-versioned untrusted input.

### Exit codes

| Code  | Meaning                                                                                                     |
| ----- | ----------------------------------------------------------------------------------------------------------- |
| 0     | Continue. stdout parsed as JSON contract (or plain text for `UserPromptSubmit` / `SessionStart` injection). |
| 2     | **Block.** stderr shown to Claude as the reason for blocking. stdout is ignored.                            |
| Other | Non-blocking error; logged. Does NOT block.                                                                 |

**Critical**: `exit 1` does **not** block ([#24327](https://github.com/anthropics/claude-code/issues/24327), [#34600](https://github.com/anthropics/claude-code/issues/34600)). Only `exit 2` halts execution. Prefer **exit 0 with JSON stdout** for structured control (more expressive, more debuggable than stderr).

### What to write where

- **stdout** — Structured JSON when applying a `decision`, `permissionDecision`, `modifiedInput`, or injecting context via `hookSpecificOutput.additionalContext`. Plain text for `UserPromptSubmit` / `SessionStart` simple injection. Empty for most informational hooks.
- **stderr** — User-visible messages (errors, warnings). **Required** for `exit 2` to surface a reason to Claude.

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

### F.8 — Prefer JSON stdout over `exit 2` for control flow

When a hook needs to block, rewrite tool input, inject additional context, or apply a permission rule, prefer **exit 0 with structured JSON stdout** (`decision`, `hookSpecificOutput`, `permissionDecision`, `modifiedInput`) over `exit 2` + stderr. The JSON contract is more expressive: it can rewrite the tool input, persist a permission rule, ask for confirmation, or inject context — none of which `exit 2` can do. `exit 2` remains correct for one-line "no, halt" decisions with a stderr reason.
Reason: structured stdout is the modern Claude Code control surface; `exit 2` is the legacy fallback.
Source: <https://code.claude.com/docs/en/hooks>; see `json-contract.md`.

### F.9 — Persistent-config injection (GHSA-ff64-7w26-62rf) is a real threat

A malicious `settings.json` can inject arbitrary hook payloads that execute on every session start, with full user privilege. Validate the settings files committed in repos before merging — especially in monorepos with many contributors. Treat `hooks` in `settings.json` like CI configuration: review, code-own, sign if possible.
Reason: hooks run shell commands with no sandbox. The supply-chain surface is the entire settings tree.
Source: <https://github.com/anthropics/claude-code/security/advisories/GHSA-ff64-7w26-62rf>.

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
