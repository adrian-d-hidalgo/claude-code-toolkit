# Hook Handler Types

Claude Code supports **five** hook handler types. Source: <https://code.claude.com/docs/en/hooks>. Snapshot date: see `CURRENT-DOCS-INDEX.md`.

| Type       | What it runs                                                                                | When to use                                                                                                                  | Restrictions                                                         |
| ---------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `command`  | Shell command (Bash on Unix, PowerShell on Windows)                                         | Default for everything; the most flexible                                                                                    | Hooks block the agent loop — keep fast                               |
| `http`     | POSTs the stdin JSON to a URL; consumes the response as if it were the script's stdout/exit | When the policy logic lives in a remote service (security gateway, ABAC engine)                                              | Network latency; failure modes (timeout, 5xx) need explicit handling |
| `mcp_tool` | Invokes an MCP server's tool with the stdin JSON                                            | When the policy logic lives in an MCP server you already run                                                                 | Requires the MCP server to be registered in the session              |
| `prompt`   | Runs a single-turn LLM prompt; the model returns a yes/no decision JSON                     | When the policy decision is judgmental and benefits from LLM reasoning (e.g., "is this Bash command obviously destructive?") | Token + latency cost on every invocation; non-determinism            |
| `agent`    | Spawns a sub-agent to handle the hook (experimental)                                        | When the hook needs full agentic reasoning over the event                                                                    | Heaviest; experimental — feature surface may change                  |

---

## Per-type schema

### `command`

```json
{
  "type": "command",
  "command": "./scripts/validate-bash.sh",
  "timeout": 5000,
  "shell": "bash"
}
```

- `command` — shell command or script path.
- `timeout` — milliseconds; default 60000.
- `shell` — `bash` (default) or `powershell` (Windows). Required only on Windows.

### `http`

```json
{
  "type": "http",
  "url": "https://policy.example.com/hooks/pre-tool-use",
  "headers": { "Authorization": "Bearer ${POLICY_TOKEN}" },
  "allowedEnvVars": ["POLICY_TOKEN"],
  "timeout": 5000
}
```

- `url` — HTTPS endpoint that receives the stdin JSON as POST body.
- `headers` — additional request headers. Supports `${ENV_VAR}` substitution from `allowedEnvVars`.
- `allowedEnvVars` — whitelist of environment variables that may be referenced in `headers` / `url`.
- The endpoint should respond with the structured stdout JSON contract (see `json-contract.md`).

### `mcp_tool`

```json
{
  "type": "mcp_tool",
  "server": "policy-server",
  "tool": "evaluate_pretool",
  "timeout": 5000
}
```

- `server` — name of the MCP server registered in the session.
- `tool` — name of the tool to invoke on that server.
- The tool's response replaces the script's stdout — same JSON contract applies.

### `prompt`

```json
{
  "type": "prompt",
  "prompt": "The user is about to run: {{tool_input.command}}. Is this destructive in a way that warrants halting? Answer yes/no with one sentence of reasoning.",
  "model": "haiku",
  "timeout": 10000
}
```

- `prompt` — instruction string. Supports stdin field interpolation via `{{...}}` (e.g. `{{tool_input.command}}`).
- `model` — model alias or full ID. Prefer Haiku for cost / speed.
- The LLM response is parsed for a decision; expects a structured "allow/deny" answer in a known shape (see official docs for the canonical parsing rules).

### `agent`

```json
{
  "type": "agent",
  "agent": "security-reviewer",
  "prompt": "Evaluate whether tool input is safe to execute: {{tool_input}}",
  "timeout": 30000
}
```

- `agent` — sub-agent identifier.
- `prompt` — initial prompt passed to the sub-agent.
- The sub-agent's final message is parsed for a decision.
- **Experimental.** Use sparingly; full sub-agent spawn cost per event is high.

---

## Picking the right handler

1. Default to `command`. Most hooks are simple enough that a shell script + `jq` solves the problem.
2. Use `http` when the policy lives in a service you already run and want centralized.
3. Use `mcp_tool` when you already have an MCP-based policy engine for other reasons.
4. Use `prompt` when the decision is judgmental and a Haiku-class model gives better answers than hand-coded rules.
5. Use `agent` only when the hook is genuinely agentic (multi-step exploration to decide) — accept the cost and the experimental status.

---

## Event-by-handler-type support

Most events accept all five handler types. Known restrictions (May 2026):

- `SessionStart` and `Setup` — `command` and `mcp_tool` only.
- Other events that gate critical flow (`PreToolUse`, `PermissionRequest`) accept all five but pay attention to latency: a `prompt` or `agent` handler on `PreToolUse` blocks every tool call by its latency budget.

Always profile latency in production. A `prompt` handler at 10 s per tool call is unusable.
