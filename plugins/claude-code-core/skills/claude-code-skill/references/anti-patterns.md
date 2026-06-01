# Anti-patterns — SKILL.md authoring

Mistakes seen in the wild that this skill must reject. Each entry: pattern → why it's wrong → fix.

## Description-as-summary

**Pattern**: `description: This skill builds and validates skills using Python scripts and YAML frontmatter.`

**Why wrong**: Describes implementation, not user intent. Claude has nothing to match against.

**Fix**: Rewrite as a trigger. `description: Use when the user wants to create, scaffold, refactor, validate, or audit a Claude Code skill.`

## Cross-component reference in description

**Pattern**: `description: …Don't use for sub-agents (use agent-manager instead).`

**Why wrong**: `description` is a routing signal. Negative scope belongs in the body. Naming a sibling skill leaks plugin-internal wiring into the trigger field.

**Fix**: Move the negative scope to the body's Scope & boundaries section, worded generically: "not for sub-agents, slash commands, plugins, or hooks".

## First-person voice

**Pattern**: `description: I help you create skills…`

**Why wrong**: Inconsistent with how Claude treats descriptions; reads as marketing rather than routing metadata.

**Fix**: Third person or imperative. "Use when… / Creates… / Scaffolds…"

## Vague verbs

**Pattern**: `description: Manages skills.`

**Why wrong**: "Manages" is a no-op verb. Claude can't tell what intent should fire it.

**Fix**: Use concrete action verbs (create, scaffold, refactor, validate, audit) and synonyms.

## Trigger language in body

**Pattern**: Body starts with "Use this skill when the user…".

**Why wrong**: That sentence belongs in `description`. The body is for instructions to Claude once the skill is already active.

**Fix**: Move trigger language to `description`. Open the body with the one-paragraph summary of what the skill does.

## Body bloat

**Pattern**: 800-line SKILL.md with five 100-line examples inline.

**Why wrong**: Skill body stays in context across turns. Every line is a recurring token cost.

**Fix**: Move long sections into `references/`. Body should be ≤500 lines and reference deeper docs by relative path.

## Tools the skill never calls

**Pattern**: `allowed-tools: Read, Write, Edit, Bash, WebFetch, WebSearch, Glob, Grep` for a skill that only reads files.

**Why wrong**: Over-broad pre-approval = silent escalation of privilege; also signals carelessness to a reviewer.

**Fix**: Pre-approve only the tools the skill actually invokes. Audit by reading the body.

## Negative scope by named sibling

**Pattern**: Body's Scope section: "Do not use for slash commands — delegate to `claude-code-slash-command`."

**Why wrong**: Couples this skill to a specific plugin layout. If the user installs a fork or renames a plugin, the reference rots.

**Fix**: Use generic component types. "This skill authors skills. It does not author sub-agents, slash commands, plugin manifests, or hooks." Let Claude pick the appropriate sibling based on its own description.

## Skill-ifying a transversal convention

**Pattern**: Creating a standalone skill (e.g., `evidence-labeling`, `code-grounded-analysis`, `risk-scoring`) for a discipline that **applies across multiple agents** but has **no clear user-facing activation trigger** of its own. Users never say "trigger the evidence-labeling skill"; the discipline is always-on in every report the agents produce.

**Why wrong**: Skills are routing-triggered units of work. A convention that should be loaded by every agent regardless of intent has no `description` that maps cleanly to user phrases — the description either over-triggers (matches too many requests) or under-triggers (matches almost none). Either way, the discipline lives in agent bodies via a body-level link, not via an activation trigger. May 2026: in the engineering-team plugin, a transversal `evidence-rule.md` already lived at the plugin-root `references/` directory; new conventions (code-grounded-analysis, risk-scoring) were authored the same way after a brief consideration of skill-ification revealed no useful trigger.

**Fix**: For transversal conventions that span multiple agents in the same plugin, prefer a plugin-root reference at `plugins/<plugin>/references/<convention>.md`. Agent bodies link to it from a short `## Evidence levels` / `## Code-grounded analysis` / `## Risk scoring` section. The convention then loads via the agent body, not via an activation trigger. Skills remain for **workflows with clear user-facing triggers** (e.g., "analyse this bug", "plan this migration", "investigate this error").

**Heuristic**: If you cannot write five concrete user phrases that should fire the skill and three that should not, it is probably a convention, not a skill.

## Hardcoded skill paths in scripts

**Pattern**: `python3 /Users/me/.claude/skills/my-skill/scripts/validate.py`.

**Why wrong**: Breaks when the skill is installed elsewhere (plugin, project, enterprise).

**Fix**: Use `${CLAUDE_SKILL_DIR}` or `${CLAUDE_PLUGIN_ROOT}` so the path resolves correctly regardless of installation location.

## Relative-path references to plugin-root files

**Pattern**: A skill SKILL.md links to a plugin-root reference using a relative path: `\`../references/evidence-rule.md\`` or `\`../../references/evidence-rule.md\``.

**Why wrong**: `validate_skill.py`'s reference regex matches `references/X.md` literal anywhere in the body and treats it as a **local** reference (relative to the skill directory). The local file does not exist there, so the validator fails with "Referenced files not found." The `skip_prefix_re` only skips paths prefixed with `${VAR}/`, `${VAR}/shared/`, or the prose forms `the repo-level `, `repo-root `, `the toolkit's `. Plain `..` parents do not match the skip pattern.

**Fix**: Use `${CLAUDE_PLUGIN_ROOT}/references/X.md` whenever the SKILL.md references a file at the plugin root rather than inside the skill's own `references/`. The validator skips the path; runtime resolution remains correct because `CLAUDE_PLUGIN_ROOT` points to the plugin directory. Same applies for `${CLAUDE_PLUGIN_ROOT}/shared/...` for shared resources.

**Heuristic**: a SKILL.md should reference only two kinds of files — `references/X.md` (local, inside the skill) and `${CLAUDE_PLUGIN_ROOT}/...` (anywhere else in the plugin). Never `../` or `../../`.

## Test file with only positive cases

**Pattern**: `tests/activation-evals.json` lists 10 cases, all with `"should_trigger": true`.

**Why wrong**: Without negative cases, you can't detect over-triggering. Common in early skill authoring. The canonical corpus is JSON because the repo-level `run_activation_evals.py` runner consumes it directly — a Markdown-only "test file" is invisible to the eval harness.

**Fix**: Match every positive case with at least one adjacent negative case ("create a sub-agent" should NOT activate the skill skill). Author the corpus in `activation-evals.json`; any sibling `.md` is only a human-readable pointer.

## Eval domain-pattern that captures sibling meta-skills

> See `routing-detection.md` for the positive guide to `DOMAIN_PATTERNS` (when to register, schema, decision tree). This section documents one specific failure mode.

**Pattern**: A meta-skill's eval `DOMAIN_PATTERNS` declares `paths: ["**/skills/**"]` to detect when Claude touches its territory. When several meta-skills coexist in the same plugin (`plugins/foo/skills/A/`, `plugins/foo/skills/B/`, …), the glob matches every sibling's `SKILL.md` too.

**Why wrong**: Claude correctly routes a query to sibling B, reads `plugins/foo/skills/B/SKILL.md`, and the runner attributes that domain-touch to A — producing a phantom false positive in A's routing score. Discovered May 2026 in `scripts/run_activation_evals.py`: claude-code-skill scored 0.632 when its real routing was 0.789, with 3 FPs all from sibling-SKILL.md reads.

**Fix**: Declare `exclude_paths` for sibling meta-skills explicitly so the matcher returns None on those:

```python
"claude-code-skill": {
    "paths": ["**/skills/**", "**/SKILL.md"],
    "exclude_paths": [
        "**/skills/claude-code-sub-agent/**",
        "**/skills/claude-code-slash-command/**",
        "**/skills/claude-code-plugin/**",
        "**/skills/claude-code-hook/**",
        "**/skills/claude-code-claude-md/**",
    ],
    "command_substrings": [...],
}
```

This affects any meta-skill whose `paths` glob is broad enough to capture its siblings under a shared plugin layout. Skills with narrowly-scoped patterns (e.g. `**/agents/**`, `**/commands/**`, `**/plugin.json`) aren't affected.

## Versioned skill names

**Pattern**: `name: claude-code-skill-v2`

**Why wrong**: Skills are not versioned by name; the plugin's `plugin.json` carries the version. Versioned names accumulate cruft.

**Fix**: Keep the name stable. Bump the plugin's `version` field instead.
