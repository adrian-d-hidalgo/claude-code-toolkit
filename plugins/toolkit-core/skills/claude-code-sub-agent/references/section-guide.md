# Sub-Agent Section Guide

Authoritative per-field reference for every Claude Code sub-agent setting. Read this before authoring or editing any agent .md frontmatter or body section.

Mirrors the official docs at <https://code.claude.com/docs/en/sub-agents>. Snapshot date: see `CURRENT-DOCS-INDEX.md`.

A sub-agent file lives at `.claude/agents/<name>.md` (project), `~/.claude/agents/<name>.md` (user), or `<plugin>/agents/<name>.md` (plugin). The file is YAML frontmatter + markdown body.

**Isolation contract.** A sub-agent gets a **fresh context window**: it inherits **none** of the parent conversation's history, tool calls, or other sub-agents' outputs. The only channel from parent to sub-agent is the `prompt` string passed via the `Agent` / Task tool. Anything the sub-agent needs — file paths, prior decisions, error messages — must be included explicitly there. Only the sub-agent's **final message** returns to the parent; every intermediate tool call stays in the sub-agent's window.

**Name-collision resolution (highest to lowest precedence):** CLI flag (`--agent <name>` in the session) → `.claude/agents/` (project) → `~/.claude/agents/` (user) → plugin-bundled agents.

**Built-in sub-agents** ship with Claude Code and can be invoked or referenced without authoring: `Explore` (read-only file discovery, defaults to Haiku for speed), `Plan` (gathers context during plan mode), `general-purpose` (multi-step exploration + action).

---

## Part A — Frontmatter Fields

Only `name` and `description` are required.

### `name`

- **Purpose** — Unique sub-agent identifier. Used in `/agents`, @-mentions (`@agent-<name>`), `--agent <name>` flag, and `SubagentStart` hook `agent_type`.
- **Required?** — **Yes.**
- **Allowed values** — Lowercase letters and hyphens. Filename doesn't have to match (but should for clarity).
- **What to put in it** — A short kebab-case identifier (`code-reviewer`, `software-developer`, `db-reader`).
- **What NOT to put in it** — Spaces, uppercase, underscores, version suffixes.
- **When to set it** — Always.

### `description`

- **Purpose** — **Routing trigger.** Claude's orchestrator reads this to decide WHEN to delegate to the agent. It is matched against user intent.
- **Required?** — **Yes.**
- **Allowed values** — Plain prose.
- **What to put in it** — Action verb + domain noun + "Use when…" / "Use proactively when…" phrasing.
- **What NOT to put in it** —
  - Implementation details ("uses Read, Grep, Glob and Semgrep internally…").
  - Tool lists.
  - References to other agents or skills by name.
  - Negative scope ("Do NOT use for X" / "delegate Y to Z agent") — that belongs in the body's Scope & boundaries section.
  - First-person voice.
- **Length** — 1–2 sentences, ~20–40 words.
- **Good example**:
  ```yaml
  description: Senior software developer. Use IMMEDIATELY whenever the user asks to write, modify, refactor, debug, or implement code in any language or framework.
  ```
- **Bad example**:
  ```yaml
  description: Senior dev specializing in pragmatic implementation. Applies Think-Before-Coding. Do NOT use for architecture (delegate to software-architect) or code review (delegate to code-reviewer).
  ```
  Why bad: explains implementation, names two external agents, leaks behavioral constraints into the routing signal.

### `tools`

- **Purpose** — Whitelist of tools the agent may use. If omitted, the agent inherits all tools from the parent.
- **Required?** — Optional.
- **Allowed values** — Comma-separated string or YAML list. Tool names from the [tools reference](https://code.claude.com/docs/en/tools-reference). Patterns like `Bash(git *)` and `Agent(worker, researcher)` work.
- **Current built-in tool catalogue** (May 2026) — `Read`, `Write`, `Edit`, `MultiEdit`, `Glob`, `Grep`, `Bash`, `WebFetch`, `WebSearch`, `Task`, `TaskOutput`, `NotebookEdit`, `TodoWrite`, `KillShell`, `AskUserQuestion`. Plus the `Skill` tool (routed via the dedicated `skills` field, not listed here) and `Agent` (rarely granted to sub-agents — sub-agents generally cannot spawn further sub-agents).
- **What to put in it** — The minimum tools the agent needs. Least privilege.
- **What NOT to put in it** — `Skill` in this list — to preload skills, use the dedicated `skills` field instead. Don't list tools the agent never uses.
- **When to set it** — Almost always. Default inheritance is too broad for a focused agent.

### `disallowedTools`

- **Purpose** — Blacklist applied to inherited or whitelisted tools.
- **Required?** — Optional.
- **Allowed values** — Same shape as `tools`.
- **What to put in it** — Tools you want stripped (`Write`, `Edit` for a read-only agent that otherwise inherits everything).
- **When to set it** — When you want the inheritance behavior of "everything except these few".

If both `tools` and `disallowedTools` are set, `disallowedTools` applies first, then `tools` is resolved against the remaining set.

### `model`

- **Purpose** — Model the agent runs on.
- **Required?** — Optional. Default: `inherit`.
- **Allowed values** — `sonnet`, `opus`, `haiku`, a full version ID (e.g. `claude-opus-4-7`), or `inherit`.
- **What to put in it** — Prefer aliases (`opus`, `sonnet`, `haiku`) over full version IDs — aliases auto-resolve to the latest version so the agent stays current. Pair the model choice with `effort:` per the cognitive-load tier in `references/model-effort-matrix.md`.
- **When to pin a full version ID** — Only when you have a specific reason to freeze a version (e.g. a tested-against-this-version eval gate, a known regression in a newer version).
- **Critical constraint** — `effort: xhigh` requires `model: opus` explicitly. Do not pair `xhigh` with `inherit` — see `references/model-effort-matrix.md`.

### `permissionMode`

- **Purpose** — How the agent handles permission prompts.
- **Required?** — Optional. Default: `default`.
- **Allowed values** — `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`.
- **What to put in it** — `default` for interactive work; `acceptEdits` for trusted agents that edit files unattended in a known workspace; `plan` for research-only agents.
- **What NOT to put in it** — `bypassPermissions` in a checked-in or distributed agent. It removes guardrails and can write to `.git`, `.claude`, and other sensitive paths.
- **Parent-mode precedence** — If the parent runs in `bypassPermissions` or `acceptEdits`, that takes precedence. If parent runs in `auto`, the sub-agent inherits auto regardless of its setting.
- **Plugin restriction** — **Ignored when the sub-agent is shipped inside a plugin.** Workaround: copy the agent file into `.claude/agents/` (project) or `~/.claude/agents/` (user) for the field to take effect.

### `maxTurns`

- **Purpose** — Hard cap on the number of agent turns before it stops.
- **Required?** — Optional.
- **Allowed values** — Integer.
- **What to put in it** — A reasonable upper bound for the agent's workflow (e.g. 20 for a code-reviewer, 50 for a debugger).
- **When to set it** — When you want defense against runaway loops in long-running agents.
- **Enforcement caveat** — Reports indicate `maxTurns` is **not reliably enforced** (issue [#41143](https://github.com/anthropics/claude-code/issues/41143), open as of May 2026). Treat as defense-in-depth, not as a hard contract.

### `skills`

- **Purpose** — Skills preloaded into the agent's context at start. The **full skill body** is injected into the sub-agent's system prompt, not just the description.
- **Required?** — Optional.
- **Allowed values** — YAML list of skill names; or the string `"all"` to preload every discovered skill; or `[]` to disable all preloading. Omitting the field leaves runtime discovery via the `Skill` tool available (the sub-agent can still load skills mid-run if it has the tool).
- **Namespacing for plugin skills** — Reference plugin-bundled skills as `<plugin-name>:<skill-name>` (e.g. `claude-code-shared:adr`). Non-plugin skills resolve by bare name across the precedence order: enterprise → user → project.
- **What to put in it** — Domain conventions, style guides, or playbooks the agent must apply on every invocation.
- **What NOT to put in it** — Skills with `disable-model-invocation: true` (won't preload). Skills the agent only sometimes needs (use runtime discovery via the `Skill` tool instead — preload pays the body's context cost on every invocation).
- **When to set it** — When the agent's quality is sensitive to specific conventions you want guaranteed in context.
- **Cross-plugin gotcha** — Cross-plugin skill references are **not currently supported** (issue [#15944](https://github.com/anthropics/claude-code/issues/15944)). A sub-agent inside plugin A cannot preload a skill bundled in plugin B even with the namespaced form. Bundle co-dependent skills with the agent that needs them, or keep them user-level.
- **Missing-skill behavior** — If a name in the list does not resolve, the sub-agent starts **silently** without that skill — no error is raised. Validate the list at authoring time.

**Preload vs runtime decision matrix:**

| Axis             | Preload via `skills:`        | Runtime via `Skill` tool                             |
| ---------------- | ---------------------------- | ---------------------------------------------------- |
| Frequency of use | Every invocation             | Some invocations                                     |
| Context cost     | Paid on every run            | Paid only when invoked                               |
| Load guarantee   | Deterministic at startup     | Depends on the agent invoking it                     |
| Typical example  | `software-architect` + `adr` | `software-architect` + `mermaid` (only when drawing) |

### `mcpServers`

- **Purpose** — MCP servers available to the agent, in addition to or instead of the session-level set.
- **Required?** — Optional.
- **Allowed values** — YAML list. Each entry is either a reference (server name string) or an inline server definition (`stdio` / `http` / `sse` / `ws` shape).
- **What to put in it** — Inline definitions for servers you want scoped to this agent only (keeps tool descriptions out of the parent's context).
- **What NOT to put in it** — Servers irrelevant to the agent's job. Each adds context cost.
- **Ignored for** — Plugin sub-agents (security restriction).

### `hooks`

- **Purpose** — Lifecycle hooks scoped to the agent.
- **Required?** — Optional.
- **Allowed values** — Same shape as `hooks.json` entries (event → matchers → commands). All hook events are supported within a sub-agent definition.
- **What to put in it** — Validators (read-only enforcement, lint runs, etc.) tied to this agent's invocations.
- **`Stop` auto-conversion** — A `Stop` hook declared in a sub-agent's frontmatter is **automatically converted to `SubagentStop`** at load time, so it fires when this sub-agent finishes (not the session). Authoring it as `Stop` is fine; understand the rewrite when debugging.
- **Ignored for** — Plugin sub-agents (security restriction). Move the agent to `.claude/agents/` or `~/.claude/agents/` if hooks are required.

### `memory`

- **Purpose** — Enable a persistent memory directory the agent reads on start and writes during work.
- **Required?** — Optional. Default: none.
- **Allowed values** — `user`, `project`, `local`.
- **What to put in it** —
  - `project` (recommended default) — knowledge specific to this codebase, shareable via version control. Path: `.claude/agent-memory/<name>/`.
  - `user` — knowledge applicable across all your projects. Path: `~/.claude/agent-memory/<name>/`.
  - `local` — project-specific but not checked in. Path: `.claude/agent-memory-local/<name>/`.
- **When to set it** — When the agent benefits from cumulative learning between sessions (debuggers, reviewers, refactorers). Skip for transient task agents.
- **Side effect** — Setting any memory scope force-enables `Read`, `Write`, `Edit` on the agent.

### `background`

- **Purpose** — Always run this agent as a background task.
- **Required?** — Optional. Default: `false`.
- **Allowed values** — `true` / `false`.
- **What to put in it** — `true` for agents that produce streaming output you want to monitor in a panel while you keep working.
- **Note** — Background agents auto-deny any permission prompt that would otherwise be issued.

### `effort`

- **Purpose** — Override the session reasoning effort for this agent's turns.
- **Required?** — Optional. Default: inherit (from session).
- **Allowed values** — `low`, `medium`, `high`, `xhigh`, `max`. Availability depends on the model — see `references/model-effort-matrix.md` for the compatibility table.
- **Critical constraint** — Always pair with `model:` per the cognitive-load tier rubric in `references/model-effort-matrix.md`. **`xhigh` requires `model: opus` explicitly** — pairing it with `model: inherit` or `model: sonnet` will fail.
- **Hard rule** — Never default any agent to `effort: max`. Anthropic docs explicitly warn against it. Justification, evidence, and decision tree all live in `references/model-effort-matrix.md` — it is the single source of truth for picking `effort:`.

### `isolation`

- **Purpose** — Run the agent against an isolated copy of the repo (a temporary git worktree).
- **Required?** — Optional. Default: none.
- **Allowed values** — `worktree`.
- **When to set it** — When the agent edits files and you want the changes contained until you've reviewed them. Worktree is auto-cleaned if no changes are made.
- **Known open bugs (May 2026)** — Treat the worktree as best-effort; check the working directory before merging an agent's output:
  - Silent failure: agent can run in main repo instead of worktree without raising ([#39886](https://github.com/anthropics/claude-code/issues/39886)).
  - Branch-name collision: derived from an 8-hex agent-id prefix; stale branch from a prior session is silently reused ([#51596](https://github.com/anthropics/claude-code/issues/51596)).
  - Wrong base commit: worktree branches from `origin/main` instead of current HEAD ([#43535](https://github.com/anthropics/claude-code/issues/43535)).
  - Nested worktrees: context compaction can drift the orchestrator CWD into a prior worktree path, causing subsequent dispatches to nest and potentially commit to main ([#27881](https://github.com/anthropics/claude-code/issues/27881)).

### `color`

- **Purpose** — Display color in `/agents` and transcripts.
- **Required?** — Optional.
- **Allowed values** — `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`.
- **When to set it** — Always set something so the agent is visually distinguishable.

### `initialPrompt`

- **Purpose** — First user message auto-sent when the agent runs as the session's main agent (via `--agent` or `agent` setting).
- **Required?** — Optional.
- **Allowed values** — Plain prose. Slash commands and skill invocations are processed.
- **When to set it** — When the agent is meant to be the session's entry point and needs an opening directive.

---

## Part B — Body / System Prompt Structure

The markdown body becomes the agent's system prompt. The agent does **not** inherit Claude Code's main system prompt — only this body plus minimal environment metadata. Write defensively.

Recommended sections, in order:

1. **Role statement** — one sentence. "You are a Senior Software Developer."
2. **Behavior rules** — numbered, terse, imperative. Claude weights early content heavily, so put the non-negotiables here.
3. **Hard rules / invariants** — what the agent must never do (no `--no-verify`, no destructive shortcuts, etc.).
4. **Anti-patterns** — patterns to reject even if requested.
5. **Workflow** — the standard sequence the agent follows for any task.
6. **Scope & boundaries** — generic component-type list of what the agent does NOT cover. **Never** name specific external agents.
7. **Reporting format** — how the agent should summarize results.

The body must:

- Use imperative ("Read the file before editing", not "I will read the file").
- State invariants, not narration.
- Be ≤200 lines. Push deep playbooks into `references/` of the agent's directory (if used) or into a preloaded skill.

The body must NOT:

- Repeat the description verbatim.
- Carry trigger language.
- Mention specific external agents/skills/projects.

---

## Part D — Best Practices (May 2026)

### D.1 — Open with a domain statement, not a persona

`"You are a senior security engineer"` is a persona. `"You are a security review agent responsible for STRIDE threat modeling and OWASP Top 10 triage on code diffs"` is a domain statement.
Reason: domain statements constrain scope operationally; persona statements inflate self-image without restricting behavior.
Source: <https://www.pubnub.com/blog/best-practices-for-claude-code-sub-agents/> (May 2026).

### D.2 — Set `permissionMode` explicitly

Default permission inheritance from the parent session is rarely "safe". Trusted edit-allowed agents: `acceptEdits`. Read-only research agents: `plan`. Default-cautious agents: `default`.
Reason: defaulting to inherited permissions silently expands or contracts the agent's privilege depending on session state.
Source: <https://code.claude.com/docs/en/sub-agents>.

### D.3 — Parallel dispatch threshold: 3+ independent tasks with non-overlapping file paths

Claude Code's orchestrator decides parallel vs sequential dispatch by file-path overlap. Document in the agent `description` (or body workflow) which paths the agent owns.
Reason: agents that don't surface their working surface get serialized unnecessarily, or worse, run concurrently against shared files.
Source: <https://github.com/Piebald-AI/claude-code-system-prompts>; <https://claudefa.st/blog/guide/agents/sub-agent-best-practices>.

### D.4 — Curate `memory:`; do not forward CLAUDE.md wholesale

CLAUDE.md is assembled for the orchestrator. Sub-agents inherit it unless `memory:` overrides it explicitly. List only the files the agent needs.
Reason: forwarding the whole CLAUDE.md plus domain instructions dilutes specialization with globally-scoped noise.
Source: <https://www.humanlayer.dev/blog/writing-a-good-claude-md>.

### D.5 — `model: inherit` is the default; override only when the task demands it

Setting `model: inherit` propagates the orchestrator's choice. An explicit override pins the agent to a tier regardless of the user's session model — a maintenance liability and a cost surprise.
Reason: users pick a model at session start; agents should respect that choice unless their correctness depends on a specific tier.
Source: <https://code.claude.com/docs/en/sub-agents>.

### D.6 — `isolation: worktree` for agents that write, not for read-only agents

A fresh worktree per invocation is correct for agents that need to mutate without contaminating the working tree (QA, refactor, multi-attempt exploration). The worktree auto-cleans when no commit is made.
Reason: adding worktree overhead to a read-only agent costs latency with no benefit.
Source: <https://claudefa.st/blog/guide/development/worktree-guide>.

### D.7 — Add a "What this agent does NOT do" section to the body

Use generic activity descriptions ("architecture decisions with no implementation step"), not named external agents. The pattern is established in `anthropics/claude-plugins-official/plugins/feature-dev/agents/`.
Reason: scope creep across sibling agents is the dominant failure mode in agent suites.
Source: <https://github.com/anthropics/claude-plugins-official/tree/main/plugins/feature-dev/agents>.

---

## Part C — Pre-ship Checklist

- [ ] `name` is kebab-case, ≤64 chars, matches `/agents` typeahead.
- [ ] `description` is a pure routing trigger — no internal mechanism, no cross-agent refs, no negative scope.
- [ ] `tools` is least-privilege; every tool is actually used by the body.
- [ ] `permissionMode` is `default` unless there's a documented reason; never `bypassPermissions` for distribution.
- [ ] `model: inherit` unless the agent genuinely needs a specific model.
- [ ] Body opens with role + numbered rules; ends with generic Scope & boundaries + Reporting format.
- [ ] Body ≤200 lines.
- [ ] No mention of external agents/skills/projects.
- [ ] If `memory:` is set, the agent's body includes instructions to curate it.
- [ ] Validator passes.
