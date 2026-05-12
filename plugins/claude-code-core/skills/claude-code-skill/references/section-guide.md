# SKILL.md Section Guide

Authoritative per-field reference for every part of a Claude Code skill. Read this before authoring or editing any SKILL.md frontmatter field, body section, or supporting directory.

Mirrors the official docs at <https://code.claude.com/docs/en/skills>. Snapshot date: see `CURRENT-DOCS-INDEX.md`.

---

## Part A — YAML Frontmatter Fields

Every field below appears between `---` markers at the top of `SKILL.md`. Only `description` is strongly recommended; everything else is optional.

### `name`

- **Purpose** — Display name of the skill. Becomes the `/<name>` slash invocation.
- **Required?** — Optional. If omitted, the directory name is used.
- **Allowed values** — Lowercase letters, digits, hyphens. Max 64 characters.
- **What to put in it** — Same string as the directory name, kebab-case. Example: `name: claude-code-skill`.
- **What NOT to put in it** — Spaces, uppercase, underscores, emoji, version suffixes. Don't name a skill after its implementation (`skill-python-runner`); name it after the user intent (`run-python`).
- **When to set it explicitly** — Always set it explicitly, even though it's optional. Defaulting to directory name silently breaks if the folder is renamed.

### `description`

- **Purpose** — **Routing trigger.** Claude reads this to decide WHEN to activate the skill. It is matched against user intent.
- **Required?** — Strongly recommended. If omitted, Claude falls back to the first paragraph of the markdown body, which is rarely a good trigger.
- **Allowed values** — Plain prose. Combined `description + when_to_use` is truncated at 1024 characters in the skill listing.
- **What to put in it** — Action verbs + domain noun + "Use when…" / "Use proactively when…" phrasing. Include trigger phrases users actually say (synonyms count: create / scaffold / build / design all mean "create").
- **What NOT to put in it** —
  - Internal mechanism ("uses Python scripts to validate…").
  - Tool lists or file names.
  - References to other skills, agents, or components by name.
  - Negative scope ("Do NOT use for X" / "delegate Y to Z") — that belongs in the body's Scope & boundaries section.
  - "I" / "we" first person — use third-person or imperative.
- **Length** — Sweet spot 200–400 chars. Hard cap on combined `description + when_to_use` is 1024 chars.
- **Good example**:
  ```yaml
  description: Use when the user wants to create, scaffold, refactor, validate, or audit a Claude Code skill — including SKILL.md, references, templates, scripts, or tests.
  ```
- **Bad example**:
  ```yaml
  description: Manages skill lifecycle with SKILL.md files, YAML frontmatter, and Python validators. Use when working with skills. Don't use for sub-agents (use agent-manager skill).
  ```
  Why bad: explains implementation, leaks tool detail, names a sibling skill, dilutes the trigger.

### `when_to_use`

- **Purpose** — Extra trigger phrases or example user prompts that complement `description`.
- **Required?** — Optional.
- **Allowed values** — Plain prose. Appended to `description` for routing; counts toward the 1024-char combined cap.
- **What to put in it** — Two or three concrete example user prompts ("e.g., user says 'create a new skill', 'scaffold a SKILL.md', 'lint my skill'…").
- **What NOT to put in it** — Anything not phrased as a trigger or example prompt.
- **When to set it vs leave default** — Set when `description` alone leaves room for ambiguity. Skip when description already covers the trigger surface.

### `argument-hint`

- **Purpose** — Autocomplete hint displayed when the user types `/<skill-name>`.
- **Required?** — Optional. Default: none.
- **Allowed values** — Short bracketed placeholder string like `[issue-number]` or `[filename] [format]`.
- **What to put in it** — The shape of expected arguments, one bracketed token per positional slot.
- **What NOT to put in it** — Free prose; long explanations (those go in the body).
- **When to set it** — When the skill accepts positional arguments and the user benefits from a visual cue.

### `arguments`

- **Purpose** — Names positional arguments so the body can reference them as `$name` instead of `$0`, `$1`, etc.
- **Required?** — Optional.
- **Allowed values** — A YAML list (`- issue`, `- branch`) or space-separated string (`issue branch`).
- **What to put in it** — One identifier per expected positional argument, ordered as the user will pass them.
- **What NOT to put in it** — Argument descriptions (those go in `argument-hint` or the body).
- **When to set it** — When the body benefits from named substitutions (`$issue`) instead of positional ones (`$0`).

### `disable-model-invocation`

- **Purpose** — Prevent Claude from auto-loading the skill; only the user (via `/<name>`) can invoke it.
- **Required?** — Optional. Default: `false`.
- **Allowed values** — `true` / `false`.
- **What to put in it** — `true` for workflows with side effects you want to gate behind explicit invocation (deploy, send-message, commit).
- **When to set it** — When auto-activation could harm the user (sends external messages, deploys, mutates remote state). Leave `false` for everything else.

### `user-invocable`

- **Purpose** — Controls whether the skill appears in the `/` menu.
- **Required?** — Optional. Default: `true`.
- **Allowed values** — `true` / `false`.
- **What to put in it** — `false` for background knowledge that isn't a meaningful user-issued action (e.g. a `legacy-system-context` skill).
- **When to set it** — When the skill is reference-only knowledge Claude should consult but the user wouldn't run as a command.

### `allowed-tools`

- **Purpose** — Pre-approves tool use while the skill is active, so the user isn't prompted for each call.
- **Required?** — Optional.
- **Allowed values** — Space-separated string or YAML list. Tool names match the [tools reference](https://code.claude.com/docs/en/tools-reference). Patterns like `Bash(git *)` and `Bash(python3 *)` work.
- **What to put in it** — The minimum set of tools the skill needs. Least privilege.
- **What NOT to put in it** — Tools the skill doesn't actually use. Wildcards like `Bash(*)` (too broad).
- **When to set it** — Almost always — pre-approval improves UX. Verify each tool is genuinely required.

### `model`

- **Purpose** — Override the model used while the skill is active.
- **Required?** — Optional. Default: inherits the session model.
- **Allowed values** — `sonnet`, `opus`, `haiku`, a full model ID (`claude-opus-4-7`), or `inherit`.
- **What to put in it** — Leave it out (inherit) unless the skill genuinely needs a specific model (e.g. requires Opus for hard reasoning).
- **When to set it** — Rarely. The user has already picked a model; forcing a switch surprises them.

### `effort`

- **Purpose** — Set the reasoning effort while the skill is active.
- **Required?** — Optional. Default: inherits the session effort.
- **Allowed values** — `low`, `medium`, `high`, `xhigh`, `max` (available levels depend on model).
- **What to put in it** — Higher for skills that require careful analysis (audit, refactor); leave default for routine work.
- **When to set it** — When the skill's correctness is sensitive to reasoning depth.

### `context`

- **Purpose** — Run the skill in a forked sub-agent context instead of inline.
- **Required?** — Optional. Default: inline (no forking).
- **Allowed values** — `fork` (only documented value).
- **What to put in it** — `fork` when the skill is task-shaped (one well-defined job, no need to share history) and you want output isolation.
- **When to set it** — When the skill performs heavy exploration or generation that would pollute the main conversation. Pair with `agent:` to pick the runner.

### `agent`

- **Purpose** — Picks which sub-agent type runs the skill when `context: fork` is set.
- **Required?** — Optional. Default: `general-purpose`.
- **Allowed values** — Built-in agents (`Explore`, `Plan`, `general-purpose`) or any custom sub-agent name.
- **What to put in it** — `Explore` for read-only research skills; `general-purpose` for skills that need to edit; a custom sub-agent for skills that should run with a specific persona's tools and model.
- **When to set it** — Only when `context: fork` is also set.

### `hooks`

- **Purpose** — Lifecycle hooks scoped to this skill's invocations.
- **Required?** — Optional.
- **Allowed values** — Same shape as `hooks.json` entries (event → matcher → command).
- **What to put in it** — Hooks that should fire only while this skill is active (PreToolUse validation, PostToolUse linting).
- **When to set it** — When the skill mutates state and benefits from per-invocation guardrails.

### `paths`

- **Purpose** — Glob patterns limiting when the skill auto-activates.
- **Required?** — Optional. Default: no path restriction.
- **Allowed values** — Comma-separated string or YAML list of glob patterns.
- **What to put in it** — Patterns matching the files the skill cares about (`.claude/skills/**`, `src/**/*.py`).
- **When to set it** — When the skill is path-specific and you want to suppress auto-activation elsewhere.

### `shell`

- **Purpose** — Picks the shell used for `` !`command` `` and ` ```! ` blocks.
- **Required?** — Optional. Default: `bash`.
- **Allowed values** — `bash` / `powershell` (Windows; requires `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`).
- **When to set it** — Only on Windows.

---

## Part B — String Substitutions in the Body

These tokens are replaced by Claude Code before the skill body reaches Claude. Document them in your SKILL.md when used so future readers can trace the value.

| Token                   | Expands to                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `$ARGUMENTS`            | All arguments passed to the skill invocation as a single string.                                                       |
| `$ARGUMENTS[N]`         | Nth positional argument (0-indexed). Quoted shell-style.                                                               |
| `$N`                    | Shorthand for `$ARGUMENTS[N]` (`$0`, `$1`, …).                                                                         |
| `$name`                 | Named argument declared in the frontmatter `arguments` list.                                                           |
| `${CLAUDE_SESSION_ID}`  | Current session identifier — useful for per-session logs.                                                              |
| `${CLAUDE_EFFORT}`      | Current effort level (`low` … `max`).                                                                                  |
| `${CLAUDE_SKILL_DIR}`   | Absolute path to this skill's directory. Use it when invoking bundled scripts so the skill works from any CWD.         |
| `${CLAUDE_PLUGIN_ROOT}` | Path to the plugin root when the skill ships in a plugin. Use it to reference shared/ resources across sibling skills. |

Dynamic context injection — the syntax `` !`<command>` `` (inline) or ` ```! ` blocks (multi-line) — runs the command **before** Claude sees the skill body, and replaces the marker with stdout. Use for live data (git status, gh pr diff). Disable globally via `disableSkillShellExecution: true` in settings.

---

## Part C — Body Structure

The markdown body becomes the skill's instructions once activated. Keep it under 500 lines; move depth to `references/`.

Recommended sections, in order:

1. **One-paragraph summary** — what the skill does, single paragraph, no fluff.
2. **What it does / modes** — if the skill has multiple modes (create / refactor / validate / audit), table them at the top.
3. **Workflow** — numbered steps Claude must follow. Each step is one verb + one outcome.
4. **Reference index** — links to local `references/*.md` and any shared resources.
5. **Scope & boundaries — what this skill is NOT for** — generic component-type list ("for skills, not for sub-agents / slash commands / plugins / hooks"). **Never** name specific external skills, agents, or projects.

The body must:

- Speak in imperative or third person ("Author the description", not "I author the description").
- State invariants rather than narrate the author's intent.
- Reference files by relative path (`references/section-guide.md`), not by absolute URL.

The body must NOT:

- Repeat the description verbatim.
- Carry trigger language ("Use when…") — that lives in `description`.
- Dump long examples inline; link to `references/` or `assets/templates/` instead.

---

## Part D — Directory Layout

A skill is a directory. Each subdirectory has a single purpose. Create only what you need.

```
my-skill/
├── SKILL.md              # REQUIRED — frontmatter + body
├── README.md             # OPTIONAL — author/maintainer doc (not loaded by Claude)
├── references/           # OPTIONAL — long docs loaded on demand
│   ├── section-guide.md         # exhaustive per-field doc (meta-skills)
│   ├── CURRENT-DOCS-INDEX.md    # snapshot of upstream docs
│   ├── anti-patterns.md         # known mistakes
│   └── <topic>.md               # deep dives, one per topic
├── assets/               # OPTIONAL — static reusable artifacts
│   └── templates/        #   commented templates Claude fills in
├── scripts/              # OPTIONAL — executable helpers
│   ├── init_*.py         #   scaffolders
│   └── validate_*.py     #   validators
└── tests/                # OPTIONAL — activation evaluations
    ├── activation-evals.json    # CANONICAL — positive + negative + edge cases; consumed by the repo-level run_activation_evals.py runner
    └── activation-tests.md      # OPTIONAL — human-readable pointer to the JSON
```

**Rules of thumb:**

- `references/` — Add when SKILL.md would otherwise exceed 500 lines, or when the same long doc is referenced more than once. Naming: kebab-case, topic-named (`security-checklist.md`, not `notes.md`).
- `assets/templates/` — Add when the skill regularly produces an artifact (a SKILL.md, an agent .md, a plugin.json). Templates must include commented placeholders documenting each field — purpose, constraints, good/bad examples.
- `scripts/` — Add only when there is repeated deterministic logic. Avoid scripts for one-off work; embed in the body instead. Naming: snake_case Python by default (`init_skill.py`, `validate_skill.py`).
- `tests/` — Add when activation reliability matters. Minimum: 5 positive triggers, 5 negative triggers, 3 edge cases. Test against multiple models if the skill is shipped widely. **Canonical corpus is `tests/activation-evals.json`, consumed by the repo-level `run_activation_evals.py` runner (see `shared/references/skills/testing-guide.md`).** A `.md` sibling is optional and only a human-readable pointer — never the source of truth.

---

## Part F — Best Practices (May 2026)

Distilled from the official Anthropic docs and high-signal community repos. Each item: rule, reason, exception (if any), source.

### F.1 — Description is a classifier, not a label

Write `description` as a trigger predicate — "Use when the user wants to …" — with concrete action verbs and disambiguating conditions.
Reason: Claude routes to the skill based exclusively on this string, matching against user intent. Generic labels like "skill helper" produce false positives and false negatives.
Source: <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices> (May 2026).

### F.2 — Sibling-skill anti-overlap belongs in the description

When the marketplace has adjacent meta-skills (skill, sub-agent, slash command, plugin, hook), each `description` must include a generic exclusion: "Do not use for sub-agents, slash commands, plugin manifests, or hooks." Use **generic component types**, never named skills.
Reason: Claude Code has no built-in routing arbiter for ambiguous prompts; the description carries the disambiguation load.
Source: <https://github.com/anthropics/claude-code/issues/17327>; `anthropics/skills/skill-creator` review step.

### F.3 — `paths:` glob discipline

If `paths:` is set, use the narrowest glob that matches the skill's working surface (`src/api/**/*.ts`, not `**/*`).
Reason: broad globs inflate context on every turn and erode token budgets.
Exception: omit `paths:` entirely when the skill is path-agnostic — empty is better than `**/*`.
Source: <https://code.claude.com/docs/en/skills> §paths.

### F.4 — `disable-model-invocation: true` for side-effecting skills

Skills that write to disk, run shell commands, call external services, or otherwise mutate state outside the current conversation set this flag.
Reason: without it, Claude may auto-invoke a side-effecting workflow mid-task.
Exception: read-only context-injection skills should leave the flag `false` so progressive disclosure works.
Source: <https://code.claude.com/docs/en/skills>.

### F.5 — `!`shell`` injection in skill bodies is a security boundary

Shell substitution runs at activation time. When the command touches files the user or upstream tools can modify (e.g. `!cat ./AGENTS.md`), an attacker can inject instructions.
Reason: arbitrary output replaces the placeholder before Claude sees the skill body; treat the boundary like any other untrusted-input boundary.
Exception: read-only, version-pinned, or internal-only sources are acceptable.
Source: <https://www.truefoundry.com/blog/claude-code-prompt-injection> (May 2026).

### F.6 — `context: fork` requires fully self-contained body

A forked skill runs in isolation with no conversation history. Write it as a standalone specification.
Reason: phrases like "as discussed above" or implicit references to earlier turns evaluate to nothing in the fork context.
Source: <https://alexop.dev/posts/understanding-claude-code-full-stack/>.

### F.7 — Body under 500 lines; progressive disclosure via references

If body content exceeds ~500 lines, split into `references/<topic>.md` referenced from the body — the body acts as an index, not an encyclopedia.
Reason: skill content stays in context across turns, so every line is a recurring token cost.
Source: <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>; Anthropic engineering, _Effective context engineering for AI agents_.

---

## Part E — Pre-ship Checklist

Before signing off a new or refactored skill:

- [ ] `name` matches directory name (kebab-case, ≤64 chars).
- [ ] `description` is a pure routing trigger — no internal mechanism, no cross-component refs, no negative scope.
- [ ] Combined `description + when_to_use` ≤ 1024 chars.
- [ ] `allowed-tools` follows least privilege; every tool is actually used.
- [ ] Body ≤ 500 lines.
- [ ] Body opens with a one-paragraph summary and ends with a generic Scope & boundaries section.
- [ ] `references/section-guide.md` exists for meta-skills; documents every field.
- [ ] `references/CURRENT-DOCS-INDEX.md` exists and is dated.
- [ ] `references/anti-patterns.md` exists.
- [ ] `tests/activation-evals.json` has ≥5 positive + ≥5 negative + ≥3 edge cases (canonical corpus consumed by the repo-level `run_activation_evals.py` runner).
- [ ] If the skill edits files in a specific domain, an entry exists in `scripts/run_activation_evals.py:DOMAIN_PATTERNS` (see `references/routing-detection.md`). Output-only skills do NOT need one.
- [ ] Validator (`shared/scripts/validate_skill.py`) passes.
- [ ] No mention of removed sibling skills (skill-optimizer, command-optimizer, mcp-server-manager, output-style-manager).
