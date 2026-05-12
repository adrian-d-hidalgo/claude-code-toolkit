---
name: claude-code-skill
description: Use IMMEDIATELY when the user wants to create, scaffold, design, refactor, improve, validate, audit, or optimize a Claude Code skill — including SKILL.md authoring, references, templates, scripts, or tests under `.claude/skills/*` or `~/.claude/skills/*`. Fire on these requests EVEN when the user has not specified which skill or path; the workflow includes a clarification step. Also fire on knowledge questions about skill authoring ("how should I structure a SKILL.md", "what makes a good skill description"). Do not use for sub-agents, slash commands, plugin manifests, or hooks; those component types have their own meta-skills in this plugin.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash(python3 *)
---

# claude-code-skill

End-to-end authoring toolkit for Claude Code skills. Covers the full lifecycle: creating new skills, refactoring existing ones, validating structure, and auditing for production-readiness.

## What this skill does

This skill operates in four modes. Choose by intent.

| Intent | Mode |
|---|---|
| "create / scaffold / build / design a new skill" | **Create** — generate the directory + SKILL.md + supporting files. |
| "refactor / improve / clean up an existing SKILL.md" | **Refactor** — restructure, split into references, tighten trigger. |
| "validate / lint / check this skill" | **Validate** — schema + frontmatter + structural checks. |
| "audit / review / assess skill quality" | **Audit** — activation quality, security, token efficiency, production-readiness. |

## Authoritative field reference

`references/section-guide.md` is the **single source of truth** for what every SKILL.md frontmatter field is for, what to put in it, what NOT to put in it, valid values, length caps, and good/bad examples. Read it before authoring or editing any field.

Same file documents the directory layout — what `references/`, `assets/templates/`, `scripts/`, and `tests/` are each for and when to add each one.

## Mode: Create

1. **Scaffold** the directory with the init script:
   ```bash
   python3 plugins/claude-code-core/skills/claude-code-skill/scripts/init_skill.py <skill-name> --path ~/.claude/skills/
   ```
   Creates `SKILL.md` (with frontmatter placeholders), `references/`, `assets/templates/`, `scripts/`, `tests/`.

2. **Gather requirements** following `references/requirement-analysis-protocol.md`: domain, 3–5 concrete usage examples, trigger phrases, edge cases, explicit non-goals.

3. **Author SKILL.md frontmatter** field by field using `references/section-guide.md`. Hard rules every time:
   - `description` is a **routing trigger** — names the user intent that fires the skill. Keep internal mechanism out; keep specific external skill/agent names out; put generic component-type negative scope inline (e.g. "Do not use for sub-agents, slash commands, plugin manifests, or hooks"). Reason: the description is matched against user intent — implementation detail and named cross-references dilute the trigger signal, but generic component exclusions sharpen it.
   - Combined `description + when_to_use` ≤ 1024 chars. Sweet spot 200–400 chars.
   - Use action verbs and trigger phrases the user would actually say.

4. **Author the body**:
   - Open with one paragraph stating what the skill does.
   - Add the workflow / modes / instructions Claude must follow once activated.
   - End with a **Scope & boundaries** section worded generically (e.g. "this skill is for skills, not for sub-agents / slash commands / plugins / hooks"). Never name specific external skills or agents.
   - Stay under 500 lines. Move detail into `references/`.

5. **Plan resources**:
   - `references/*.md` — long docs Claude loads only when needed. Always include `section-guide.md`, `anti-patterns.md`, `CURRENT-DOCS-INDEX.md`.
   - `assets/templates/*` — reusable templates with commented placeholders documenting each field.
   - `scripts/*` — only when there is genuine repeated logic; otherwise omit.
   - `tests/activation-tests.md` — minimum 5 positive + 5 negative + 3 edge cases.

6. **Validate** before sign-off (see Validate mode).

## Mode: Refactor

Run when an existing SKILL.md is bloated, has weak triggers, or mixes routing and behavior.

1. Read the current `SKILL.md`, all `references/`, and `tests/activation-tests.md`.
2. Apply `references/optimization-patterns.md` and `references/composition-patterns.md`.
3. Split: move any section >50 lines into a new `references/<topic>.md`.
4. Rewrite `description` against the routing-trigger contract from `references/section-guide.md`.
5. Strip cross-component references and "Do NOT use for X (delegate to Y)" hints from the description; relocate to body's Scope & boundaries section.
6. Re-run validation.

## Mode: Validate

Run the technical validator:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_skill.py <path-to-skill>/
```

The validator checks YAML, length caps, required fields, and structural conventions. Use `references/deployment-checklist.md` for the human checklist (description quality, anti-pattern absence, references organized, tests cover positive + negative + edge).

## Mode: Audit

Apply when production-readiness is the goal.

1. **Activation quality** — `references/activation-optimization-guide.md` for description tuning; `references/anti-patterns.md` to detect over/under-triggering.
2. **Security** — `${CLAUDE_PLUGIN_ROOT}/shared/references/skills/security-checklist.md`; verify `allowed-tools` follows least privilege.
3. **Token efficiency** — body <500 lines; `description` ≤1024 chars; references load only when needed.
4. **Lifecycle** — `references/lifecycle-management.md` for versioning, deprecation, migration.

## Scope & boundaries — what this skill is NOT for

This skill authors skills. It does not author:

- **Sub-agents** (`.claude/agents/*.md`) — use the sub-agent meta-skill instead.
- **Slash commands** (`.claude/commands/*.md`) — use the slash-command meta-skill.
- **Plugin manifests** (`.claude-plugin/plugin.json` / `marketplace.json`) — use the plugin meta-skill.
- **Hooks** (`hooks/hooks.json`) — use the hook meta-skill.
- **Application source code** (`src/`, `app/`, `lib/`, etc.) — out of scope entirely.

When the path is `.claude/skills/*` or `~/.claude/skills/*`, this skill applies. For any other path, decline and direct the user to the appropriate sibling.

## Reference index

Local (this skill):
- `references/section-guide.md` — every SKILL.md frontmatter field + every directory, exhaustively documented.
- `references/CURRENT-DOCS-INDEX.md` — links to upstream Anthropic docs this skill mirrors.
- `references/anti-patterns.md` — common authoring mistakes.
- `references/requirement-analysis-protocol.md` — pre-authoring workflow.
- `references/resource-planning.md` — scripts vs references vs assets.
- `references/activation-optimization-guide.md` — description tuning.
- `references/composition-patterns.md` — splitting large skills.
- `references/deployment-checklist.md` — pre-ship checklist.
- `references/lifecycle-management.md` — versioning + deprecation.
- `references/optimization-patterns.md` — refactoring patterns.

Shared (across all `claude-code-*` skills):
- `${CLAUDE_PLUGIN_ROOT}/shared/protocols/skills/validation-protocol.md`
- `${CLAUDE_PLUGIN_ROOT}/shared/protocols/skills/activation-protocol.md`
- `${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_skill.py`
- `${CLAUDE_PLUGIN_ROOT}/shared/references/skills/security-checklist.md`
- `${CLAUDE_PLUGIN_ROOT}/shared/references/skills/testing-guide.md`
- `${CLAUDE_PLUGIN_ROOT}/shared/references/skills/troubleshooting.md`
- `${CLAUDE_PLUGIN_ROOT}/shared/references/skills/activation-examples.md`
- `${CLAUDE_PLUGIN_ROOT}/shared/references/skills/best-practices-comprehensive.md`

Templates (this skill):
- `assets/templates/SKILL-template.md` — annotated SKILL.md skeleton.
- `assets/templates/test-suite-template.md` — activation-tests.md skeleton.

Scripts (this skill):
- `scripts/init_skill.py` — scaffold a new skill.
