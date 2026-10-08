# Slash Command Section Guide

Authoritative per-field reference for every Claude Code slash command setting.

Slash commands live at `.claude/commands/<name>.md` (project), `~/.claude/commands/<name>.md` (user), or `<plugin>/commands/<name>.md` (plugin). They are YAML frontmatter + markdown body.

> **Important context.** Slash commands and skills have **merged** in Claude Code 2.x. A skill at `.claude/skills/<name>/SKILL.md` automatically exposes `/<name>`. Slash commands at `.claude/commands/<name>.md` still work and accept the same frontmatter as skills. For new work, prefer a skill — you get the supporting-files capability for free. See `command-vs-skill.md` for the decision guide.
>
> **Precedence under name collision.** When a skill and a command share the same name, the **skill wins** (shipped in Claude Code v2.1.101, April 2026). Treat `.claude/commands/<name>.md` as legacy for new authoring.

Mirrors the official docs at <https://code.claude.com/docs/en/commands> + the skills page (they share frontmatter). Snapshot date: see `CURRENT-DOCS-INDEX.md`.

---

## Part A — Frontmatter Fields

Slash command frontmatter is a strict subset of the skill frontmatter. All fields are optional unless noted.

### `name`

- **Purpose** — Slash-command identifier. The user types `/<name>`.
- **Required?** — Optional. Default: derived from the filename.
- **Allowed values** — Lowercase letters, digits, hyphens. ≤64 chars.
- **What to put in it** — Same as the filename minus `.md`, kebab-case.
- **What NOT to put in it** — Spaces, uppercase, version suffixes.

### `description`

- **Purpose** — **UX label** shown in the `/` menu when the user types `/`. Also loaded into context so Claude can auto-invoke (unless `disable-model-invocation: true`).
- **Required?** — Strongly recommended.
- **Allowed values** — Plain prose.
- **What to put in it** — A short **imperative phrase** describing what running the command will do.
- **What NOT to put in it** —
  - "Use when…" trigger language (irrelevant — the user is invoking explicitly).
  - References to other commands or skills.
  - Long sentences (under 20 words).
  - Internal mechanism.
- **Length / budget** — Combined description budget across all installed commands and skills is **1% of the model's context window** (fallback **8,000 characters**). When overflow occurs, descriptions for least-recently-invoked entries are dropped first — and a dropped description means Claude can no longer auto-invoke the command. Keep each description concise.
- **Good example**: `description: Generate a Conventional Commits message from staged changes.`
- **Bad example**: `description: This command should be used instead of the commit-message skill when you want to run it manually. It reads git diff and applies Pope/Beams rules.`
  Why bad: cross-reference + implementation detail; the user already chose to run it.

### `argument-hint`

- **Purpose** — Visual hint in the `/` autocomplete showing expected arguments.
- **Required?** — Optional.
- **Allowed values** — Bracketed placeholders like `[issue-number]` or `[branch] [target]`.
- **What to put in it** — One bracketed token per expected positional slot.
- **When to set it** — Whenever the command takes arguments.

### `arguments`

- **Purpose** — Names positional arguments so the body can use `$name` substitutions.
- **Required?** — Optional.
- **Allowed values** — YAML list or space-separated string.
- **What to put in it** — Identifiers matching positional order.
- **When to set it** — When the body would be more readable with named subs than `$0`, `$1`.

### `allowed-tools`

- **Purpose** — Pre-approves tool use during the command run.
- **Required?** — Optional.
- **Allowed values** — Same as skills: tool names + patterns like `Bash(git *)`.
- **What to put in it** — The minimum tool set the command needs. Least privilege.
- **When to set it** — Almost always — pre-approval improves UX.

### `model`

- **Purpose** — Override the model for the command's run.
- **Required?** — Optional. Default: inherit.
- **Allowed values** — `sonnet`, `opus`, `haiku`, a full model ID, or `inherit`.
- **When to set it** — Rarely. Only when the command's correctness binds to a specific model tier.

### `disable-model-invocation`

- **Purpose** — Hide from Claude's auto-activation (Claude won't auto-load the command's content into its context).
- **Required?** — Optional. Default: `false`.
- **Allowed values** — `true` / `false`.
- **What to put in it** — `true` for commands with external side effects (deploy, send-message, commit).
- **When to set it** — When you want the workflow strictly user-driven.
- **Canonical spelling** — `disable-model-invocation` paired with `user-invocable` (not `user-invokable` — that typo is silently rejected per issue [#23723](https://github.com/anthropics/claude-code/issues/23723)). The two flags are orthogonal: `user-invocable: false` only hides from the `/` menu, `disable-model-invocation: true` only blocks Claude auto-invocation.

### `context`

- **Purpose** — Run the command inside a forked sub-agent context.
- **Required?** — Optional. Default: inline.
- **Allowed values** — `fork`.
- **When to set it** — When the command generates a lot of output that would clutter the main conversation.

### `agent`

- **Purpose** — Picks the sub-agent type when `context: fork` is set.
- **Allowed values** — `Explore`, `Plan`, `general-purpose`, or a custom sub-agent name.
- **When to set it** — Only when `context: fork` is also set.

### `effort`, `hooks`, `paths`, `shell`

Same shape and semantics as skill frontmatter — see the skill `section-guide.md`. Slash commands rarely need them; set explicitly only when there's a clear reason.

---

## Part B — Body Substitutions

The body is plain markdown with substitutions applied before Claude reads it:

| Token                   | Expands to                                                                                                                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$ARGUMENTS`            | All arguments as one string. **The only reliably-implemented substitution** — use this.                                                                                                                                                             |
| `$N` / `$ARGUMENTS[N]`  | Nth positional argument. **Documented but currently not implemented** (issue [#16163](https://github.com/anthropics/claude-code/issues/16163), open as of May 2026). Treat as broken; prefer named arguments or parse `$ARGUMENTS` inside the body. |
| `$name`                 | Named argument from the `arguments:` frontmatter list. Works when declared.                                                                                                                                                                         |
| `${CLAUDE_SESSION_ID}`  | Current session ID.                                                                                                                                                                                                                                 |
| `${CLAUDE_SKILL_DIR}`   | The command's directory (yes, named "skill" even for commands — historical artifact).                                                                                                                                                               |
| `${CLAUDE_PLUGIN_ROOT}` | Plugin root when applicable.                                                                                                                                                                                                                        |

Dynamic context injection: `` !`<command>` `` (inline) and ` ```! ` blocks run shell commands **before** Claude sees the body, replacing the token with stdout. Disable globally via `disableSkillShellExecution: true`.

**Critical security note.** When `$ARGUMENTS` is used inside a `!` shell substitution (e.g. `` !`some-tool $ARGUMENTS` ``), user input is passed to the shell **without escaping** (open issue [#16163](https://github.com/anthropics/claude-code/issues/16163)). A user typing `; rm -rf .` as the argument executes that shell. Mitigations: avoid `$ARGUMENTS` in `!` blocks entirely; or quote with single quotes (`!'tool $ARGUMENTS'` is still vulnerable to single-quote escape — there is no fully safe quoting); or validate / route through a wrapper script that performs its own escaping. Until the bug is fixed, treat any `!`shell$ARGUMENTS`` pattern as a sandbox escape.

---

## Part C — Body Structure

A slash command body is typically short — one task, one execution path.

Recommended structure:

1. **One-paragraph statement** of what the command does.
2. **Dynamic context** block — `!` injections that pull live data.
3. **Instructions** — what Claude should do with the context.
4. **Output format** (if structured output is expected).

The body must:

- Be focused on a single task.
- Use substitutions correctly (every `$N` referenced has a matching positional slot).
- Use `${CLAUDE_SKILL_DIR}` for paths to bundled assets, never absolute paths.

The body must NOT:

- Carry trigger language ("Use this when…") — the slash is the trigger.
- Reference other commands or skills.
- Re-state the description.

---

## Part D — Command vs Skill

Slash commands and skills now share frontmatter. New work should default to a skill unless:

- The work is a single deterministic task with explicit arguments.
- You don't need supporting files (`references/`, `assets/templates/`, `scripts/`).
- You don't want Claude to auto-activate the workflow.

If two of those three are false, write a skill. Skills automatically expose `/<skill-name>` as a slash command and also support auto-activation. See `command-vs-skill.md` for the full decision matrix.

---

## Part F — Best Practices (May 2026)

### F.1 — `$ARGUMENTS` is a single string; structured input uses positional or named slots

If the command accepts free-form text, `$ARGUMENTS` is correct. If the command accepts a structured set of inputs (issue number + environment + tag), declare `arguments:` and reference each by name (`$issue`, `$env`, `$tag`).
Reason: mixing `$ARGUMENTS` with structured expectations is the leading command-authoring bug — half-typed input silently expands to empty for half the slots.
Source: <https://alexop.dev/posts/claude-code-customization-guide-claudemd-skills-subagents/>.

### F.2 — Shell injection via `!``$ARGUMENTS``` is critical and must be defended

If a command body contains `` !`some-tool $ARGUMENTS` `` and the user types `; rm -rf .` as the argument, the shell executes both. Quote, validate, or refuse.
Reason: user-supplied arguments inside `!`shell`` substitution are unsanitized by default.
Exception: when the command accepts only validated arguments (numeric, fixed enum, or pre-validated by a wrapper script), shell injection is contained.
Source: <https://www.truefoundry.com/blog/claude-code-prompt-injection>.

### F.3 — `disable-model-invocation: true` is the default for slash commands

Slash commands are user-invoked by design. Setting `disable-model-invocation: true` makes Claude treat the command as user-only, preventing it from auto-running deliberate human actions.
Reason: a `/deploy` command should never fire because Claude decided to deploy.
Exception: skills that happen to expose a `/skill-name` slash but are also auto-activated leave the flag `false`.
Source: <https://www.mindstudio.ai/blog/claude-code-skills-vs-slash-commands>.

### F.4 — Plugin namespace collisions: invoke with the prefix when ambiguous

A `/deploy` command in plugin A silently shadows the same name in plugin B (or vice versa). Inside a plugin, the `name` field becomes the namespace, and users can disambiguate with `/<plugin-name>:deploy`.
Reason: name collisions across installed plugins are silent failures.
Source: <https://code.claude.com/docs/en/plugins-reference>.

### F.4.1 — Subdirectory namespacing for local commands

Inside `.claude/commands/`, subdirectories create namespaces: `.claude/commands/git/commit.md` is invoked as `/git:commit`. Combine with file naming to organise large local command sets without polluting the top-level `/` menu.
Reason: flat layouts at scale collide on common verbs (`deploy`, `commit`, `review`); subdirectory namespaces keep them disambiguated locally.
Source: <https://code.claude.com/docs/en/slash-commands>.

### F.5 — Default to a skill, not a command, for new authoring work

Slash commands and skills now share frontmatter. Skills automatically expose `/<name>` AND support `references/`/`assets/`/`scripts/`/`tests/`. New work should default to a skill unless the artifact is a single file unlikely to grow.
Reason: skills are a strict superset of commands; reaching for a command is a downgrade.
Source: <https://medium.com/@agustin.ignacio.rossi/understanding-claude-md-vs-skills-vs-slash-commands-vs-plugins-1050c68fa63b>.

---

## Part E — Pre-ship Checklist

- [ ] `name` matches filename (kebab-case, ≤64 chars).
- [ ] `description` is a short imperative phrase (<20 words), no trigger language, no cross-refs.
- [ ] `argument-hint` set when the command takes arguments.
- [ ] `allowed-tools` follows least privilege.
- [ ] Body uses substitutions correctly; no orphan `$N` slots.
- [ ] Paths to bundled assets use `${CLAUDE_SKILL_DIR}` or `${CLAUDE_PLUGIN_ROOT}`.
- [ ] Validator passes.
- [ ] Considered whether this should be a skill instead — and decided.
