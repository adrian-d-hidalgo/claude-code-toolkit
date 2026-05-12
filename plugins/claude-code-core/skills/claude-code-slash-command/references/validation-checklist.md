# Validation Checklist

Complete validation criteria for Claude Code commands.

## Validation Categories

1. Structure Validation
2. Security Validation
3. Context Detection Validation
4. Independence Validation
5. Documentation Validation

## 1. Structure Validation

### YAML Frontmatter

- [ ] Valid YAML syntax (no parsing errors)
- [ ] Required field: `description` present
- [ ] Required field: `allowed-tools` present
- [ ] Required field: `argument-hint` present
- [ ] Required field: `model` present and valid (sonnet/opus/haiku)
- [ ] Description is clear and specific (not generic)
- [ ] Description is concise (<200 characters)
- [ ] Argument-hint describes expected parameters
- [ ] No extra/unknown fields in frontmatter

**Example Valid Frontmatter**:
```yaml
---
description: Configure Jest and Playwright testing for Angular project
allowed-tools: Read, Write, Edit, Bash(npm install *), Bash(ng *)
argument-hint: [optional-test-framework]
model: sonnet
---
```

### File Structure

- [ ] File is named with kebab-case (lowercase with hyphens)
- [ ] File extension is `.md`
- [ ] File is in appropriate category directory
- [ ] File size is reasonable (<1000 lines)
- [ ] Markdown syntax is valid
- [ ] Headers use proper hierarchy (##, ###, not #)

### Content Organization

- [ ] Clear opening statement parsing $ARGUMENTS
- [ ] Logical section organization
- [ ] Progressive disclosure of information
- [ ] No duplicate sections
- [ ] Consistent formatting throughout

## 2. Security Validation

### Tool Permissions

- [ ] `allowed-tools` follows least privilege principle
- [ ] Bash commands are restricted (not bare `Bash`)
- [ ] File tools (Write/Edit) are justified
- [ ] No unnecessary tool permissions
- [ ] Research commands use Read-only tools
- [ ] Development commands use appropriate Bash restrictions

**Bash Restriction Patterns**:
- ✅ `Bash(npm install *)` - Restricted to npm install
- ✅ `Bash(git status)` - Specific command only
- ❌ `Bash` - Unrestricted (NEVER use)
- ❌ `Bash(*)` - Unrestricted (NEVER use)

### Input Validation

- [ ] User inputs are validated before use
- [ ] Path parameters checked for traversal (../)
- [ ] Command parameters are sanitized
- [ ] File names validated against malicious patterns
- [ ] Argument length limits considered

### Safe Operations

- [ ] File overwrites have confirmation or backup
- [ ] Destructive operations have rollback
- [ ] No sensitive information in outputs/logs
- [ ] External inputs are sanitized
- [ ] Respects .gitignore and .claudeignore

## 3. Context Detection Validation

**For creation commands only** (commands that create other files/commands).

### Detection Logic

- [ ] Uses Glob to detect .claude/ directory
- [ ] Checks for existing directory structure
- [ ] Handles missing .claude/ gracefully
- [ ] Creates directory structure as needed
- [ ] Determines appropriate category automatically

### File Placement

- [ ] Never creates files in root directory (unless explicitly for root)
- [ ] Creates files in .claude/commands/[category]/
- [ ] Uses correct category based on command type
- [ ] Uses correct subcategory based on technology/domain

### User Feedback

- [ ] Provides clear feedback about file location
- [ ] Reports directory creation if needed
- [ ] Confirms successful file creation
- [ ] Explains directory structure choice

**Example Context Detection Section**:
```markdown
## Context Detection Implementation

**Before creating any files**:

1. Check for .claude/ directory: Use Glob("**/.claude")
2. Verify commands directory: Check .claude/commands/**
3. Create structure if needed: mkdir -p .claude/commands/[category]
4. Determine category: Based on command type
5. Create file: .claude/commands/[category]/[name].md
6. Provide feedback: "Created at [path]"
```

## 4. Independence Validation

### Execution Independence

- [ ] Command executes without requiring other commands
- [ ] No circular dependencies with other commands
- [ ] Graceful degradation when dependencies unavailable
- [ ] Self-contained error handling
- [ ] Clear success/failure indicators

### Optional Dependencies

- [ ] Optional integrations are documented
- [ ] Command works without optional dependencies
- [ ] Provides fallback when integration unavailable
- [ ] Documents integration benefits

### Collaboration Capability

- [ ] Can be called by agents (if applicable)
- [ ] Can be called by other commands (if applicable)
- [ ] Provides useful feedback/status
- [ ] Maintains appropriate context
- [ ] Returns structured results when needed

## 5. Documentation Validation

### Clarity

- [ ] Purpose is immediately clear
- [ ] Instructions are unambiguous
- [ ] Technical terms are explained
- [ ] Examples are provided
- [ ] Expected outcomes are described

### Completeness

- [ ] All parameters documented
- [ ] Prerequisites listed
- [ ] Error conditions explained
- [ ] Success criteria defined
- [ ] Usage examples provided

### Accuracy

- [ ] Information is up-to-date
- [ ] Examples actually work
- [ ] No deprecated practices
- [ ] Correct tool references
- [ ] Accurate technical details

## Command Type Specific Validation

### Action/Development Commands

Additional checks:

- [ ] Prerequisites section present
- [ ] Safety checks implemented
- [ ] Execution steps are clear
- [ ] Validation protocol included
- [ ] Error recovery documented
- [ ] Rollback procedure if destructive

### Research Commands

Additional checks:

- [ ] Domain-specific credibility criteria defined
- [ ] Progressive search strategy (Level 1-4) present
- [ ] Reincidence protocol implemented
- [ ] Information synthesis framework included
- [ ] Output structure defined
- [ ] Confidence indicators used

### Creation/Meta Commands

Additional checks:

- [ ] Context detection implemented
- [ ] Standards compliance verified
- [ ] Quality assurance included
- [ ] System integration considered
- [ ] Creates files in correct location
- [ ] Validates created files

## Validation Execution

### Manual Validation

Read command file and check each item in relevant category:

1. Read command file
2. Check Structure Validation items
3. Check Security Validation items
4. Check Context Detection (if creation command)
5. Check Independence Validation items
6. Check Documentation Validation items
7. Check command-type-specific items

### Automated Validation

Can be automated with validation script:

```bash
# Run validation script
python scripts/validate_command.py /path/to/command.md
```

Script should check:
- YAML syntax validity
- Required fields present
- File naming conventions
- Tool permission patterns
- Common security issues

## Validation Report Format

```markdown
# Validation Report: [command-name].md

**Overall Status**: [COMPLIANT / PARTIALLY_COMPLIANT / NON_COMPLIANT]

## Structure Validation
Status: ✅ PASS / ⚠️ WARNINGS / ❌ FAIL

Issues:
- [List any issues found]

## Security Validation
Status: ✅ PASS / ⚠️ WARNINGS / ❌ FAIL

Issues:
- [List any issues found]

## Context Detection Validation
Status: ✅ PASS / ⚠️ WARNINGS / ❌ FAIL / N/A

Issues:
- [List any issues found]

## Independence Validation
Status: ✅ PASS / ⚠️ WARNINGS / ❌ FAIL

Issues:
- [List any issues found]

## Documentation Validation
Status: ✅ PASS / ⚠️ WARNINGS / ❌ FAIL

Issues:
- [List any issues found]

## Recommendations

1. [Specific improvement recommendation]
2. [Specific improvement recommendation]
3. [Specific improvement recommendation]

## Summary

[Brief summary of validation results and priority actions]
```

## Common Issues and Fixes

### Issue: Missing Context Detection

**Symptom**: Creation command doesn't detect .claude/

**Fix**:
```markdown
Add Context Detection Implementation section with:
1. Glob("**/.claude") check
2. Directory structure validation
3. Structure creation if needed
4. Proper file placement
5. User feedback
```

### Issue: Overly Permissive Tools

**Symptom**: `allowed-tools: Bash` or too many unnecessary tools

**Fix**:
```yaml
Review each tool:
- Is it absolutely necessary?
- Can Bash be restricted further?
- Remove unused tools
```

### Issue: No Input Validation

**Symptom**: User inputs used directly without checking

**Fix**:
```markdown
Add validation checks:
- Path parameters: Check for ../
- File names: Validate against patterns
- Arguments: Length and format validation
- Commands: Sanitize before execution
```

### Issue: Missing Error Recovery

**Symptom**: Errors reported but no recovery procedure

**Fix**:
```markdown
Add Error Recovery section:
- Capture error context
- Provide resolution steps
- Implement rollback if needed
- Document common errors
```

### Issue: Unclear Documentation

**Symptom**: Purpose unclear, examples missing

**Fix**:
```markdown
Improve documentation:
- Add clear purpose statement
- Provide 2-3 usage examples
- Document all parameters
- Explain expected outcomes
- Add troubleshooting section
```

## Validation Frequency

**When to validate**:

1. **Before first use**: Validate newly created commands
2. **After modifications**: Re-validate after changes
3. **Regular audits**: Quarterly review of all commands
4. **Security updates**: When security best practices change
5. **Tool updates**: When allowed-tools capabilities change
6. **Issue reports**: When users report problems

## Continuous Improvement

**Track validation results**:
- Common issues across commands
- Recurring security patterns
- Documentation gaps
- Integration problems

**Update standards**:
- Refine validation criteria
- Add new security patterns
- Improve documentation templates
- Enhance automation

**Share learnings**:
- Document best practices
- Create reference examples
- Update templates
- Train command creators
