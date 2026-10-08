# Security Checklist — hook authoring

Hooks run with **the full privilege of the user running Claude Code**. There is no sandbox. A bad hook can `rm -rf $HOME`, exfiltrate env vars, or escalate via `sudo` if the user is in the sudoers file. Audit accordingly.

Source: <https://code.claude.com/docs/en/hooks>. Prompt-injection background: <https://www.truefoundry.com/docs/concepts/prompt-injection>.

Walk this checklist before merging any hook. Each item: what to check, why, how to fix.

---

## Filesystem permissions

- [ ] **No `chmod 777`, `chmod -R 777`, or `chmod a+rwx` anywhere in the script.**
  Why: makes the file world-writable, allowing any local process to tamper with the script Claude Code will execute next turn.
  Fix: use `chmod 755` for executables, `chmod 644` for data, `chmod 600` for anything sensitive.

- [ ] **No `umask 000` or `umask 0` calls.**
  Why: same effect as `chmod 777` for any file the script creates afterward.
  Fix: leave the inherited umask alone. If you must set it, use `umask 022`.

## Shell evaluation

- [ ] **No `eval`, `bash -c`, `sh -c`, or `source` on any value derived from stdin, `tool_input`, or `prompt`.**
  Why: stdin is structured data that may carry prompt-injection content; `tool_input.command` is literally the command Claude wants to run. Evaluating either hands arbitrary code execution to whoever shaped the prompt.
  Fix: parse with `jq -r` or `json.loads`, then compare strings. Never re-execute.

- [ ] **No `curl … | bash`, `wget -O - … | sh`, or any pipe-to-shell of a network resource.**
  Why: the remote payload is whatever the upstream server decides at the moment of the request — not what the author audited.
  Fix: pin the dependency at install time, vendor it in the plugin, and call the local copy.

- [ ] **No unquoted variable expansion inside `command` or scripts.**
  Why: `rm $FILE` where `FILE=" foo /etc/passwd"` deletes `/etc/passwd`.
  Fix: always quote: `rm -- "$FILE"`. Use `--` to terminate option parsing.

## Path validation

- [ ] **Reject `file_path` containing `..` segments.**
  Why: `tool_input.file_path` is attacker-controllable; `..` traversal escapes the workspace.
  Fix:
  ```bash
  case "$FILE_PATH" in *..*) echo "rejected: traversal" >&2; exit 2;; esac
  ```

- [ ] **Reject `file_path` that is a symlink to outside the workspace.**
  Why: a symlink at `./innocent.txt → /etc/shadow` lets a write hook silently target arbitrary system files.
  Fix:
  ```bash
  REAL=$(realpath -- "$FILE_PATH")
  case "$REAL" in "$PWD"/*) ;; *) echo "rejected: outside workspace" >&2; exit 2;; esac
  ```

- [ ] **Resolve `file_path` to an absolute path before any check, not after.**
  Why: checking a relative path then operating on the absolute one races against `chdir`.
  Fix: `realpath -- "$FILE_PATH"` (Linux/macOS) or `pathlib.Path(p).resolve(strict=False)` in Python, **once**, and use the resolved path thereafter.

- [ ] **Hardcoded absolute paths are workspace-relative only, never under `/etc`, `/root`, `/var`, `/usr`.**
  Why: hooks have no business mutating system directories.
  Fix: confine writes to `${CLAUDE_PLUGIN_ROOT}`, the project root, or `${XDG_STATE_HOME}`.

## Secrets and PII

- [ ] **No `echo $SECRET`, `echo $TOKEN`, `cat .env`, or printing of any environment variable to stdout.**
  Why: for `UserPromptSubmit` stdout is appended to Claude's prompt — the secret ends up in the model context and any downstream telemetry. For other events, stdout is logged or shown to the user.
  Fix: validate without printing. If a secret must influence output, hash it or compare it in-place and emit only a boolean.

- [ ] **No `env | grep …` or `set` written to stdout.**
  Why: dumps the entire environment, including `AWS_SECRET_ACCESS_KEY`, `GH_TOKEN`, etc.
  Fix: never dump env. If you must read a specific var, name it: `"$AWS_REGION"`.

- [ ] **`tool_input` payloads are NOT logged verbatim.**
  Why: `tool_input` for `Write`/`Edit` includes the full file contents — which may contain secrets pasted from `.env` or a password manager.
  Fix: log `tool_name`, `file_path`, and a SHA-256 of `tool_input` if you need correlation. Never the raw payload.

## stdin and shell argument handling

- [ ] **Stdin is read once into a variable, then parsed; never piped twice.**
  Why: reading stdin twice gets empty content the second time, silently breaking the second consumer.
  Fix:
  ```bash
  INPUT=$(cat)
  echo "$INPUT" | jq -r '.tool_name'
  echo "$INPUT" | jq -r '.tool_input.file_path'
  ```

- [ ] **Stdin parsing uses `jq -r` or `json.loads`, never regex.**
  Why: JSON has escape sequences, nested structures, and unicode — regex parsers misread them and let injected content through.
  Fix: use a real JSON parser.

- [ ] **No `$@`, `$*`, or `$1` used inside hook scripts.** Hook scripts receive **no** positional args; data is on stdin.
  Why: if you treat positional args as input, a future Claude Code change that adds args becomes silent corruption.
  Fix: read stdin only.

## Process hygiene

- [ ] **No `sudo`, `doas`, `pkexec`, `su` invocations.**
  Why: hooks run unattended; an interactive password prompt hangs the agent loop, and a passwordless sudo entry escalates a script bug to a root compromise.
  Fix: design the operation to work without elevation. If elevation is genuinely needed, the work does not belong in a hook.

- [ ] **No background processes (`&`, `nohup`, `disown`) launched from a hook.**
  Why: orphaned processes accumulate across sessions; users have reported leaking dozens of zombie watchers.
  Fix: do the work synchronously and exit, or use a real scheduler (`launchd`, `systemd --user`, `cron`).

- [ ] **No persistent state writes to user's home root** (`~/file`, `~/.config/file` outside an app-specific subdir).
  Why: pollutes `$HOME`; hard to clean up; conflicts with other tools.
  Fix: write under `${XDG_STATE_HOME:-$HOME/.local/state}/<plugin>/`.

## Network egress

- [ ] **No outbound network calls in `PreToolUse`.**
  Why: every tool call now depends on a remote service. One outage stalls every tool call for the full timeout.
  Fix: cache decisions locally, or move the check to `PostToolUse` (non-blocking).

- [ ] **Any outbound call enforces a `--max-time` (curl) or `timeout=` (Python).**
  Why: without a per-request timeout, a hung TCP connection burns the hook's full `timeout` budget.
  Fix: `curl --max-time 2`, `requests.get(url, timeout=2)`.

## Audit-trail

- [ ] **Security-relevant decisions (`exit 2` blocks) log who/what/why to an append-only log.**
  Why: a security hook with no audit trail is unreviewable after the fact.
  Fix: write a JSON-lines record on every block: `{ts, tool_name, reason, sha256(tool_input)}`.

## Final principle

Default to least privilege: read only what you need, write only where you must, return only the boolean answer the hook exists to produce.
