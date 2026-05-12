---
name: claude-code-claude-md
description: Use IMMEDIATELY for ANY question, request, or symptom involving a CLAUDE.md or AGENTS.md file — creating, scaffolding, refactoring, validating, auditing, optimizing, trimming, or knowledge questions about what belongs in it ("what should go in CLAUDE.md vs README?", "how do I make Claude follow our conventions?", "my CLAUDE.md is too long", "Claude keeps forgetting our build commands"). At any scope (global `~/.claude/CLAUDE.md`, project `<root>/CLAUDE.md`, or directory-level `<subdir>/CLAUDE.md`). Fire EVEN when the file doesn't exist yet, and on symptom-shaped requests where the natural fix is a CLAUDE.md edit. Do not use for skills, sub-agents, slash commands, plugin manifests, or hooks; those component types have their own meta-skills in this plugin.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash(python3 *)
  - Bash(wc *)
---

# claude-code-claude-md

End-to-end authoring toolkit for CLAUDE.md — Claude Code's persistent agent instruction file. Treats CLAUDE.md as one layer of an _instruction surface_ (root file + on-demand pointers + skills), not a single document. Applies equally to AGENTS.md (the cross-tool open standard) when both files coexist.

## Identity (read before anything else)

CLAUDE.md is **for the agent, not for humans**. Empirically (arxiv:2601.20404, arxiv:2602.11988): instruction files improve agent performance _only when content is operative_ (commands, conventions, constraints, triggered pointers). Descriptive content (architecture, file maps, intent) actively hurts performance and inflates cost by 20%+.

- **README** explains a project to humans.
- **CLAUDE.md** instructs the agent: what to run, what to enforce, when to stop.

When in doubt of any line, ask: _"Would removing this cause Claude to do the wrong thing on a task it currently handles correctly?"_ If no, delete it.

## What this skill does

| Intent                                                  | Mode                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| "create / scaffold / set up CLAUDE.md for this project" | **Create** — pick scope; emit a minimal annotated skeleton with the six operative categories.                                               |
| "refactor / improve / clean up my CLAUDE.md"            | **Refactor** — split via `@import` and active pointers, drop README-content + architectural overviews, reorder critical rules to the front. |
| "validate / lint / audit CLAUDE.md"                     | **Validate** — run the linter for structural and content rules.                                                                             |
| "optimize tokens / it's too long"                       | **Optimize** — measure, identify low-signal lines, propose cuts.                                                                            |

## Authoritative reference

`references/section-guide.md` is the **single source of truth** for: the six categories of value (operative commands / non-lintable conventions / constraints-with-alternatives / active pointers / escalation / workflow), the thirteen anti-patterns with empirical severity tags, the three-layer instruction-surface mental model, scope hierarchy, versioning, and good/bad examples. Read it before authoring or editing.

## Mode: Create

1. **Pick the scope** with the user:
   - **Global** (`~/.claude/CLAUDE.md`): identity defaults, commit conventions, security invariants, behavioral preferences that apply across all the user's projects.
   - **Project** (`<root>/CLAUDE.md`): build/test/lint commands, project-specific conventions and constraints. Checked into git.
   - **Directory** (`<subdir>/CLAUDE.md`): monorepo per-package rules that _differ from the project root_. Adds to, does not replace, project-level.

2. **Pick the right template**:
   - `assets/templates/global-claude-md.template.md`
   - `assets/templates/project-claude-md.template.md`
   - `assets/templates/directory-claude-md.template.md`

3. **Fill the skeleton minimally** using the six categories from `references/section-guide.md` Part B. Skip any category that does not apply. Aim for 30–100 lines.

4. **Active pointers, not inline content.** When the agent needs domain knowledge ("here's how our migrations work"), put a triggered pointer in CLAUDE.md and the content in `docs/` or `docs/adr/`. Pattern:

   ```markdown
   ## When writing migrations

   Read `docs/db-conventions.md` first.
   ```

5. **Top of file gets `<!-- last-reviewed: YYYY-MM-DD -->`** — zero tokens (stripped before injection), enables drift detection.

6. **Validate** before sign-off.

## Mode: Refactor

Run when an existing CLAUDE.md has:

- More than 200 lines OR more than ~800 words.
- Any architectural overview section ("we chose Event Sourcing because…").
- Any file-tree map ("`src/api/` contains controllers…").
- Passive pointers ("see `docs/X`" without trigger).
- Rules a linter already enforces.
- Duplicate content across scope levels.
- Vague modifiers ("write clean code") without measurable criteria.

Refactor steps:

1. Read the file. Run the validator to surface specific violations.
2. Apply `references/optimization.md` patterns in priority order: excise architectural overviews → excise file maps → excise README content → activate passive pointers → delete linter-redundancy → rewrite negation-without-alternative → purge vague modifiers.
3. Reorder so the most critical behavioral rules sit in the first 20 lines (security / compliance) and last 10 (closing workflow rules).
4. Re-validate. Target: ≥30% smaller AND every remaining section maps to one of the six categories.

## Mode: Validate

Run the linter:

```bash
python3 plugins/claude-code-core/skills/claude-code-claude-md/scripts/validate_claude_md.py <path-to-CLAUDE.md>
```

Checks: line/word/byte caps, README-headings, architectural-rationale patterns, file-tree maps, passive pointers, linter-redundancy, vague modifiers, first-person voice, negation-without-alternative, stale path references, `@import` target existence, `last-reviewed` HTML comment presence.

Use `references/validation-checklist.md` for the manual review pass.

## Mode: Optimize

When the user wants to reduce token cost:

1. **Measure**: `wc -l <path>`; `wc -w <path>`; `python3 -c "print(len(open('<path>').read()) // 4)"` for a crude token proxy.
2. **Lint**: run the validator for automated signals.
3. **Apply optimization patterns** in priority order from `references/optimization.md`:
   1. Excise architectural overviews (highest empirical impact)
   2. Excise file-tree maps
   3. Excise README content
   4. Activate passive pointers (add trigger conditions)
   5. Delete linter-redundancy
   6. Rewrite negation → constraint-with-alternative
   7. Purge vague modifiers
   8. Scope-deduplicate
   9. Auto-memory deduplicate
   10. Rebalance always-apply rules
   11. Stale-reference cleanup
   12. `@import` decompose long sections
   13. Primacy + recency reorder
   14. Speculative-rule purge
4. **Re-measure**. Target: ≥30% smaller AND no loss of operative content.

## Scope & boundaries — what this skill is NOT for

This skill authors CLAUDE.md (and adjacent AGENTS.md) files. It does not author:

- **Skills** (`.claude/skills/*/SKILL.md`) — use the skill meta-skill.
- **Sub-agents** (`.claude/agents/*.md`) — use the sub-agent meta-skill.
- **Slash commands** (`.claude/commands/*.md`) — use the slash-command meta-skill.
- **Plugin manifests** (`.claude-plugin/plugin.json` / `marketplace.json`) — use the plugin meta-skill.
- **Hooks** (`hooks/hooks.json`) — use the hook meta-skill.
- **README.md, CONTRIBUTING.md, ADRs, `docs/`** — those are human-facing documents.
- **Auto-memory** (`~/.claude/projects/.../memory/`) — Claude Code manages it automatically.

## Reference index

Local:

- `references/section-guide.md` — every section, every category, every rule, exhaustively documented with empirical sourcing.
- `references/CURRENT-DOCS-INDEX.md` — upstream Anthropic + AGENTS.md spec + peer-reviewed papers + community sources.
- `references/anti-patterns.md` — thirteen authoring mistakes with sources and fixes.
- `references/optimization.md` — fourteen token-trimming patterns in priority order.
- `references/validation-checklist.md` — pre-ship checklist.

Templates:

- `assets/templates/global-claude-md.template.md`
- `assets/templates/project-claude-md.template.md`
- `assets/templates/directory-claude-md.template.md`

Scripts:

- `scripts/validate_claude_md.py` — structural + content linter.
