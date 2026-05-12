# Error Patterns

Error handling and recovery patterns for Claude Code commands.

## Standard Error Recovery Protocol

### Five-Step Recovery Process

```markdown
## Error Recovery

When errors occur:

1. **Capture Context**
2. **Research Solution** (if applicable)
3. **Apply Progressive Fixes**
4. **Validate Resolution**
5. **Rollback if Needed**
```

### Step 1: Capture Context

**Gather comprehensive error information**:

```markdown
**Capture context**:
- Error message (exact text)
- Stack trace (if available)
- Environment:
  - OS: [operating system]
  - Runtime: [Node version, Python version, etc.]
  - Package versions: [relevant dependencies]
- Configuration:
  - Config files state
  - Environment variables
  - Project structure
- Reproduction steps:
  - What action triggered error
  - Can it be reproduced
  - Frequency (always, sometimes, rare)
```

### Step 2: Research Solution

**When to research**:
- Error message is unfamiliar
- Error is environment/version specific
- Standard solutions don't apply
- Complex/unusual error

```markdown
**Research current solutions** (if applicable):
```
If error not in known patterns:
  1. Use: [appropriate research command]
  2. Provide: Full error message, stack, versions
  3. Context: Configuration, reproduction steps
  4. Parse: Prioritize Tier 1-2 solutions
```

**Fallback** if research unavailable:
- Try common generic fixes
- Check command-local knowledge
```

### Step 3: Apply Progressive Fixes

**Progression**: Safe → Recommended → Experimental

```markdown
**Apply fixes progressively**:

**Level 1 - Safe fixes** (no side effects):
  1. [Safe fix 1]
  2. [Safe fix 2]
  Test after each

**Level 2 - Recommended fixes** (minor side effects):
  1. [Recommended fix 1]
  2. [Recommended fix 2]
  Test after each

**Level 3 - Experimental fixes** (may have consequences):
  1. [Experimental fix 1]
  2. [Experimental fix 2]
  Test and validate thoroughly
```

### Step 4: Validate Resolution

**Ensure fix actually works**:

```markdown
**Validate resolution**:
- [ ] Error no longer occurs
- [ ] Expected functionality works
- [ ] No new errors introduced
- [ ] Performance acceptable
- [ ] Side effects minimal
```

### Step 5: Rollback Capability

**If all fixes fail**:

```markdown
**Rollback procedure**:
1. Restore previous state (from backup/git)
2. Document what was attempted
3. Preserve error context
4. Report issue with full context
5. Suggest manual intervention or alternative approach
```

## Common Error Categories

### File System Errors

**ENOENT (File Not Found)**:
```markdown
**Error**: ENOENT: no such file or directory

**Common Causes**:
- Path incorrect or misspelled
- File doesn't exist at expected location
- Working directory not where expected

**Progressive Fixes**:
1. Verify file path is absolute or properly resolved
2. Check if file exists: Glob or Read to verify
3. Create missing parent directories
4. Check file permissions
5. Verify working directory

**Rollback**: N/A (safe operations)
```

**EACCES (Permission Denied)**:
```markdown
**Error**: EACCES: permission denied

**Common Causes**:
- Insufficient file permissions
- Directory not writable
- File locked by another process

**Progressive Fixes**:
1. Check current permissions
2. Verify user has write access to directory
3. Check if file is locked
4. Try alternative location with permissions
5. Suggest permission change (user action required)

**Rollback**: N/A (no changes made)
```

### Network Errors

**ECONNREFUSED (Connection Refused)**:
```markdown
**Error**: ECONNREFUSED

**Common Causes**:
- Service not running
- Wrong port
- Firewall blocking
- localhost vs 127.0.0.1

**Progressive Fixes**:
1. Verify service is running
2. Check port number correctness
3. Try alternative host (localhost vs 127.0.0.1)
4. Check firewall settings
5. Research environment-specific issues

**Rollback**: N/A (connection attempts)
```

### Package/Dependency Errors

**Module Not Found**:
```markdown
**Error**: Cannot find module 'X'

**Common Causes**:
- Package not installed
- Wrong package name
- Version incompatibility
- Missing dependency

**Progressive Fixes**:
1. Install missing package
2. Check package name spelling
3. Verify package.json includes dependency
4. Clear node_modules and reinstall
5. Check for version conflicts

**Rollback**: Remove installed packages if needed
```

**Version Conflicts**:
```markdown
**Error**: Peer dependency conflict

**Common Causes**:
- Incompatible versions
- Multiple versions of same package
- Outdated dependencies

**Progressive Fixes**:
1. Check dependency tree
2. Update conflicting packages
3. Use compatible versions
4. Research version compatibility
5. Consider alternative packages

**Rollback**: Restore package.json and lockfile
```

### Build/Compilation Errors

**Syntax Errors**:
```markdown
**Error**: SyntaxError: Unexpected token

**Common Causes**:
- Typo in code
- Missing/extra bracket or parenthesis
- Incorrect syntax for language version

**Progressive Fixes**:
1. Check line indicated in error
2. Verify bracket/parenthesis matching
3. Check for recent changes
4. Validate syntax for language version
5. Use linter/formatter to identify issues

**Rollback**: Revert recent code changes
```

**Type Errors**:
```markdown
**Error**: TypeError: Cannot read property 'X' of undefined

**Common Causes**:
- Variable is undefined/null
- Property doesn't exist
- Asynchronous timing issue

**Progressive Fixes**:
1. Add null/undefined checks
2. Verify property exists
3. Check initialization order
4. Add defensive programming
5. Review async/await usage

**Rollback**: Revert type-related changes
```

## Error Handling Patterns

### Try-Catch Pattern

```markdown
**When to use**: Operations that may fail but shouldn't crash command

```
Try:
  [Risky operation]
Catch [SpecificError]:
  1. Log error with context
  2. Attempt recovery
  3. If recovery fails, fallback
  4. If fallback fails, report and exit gracefully
Finally:
  Clean up resources
```
```

### Validation-First Pattern

```markdown
**When to use**: Prevent errors by validating before operations

```
**Validate inputs**:
- [ ] Required parameters present
- [ ] Parameters correct type/format
- [ ] Files/directories exist
- [ ] Permissions adequate
- [ ] Dependencies available

**Then proceed** with confidence
```
```

### Fail-Fast Pattern

```markdown
**When to use**: Critical errors that prevent continuation

```
If critical_condition_failed:
  1. Report specific error clearly
  2. Explain why we can't continue
  3. Suggest resolution steps
  4. Exit gracefully (non-zero exit code)
  5. Clean up any partial changes
```
```

### Gradual Degradation Pattern

```markdown
**When to use**: Non-critical features that can be skipped

```
Try:
  [Optional enhanced feature]
Catch error:
  Log: "Enhanced feature unavailable, using basic version"
  Proceed with basic functionality
```
```

## Error Communication

### User-Friendly Error Messages

**Bad error message**:
```
❌ Error: undefined
❌ Something went wrong
❌ Process failed
```

**Good error message**:
```
✅ Error: Cannot find configuration file 'config.json' in .claude/ directory

Possible solutions:
1. Create config.json file
2. Specify config path with --config flag
3. Use default configuration (--use-defaults)

For more help: /command-name --help
```

### Error Message Template

```markdown
**Error**: [Specific error description]

**Cause**: [What went wrong]

**Location**: [File, line, or component if applicable]

**Solutions**:
1. [Most likely solution]
2. [Alternative solution]
3. [Last resort / manual intervention]

**Context**: [Relevant environmental info]

**Help**: [Where to find more information]
```

## Testing Error Handling

### Test Scenarios

**Scenario 1: Missing Required Parameter**
- Given: Command invoked without required parameter
- When: Parameter validation runs
- Then: Clear error message, suggests correct usage
- Verify: Exit gracefully, no partial changes

**Scenario 2: File Operation Fails**
- Given: File doesn't exist or no permissions
- When: File operation attempted
- Then: Error caught, alternatives attempted, clear message
- Verify: Rollback or safe state

**Scenario 3: Network Operation Fails**
- Given: Service unavailable
- When: Connection attempted
- Then: Timeout handled, fallback activated, user informed
- Verify: Command continues or fails gracefully

**Scenario 4: Unexpected Error**
- Given: Unanticipated error occurs
- When: Any operation
- Then: Generic error handler catches, preserves context
- Verify: Useful error report generated

## Anti-Patterns

❌ **Silent Failure**:
```markdown
Try:
  risky_operation()
Catch:
  pass  # Ignores error completely
```

❌ **Vague Error**:
```markdown
"Error occurred"  # What error? Where? How to fix?
```

❌ **No Rollback**:
```markdown
Partial changes made
Error occurs
Leaves system in inconsistent state
```

❌ **Error Cascade**:
```markdown
Error A → causes Error B → causes Error C
User sees Error C, no context about A or B
```

✅ **Good Pattern**:
```markdown
Try:
  operation()
Catch SpecificError as e:
  Log full context and error details
  Attempt specific recovery
  If recovery fails, rollback changes
  Report clear error with solutions
  Exit gracefully
```

## Logging and Debugging

### Error Logging Template

```markdown
**Log Entry**:
- Timestamp: [when error occurred]
- Command: [command being executed]
- Operation: [specific operation that failed]
- Error Type: [error class/type]
- Error Message: [full error message]
- Stack Trace: [if available]
- Context: [relevant state information]
- Attempted Fixes: [what was tried]
- Resolution: [outcome]
```

### Debug Information

**Include in error reports**:
- Command version
- Environment details
- Configuration state
- Recent changes
- Reproduction steps
- Attempted solutions
- Expected vs actual behavior
