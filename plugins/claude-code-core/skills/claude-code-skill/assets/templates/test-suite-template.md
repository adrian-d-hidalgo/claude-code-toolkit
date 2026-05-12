# Test Suite for [Skill Name]

Version: 1.0.0
Last Updated: [Date]

## Activation Tests

### Positive Triggers (Should Activate)

Test that skill activates for these requests:

**Test 1.1: Direct keyword match**
- Input: "[Phrase with main keyword]"
- Expected: Skill activates
- Actual: [Pass/Fail]
- Notes:

**Test 1.2: Use case match**
- Input: "[Phrase matching use case]"
- Expected: Skill activates
- Actual: [Pass/Fail]
- Notes:

**Test 1.3: Technology mention**
- Input: "[Phrase with specific technology]"
- Expected: Skill activates
- Actual: [Pass/Fail]
- Notes:

**Test 1.4: Varied phrasing**
- Input: "[Alternative phrasing]"
- Expected: Skill activates
- Actual: [Pass/Fail]
- Notes:

**Test 1.5: Complex request**
- Input: "[Multi-part request]"
- Expected: Skill activates
- Actual: [Pass/Fail]
- Notes:

### Negative Triggers (Should NOT Activate)

Test that skill does NOT activate for these requests:

**Test 2.1: Unrelated domain**
- Input: "[Request outside skill domain]"
- Expected: Skill does NOT activate
- Actual: [Pass/Fail]
- Notes:

**Test 2.2: Similar keyword, different context**
- Input: "[Keyword in unrelated context]"
- Expected: Skill does NOT activate
- Actual: [Pass/Fail]
- Notes:

**Test 2.3: Generic request**
- Input: "[Vague, generic request]"
- Expected: Skill does NOT activate (or general Claude responds)
- Actual: [Pass/Fail]
- Notes:

**Test 2.4: Related but out of scope**
- Input: "[Related topic but not skill's responsibility]"
- Expected: Skill does NOT activate
- Actual: [Pass/Fail]
- Notes:

**Test 2.5: False positive check**
- Input: "[Phrase likely to cause false positive]"
- Expected: Skill does NOT activate
- Actual: [Pass/Fail]
- Notes:

### Edge Cases

**Test 3.1: Ambiguous request**
- Input: "[Ambiguous request]"
- Expected: Skill requests clarification OR activates with assumptions
- Actual: [Pass/Fail]
- Notes:

**Test 3.2: Partial match**
- Input: "[Partial keyword match]"
- Expected: [Define expected behavior]
- Actual: [Pass/Fail]
- Notes:

**Test 3.3: Misspelled keyword**
- Input: "[Request with typo]"
- Expected: [Define expected behavior]
- Actual: [Pass/Fail]
- Notes:

## Functionality Tests

### Core Workflow Tests

**Test 4.1: Basic operation**
- Input: "[Simple, common request]"
- Expected Workflow:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- Expected Output: "[Description of output]"
- Actual Output: [Details]
- Success Criteria:
  - [ ] Correct tools called
  - [ ] Output format correct
  - [ ] All steps completed
- Result: [Pass/Fail]
- Notes:

**Test 4.2: Complex operation**
- Input: "[Complex request with multiple steps]"
- Expected Workflow:
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
  4. [Step 4]
- Expected Output: "[Description of output]"
- Actual Output: [Details]
- Success Criteria:
  - [ ] All steps executed in order
  - [ ] Intermediate validation passed
  - [ ] Final output complete
- Result: [Pass/Fail]
- Notes:

**Test 4.3: Resource utilization**
- Input: "[Request requiring bundled resources]"
- Expected Behavior:
  - Uses scripts/[script-name]
  - References references/[file-name]
  - Applies assets/[asset-name]
- Actual Behavior: [Details]
- Result: [Pass/Fail]
- Notes:

**Test 4.4: Multi-skill coordination**
- Input: "[Request requiring other skills]"
- Expected Coordination:
  1. Primary skill activates
  2. Delegates to [other-skill]
  3. Integrates results
- Actual Coordination: [Details]
- Result: [Pass/Fail]
- Notes:

### Error Handling Tests

**Test 5.1: Invalid input**
- Input: "[Request with invalid parameters]"
- Expected: Validation error with clear message
- Actual: [Details]
- Result: [Pass/Fail]
- Notes:

**Test 5.2: Missing resource**
- Input: "[Request when resource unavailable]"
- Expected: Graceful error with guidance
- Actual: [Details]
- Result: [Pass/Fail]
- Notes:

**Test 5.3: Edge case handling**
- Input: "[Boundary condition]"
- Expected: Appropriate handling
- Actual: [Details]
- Result: [Pass/Fail]
- Notes:

## Performance Tests

### Token Efficiency

**Test 6.1: Simple task token usage**
- Scenario: [Simple operation]
- Baseline (without skill): [X tokens]
- With skill: [Y tokens]
- Efficiency gain: [(X-Y)/X * 100%]
- Target: 40-50% reduction
- Result: [Pass/Fail]

**Test 6.2: Complex task token usage**
- Scenario: [Complex operation]
- Baseline (without skill): [X tokens]
- With skill: [Y tokens]
- Efficiency gain: [(X-Y)/X * 100%]
- Target: 40-50% reduction
- Result: [Pass/Fail]

### Speed Tests

**Test 6.3: Response time**
- Scenario: [Typical operation]
- Average response time: [X seconds]
- Target: [<Y seconds]
- Result: [Pass/Fail]

## Quality Tests

### Output Quality

**Test 7.1: Accuracy**
- Scenario: [Operation requiring precision]
- Output accuracy: [Percentage or description]
- Target: 95%+
- Result: [Pass/Fail]

**Test 7.2: Completeness**
- Scenario: [Multi-part operation]
- Completion rate: [Percentage]
- Missing elements: [List if any]
- Target: 85%+
- Result: [Pass/Fail]

**Test 7.3: Consistency**
- Scenario: [Same request, multiple times]
- Consistency across runs: [Description]
- Variations: [List if significant]
- Result: [Pass/Fail]

## Integration Tests

### Model Compatibility

**Test 8.1: Haiku**
- Scenario: [Standard operation]
- Activation: [Pass/Fail]
- Functionality: [Pass/Fail]
- Notes:

**Test 8.2: Sonnet**
- Scenario: [Standard operation]
- Activation: [Pass/Fail]
- Functionality: [Pass/Fail]
- Notes:

**Test 8.3: Opus**
- Scenario: [Complex operation]
- Activation: [Pass/Fail]
- Functionality: [Pass/Fail]
- Notes:

## Regression Tests

Run after updates to verify no breaking changes.

**Test 9.1: Previous version compatibility**
- Scenario: [Operation from previous version]
- Expected: Works as before or better
- Actual: [Details]
- Result: [Pass/Fail]

**Test 9.2: Metric comparison**
- Activation accuracy: v[X] [%] → v[Y] [%]
- Token efficiency: v[X] [%] → v[Y] [%]
- Task completion: v[X] [%] → v[Y] [%]
- Result: [Improved/Maintained/Regressed]

## Test Summary

**Date**: [Test date]
**Version**: [Skill version]
**Tester**: [Name]

### Results

| Category | Tests Passed | Tests Failed | Pass Rate |
|----------|--------------|--------------|-----------|
| Activation (Positive) | X/5 | Y/5 | Z% |
| Activation (Negative) | X/5 | Y/5 | Z% |
| Activation (Edge Cases) | X/3 | Y/3 | Z% |
| Functionality | X/4 | Y/4 | Z% |
| Error Handling | X/3 | Y/3 | Z% |
| Performance | X/3 | Y/3 | Z% |
| Quality | X/3 | Y/3 | Z% |
| Integration | X/3 | Y/3 | Z% |
| Regression | X/2 | Y/2 | Z% |
| **TOTAL** | **X/31** | **Y/31** | **Z%** |

### Metrics

- Activation accuracy: [%]
- False positive rate: [%]
- False negative rate: [%]
- Task completion rate: [%]
- Token efficiency gain: [%]
- Average response time: [seconds]

### Issues Found

1. [Issue 1 description]
   - Severity: [Critical/High/Medium/Low]
   - Action: [Fix required]

2. [Issue 2 description]
   - Severity: [Critical/High/Medium/Low]
   - Action: [Fix required]

### Recommendations

1. [Recommendation 1]
2. [Recommendation 2]
3. [Recommendation 3]

### Next Steps

- [ ] Fix critical issues
- [ ] Address high-priority items
- [ ] Retest failed scenarios
- [ ] Update documentation if needed
- [ ] Deploy to production (if all tests pass)
