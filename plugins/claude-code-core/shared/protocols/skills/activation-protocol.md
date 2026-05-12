# Skill Activation Optimization Protocol

## Purpose

Systematic process for optimizing skill activation rates through description refinement, keyword analysis, and semantic matching improvements.

## When to Use

- **Low activation rate** (<70% on target scenarios)
- **False positives** (activates when shouldn't)
- **Inconsistent activation** (sometimes works, sometimes doesn't)
- **After skill refactoring** (ensure activation still works)
- **Before production deployment** (claude-code-skill final check)

## Prerequisites

Before optimizing activation:
1. Skill must pass technical validation (`validation-protocol.md`)
2. Core functionality must be working
3. At least 10 test scenarios defined (5 positive, 5 negative)

## Process

### Step 1: Baseline Measurement

**Measure current activation rate**:

1. Create test suite with diverse scenarios:
   - 10+ positive triggers (should activate)
   - 10+ negative triggers (should NOT activate)
   - Include variations in phrasing, language, context

2. Run tests and record results:
   - Activation rate: `(correct activations / total positives) × 100`
   - False positive rate: `(incorrect activations / total negatives) × 100`
   - Target: >80% activation, <10% false positives

3. Identify patterns in failures:
   - Which phrases fail to trigger?
   - Which user intents are missed?
   - Are failures consistent or random?

### Step 2: Description Analysis

**Analyze current description for weaknesses**:

Load activation examples:
```
${CLAUDE_PLUGIN_ROOT}/shared/references/skills/activation-examples.md
```

**Common weaknesses**:

| Weakness | Example | Impact |
|----------|---------|--------|
| Too generic | "Works with files" | Low semantic match confidence |
| Implementation-focused | "Uses YAML and scripts" | Confuses HOW with WHEN |
| Missing verb variations | Only "creating" | Misses "building", "designing", "making" |
| No context triggers | Missing directory paths | Doesn't activate in correct locations |
| Too verbose | >600 chars | Dilutes key activation signals |
| No differentiation | Overlaps with other skills | Activation conflicts |

**Checklist**:
- [ ] Starts with what it does (not how it works)
- [ ] Lists specific action triggers (verbs)
- [ ] Includes context triggers (paths, file types, domains)
- [ ] Has verb variations for primary actions (3-5 variations per action)
- [ ] Length 200-500 chars (optimal for clarity without dilution)
- [ ] No internal implementation details
- [ ] Clear boundaries (what it does NOT do)

### Step 3: Keyword Density Optimization

**Increase verb variation density**:

Primary actions should have multiple verb forms to capture user intent variations.

**Verb variation table**:

| Primary Action | Variations (include 3-5) |
|----------------|--------------------------|
| Create | creating, building, designing, making, generating, initializing |
| Improve | improving, enhancing, optimizing, refactoring, fixing, upgrading |
| Validate | validating, checking, verifying, reviewing, auditing, inspecting |
| Configure | configuring, setting up, establishing, defining, customizing |
| Analyze | analyzing, examining, evaluating, assessing, reviewing, diagnosing |
| Manage | managing, handling, organizing, maintaining, controlling |
| Deploy | deploying, publishing, releasing, distributing, shipping |
| Test | testing, verifying, validating, checking, evaluating |

**Example optimization**:

❌ **Before** (low density):
```yaml
description: >
  Creates and improves Claude Code skills. Use when creating skills
  or working with .claude/skills/* directories.
```
Activation triggers: "create", "improve", "skills"

✅ **After** (high density):
```yaml
description: >
  Creates, builds, designs, improves, enhances, optimizes, validates,
  and audits Claude Code skills. Use when creating skills, building
  new skills, designing skills, improving skills, fixing skills,
  validating skill structure, or working with .claude/skills/* directories.
```
Activation triggers: "create/build/design", "improve/enhance/optimize/fix", "validate/audit", "skills", ".claude/skills/*"

**Result**: Higher semantic matching confidence across different user phrasings.

### Step 4: Context Trigger Enhancement

**Add specific context markers**:

Context triggers help activation in correct scenarios even without explicit keywords.

**Context types**:

1. **Path triggers**: `.claude/skills/*`, `~/.claude/skills/*`, specific directories
2. **File type triggers**: "*.md files", "JSON files", "Python scripts"
3. **Domain triggers**: "authentication", "database", "API"
4. **Operation triggers**: "in production", "during deployment", "for testing"

**Example**:
```yaml
description: >
  Creates and optimizes Claude Code skills. REQUIRED when creating skills,
  improving skills, validating skill structure, or working with skill files
  in .claude/skills/* or ~/.claude/skills/* directories.
```

Path triggers (`.claude/skills/*`) help activate even if user says "fix this" while in that directory.

### Step 5: Differentiation from Similar Skills

**Prevent activation conflicts**:

If multiple skills have overlapping domains, add explicit differentiation.

**Strategy**:
1. Identify potentially conflicting skills
2. Add "NOT handled" clause to both descriptions
3. Use "REQUIRED when" for critical infrastructure skills

**Example** (claude-code-skill vs claude-code-sub-agent):

claude-code-skill:
```yaml
description: >
  Creates new Claude Code skills. Use when creating skills, building skills,
  or initializing skill structure in .claude/skills/*. Does NOT handle agents
  (use claude-code-sub-agent for .claude/agents/*).
```

claude-code-sub-agent:
```yaml
description: >
  Creates new Claude Code agents. REQUIRED when creating agents, building agents,
  or working with .claude/agents/*. Does NOT handle skills (use claude-code-skill
  for .claude/skills/*).
```

### Step 6: A/B Testing

**Test description variations**:

1. Create 2-3 description variations using different strategies:
   - Variation A: Focus on verb density
   - Variation B: Focus on context triggers
   - Variation C: Focus on differentiation

2. Test each against full test suite (20+ scenarios)

3. Measure activation rates:
   - Which variation has highest accuracy?
   - Which has lowest false positives?
   - Are there patterns in which scenarios each handles best?

4. Combine best elements from top performers

### Step 7: Validation and Deployment

**Final checks**:

1. Run full test suite with optimized description:
   - Target: >80% activation rate
   - Target: <10% false positive rate

2. Cross-check with validation protocol:
   ```
   ${CLAUDE_PLUGIN_ROOT}/shared/protocols/skills/validation-protocol.md
   ```

3. Test with real user scenarios (not just test cases)

4. Monitor activation in production (if using `--debug` mode)

**Sign-off criteria**:
- [ ] Activation rate >80% on test suite
- [ ] False positive rate <10%
- [ ] Real-world testing completed
- [ ] No conflicts with other skills
- [ ] Description within 200-500 chars
- [ ] All validation protocol checks passing

## Activation Patterns

### Standard Pattern (most skills)
```yaml
description: >
  [What it does]. Use when [trigger-1], [trigger-2], or working with [paths].
```

**When to use**: General-purpose skills, optional functionality

### Imperative Pattern (critical infrastructure)
```yaml
description: >
  [What it does]. REQUIRED when [trigger-1], [trigger-2], or working with [paths].
```

**When to use**: Core Claude Code infrastructure (agents, commands, hooks, output-styles)

**Note**: Both patterns have identical activation mechanics - "REQUIRED" is semantic emphasis only.

## Common Optimization Scenarios

### Scenario 1: Low Activation on Target Phrases

**Problem**: Skill should activate on "build a new skill" but doesn't

**Diagnosis**: Missing verb variation "build"

**Fix**: Add to description: "creating skills, building new skills, designing skills"

**Verification**: Re-test with "build a new skill" phrase

### Scenario 2: False Positives

**Problem**: Skill activates on "create agent" (should be claude-code-sub-agent)

**Diagnosis**: Too generic "create" without domain differentiation

**Fix**: Add exclusion: "Use when creating skills... Does NOT handle agents."

**Verification**: Test negative scenarios with agent-related phrases

### Scenario 3: Inconsistent Activation

**Problem**: Sometimes activates, sometimes doesn't with same phrase

**Diagnosis**: Competing skills or borderline semantic match

**Fix**: Increase keyword density + add path context triggers

**Verification**: Run same phrase 10 times, check consistency

### Scenario 4: Language Variations

**Problem**: Works in English but not Spanish/other languages

**Diagnosis**: Keyword-based matching fails across languages

**Fix**: Add multilingual verb variations OR use path-based triggers (language-agnostic)

**Verification**: Test in target languages

## Metrics and Monitoring

### Key Metrics

- **Activation Rate**: `(correct activations / total opportunities) × 100`
- **Precision**: `(correct activations / total activations) × 100`
- **False Positive Rate**: `(false activations / negative scenarios) × 100`
- **Consistency Score**: Variance in repeated tests with same phrase

### Target Benchmarks

| Metric | Minimum | Good | Excellent |
|--------|---------|------|-----------|
| Activation Rate | 70% | 80% | 90%+ |
| Precision | 80% | 90% | 95%+ |
| False Positive Rate | <20% | <10% | <5% |
| Consistency | 70% | 85% | 95%+ |

## Tools and Resources

**Analysis Tools**:
```bash
# Analyze activation patterns (future)
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/analyze_activation.py [skill-path]
```

**References**:
- `${CLAUDE_PLUGIN_ROOT}/shared/references/skills/activation-examples.md` - Real-world description patterns
- `${CLAUDE_PLUGIN_ROOT}/shared/references/skills/best-practices-comprehensive.md` - Comprehensive guidelines

**Debug Mode**:
```bash
# See activation decisions in real-time
claude --debug
```

Shows:
- Which skills were considered
- Why each was selected/rejected
- Confidence scores (if available)

## Notes

- **Activation is probabilistic**: Not deterministic matching
- **Context matters**: Same phrase may activate different skills based on current directory, recent messages
- **Iterate based on real usage**: Monitor production activations and adjust
- **Balance specificity vs coverage**: Too specific = misses valid scenarios, too generic = false positives
