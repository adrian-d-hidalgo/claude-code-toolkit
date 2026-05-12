# Troubleshooting — common hook failure modes

Source: <https://code.claude.com/docs/en/hooks>.

For each symptom: probable cause → fix. Pair with `validation-checklist.md` to confirm.

The single most useful diagnostic command:

```bash
claude --debug 2>&1 | grep -i hook
```

This logs every hook the runtime considers, every match decision, every exit code. Run it before reading further symptoms.

---

## Symptom: hook is configured but never fires

**Cause A — matcher mismatch.**
The matcher regex doesn't match the tool name. `Bash ` (trailing space), `bash` (lowercase), `BashTool` (suffix) all silently miss.
**Fix:** test the matcher against the literal tool name:
```bash
grep -E '<matcher>' <<< 'Bash' && echo MATCH || echo MISS
```

**Cause B — JSON parse error in `hooks.json` or `settings.json`.**
A single trailing comma drops the entire file silently. Claude Code logs the parse error only at `--debug` level.
**Fix:**
```bash
python3 -m json.tool hooks/hooks.json > /dev/null
```

**Cause C — file in the wrong location.**
- Inside a plugin, hooks live at `<plugin-root>/hooks/hooks.json` (auto-loaded).
- For user-level scope, they live in `~/.claude/settings.json` under `"hooks"`, **not** in a standalone `~/.claude/hooks.json` (which is ignored).
- For project scope, they live in `.claude/settings.json` under `"hooks"`.
**Fix:** confirm placement with the table in `section-guide.md` Part D.

**Cause D — plugin not active.**
The hook file is correct but the plugin is disabled or not installed.
**Fix:** `claude /plugins` and confirm the plugin is listed and enabled.

**Cause E — event name typo.**
`PreToolCall`, `pretooluse`, `Pre-tool-use` — none of these are real. Names are case-sensitive.
**Fix:** see the canonical list in `section-guide.md` Part A.

---

## Symptom: hook fires twice (or N times) per tool call

**Cause A — overlapping matchers.**
Two entries match the same tool, e.g. `"matcher": "Edit"` and `"matcher": "Edit|Write"`. Both fire.
**Fix:** consolidate into one entry with the union matcher, or narrow each to non-overlapping sets.

**Cause B — same hook declared in plugin auto-load AND `plugin.json` `hooks:`.**
v2.1+ auto-loads `hooks/hooks.json`. If `plugin.json` also lists it, you get a duplicate-detection error or double-fire.
**Fix:** remove the `hooks:` entry from `plugin.json`.

**Cause C — same hook declared at user-level AND project-level.**
Both fire, in order.
**Fix:** delete the duplicate. Decide on one scope.

**Cause D — parallel tool calls.**
Claude makes parallel tool calls; `PostToolUse` fires once per call, simultaneously. Looks like duplication, is actually correct.
**Fix:** make the script idempotent (`best-practices.md` §5), not the configuration.

---

## Symptom: hook blocks the tool call when you didn't intend it to

**Cause A — `exit 1` thought to be a warning.**
Only `exit 2` blocks. `exit 1` is non-blocking. If a tool call IS being blocked, the script returned `2`, not `1`.
**Fix:** `echo $?` after the script in a manual run. If it's `2`, find the path that exits `2` and convert to `exit 0` + stderr.

**Cause B — `set -e` tripping on an unrelated command.**
With `set -e`, any command returning non-zero (`grep` finding no match returns 1) terminates the script. The script then exits with that code — and the agent sees `exit 1` (non-blocking) but logs it as an error.
**Fix:** anchor commands that can legitimately return non-zero:
```bash
grep -q "TODO" "$f" || true   # don't trip set -e
```

**Cause C — `pipefail` masking the real exit.**
`set -o pipefail` makes a pipeline return the **first** non-zero exit. A formatter that exits 0 but is piped through a `tee` that fails will surface as failure.
**Fix:** examine the actual failing command with `bash -x` or `bash -v`.

---

## Symptom: stdin is empty inside the script

**Cause A — wrong hook `type`.**
Only `"type": "command"` delivers stdin. There is no other type in v2.1.x, but typos like `"type": "shell"` or omitting the key produce silent no-input behavior.
**Fix:** set `"type": "command"`.

**Cause B — script reads stdin twice.**
The first read drains it; the second gets EOF.
**Fix:** read once into a variable, then parse repeatedly:
```bash
INPUT=$(cat)
TOOL_NAME=$(jq -r '.tool_name' <<< "$INPUT")
FILE_PATH=$(jq -r '.tool_input.file_path' <<< "$INPUT")
```

**Cause C — event has no stdin payload.**
`Notification` and some `SessionStart` invocations may send empty stdin.
**Fix:** check the event's payload shape in `section-guide.md` Part A. Don't read stdin for events that don't send any.

---

## Symptom: hook silently times out

**Cause:** the script runs longer than `timeout` (default 60000 ms). Claude Code kills it with SIGTERM. The agent sees no exit code and proceeds.

**Diagnostic:** time the script directly:
```bash
echo '{"tool_name":"Bash","tool_input":{}}' | time hooks/scripts/<script>.sh
```

**Fix paths:**
- If the script is slow because of a remote call, add `--max-time` (curl) or `timeout=` (Python) per request.
- If the script is genuinely slow work, move it out of the hook (queue file + background worker).
- If the timeout is just too tight, raise it (still set explicitly, never default to 60s).

---

## Symptom: error output not visible to the user or to Claude

**Cause:** message written to stdout instead of stderr for a non-`UserPromptSubmit` event.

**Fix:** stderr is the user-visible channel for warnings and block reasons. stdout is appended to the prompt for `UserPromptSubmit` and otherwise typically logged-only.
```bash
echo "validation failed: $reason" >&2
```

For block messages (`exit 2`), stderr is **the only place** Claude reads the reason from.

---

## Symptom: script "works on my machine" but not in CI / a teammate's clone

**Cause A — hardcoded absolute path.**
`/Users/me/.../validate.sh` doesn't exist anywhere else.
**Fix:** `${CLAUDE_PLUGIN_ROOT}/hooks/scripts/validate.sh`.

**Cause B — missing executable bit.**
`git` preserves the executable bit only if it was set when committed.
**Fix:**
```bash
chmod +x hooks/scripts/*.sh
git update-index --chmod=+x hooks/scripts/*.sh
```

**Cause C — script depends on `jq`, `python3`, or another binary not installed on the target.**
**Fix:** check at script start:
```bash
command -v jq >/dev/null || { echo "jq required" >&2; exit 0; }
```
Fail open for non-security hooks (don't block on missing dev tools).

**Cause D — shebang points to a path that doesn't exist on the target.**
`#!/usr/local/bin/python3` is macOS-Homebrew-specific.
**Fix:** `#!/usr/bin/env python3` and `#!/usr/bin/env bash`. Always.

---

## Symptom: `UserPromptSubmit` hook leaks unexpected content into the conversation

**Cause:** stdout from `UserPromptSubmit` is **appended to the user prompt** before Claude sees it. Any debug `echo`, any `set -x` trace, any `print()` lands in the model context.

**Fix:**
- Send all diagnostics to stderr.
- For intentional context injection, validate the content before printing — same sanitisation discipline as if you were writing the prompt yourself.
- See `security-checklist.md` "Secrets and PII" and `best-practices.md` §7.

---

## Symptom: PostToolUse formatter appends headers / lines repeatedly

**Cause:** non-idempotent mutation. Hook fires every time, appends every time.

**Fix:** see `best-practices.md` §5. Check-before-mutate; design the mutation as a no-op on re-run.

---

## Symptom: `claude --debug` shows hook fired and exited 0, but the side effect didn't happen

**Cause:** the script silently failed mid-way. `set -e` was missing, or an error was suppressed with `|| true` too aggressively.

**Fix:** add `set -euo pipefail` at the top; remove `|| true` except where genuinely needed. Re-run with `bash -x` to see which line stopped working.
