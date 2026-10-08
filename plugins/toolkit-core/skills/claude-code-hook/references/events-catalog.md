# Hook Events Catalog

Complete catalog of Claude Code hook lifecycle events. Mirrors the official docs at <https://code.claude.com/docs/en/hooks>. Snapshot date: see `CURRENT-DOCS-INDEX.md`.

Claude Code documents **31 events** as of May 2026. Group them by lifecycle stage:

- **Session boundary** — `SessionStart`, `Setup`, `SessionEnd`
- **Prompt lifecycle** — `UserPromptSubmit`, `UserPromptExpansion`
- **Tool lifecycle** — `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`
- **Notification & surface** — `Notification`, `InstructionsLoaded`, `ConfigChange`, `TerminalSequence` (via stdout fields, not event)
- **Sub-agent lifecycle** — `SubagentStart`, `SubagentStop`, `TeammateIdle`
- **Task lifecycle** — `TaskCreated`, `TaskCompleted`
- **Turn lifecycle** — `Stop`, `StopFailure`
- **Filesystem / workspace** — `CwdChanged`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`
- **Compaction** — `PreCompact`, `PostCompact`
- **Elicitation** (interactive prompts) — `Elicitation`, `ElicitationResult`

Each entry below lists: when it fires, whether it accepts a `matcher`, what to use it for, and any per-event stdin/stdout specifics. Universal fields (`session_id`, `transcript_path`, `cwd`, `permission_mode`, `effort`, `hook_event_name`) are in `json-contract.md` and omitted here for brevity.

---

## Session boundary

### `SessionStart`

- **When** — Once at session startup.
- **Matcher** — None.
- **stdin extras** — `source` (`startup` | `resume` | `clear` | `compact`).
- **stdout** — `hookSpecificOutput.additionalContext` is **added to Claude's context** as session-level context (similar to `UserPromptSubmit` injection but at startup).
- **Use for** — Environment setup, opening DB connections, injecting org-level context, repo-state snapshot.
- **Supported handler types** — `command`, `mcp_tool`.

### `Setup`

- **When** — Once before `SessionStart`, used for environment preparation that other startup hooks depend on.
- **Matcher** — None.
- **stdout** — `hookSpecificOutput.additionalContext` accepted, same semantics as `SessionStart`.
- **Use for** — Preflight checks; secrets loading; environment-variable assertions.

### `SessionEnd`

- **When** — Once at session end.
- **Matcher** — None.
- **Use for** — Teardown, flush logs, close DB connections, commit telemetry batches.

---

## Prompt lifecycle

### `UserPromptSubmit`

- **When** — Before Claude sees the user's typed prompt.
- **Matcher** — None.
- **stdin extras** — `prompt` (the user-typed text).
- **stdout** — If non-empty, **appended to the prompt Claude receives**. Structured: `hookSpecificOutput.additionalContext` and `hookSpecificOutput.sessionTitle`.
- **Exit 2** — Rejects the prompt entirely.
- **Security note** — stdout is the channel by which content injects into Claude's view of "what the user said". Echoing secrets or env values here leaks them into the model and into any prompt-injection-attacker's hands.
- **Use for** — Auto-injecting current branch / cwd / env state; guard rails ("the user is asking about X — load context Y first").

### `UserPromptExpansion`

- **When** — During prompt expansion (resolution of `@-imports`, skill / command references) before Claude sees the final prompt.
- **Matcher** — None.
- **stdout** — Same `hookSpecificOutput` shape as `UserPromptSubmit`.
- **Use for** — Custom expansion logic, rewriting prompt boilerplate.

---

## Tool lifecycle

### `PreToolUse`

- **When** — After Claude creates tool parameters, before the tool executes.
- **Matcher** — Regex against `tool_name`.
- **stdin extras** — `tool_name`, `tool_input`, `tool_use_id`. Plus `agent_id` and `agent_type` when running inside a sub-agent.
- **stdout (structured)** — `hookSpecificOutput.permissionDecision` (`allow` | `deny` | `ask` | `defer`), `permissionDecisionReason`, `additionalContext`, `modifiedInput` (replaces `tool_input` before the tool runs).
- **Exit 2** — Block the tool call; stderr returned to Claude as the reason.
- **Use for** — Validation, sandbox-policy enforcement, tool-input rewriting, last-mile linting before destructive operations.

### `PermissionRequest`

- **When** — When Claude requests a permission for a tool call.
- **Matcher** — Tool name or permission rule.
- **stdout (structured)** — `hookSpecificOutput.decision` with `behavior` (`allow` | `deny`), `updatedInput` (modified `tool_input`), `applyPermissionRule` (e.g. `Rule(...)` to persist the decision).
- **Use for** — Policy-driven permission decisions; auto-allow based on signed user identity; auto-deny for paths matching exclusion rules.

### `PermissionDenied`

- **When** — After a permission has been denied (by Claude, user, or policy).
- **Matcher** — Tool name or rule.
- **Use for** — Audit log of denied operations; alerting on attempts to access sensitive paths.

### `PostToolUse`

- **When** — After tool executes successfully.
- **Matcher** — Regex against `tool_name`.
- **stdin extras** — `tool_name`, `tool_input`, `tool_response`, `tool_use_id`. Plus `agent_id` / `agent_type` in sub-agent context.
- **stdout (structured)** — `decision: "block"` + `reason` (blocks Claude's next turn — the tool call already happened and cannot be undone). `hookSpecificOutput.additionalContext` injects additional context.
- **Concurrency** — Fires **once per tool simultaneously** when Claude makes parallel tool calls. Scripts must be idempotent.
- **Use for** — Linting / formatting after edits, indexing after writes, audit logging.

### `PostToolUseFailure`

- **When** — After a tool execution fails (non-zero exit / exception).
- **Matcher** — `tool_name`.
- **stdin extras** — Same as `PostToolUse` plus error fields.
- **Use for** — Incident logging, automatic retry hints, surfacing failures to telemetry.

### `PostToolBatch`

- **When** — After a batch of parallel tool calls completes (all of them).
- **Matcher** — None typically; some configs accept matchers on the batch shape.
- **Use for** — Batch-level reconciliation, follow-up actions that depend on the full batch result.

---

## Notification & surface

### `Notification`

- **When** — When Claude Code surfaces a notification.
- **Matcher** — Notification type.
- **Use for** — Custom notification routing (Slack webhook, macOS `osascript` sound, mobile push).

### `InstructionsLoaded`

- **When** — After Claude has loaded CLAUDE.md, AGENTS.md, and all auto-loaded instruction files for the session.
- **Matcher** — None.
- **stdin extras** — Includes which files loaded, sizes, and (in some implementations) the loaded content.
- **Use for** — Debugging which files are in context (the canonical use); auditing instruction footprint; flagging missing files.

### `ConfigChange`

- **When** — When the runtime configuration changes (settings.json edit, marketplace add/remove, plugin enable/disable).
- **Matcher** — Optional; some configs accept a key-pattern matcher.
- **stdout** — `decision: "block"` + `reason` rejects the change.
- **Use for** — Policy enforcement on settings; preventing accidental disable of safety hooks.

---

## Sub-agent lifecycle

### `SubagentStart`

- **When** — When a sub-agent created via the Task / Agent tool starts.
- **Matcher** — Sub-agent `name`.
- **stdin extras** — `agent_id`, `agent_type`, sub-agent prompt.
- **Use for** — Setup specific to an agent (open DB, set env), telemetry.

### `SubagentStop`

- **When** — When a sub-agent finishes.
- **Matcher** — Sub-agent `name`.
- **stdin extras** — `agent_id`, `agent_transcript_path`, `tool_use_id`, `stop_hook_active`, `last_assistant_message`.
- **stdout (structured)** — `decision: "block"` + `reason` (blocks parent from receiving the sub-agent's output).
- **Auto-conversion note** — A `Stop` hook declared inside a sub-agent's frontmatter is automatically rewritten to `SubagentStop` at load time.
- **Use for** — Per-agent cleanup; sub-agent output validation.

### `TeammateIdle`

- **When** — When a teammate-class agent goes idle waiting for input.
- **Matcher** — Teammate name.
- **Use for** — Detecting stuck teammates; auto-resume; escalation.

---

## Task lifecycle

### `TaskCreated`

- **When** — When a new task (TodoWrite, Task tool, scheduled task) is created.
- **Matcher** — Task type or source.
- **Use for** — External task tracker mirroring; auditing.

### `TaskCompleted`

- **When** — When a task transitions to completed state.
- **Matcher** — Task type or ID pattern.
- **Use for** — Notification on long-running task completion; telemetry.

---

## Turn lifecycle

### `Stop`

- **When** — When Claude finishes its turn / overall response.
- **Matcher** — None.
- **stdin extras** — `stop_hook_active`, `last_assistant_message` (optional).
- **stdout (structured)** — `decision: "block"` + `reason` blocks completion (Claude continues to a next turn).
- **Sub-agent variant** — Auto-converted to `SubagentStop` inside sub-agent frontmatter.
- **Use for** — End-of-turn notifications, sound effects, telemetry, automatic checkpointing.

### `StopFailure`

- **When** — When the `Stop` hook itself fails or the turn ends in error.
- **Matcher** — None.
- **Use for** — Cleanup that must run even on error paths; alerting.

---

## Filesystem / workspace

### `CwdChanged`

- **When** — When Claude's current working directory changes (via `cd` or equivalent).
- **Matcher** — Path pattern.
- **Use for** — Auto-loading subdirectory-specific context; detecting drift into unexpected paths.

### `FileChanged`

- **When** — When a watched file changes (outside of Claude's own edits).
- **Matcher** — File path glob.
- **Use for** — Re-running typecheck on `tsconfig.json` change; reloading config on `.env` change.

### `WorktreeCreate`

- **When** — When a sub-agent worktree is created (`isolation: worktree`).
- **Matcher** — Agent name.
- **Use for** — Setup specific to the worktree (install deps, set env).

### `WorktreeRemove`

- **When** — When a sub-agent worktree is cleaned up.
- **Matcher** — Agent name.
- **Use for** — Teardown; archiving the worktree contents before removal.

---

## Compaction

### `PreCompact`

- **When** — Before Claude Code auto-compacts the conversation (summarizes context to free token budget).
- **Matcher** — None.
- **stdin extras** — `trigger` (`manual` | `auto`), `custom_instructions`.
- **stdout (structured)** — `decision: "block"` + `reason` cancels compaction.
- **Use for** — Snapshotting state before summarization; injecting custom compaction directives.

### `PostCompact`

- **When** — After compaction completes.
- **Matcher** — None.
- **Use for** — Re-injecting state that compaction may have discarded; logging compaction cost.

---

## Elicitation

### `Elicitation`

- **When** — When Claude or a tool requests interactive input from the user (clarifying questions, confirmation prompts).
- **Matcher** — Elicitation type.
- **Use for** — Auto-answering deterministic prompts; routing to alternative UI.

### `ElicitationResult`

- **When** — After the user responds to an elicitation.
- **Matcher** — Elicitation ID.
- **Use for** — Logging user answers; downstream processing of the response.

---

## Cross-cutting notes

- **Matcher absence** — Events without a matcher (most prompt-, turn-, and session-level events) fire on every occurrence regardless of context. Use specificity inside the script (filter on stdin fields) rather than in the matcher.
- **Universal stdout fields** — Every event accepts `continue`, `stopReason`, `suppressOutput`, `systemMessage`, `terminalSequence` (see `json-contract.md`). These work regardless of the event's specific `hookSpecificOutput` shape.
- **Per-event support of handler types** — Most events accept all five handler types (`command`, `http`, `mcp_tool`, `prompt`, `agent`). `SessionStart` and a few others restrict to `command` + `mcp_tool`. See `handler-types.md`.
