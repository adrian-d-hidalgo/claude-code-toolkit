---
description: [Clear, specific description of what this command does]
allowed-tools: [Minimal required tools]
argument-hint: [parameter-1] [parameter-2]
model: sonnet
---

Parse arguments from "$ARGUMENTS": [Brief acknowledgment and parameter extraction]

## Task Definition & Scope

**Objective**: [Clear statement of what this command accomplishes]

**Input Parameters**:

- **[Parameter 1]**: [Description and validation requirements]
- **[Parameter 2]** (optional): [Description and default behavior]

**Expected Outcomes**:

- [Specific outcome 1]
- [Specific outcome 2]

**Success Criteria**:

- [Measurable criterion 1]
- [Measurable criterion 2]

## Prerequisites & Validation

**Environment checks**:

- [ ] [Required tool/dependency 1] available
- [ ] [Required configuration 1] present
- [ ] [Required permission/access 1] granted

**Input validation**:

- [ ] [Parameter 1] format is valid
- [ ] [Parameter 2] within acceptable range
- [ ] [Prerequisite condition] met

## Context Detection Implementation

**Before creating/modifying files** (if applicable):

1. **Detect project structure**:

   ```bash
   Use Glob("**/.claude") or similar to find project root
   ```

2. **Verify target location**:

   ```bash
   Check if target directory exists
   Validate write permissions
   ```

3. **Create structure if needed**:

   ```bash
   Create necessary directories
   Provide clear feedback about locations
   ```

4. **Never create files in root** unless explicitly intended

## Implementation Steps

### Step 1: [First Major Action]

[Description of what this step does]

**Actions**:

1. [Specific action]
2. [Specific action]

**Validation**:

- Check [expected result]

### Step 2: [Second Major Action]

[Description]

**Actions**:

1. [Specific action]
2. [Specific action]

**Validation**:

- Verify [expected state]

### Step 3: [Final Actions]

[Description]

**Final checks**:

- [ ] [Check 1]
- [ ] [Check 2]

## Error Recovery

### Common Errors

**Error 1: [Error Type]**

- **Symptom**: [What user sees]
- **Cause**: [Why it happens]
- **Resolution**:
  1. [Step to resolve]
  2. [Step to resolve]

**Error 2: [Error Type]**

- **Symptom**: [What user sees]
- **Cause**: [Why it happens]
- **Resolution**:
  1. [Step to resolve]

### Recovery Protocol

When errors occur:

1. **Capture context**: Error message, environment details
2. **Attempt resolution**: Apply standard fixes
3. **Validate fix**: Confirm error resolved
4. **Rollback if needed**: Restore previous state if all fixes fail

## Validation Protocol

**Output verification**:

- [ ] [Expected output 1] present
- [ ] [Expected output 2] correct

**Functional testing**:

- [ ] [Functionality 1] works as expected
- [ ] [Functionality 2] performs correctly

## Usage Examples

### Example 1: [Common Use Case]

```bash
/command-name typical-parameter
```

**Expected Output**:

```
[What user should see]
```

**Result**: [What gets created/modified]

### Example 2: [Edge Case]

```bash
/command-name edge-case-parameter
```

**Expected Behavior**: [How command handles this case]

## Integration Notes

**Works with**:

- [Related command/agent]: [How they integrate]

**Can be called by**:

- [Agent/command types that use this]

## Troubleshooting

**Issue: [Common Problem 1]**

- Check: [What to verify]
- Solution: [How to fix]

**Issue: [Common Problem 2]**

- Check: [What to verify]
- Solution: [How to fix]
