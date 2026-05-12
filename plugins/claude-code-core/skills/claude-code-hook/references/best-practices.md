# Best Practices — hook authoring

Production patterns for Claude Code hooks. Source of truth: <https://code.claude.com/docs/en/hooks>.

Each pattern is paired with the reason it exists. Apply them after the entry-level rules in `section-guide.md`; reject them only when the surrounding system gives you a stronger guarantee.

---

## 1. Exit-code discipline

Only three codes carry semantic weight. Everything else is noise.

| Exit | Semantics                                                                       |
| ---- | ------------------------------------------------------------------------------- |
| 0    | Allow. stdout printed; for `UserPromptSubmit`, stdout is appended to the prompt.|
| 2    | **Block.** stderr is shown to Claude as the reason. Tool call halts.            |
| 1 or other | Non-blocking error. Logged; tool call proceeds.                           |

Reason: Claude Code dispatches on these three codes only. A script that returns `exit 1` thinking it is "blocking" is silently ineffective — `exit 2` is the **only** halt signal.

Rules of thumb:

- Reserve `exit 2` for blocks the user genuinely wants to see surfaced. Never for warnings.
- Print warnings to stderr and `exit 0`. Claude sees them, the tool proceeds.
- Treat any uncaught error (`set -e` tripping, Python uncaught exception) as a non-blocking error — fail open by default, fail closed only for security hooks (see §6).

## 2. Timeout selection per event

The default `timeout` is 60000 ms (60 s). That is far too long for an interactive agent loop.

| Event                       | Recommended timeout | Reason                                                |
| --------------------------- | ------------------- | ----------------------------------------------------- |
| `PreToolUse` (validator)    | 2000–5000 ms        | Blocks every tool call; latency is user-visible.      |
| `PostToolUse` (formatter)   | 5000–15000 ms       | Runs after the tool; longer is tolerable but capped.  |
| `UserPromptSubmit`          | 2000 ms             | User is waiting at the prompt.                        |
| `Stop` / `SubagentStop`     | 5000 ms             | End-of-turn; brief.                                   |
| `SessionStart` / `SessionEnd` | 10000 ms          | One-shot per session.                                 |
| `PreCompact`                | 10000 ms            | One-shot; can do heavier snapshotting.                |
| `Notification`              | 2000 ms             | Should be near-instant.                               |

If a hook genuinely needs more time, the work belongs out of the hook (background process, scheduled job, `PostToolUse` writing a queue file). Hooks block the agent loop.

## 3. Stdin JSON parsing

Stdin is always a single JSON object. Never `eval` it, never read it line-by-line, never assume a field is present.

Bash with `jq` (preferred):

```bash
INPUT=$(cat)
TOOL_NAME=$(jq -r '.tool_name // empty' <<< "$INPUT")
FILE_PATH=$(jq -r '.tool_input.file_path // empty' <<< "$INPUT")
```

Python:

```python
import json, sys
data = json.load(sys.stdin)
tool_name = data.get("tool_name", "")
file_path = data.get("tool_input", {}).get("file_path", "")
```

Reason: `jq -r '.x // empty'` returns the empty string when `.x` is absent instead of the literal `"null"`. `data.get("k", default)` does the same in Python. Field absence is the common case for cross-event scripts.

Anti-pattern: `bash -c "$(cat)"` or `eval "$(cat)"`. Stdin is structured data, not code.

## 4. Structured logging

Hooks run silently. Without a log, debugging is guesswork.

```bash
LOG="${CLAUDE_PLUGIN_ROOT}/logs/hook.log"
mkdir -p "$(dirname "$LOG")"
printf '%s\t%s\t%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$TOOL_NAME" "$FILE_PATH" >> "$LOG"
```

Rules:

- Append, never overwrite. Use TSV or JSON-lines.
- Log to a path under `${CLAUDE_PLUGIN_ROOT}` or `${XDG_STATE_HOME}`, never `/tmp` (cleared on reboot) and never the user's home root.
- Never log `tool_input` payloads verbatim — they may contain secrets (env vars, file contents). Log the tool name and a hash of the input if you need correlation.
- Rotate by size or date if the log is shipped in a plugin.

## 5. Idempotency for `PostToolUse`

`PostToolUse` fires once per tool call, **concurrently** for parallel calls. A formatter that appends a header line will append it N times on N retries.

Rules:

- Check-before-mutate. `grep -q "^// formatted" "$f" || prepend_header "$f"`.
- Use atomic writes for shared state: `mv "$tmp" "$final"`, not `>> "$final"`.
- For shared logs, use `flock` (Linux) or rely on `O_APPEND` semantics (single `write(2)` ≤ PIPE_BUF is atomic on POSIX).
- A hook that formats a file should produce a fixed-point: running it twice in a row yields the same bytes.

## 6. Fail-closed vs fail-open

| Hook type            | On error, …                       | Why                                                                                  |
| -------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| Security validator   | **Fail closed** — `exit 2`.       | If the validator can't decide, the conservative answer is to block.                  |
| Formatter / linter   | **Fail open** — `exit 0` + stderr.| The tool call already succeeded; a broken formatter shouldn't bury the user's work. |
| Context injector     | **Fail open** — `exit 0` + empty. | Missing context is recoverable; a rejected prompt is not.                            |
| Logger / telemetry   | **Fail open** — `exit 0`, silent. | Telemetry failures must never affect interactive flow.                               |

Encode this explicitly. In bash:

```bash
trap 'echo "validator error: $?" >&2; exit 2' ERR   # fail closed
trap 'echo "formatter error: $?" >&2; exit 0' ERR   # fail open
```

## 7. Choosing the right event

| Goal                                              | Event              | Notes                                                                            |
| ------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| Block a tool call before it runs                  | `PreToolUse`       | Only event whose `exit 2` halts the call. stderr is the user-visible reason.     |
| React to a tool call (format, lint, log, notify)  | `PostToolUse`      | stdin includes `tool_response`. Tool already executed; don't try to "undo" it.   |
| Inject context into the user's prompt             | `UserPromptSubmit` | stdout is appended to the prompt. Treat stdout as a security surface.            |
| Veto a prompt entirely                            | `UserPromptSubmit` | `exit 2`. Surface the reason on stderr.                                          |
| End-of-turn notification, sound, telemetry        | `Stop`             | Sub-agent variant: `SubagentStop` (auto-converted in agent frontmatter).         |
| Bootstrap per-session state (env, DB connection)  | `SessionStart`     | Tear down in `SessionEnd`.                                                       |
| Snapshot state before context summarization       | `PreCompact`       | Fires once before each compact.                                                  |

Decision rules:

- "I need to **decide** if Claude can do X." → `PreToolUse`.
- "I need to **react** after Claude did X." → `PostToolUse`.
- "I need to **shape** what Claude sees." → `UserPromptSubmit`.
- "I need to **observe** without affecting flow." → `PostToolUse` or `Stop`, never `PreToolUse`.

If you find yourself reaching for `PreToolUse` to observe rather than decide, you're paying user-visible latency for a logging job. Move it to `PostToolUse`.

## 8. Portable invocation

Inside a plugin, always invoke scripts via `${CLAUDE_PLUGIN_ROOT}`:

```json
{ "type": "command", "command": "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/validate.sh" }
```

In a project's `.claude/settings.json`, prefer paths relative to the project root and document them. Never embed paths under `/Users/...` or `/home/...`. Reason: `hooks.json` is shared via git; an absolute path is a portability bug on first clone.

## 9. Keep `command` thin; put logic in a script

`command` is hard to test, hard to read, and hard to lint when it grows beyond a single call. Move logic into `hooks/scripts/<name>.sh` and call it from `command`. The script is shell-checkable (`shellcheck`), testable (`bats`, `pytest`), and reviewable in a diff.

The two-line `command` heuristic: if the command exceeds two short statements, extract it.
