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

## Hardcoded skill paths in scripts

**Pattern**: `python3 /Users/me/.claude/skills/my-skill/scripts/validate.py`.

**Why wrong**: Breaks when the skill is installed elsewhere (plugin, project, enterprise).

**Fix**: Use `${CLAUDE_SKILL_DIR}` or `${CLAUDE_PLUGIN_ROOT}` so the path resolves correctly regardless of installation location.

## Test file with only positive cases

**Pattern**: `tests/activation-tests.md` lists 10 cases, all of which should activate the skill.

**Why wrong**: Without negative cases, you can't detect over-triggering. Common in early skill authoring.

**Fix**: Match every positive case with at least one adjacent negative case ("create a sub-agent" should NOT activate the skill skill).

## Eval domain-pattern that captures sibling meta-skills

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
