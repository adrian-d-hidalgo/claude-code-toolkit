# Validation Checklist — pre-ship

Run this before shipping any hook. Source: <https://code.claude.com/docs/en/hooks>.

Each item is a binary gate. If you can't tick it, fix it.

---

## Schema

- [ ] **`hooks.json` parses as valid JSON.**
  ```bash
  python3 -m json.tool hooks/hooks.json > /dev/null
  ```
  If this errors, no other gate matters.

- [ ] **Top-level shape is `{ "<EventName>": [ … ] }`** — not `{ "hooks": { "<EventName>": … } }` when shipped as `hooks/hooks.json` inside a plugin.
  The double-`hooks` shape is only correct inside `settings.json`. Plugin auto-loaded `hooks/hooks.json` uses the flat shape.

- [ ] **Each event entry is an array, not an object.** `"PreToolUse": [ … ]`, never `"PreToolUse": { … }`.

- [ ] **Every command entry has `type: "command"`.** No other `type` is supported in v2.1.x.

- [ ] **No `description`, `comment`, `name`, or other unknown keys** inside hook entries. The schema ignores or rejects them. Comments live in surrounding markdown.

- [ ] **Programmatic schema check passes.**
  ```bash
  python3 plugins/claude-code-core/shared/scripts/validate_hooks.py hooks/hooks.json
  ```

## Matchers

- [ ] **Event name spelled exactly:** `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `Notification`, `SessionStart`, `SessionEnd`, `PreCompact`, `SubagentStart`, `SubagentStop`. Case-sensitive. `PreToolCall`, `pretooluse`, `preToolUse` are all wrong.

- [ ] **Matcher actually matches the intended tool(s).** Test with the literal tool name:
  ```bash
  grep -E '<your-matcher>' <<< 'Bash'
  grep -E '<your-matcher>' <<< 'Edit'
  ```
  A matcher of `"Bash "` (trailing space) silently matches nothing.

- [ ] **Matcher is the narrowest expression that captures intent.** `"Bash"` not `".*"`; `"Edit|Write"` not `".*it.*"`. Overbroad matchers waste cycles and surface area (see `anti-patterns.md`).

- [ ] **Events without a matcher (`Stop`, `Notification`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`, `PreCompact`) have no `matcher` key.** Adding one is silently ignored or causes parse errors depending on the validator.

## Command and script

- [ ] **`command` uses `${CLAUDE_PLUGIN_ROOT}` for any bundled script reference.** No `/Users/...`, no `/home/...`, no `~/...`.

- [ ] **Referenced script file exists at the resolved path.**
  ```bash
  ls -l hooks/scripts/<your-script>.sh
  ```

- [ ] **Script has the executable bit.**
  ```bash
  test -x hooks/scripts/<your-script>.sh && echo OK
  ```
  Missing `+x` makes hooks fail silently on macOS/Linux.

- [ ] **Script has a shebang as line 1.** `#!/usr/bin/env bash` or `#!/usr/bin/env python3`. Without one, the kernel can't dispatch.

- [ ] **Bash scripts pass `bash -n`** (syntax check):
  ```bash
  bash -n hooks/scripts/<your-script>.sh
  ```

- [ ] **Bash scripts have `set -euo pipefail`** at the top (unless you have a documented reason to fail open on errors — see `best-practices.md` §6).

- [ ] **Python scripts pass `python3 -m py_compile`**:
  ```bash
  python3 -m py_compile hooks/scripts/<your-script>.py
  ```

## Stdin handling

- [ ] **Script reads stdin into a variable, then parses with `jq -r` or `json.loads`.** No `eval`, no regex on JSON.

- [ ] **Script handles missing fields gracefully** (`jq -r '.x // empty'` or `dict.get(k, default)`). Not every event emits every field.

- [ ] **Script behaves correctly with empty stdin** (e.g. when triggered with no input from a misconfigured matcher). Exit 0, no crash:
  ```bash
  echo '' | hooks/scripts/<your-script>.sh
  ```

- [ ] **Script behaves correctly with malformed JSON**. Either fail closed (`exit 2`) or fail open (`exit 0` + stderr), per the policy in `best-practices.md` §6 — but never crash with a stack trace into the agent loop.

## Exit codes

- [ ] **Exit `0` for success.** Exit `2` reserved for genuine blocks. Other codes mean non-blocking error.

- [ ] **User-visible messages go to stderr**, not stdout (except `UserPromptSubmit` intentional context injection).

- [ ] **Block reasons (when exiting 2) are written to stderr in a single, actionable sentence.** Not a stack trace.

## Timeout

- [ ] **`timeout` is set and is the minimum viable value** for the operation (see `best-practices.md` §2). The 60000 ms default is too long for any interactive event.

- [ ] **Script doesn't depend on remote services without a per-request timeout.** A `curl` without `--max-time` will burn the entire hook `timeout`.

## Placement

- [ ] **If shipped in a plugin, the file lives at `<plugin-root>/hooks/hooks.json`** and is **not** also declared in `plugin.json`'s `hooks:` field. Both = duplicate-detection error in v2.1+.

- [ ] **If shipped in a project, the file lives at `.claude/settings.json` under `"hooks": { … }`**, not at a top-level `hooks.json` (project-level top-level files are ignored).

- [ ] **If shipped in agent/skill frontmatter `hooks:`, the event names are scoped correctly** — `Stop` is auto-converted to `SubagentStop` in agent frontmatter; this is by design, not an error.

## Live test

- [ ] **Hook tested end-to-end with `claude --debug` against a real tool call** matching the matcher. The debug log shows `Hook fired: <event>` and the exit code.

- [ ] **Negative test: a tool call NOT matching the matcher does NOT trigger the hook.** Easy to miss with regex matchers; a `".*"` accidentally left in matches everything.

- [ ] **Idempotency test (for `PostToolUse`): triggering the same tool call twice produces the same file state.** Run it, snapshot bytes, run again, diff: zero output.

- [ ] **No secrets in the resulting log or stdout.** `grep -E '(token|secret|key|password)' <log>` returns nothing.
