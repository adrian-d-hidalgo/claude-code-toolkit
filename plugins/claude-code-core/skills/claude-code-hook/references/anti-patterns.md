# Anti-patterns — hook authoring

## Adding a `description` or `comment` field to a hook entry

**Pattern**:
```json
{ "matcher": "Bash", "description": "Block destructive bash", "hooks": [ … ] }
```

**Why wrong**: `description` is not in the schema. It's silently ignored or, in stricter parsers, errors out.

**Fix**: Move the explanation to the surrounding README or to a comment in the script itself.

## Declaring `hooks/hooks.json` in `plugin.json`

**Pattern**: Plugin has `hooks/hooks.json` AND `"hooks": ["hooks/hooks.json"]` in `plugin.json`.

**Why wrong**: Claude Code 2.1+ auto-loads `hooks/hooks.json`. Declaring it again triggers a duplicate-detection error.

**Fix**: Remove the entry from `plugin.json`. Auto-load handles it.

## Overbroad matcher

**Pattern**: `"matcher": ".*"` on `PreToolUse` when only `git push` matters.

**Why wrong**: The hook fires on every tool call, blocking critical-path latency.

**Fix**: Narrow the matcher: `"matcher": "Bash"` plus filtering inside the script.

## Network calls in a `PreToolUse` hook

**Pattern**: Hook script `curl`s a remote API to decide whether to allow the tool call.

**Why wrong**: `PreToolUse` blocks until the script returns. Remote calls add user-visible latency to every tool invocation.

**Fix**: Cache results locally, do remote checks asynchronously, or move to `PostToolUse` if blocking isn't critical.

## Exit 2 for warnings

**Pattern**: Script exits 2 when something is mildly suspicious.

**Why wrong**: Exit 2 **blocks** the tool call. The user sees "Blocked: …" and has to retry.

**Fix**: Exit 0 + write a warning to stderr. Reserve exit 2 for genuine blocks.

## Hardcoded absolute path in `command`

**Pattern**: `"command": "/Users/me/scripts/validate.sh"`.

**Why wrong**: Breaks for every other installation.

**Fix**: `"command": "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/validate.sh"`.

## No `timeout`

**Pattern**: Hook script that can run for >60 s with no `timeout` set.

**Why wrong**: Default timeout (60 s) blocks the user's tool call. Long-running work doesn't belong in a hook.

**Fix**: Set an aggressive `timeout` (e.g. 5000 ms). If work exceeds that, move it out of the hook.

## Reading secrets to stdout

**Pattern**: Hook script reads an env var or file and prints it to stdout.

**Why wrong**: For `UserPromptSubmit`, stdout is **appended to the prompt** — the secret ends up in Claude's context. For other events, stdout is usually logged.

**Fix**: Validate without printing. If you must redact, do it in the script.

## `eval` on stdin

**Pattern**: `eval "$(cat)"` or `bash -c "$(cat)"` inside a hook script.

**Why wrong**: Stdin is JSON from Claude Code — but if a prompt-injection or malformed input slips in, you've handed remote code execution to whoever wrote the input.

**Fix**: Parse the JSON with `jq` or a real JSON parser. Never `eval`.

## Forgetting to make scripts executable

**Pattern**: Hook configured, script committed, but `chmod +x` not run.

**Why wrong**: Hook fails silently on macOS/Linux. User sees no obvious cause.

**Fix**: `chmod +x scripts/*.sh` before shipping. In plugins, document this in the README.

## Idempotency violations in `PostToolUse`

**Pattern**: `PostToolUse` formatter that appends a line each time it runs.

**Why wrong**: Some workflows trigger the hook multiple times (retries, sub-agent stops). Side effects accumulate.

**Fix**: Make the script idempotent — checking before mutating, or designing the mutation as a no-op on re-run.

## Inline command instead of script

**Pattern**: `"command": "if grep -q 'TODO' $FILE; then echo blocked; exit 2; fi"`.

**Why wrong**: Inline command grows fragile fast. Hard to test, hard to read in `hooks.json`.

**Fix**: Move the logic into `scripts/<name>.sh` and call it: `"command": "${CLAUDE_PLUGIN_ROOT}/scripts/<name>.sh"`.
