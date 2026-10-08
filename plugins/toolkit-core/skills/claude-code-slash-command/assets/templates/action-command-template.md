---
description: [Clear, specific description of what this command does - be precise and action-oriented]
allowed-tools: [Minimal required tools - follow least privilege principle]
argument-hint: [expected-parameter-1] [optional-parameter-2]
model: sonnet
---

[Brief opening statement that parses and acknowledges the arguments from "$ARGUMENTS"]

## Task Definition & Scope

**Objective**: [Clear statement of what this command accomplishes]

**Input Parameters**:

- **[Parameter 1]**: [Description and validation requirements]
- **[Parameter 2]** (optional): [Description and default behavior]

**Expected Outcomes**:

- [Specific outcome 1]
- [Specific outcome 2]
- [Specific outcome 3]

**Success Criteria**:

- [Measurable criterion 1]
- [Measurable criterion 2]

## Prerequisites & Safety Checks

**Environment Validation**:

- [ ] Check required tools installed ([tool1], [tool2])
- [ ] Verify project structure (package.json, [config-files])
- [ ] Validate permissions (write access to target directories)

**Safety Checks**:

- [ ] Git status check (warn if uncommitted changes)
- [ ] Backup existing files if modifications are destructive
- [ ] Dry-run option for preview (if applicable)

**Dependencies**:

- [Tool/package 1] version [X.X.X or higher]
- [Tool/package 2] installed globally/locally
- [Configuration] file present at [location]

## Context Detection Implementation

**Before creating any files** (if this command creates files):

1. **Check for .claude/ directory**:

   ```bash
   Use Glob("**/.claude") to detect project structure
   ```

2. **Verify target directory**:

   ```bash
   Check if [target-directory] exists and is writable
   ```

3. **Create directory structure if needed**:

   ```bash
   Create [target-directory] if missing
   Validate creation was successful
   ```

4. **Determine appropriate location**:
   - Based on project type/framework
   - Following project conventions
   - Respecting existing structure

5. **Provide clear feedback about file location**:
   ```
   "Created [file-type] at [full-path]"
   ```

**Never create files in root directory unless explicitly intended.**

## Implementation Steps

### Step 1: [First Major Action]

[Detailed description of what this step does]

**Actions**:

1. [Specific action with tool]
2. [Specific action with tool]
3. [Specific action with tool]

**Validation**:

- Check that [expected result]
- Verify [expected state]

### Step 2: [Second Major Action]

[Detailed description of what this step does]

**Actions**:

1. [Specific action]
2. [Specific action]

**Validation**:

- Confirm [expected result]

### Step 3: [Third Major Action]

[Continue pattern for remaining steps]

### Step N: [Final Action]

[Completion step]

**Final Checks**:

- [ ] [Check 1]
- [ ] [Check 2]
- [ ] [Check 3]

## Research Integration

**When to use research** (if applicable):

- Current [technology] version information needed
- Error resolution required
- Best practice validation
- Tool comparison decisions

**Research invocation**:

```markdown
If [condition requiring current information]:

1. Use: [Appropriate research command]
2. Provide: [Specific context, technology stack, error details]
3. Handle: Research failure gracefully with fallback approaches
```

**Fallback approaches**:

- [Fallback approach 1 if research unavailable]
- [Fallback approach 2]

## Error Recovery

### Common Errors

**Error 1: [Error Type]**

- **Symptom**: [What user sees]
- **Cause**: [Why it happens]
- **Resolution**:
  1. [Step to resolve]
  2. [Step to resolve]
  3. [Step to resolve]

**Error 2: [Error Type]**

- **Symptom**: [What user sees]
- **Cause**: [Why it happens]
- **Resolution**:
  1. [Step to resolve]

### Standard Recovery Protocol

When errors occur:

1. **Capture context**:
   - Error message and stack trace
   - Environment details ([OS], [versions])
   - Configuration state

2. **Research current solutions** (if applicable):
   - Use appropriate research command
   - Provide captured context
   - Incorporate environmental details

3. **Apply progressive fixes**:
   - Try safe/recommended fixes first
   - Test after each fix
   - Move to experimental approaches if needed

4. **Validate resolution**:
   - Confirm error resolved
   - Check for side effects
   - Verify expected functionality

5. **Document solution**:
   - Note which fix worked
   - Record for future reference

6. **Rollback capability**:
   - If all fixes fail, restore previous state
   - Report issue with captured context
   - Suggest manual intervention

## Validation Protocol

**Output Verification**:

- [ ] [Expected file 1] exists at [location]
- [ ] [Expected file 2] has correct content
- [ ] [Configuration] is properly set

**Functional Testing**:

- [ ] Run [test command] to verify functionality
- [ ] Execute [validation command] to check correctness
- [ ] Confirm [expected behavior] works

**Performance Checks**:

- [ ] Operation completed within reasonable time
- [ ] No excessive resource usage
- [ ] Generated files are optimal size

**Security Validation**:

- [ ] No sensitive information exposed
- [ ] Proper permissions set on created files
- [ ] No security vulnerabilities introduced

## Usage Examples

### Example 1: [Common Use Case]

```bash
[command-invocation with typical parameters]
```

**Expected Output**:

```
[What user should see]
```

**Result**:

- [What gets created/modified]
- [Expected state change]

### Example 2: [Edge Case]

```bash
[command-invocation with edge case parameters]
```

**Expected Output**:

```
[What user should see]
```

### Example 3: [Advanced Usage]

```bash
[command-invocation with advanced parameters]
```

**Special Considerations**:

- [Note about this usage]
- [Warning or tip]

## Integration Notes

**Integrates with**:

- [Other command 1]: [How they work together]
- [Other command 2]: [How they work together]
- [Agent type]: [How agents can use this command]

**Can be called by**:

- [Agent types that benefit from this command]
- [Other commands that might invoke this]

**Provides**:

- [Output/state that other commands can use]
- [Feedback that agents can interpret]

## Troubleshooting

**Issue: [Common Problem 1]**

- Check: [What to verify]
- Solution: [How to fix]

**Issue: [Common Problem 2]**

- Check: [What to verify]
- Solution: [How to fix]

**Issue: [Common Problem 3]**

- Check: [What to verify]
- Solution: [How to fix]

## Notes and Warnings

**Important Notes**:

- [Important consideration 1]
- [Important consideration 2]

**Warnings**:

- ⚠️ [Warning about destructive operation]
- ⚠️ [Warning about side effects]

**Tips**:

- 💡 [Helpful tip for better results]
- 💡 [Optimization suggestion]
