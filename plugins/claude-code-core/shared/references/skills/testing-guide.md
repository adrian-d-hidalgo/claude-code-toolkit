# Testing Guide

Comprehensive testing procedures for skills.

## Activation-evals corpus authoring (May 2026 learnings)

The `tests/activation-evals.json` corpus drives the live eval harness (`scripts/run_activation_evals.py --live --judge`). Writing it well is the difference between routing 0.79 (failing the bar) and 1.00 (perfect).

### Two metrics, two purposes

- **Routing** (`skill_invoked` ↔ `expected`): binary — did Claude pick the right tool?
- **Outcome** (`understood_intent` + `action_appropriate`, judged by Opus): did Claude do the right thing semantically? Out of 4, threshold 1.5.

For **skills**, routing is the primary metric — the meta-skill must actually fire to drive its workflow. For **sub-agents**, outcome is primary — main Claude has the same tools and inlining the work is often a valid alternative to delegation (see `claude-code-sub-agent/SKILL.md` for the reality check).

### Query patterns to PREFER for positive cases

These route cleanly because the meta-skill workflow is the natural answer — Claude cannot do the work without invoking the skill:

```json
{"query": "Create a new X that does Y", "should_trigger": true}
{"query": "Scaffold the .claude/X/foo.md for a Y workflow"}
{"query": "Design a X with the Z field configured for W"}
{"query": "Walk me through the X frontmatter and what each field controls"}
{"query": "Generate a X description that's a strong classifier for Y intent"}
{"query": "What sections should a X have, and what's the convention for Z?"}
```

### Query patterns to AVOID for positive cases

These trigger Claude's **verify-before-act** safety behavior — Claude will `Glob` / `Read` / `Bash` to locate the file FIRST, which the runner sees as a routing miss even though the behavior is correct:

```json
// ❌ "this X" / "my Y" without a specific path
{"query": "Validate this slash command's frontmatter"}
{"query": "Audit my plugin for production readiness"}
{"query": "Refactor my agent — its description is too vague"}

// ❌ Cross-domain "convert this to a Y"
{"query": "Convert this command into a skill"}  // routes to the destination skill, not the source

// ❌ Trivial single-function inline-able work (for sub-agents specifically)
{"query": "Write a Python function that dedupes a list"}  // Claude just writes it
```

The judge will consistently rate these as "appropriate routing — Claude verified before acting" — meaning the corpus is asking the wrong question, not that the model is wrong.

### Edge cases

Edge cases SHOULD be genuinely ambiguous. They test that the description's negative scope works. But the wording must still be routable:

```json
// Genuinely ambiguous BUT routable
{"query": "Make a /build thing", "should_trigger": true}   // slash-command meta-skill should clarify
{"query": "I want to ship a sub-agent in a Claude Code plugin — what goes in agents/ vs plugin.json?", "should_trigger": true}  // sub-agent meta-skill (authoring) but plugin scope is mentioned

// Ambiguous AND unroutable (Claude asks for clarification, judge rates as appropriate, eval counts as FN)
{"query": "Give the agent persistent memory"}  // which agent?
{"query": "Set up an agent that auto-applies hooks"}  // sub-agent or hook?
```

The second group needs rewording to anchor it to one meta-skill clearly while still being non-obvious.

### Negative cases

Negative cases test the description's negative scope. Use sibling-domain phrasings:

```json
{"query": "Create a new sub-agent for database migrations", "should_trigger": false}  // tests claude-code-skill's negative scope
{"query": "Build a slash command", "should_trigger": false}
{"query": "Configure a PreToolUse hook", "should_trigger": false}
```

Plus 2–4 non-Claude-Code negatives to catch over-eager triggering:

```json
{"query": "Edit my application code", "should_trigger": false}
{"query": "Run the test suite", "should_trigger": false}
{"query": "Write a Dockerfile", "should_trigger": false}
```

### Empirical baseline (May 2026)

Corpora rewritten following this guide hit **routing 0.947–1.000** across 6 meta-skills (aggregate 0.991 ± 0.022). Outcome 3.74–4.00 / 4. Run-to-run variance ~0.05 — don't over-rotate on a single delta.

### Schema reminder

```json
{
  "skill": "claude-code-foo",
  "version": "2.1.0",
  "snapshot_date": "YYYY-MM-DD",
  "notes": "Optional — capture what changed between versions",
  "cases": [
    {"id": "pos-01", "query": "...", "should_trigger": true,  "category": "positive-direct"},
    {"id": "neg-01", "query": "...", "should_trigger": false, "category": "negative-sibling"},
    {"id": "edge-01","query": "...", "should_trigger": true,  "category": "edge-ambiguous", "notes": "Why this is edge."}
  ]
}
```

Target: ≥8 positives, ≥8 negatives, ≥3 edge cases per skill.

---


## Testing Philosophy

**Build evaluations first**: Create test scenarios before extensive documentation.

Test with:
- All target models (Haiku, Sonnet, Opus)
- Real usage scenarios (not isolated cases)
- Team feedback from actual usage patterns

## Test Types

### 1. Activation Testing

Verify skill triggers correctly.

**Minimum 3 evaluations required**:

**Positive triggers** (should activate):
```
Test what phrases SHOULD trigger skill based on description

Examples for PDF processing skill:
- "Rotate invoice.pdf 90 degrees"
- "Merge these PDF files"
- "Extract text from document.pdf"
- "Help me process this PDF"
- "I need to manipulate a PDF file"
```

**Negative triggers** (should NOT activate):
```
Test what phrases SHOULD NOT trigger skill

Examples for PDF processing skill:
- "Create a new PDF from scratch" (if skill only processes existing)
- "PDF format specification details" (informational query)
- "Best PDF reader recommendations" (tool comparison)
- "My PDF knowledge is limited" (false positive on "PDF")
```

**Edge cases**:
```
Ambiguous or partial matches

Examples:
- "Can you help with this file?" (unclear file type)
- "Process this document" (unclear operation)
- "PDF" (single keyword, no context)
```

**Using debug mode**:
```bash
claude --debug

# Shows activation decisions:
# - Which skills considered
# - Why skill activated/didn't activate
# - Confidence scores (if available)
```

### 2. Functionality Testing

Test core workflows end-to-end.

**Test structure**:
```
For each primary use case:
1. Define input
2. Execute skill workflow
3. Verify output matches expected
4. Check success criteria met
5. Validate error handling (if applicable)
```

**Example test case**:
```markdown
Test: PDF Rotation

Input: "Rotate document.pdf 90 degrees clockwise"

Expected workflow:
1. Skill activates (verify in debug mode)
2. Validates file exists
3. Executes scripts/rotate_pdf.py
4. Verifies output file created
5. Reports success

Success criteria:
- Output file exists
- Output file is valid PDF
- Rotation angle correct
- Original file unchanged (if preserve=true)

Error scenarios:
- File doesn't exist → Clear error message
- Invalid angle → Validation error
- Corrupted PDF → Graceful failure with details
```

### 3. Integration Testing

Test multi-skill coordination (if applicable).

**Scenarios**:
```markdown
Test: Skill coordinates with research-specialist

Input: "Process this PDF using best practices"

Expected workflow:
1. Primary skill activates
2. Delegates to research-specialist for best practices
3. Applies recommended approach
4. Returns coordinated result

Validation:
- Both skills activated appropriately
- Information passed correctly between skills
- Final output incorporates best practices
- No conflicts or duplicate work
```

## Metrics to Track

### Activation Metrics

**Activation accuracy**: Triggers when should

Target: 90%+

Calculate:
```
True Positives / (True Positives + False Negatives)
```

**False positive rate**: Triggers when shouldn't

Target: <5%

Calculate:
```
False Positives / (False Positives + True Negatives)
```

### Performance Metrics

**Tool correctness**: Calls right functions

Target: 95%+

Measure: Percentage of test cases where correct tools called

**Task completion**: End-to-end success

Target: 85%+

Measure: Percentage of test scenarios completed successfully

**Token efficiency**: Reduction vs baseline

Target: 40-50% reduction

Measure:
```
(Baseline Tokens - Skill Tokens) / Baseline Tokens × 100%
```

**Error rate**: Graceful failures

Target: <5%

Measure: Percentage of tests with unhandled errors

## Validation Loop Process

Iterative testing methodology:

```
1. Run test scenario
2. Observe outcome
3. If PASS:
   - Document success
   - Move to next scenario
4. If FAIL:
   - Identify root cause
   - Categorize issue (activation, logic, tool use, output)
   - Fix SKILL.md or resources
   - Re-run test
   - Repeat until passing
5. After all tests pass:
   - Validate against success criteria
   - Get team/user feedback
   - Iterate if needed
```

## Test Documentation

**Test suite structure**:
```
skill-name/tests/
├── activation-tests.md       # Positive/negative/edge case triggers
├── functionality-tests.md    # Core workflow validation
├── edge-cases.md             # Error handling scenarios
└── integration-tests.md      # Multi-skill coordination
```

**Test case template**:
```markdown
## Test: [Test Name]

**Category**: [Activation|Functionality|Integration|Edge Case]

**Input**: [User request or trigger phrase]

**Expected Behavior**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Success Criteria**:
- [Criterion 1]
- [Criterion 2]

**Actual Result**: [Pass|Fail - details]

**Notes**: [Observations, improvements, edge cases discovered]
```

## Testing with Different Models

Test across model tiers for consistency.

**Model-specific considerations**:

**Haiku** (fastest, most efficient):
- Verify skill still triggers (less context tolerance)
- Check if simplified instructions needed
- Validate token efficiency gains

**Sonnet** (balanced):
- Primary testing target
- Full feature validation
- Performance baseline

**Opus** (most capable):
- Complex scenario testing
- Edge case handling
- Multi-step workflow validation

## Team Feedback Integration

Incorporate real usage patterns.

**Feedback collection**:
```markdown
After deployment, gather:
- Which triggers worked/failed in practice
- Unexpected activations (false positives)
- Missed activations (false negatives)
- Tool usage correctness
- Output quality assessment
- Performance (speed, token usage)
```

**Iteration based on feedback**:
```
Weekly: Review activation logs and user reports
Monthly: Analyze metrics trends
Quarterly: Comprehensive test suite re-run
```

## Regression Testing

Prevent breaking changes.

**Before updates**:
```
1. Run full test suite on current version
2. Document baseline metrics
3. Apply changes
4. Re-run full test suite
5. Compare metrics:
   - Activation accuracy maintained or improved?
   - Performance metrics maintained or improved?
   - No new failures introduced?
6. If regressions found:
   - Identify cause
   - Fix or revert change
   - Re-test
```

## Performance Benchmarking

Compare against baselines.

**Benchmark tests**:
```markdown
Test: Token efficiency

Baseline: General Claude without skill
- Run scenario
- Record tokens used
- Record completion time

With Skill: Same scenario
- Run scenario
- Record tokens used
- Record completion time

Calculate:
- Token reduction: (Baseline - Skill) / Baseline × 100%
- Speed improvement: (Baseline Time - Skill Time) / Baseline Time × 100%

Target: 40-50% token reduction, comparable or faster speed
```

## Common Testing Issues

### Skill Not Activating

**Debug steps**:
1. Run with `claude --debug` to see activation decisions
2. Check if description too vague or generic
3. Test if trigger phrases match description keywords
4. Verify file paths correct (`~/.claude/skills/` or `.claude/skills/`)
5. Restart Claude Code to reload skills

### False Positives

**Debug steps**:
1. Review description for overly broad keywords
2. Make description more domain-specific
3. Add specific technologies/file types to description
4. Test with negative trigger phrases
5. Iterate description until false positives eliminated

### Inconsistent Behavior

**Debug steps**:
1. Test across multiple models (Haiku, Sonnet, Opus)
2. Check for time-sensitive content in SKILL.md
3. Verify no randomness in core logic
4. Test same scenario multiple times
5. Review if context from previous conversation affecting results

## Quick Testing Checklist

Before deployment:

- [ ] Minimum 3 positive trigger tests passed
- [ ] Minimum 3 negative trigger tests passed
- [ ] Core workflows tested end-to-end
- [ ] Edge cases handled gracefully
- [ ] Tested with Haiku, Sonnet, Opus
- [ ] Metrics meet targets (90% activation, 85% completion, 40-50% tokens)
- [ ] Team provided feedback on real usage
- [ ] Regression tests passed after changes
- [ ] Performance benchmarks acceptable
