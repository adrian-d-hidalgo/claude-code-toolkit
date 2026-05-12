# Command Improvement Sub-Workflows

Detailed workflows for fixing specific command issues.

## Sub-Workflow 2A: Fix Context Detection Issues

**Symptoms**:
- Files created in wrong locations
- No directory structure validation
- Root directory file creation

**Implementation**:

1. **Add Context Detection section** (if missing):
```markdown
## Context Detection Implementation

**Before creating any files**:

1. Check for .claude/ directory: Use Glob("**/.claude")
2. Verify target directory exists
3. Create directory structure if needed
4. Provide clear feedback about file location
```

2. **Update allowed-tools** to include Glob if missing

3. **Add directory checks** before Write operations:
```markdown
Before Write:
- Glob("**/.claude") to find project structure
- Validate target directory exists
- Create if missing with proper feedback
```

4. **Test file placement**:
   - Run command in test environment
   - Verify files created in correct location
   - Check feedback messages are clear

**Load**: references/context-detection.md for complete patterns

## Sub-Workflow 2B: Security Enhancements

**Symptoms**:
- Unrestricted Bash access
- Too many tools in allowed-tools
- No input validation
- Missing sanitization

**Implementation**:

1. **Audit allowed-tools** (restrict to minimum needed):
```yaml
# BAD
allowed-tools: [Read, Write, Edit, Bash, Grep, Glob]

# GOOD (only what's actually used)
allowed-tools: [Read, Write, Bash(npm *), Grep]
```

2. **Add input validation** in command body:
```markdown
## Input Validation

Before processing:
- Validate [parameter] format matches [pattern]
- Sanitize file paths to prevent directory traversal
- Check parameter values are within expected ranges
```

3. **Restrict Bash commands**:
```yaml
# Change from:
allowed-tools: [Bash]

# To specific commands:
allowed-tools: [Bash(npm *), Bash(git status)]
```

4. **Test security scenarios**:
   - Invalid inputs
   - Malicious paths
   - Excessive permissions

**Load**: references/security-patterns.md for validation checklist

## Sub-Workflow 2C: Performance Optimization

**Symptoms**:
- Slow execution
- Redundant operations
- Multiple searches for same data
- Inefficient file operations

**Implementation**:

1. **Identify bottlenecks**:
   - Multiple Glob calls for same pattern
   - Reading same file multiple times
   - Unnecessary validation loops

2. **Optimize file operations**:
```markdown
# BAD: Multiple reads
Read(file.ts) # Check imports
Read(file.ts) # Check exports
Read(file.ts) # Check content

# GOOD: Single read
Read(file.ts) # Analyze once for all needs
```

3. **Remove redundant checks**:
   - Combine similar validations
   - Cache results when safe
   - Use single Glob for multiple patterns

4. **Improve search patterns**:
```bash
# BAD: Too broad
Grep("function")

# GOOD: Specific
Grep("function handleSubmit", glob="**/*.ts")
```

**Load**: references/optimization-patterns.md for techniques

## Sub-Workflow 2D: Error Handling Improvements

**Symptoms**:
- Generic error messages
- No recovery procedures
- Silent failures
- Poor error context

**Implementation**:

1. **Add specific error messages**:
```markdown
## Error Recovery

**Error: Package.json not found**
- Symptom: Command fails immediately
- Cause: Not in project root
- Resolution:
  1. Navigate to project directory
  2. Verify package.json exists
  3. Re-run command
```

2. **Implement recovery procedures**:
```markdown
When [error] occurs:
1. Capture error context
2. Research current solutions (if applicable)
3. Apply progressive fixes
4. Validate resolution
5. Document solution
```

3. **Add rollback mechanisms**:
```markdown
If operation fails:
- Restore previous state
- Clean up partial changes
- Report with context
```

**Load**: references/error-patterns.md for patterns

## Sub-Workflow 2E: Research Integration

**When to add**:
- Command needs current technology information
- Error resolution requires latest solutions
- Best practices validation needed
- Tool comparison decisions

**Implementation**:

1. **Add Research Integration section**:
```markdown
## Research Integration

**When to use research**:
- Current [technology] version information needed
- Error resolution required
- Best practice validation

**Research invocation**:
If [condition]:
1. Use: [Appropriate research command]
2. Provide: [Context, stack, error details]
3. Handle: Research failure with fallback
```

2. **Define fallback approaches**:
```markdown
**Fallback approaches**:
- [Known working solution for common case]
- [Manual steps if research unavailable]
```

**Load**: references/research-integration.md for integration patterns

## Sub-Workflow 2F: Documentation Enhancement

**Symptoms**:
- No usage examples
- Unclear parameter descriptions
- Missing expected outcomes
- Poor section organization

**Implementation**:

1. **Add clear examples**:
```markdown
## Usage Examples

### Example 1: Common Use Case
```bash
/command-name typical-value
```

**Expected Output**:
```
[Clear output description]
```

**Result**: [What gets created/changed]
```

2. **Improve parameter descriptions**:
```markdown
## Input Parameters

- **parameter-name**: [Type] - [Clear description]
  - Format: [Expected format]
  - Example: `example-value`
  - Required: yes/no
```

3. **Clarify expected outcomes**:
```markdown
## Expected Outcomes

After successful execution:
- [Specific outcome 1]
- [Specific outcome 2]
- [Specific outcome 3]
```

4. **Review template** for structure reference

## Quick Reference

| Issue Type | Sub-Workflow | Reference |
|---|---|---|
| Context detection fails | 2A | context-detection.md |
| Security gaps | 2B | security-patterns.md |
| Performance issues | 2C | optimization-patterns.md |
| Error handling weak | 2D | error-patterns.md |
| Need research integration | 2E | research-integration.md |
| Documentation incomplete | 2F | command-patterns.md + templates |
