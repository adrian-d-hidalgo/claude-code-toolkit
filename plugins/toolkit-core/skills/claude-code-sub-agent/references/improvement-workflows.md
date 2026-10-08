# Agent Improvement Sub-Workflows

Detailed implementation guides for improving existing agents.

## Sub-Workflow 2A: Fix Activation Issues

**Symptoms**:

- Missing "Use immediately when" clause
- Less than 4 activation examples
- Examples lack proper structure
- Vague activation triggers

**Implementation**:

1. **Add/Fix activation clause**:

```yaml
# Add to description
Use immediately when [specific trigger conditions]
```

2. **Add complete examples**:

```xml
<example>
Context: [Specific situation]
request: "[Exact user request]"
assistant: "[Response approach]"
<commentary>[Why this agent activates]</commentary>
</example>
```

3. **Ensure diversity**:
   - Direct activation example
   - Context-triggered example
   - Delegation example
   - Edge case example

4. **Test triggers**:
   - Verify examples are realistic
   - Check no overlap with other agents
   - Validate activation conditions are specific

**Load**: references/activation-patterns.md for complete examples

## Sub-Workflow 2B: Security Enhancements

**Symptoms**:

- Unrestricted Bash access
- Too many tools in allowed-tools
- WebSearch for non-research agent
- Missing Bash restrictions

**Implementation**:

1. **Audit allowed-tools** (restrict to minimum):

```yaml
# BAD
tools: Read, Write, Edit, Bash, WebSearch

# GOOD
tools: Read, Edit, Bash(npm *), Grep, Glob
```

2. **Restrict Bash commands**:

```yaml
# Change from:
tools: Bash

# To specific commands:
tools: Bash(npm *), Bash(ng generate *)
```

3. **Remove WebSearch if not research-specialist**:

```yaml
# Remove WebSearch, add delegation section:
## Research Integration

When current information needed:
  - Delegate to research-specialist
  - Provide context and technology stack
```

4. **Test security scenarios**:
   - Invalid tool usage attempts
   - Verify Bash restrictions
   - Confirm WebSearch delegation

**Load**: references/tool-security.md for validation checklist

## Sub-Workflow 2C: Scope Refinement

**Symptoms**:

- Overlaps with other agents
- Unclear boundaries
- Too broad or too narrow scope
- Missing delegation patterns

**Implementation**:

1. **Define clear scope**:

```markdown
## Scope & Boundaries

**Within Scope**:

- [Specific capability 1]
- [Specific capability 2]

**Out of Scope**:

- [What to avoid] → Delegate to [agent/command]
```

2. **Add delegation patterns**:

```markdown
## Delegation Strategy

**To [agent-type]**:

- When: [Specific conditions]
- Provide: [Context to handoff]
- Fallback: [Behavior if unavailable]
```

3. **Test differentiation**:
   - List all similar agents
   - Identify unique value
   - Add examples showing differentiation

**Load**: references/agent-patterns.md for scope examples

## Sub-Workflow 2D: Integration Enhancement

**Symptoms**:

- No command references
- No collaboration patterns
- Missing integration points
- Hard dependencies

**Implementation**:

1. **Add command integration**:

```markdown
## Command Integration

**Relevant Commands**:

- `/[command-name]`: [When and how to use]

**Integration Pattern**:
[How command enhances agent capabilities]
```

2. **Define collaboration patterns**:

```markdown
## Collaboration Framework

**With [agent-type]**:

- [When to collaborate]
- [Information to exchange]
- [Handoff protocol]
```

3. **Ensure soft dependencies**:

```markdown
**Fallback Strategies**:

- If [command/agent] unavailable: [Alternative approach]
```

**Load**: references/agent-patterns.md for integration patterns

## Sub-Workflow 2E: Documentation Enhancement

**Symptoms**:

- Missing key sections
- Unclear examples
- Poor organization
- Vague guidance

**Implementation**:

1. **Add missing sections**:

```markdown
## Core Competencies

- [Competency 1]

## Standards & Best Practices

- [Standard 1]

## Tool Usage Optimization

- [Tool]: [Purpose]
```

2. **Improve examples**:

```markdown
### Example: [Scenario]

**Context**: [Situation]
**Request**: "[User request]"
**Approach**: [How agent responds]
**Tools**: [Tools used]
**Outcome**: [Expected result]
```

3. **Clarify guidance**:
   - Replace vague statements with specifics
   - Add code examples where helpful
   - Provide clear decision criteria

**Use template** for structure reference

## Sub-Workflow 2F: Model + Effort Alignment

**Symptoms**:

- `model: inherit` paired with reasoning-heavy work (agent is silently downgraded to Sonnet on non-Max sessions, losing Opus's capacity for tier A/B work)
- `effort: max` set as a blanket default (wastes tokens, overthinks per Anthropic's warning)
- `effort: xhigh` paired with `model: inherit` or `model: sonnet` (will fail — `xhigh` is Opus-only)
- Intelligence-sensitive agent (code-writing / refactoring / debugging) running at `effort: medium` (under-powered for the work)
- Full version ID pinned (`claude-opus-4-7`) without a documented reason (agent goes stale when newer versions ship)

**Implementation**:

1. **Classify the agent's cognitive load** using `references/model-effort-matrix.md`:
   - Tier A — Strategic (architecture, planning, ADRs, NFRs)
   - Tier B — Heavy analysis (STRIDE, dimensional modelling, performance analysis)
   - Tier C — Intelligence-sensitive execution (code writing, review, debug, refactor)
   - Tier D — Mechanical (regex transformers, formatters, syntax converters)

2. **Compare current pair against tier default**:

   ```yaml
   # Tier A/B
   model: opus
   effort: xhigh

   # Tier C
   model: sonnet
   effort: high

   # Tier D
   model: sonnet
   effort: medium
   # or:
   model: haiku
   # (omit effort — Haiku doesn't support adaptive thinking)
   ```

3. **Flag unsafe pairings**:
   - `effort: xhigh` + `model: inherit` → unsafe; pin `model: opus`.
   - `effort: xhigh` + `model: sonnet` → invalid; demote to `effort: high` or change model.
   - `effort: max` as default → revert to tier-appropriate `xhigh`/`high`; document any retention with an evidence link to evals.
   - Full version ID (`claude-opus-4-7`) without rationale → switch to alias (`opus`) for auto-update.

4. **Promote intelligence-sensitive agents off `medium`**:
   Docs frame `high` as the minimum for intelligence-sensitive work. Any code-writing / refactoring / review / debug agent currently on `medium` should be promoted to `high` unless the body justifies why the work is genuinely mechanical.

5. **Run validation**: see `references/validation-checklist.md` Effort Field + Model:Effort Pairing section.

**Load**: `references/model-effort-matrix.md` for the full rubric, decision tree, and per-cell hints.
