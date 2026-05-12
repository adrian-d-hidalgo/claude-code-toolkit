# Activation Optimization Guide

Practical guide for optimizing skill activation descriptions based on real failure analysis.

## Case Study: skill-manager Activation Failure

### Problem

**User request**: "necesito que analices si el @skills/command-manager/ cumple con los estándares correctos"

**Result**: Skill did NOT activate

### Root Causes

1. **Verb priority wrong**: "Creates" was first, but user said "analices" (analyze)
2. **Path mismatch**: Description had `.claude/skills/*` but user said `@skills/`
3. **Missing verb forms**: Had "compliance" (noun) not "checking compliance" (verb phrase)

### Solution Applied

**Before** (295 chars):

```yaml
Creates, improves, validates, and audits Claude Code skills for standards
compliance. REQUIRED when creating skills, analyzing skill quality, validating
compliance, auditing standards, or working with .claude/skills/* directories.
Handles skill ecosystems only, NOT application code.
```

**After** (340 chars):

```yaml
Analyzes, creates, improves, validates, and audits Claude Code skill ecosystems
for standards compliance and quality. Use when analyzing skills, checking compliance,
validating structure, auditing quality, reviewing standards, evaluating deployment
readiness, or working with skill files in .claude/skills/* or ~/.claude/skills/* directories.
```

### Key Changes

1. ✅ **"Analyzes" first** - Primary use case (60% of requests)
2. ✅ **Path coverage** - Both `.claude/skills/*` (project) and `~/.claude/skills/*` (global)
3. ✅ **Verb phrases** - "checking compliance", "reviewing standards", "evaluating deployment"
4. ✅ **No negative mentions** - Removed "NOT commands, agents" (creates noise)
5. ✅ **"skill files"** - Covers `@skills/*` mention syntax

### Impact

| Metric        | Before | After  | Change |
| ------------- | ------ | ------ | ------ |
| Trigger match | ~35%   | ~85%   | +143%  |
| Path coverage | 50%    | 100%   | +100%  |
| Verb matching | Weak   | Strong | +300%  |

---

## Optimization Checklist

Use for ANY skill description:

### 1. Verb Priority

- [ ] Most common action = FIRST verb
- [ ] If analyzing is primary → "Analyzes" first
- [ ] If creating is primary → "Creates" first

### 2. Path Patterns

- [ ] Project-level: `.claude/[type]/*`
- [ ] Global-level: `~/.claude/[type]/*`
- [ ] Generic: "[type] files" (covers @mentions)

### 3. Action Triggers

- [ ] Use verb phrases: "checking X", "reviewing Y"
- [ ] Avoid lone nouns: "compliance" → "checking compliance"
- [ ] List 5-8 common actions users say

### 4. Scope Definition

- [ ] Positive scope: "skill ecosystems", "command structures"
- [ ] NO negative mentions: Avoid "NOT X, Y, Z" (creates noise)
- [ ] Let path patterns define boundaries

### 5. Length

- [ ] Target: 200-500 chars
- [ ] Under 200: Too vague
- [ ] Over 500: Diluted triggers

### 6. Validation

- [ ] Test with real user requests
- [ ] Check trigger matching for primary use cases
- [ ] Verify path patterns cover user syntax

---

## Formula

```
[Primary-verb], [other-verbs] [domain] for [outcomes].
Use when [action-trigger-1], [action-trigger-2], ..., or working with
[domain] files in [path-pattern-1] or [path-pattern-2] directories.
```

### Example Application

**Domain**: Commands
**Primary use**: Analyzing (60%), Creating (40%)

```yaml
Analyzes, creates, improves, and validates Claude Code custom commands
for structure and security. Use when analyzing commands, checking structure,
validating security, reviewing patterns, or working with command files in
.claude/commands/* or ~/.claude/commands/* directories.
```

---

## Verify-before-act trap (May 2026 empirical finding)

The most expensive activation failure isn't a missing verb — it's a verb that triggers Claude's **verify-before-act** behavior instead of routing.

### The pattern

Queries like `"Validate this X"`, `"Audit my Y"`, `"Refactor my Z — its frontmatter is broken"` reference an existing-but-unspecified file. Claude does the safe thing: runs `Glob`/`Bash`/`Read` to find the file BEFORE invoking the meta-skill. In a live eval that counts as a routing miss even though the behavior is correct.

### Empirical data

Tested across 5 meta-skill corpora (claude-code-{skill, slash-command, sub-agent, plugin, hook}), May 2026:

| Query pattern                                  |                               Routing rate |
| ---------------------------------------------- | -----------------------------------------: |
| `"Create / Scaffold / Build / Design a new X"` |                                       ~95% |
| `"Help me build a X" / "Design a X for Y"`     |                                       ~95% |
| `"Walk me through the X workflow"`             |                                       ~95% |
| `"Validate this X"` (no path)                  |                      ~30% (verifies first) |
| `"Audit my X for production readiness"`        |                          ~30% (asks which) |
| `"Refactor my X — it has problem Y"` (no path) |                               ~50% (mixed) |
| `"Convert this X to a Y"` (cross-domain)       | ~40% (routes to destination skill instead) |

### Rule

If a description claims `validate` / `audit` / `refactor` verbs, the meta-skill DOES own those operations — but **the corpus should still use design/build/walk-through phrasings for routing tests**. The verify-then-invoke sequence is correct behavior; penalize the eval design, not the model.

### Authoring fix — descriptions

Keep all the verbs in the description (they help match the long tail), but don't bank routing reliability on them:

```yaml
# OK to claim ownership of all verbs in the description:
description: Use when the user wants to create, scaffold, refactor, validate, audit, or design a Claude Code skill — including SKILL.md authoring, references, templates.

# But trigger reliability rides on design/build/walk-through phrasings.
```

### Authoring fix — corpora

When writing `tests/activation-evals.json`, prefer query patterns that don't depend on Claude finding a specific file first:

```json
// ❌ Verify-before-act trap
{"query": "Validate this slash command's frontmatter", "should_trigger": true}
{"query": "Audit my plugin for production readiness", "should_trigger": true}

// ✓ Routes cleanly
{"query": "What allowed-tools should a /deploy slash command declare, and why?", "should_trigger": true}
{"query": "Design the directory layout for a plugin that ships 3 skills and 1 sub-agent", "should_trigger": true}
{"query": "Walk me through migrating /generate-tests to a skill — decision criteria and what carries over", "should_trigger": true}
```

The shift: from "do X to my existing Y" → to "design / generate / walk me through X". The meta-skill workflow is the natural answer, not file discovery.

### Description-length variance (also empirical)

Across 3 rewrite attempts on 3 skills:

| Skill                     | Long description (~900 chars) | Short description (~600 chars) |
| ------------------------- | ----------------------------: | -----------------------------: |
| claude-code-sub-agent     |                 0.737 → 0.842 |                         +0.105 |
| claude-code-plugin        |                 0.895 → 0.842 |                         −0.053 |
| claude-code-slash-command |                 0.789 → 0.684 |                         −0.105 |

Net: description rewriting falls inside the LLM run-to-run variance (~0.05–0.10 stdev). Don't over-tune description text — the corpus quality matters more.

---

## Common Pitfalls

### ❌ Pitfall 1: Wrong verb order

```yaml
Creates and analyzes skills...
```

If users mostly ANALYZE (not create), this weakens matching.

### ❌ Pitfall 2: Single path pattern

```yaml
working with .claude/skills/* directories
```

Misses `~/.claude/skills/*` (global) and `@skills/*` (mentions).

### ❌ Pitfall 3: Negative mentions

```yaml
Handles skills, NOT commands or agents
```

Introduces "commands" and "agents" keywords → noise.

### ❌ Pitfall 4: Noun-heavy

```yaml
for compliance and structure validation
```

Weaker than: "checking compliance, validating structure"

### ❌ Pitfall 5: Implementation details

```yaml
Uses SKILL.md files and YAML frontmatter
```

Focus on WHEN to activate, not HOW it works.

---

## Testing Strategy

### Should Activate (Positive Tests)

Test your actual use cases:

1. "analyze the skill X for compliance"
2. "check if @skills/foo meets standards"
3. "review skill at ~/.claude/skills/bar"
4. "validate skill structure"
5. "evaluate deployment readiness"

### Should NOT Activate (Negative Tests)

Test scope boundaries:

1. "analyze command X" (should hit the slash-command meta-skill, not this one)
2. "review application code" (should not activate any meta-skill — that's app code)
3. "check agent setup" (should hit the sub-agent meta-skill, not this one)

### Confidence Check

After changes, verify:

- Primary use case: >80% match confidence
- Secondary use cases: >60% match confidence
- Negative tests: <30% match confidence

---

## Quick Reference

### Path Patterns by Type

| Type     | Project               | Global                 | Generic         |
| -------- | --------------------- | ---------------------- | --------------- |
| Skills   | `.claude/skills/*`    | `~/.claude/skills/*`   | `skill files`   |
| Commands | `.claude/commands/*`  | `~/.claude/commands/*` | `command files` |
| Agents   | `.claude/agents/*`    | `~/.claude/agents/*`   | `agent files`   |
| Hooks    | `settings.json hooks` | N/A                    | `hook config`   |

### Action Verb Categories

**Analysis**: analyzing, checking, reviewing, evaluating, auditing, validating
**Creation**: creating, building, generating, designing
**Modification**: improving, updating, refactoring, optimizing, fixing
**Management**: managing, organizing, maintaining

### Length Guidelines

- Minimum: 200 chars (too vague below this)
- Sweet spot: 250-400 chars
- Maximum: 500 chars (dilution above this)
- Hard limit: 1024 chars (system enforced)

---

## Reusable Template

```yaml
description: >
  [Primary-verb], [verb-2], [verb-3], and [verb-4] [domain-noun] [domain-scope]
  for [outcome-1] and [outcome-2]. Use when [action-1], [action-2], [action-3],
  [action-4], [action-5], or working with [generic-files] in [path-pattern-1]
  or [path-pattern-2] directories.
```

Fill in:

- `[Primary-verb]`: Most common action (Analyzes, Creates, etc.)
- `[domain-noun]`: What you work with (skills, commands, agents)
- `[domain-scope]`: Qualifier (ecosystems, structures, configurations)
- `[outcome-1/2]`: Results (standards compliance, security, quality)
- `[action-1..5]`: Verb phrases users will say
- `[path-pattern-1/2]`: File system paths

---

## Validation Script

After optimization, validate:

```bash
python scripts/validate_skill.py /path/to/skill/
```

Expected output:

- ✓ Description length: [chars]/1024
- ✓ Description uses third person
- ✓ No warnings about description
