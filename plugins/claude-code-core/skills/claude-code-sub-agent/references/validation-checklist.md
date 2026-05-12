# Agent Validation Checklist

Complete validation criteria for agent quality and compliance.

## Header Validation

### YAML Frontmatter

- [ ] Valid YAML syntax (parses without errors)
- [ ] Required fields present: `name`, `description`, `tools`, `model`
- [ ] Optional fields properly formatted if present

### Name Field

- [ ] Matches filename (without .md extension)
- [ ] Uses kebab-case format
- [ ] Descriptive and unique
- [ ] Pattern: `[specialization]-[type]` (e.g., `angular-developer`)

### Description Field

- [ ] Includes role and specialization
- [ ] Lists key capabilities
- [ ] Contains "Use immediately when" clause
- [ ] Has 4-6 activation examples
- [ ] Examples follow proper format
- [ ] Examples cover diverse scenarios

### Tools Field

- [ ] List or comma-separated string format
- [ ] All tools are valid Claude Code tools
- [ ] Minimal necessary permissions
- [ ] No unrestricted Bash access
- [ ] WebSearch only if research-specialist
- [ ] Bash commands use specific patterns

### Model Field

- [ ] Valid value: `sonnet`, `opus`, `haiku`, or `inherit`
- [ ] Appropriate for agent complexity
- [ ] Consistent with agent's role

## Activation Examples Validation

### Example Count

- [ ] Minimum 4 examples
- [ ] Maximum 6 examples
- [ ] Recommended: 4-6 examples

### Example Structure

Each example must have:
- [ ] `<example>` opening tag
- [ ] `Context:` field describing situation
- [ ] `request:` field with user request (in quotes)
- [ ] `assistant:` field with response approach (in quotes)
- [ ] `<commentary>` tag with activation rationale
- [ ] `</commentary>` closing tag
- [ ] `</example>` closing tag

### Example Diversity

Examples should cover:
- [ ] Direct activation (user explicitly requests)
- [ ] Context-triggered (situation matches domain)
- [ ] Delegation scenario (handed off from other agent)
- [ ] Edge case or complex scenario
- [ ] Optional: Negative case (when NOT to activate)

### Example Quality

- [ ] Clear and specific contexts
- [ ] Realistic user requests
- [ ] Appropriate responses
- [ ] Commentary explains WHY agent activates
- [ ] No generic/vague examples

## Content Structure Validation

### Required Sections

- [ ] Core Competencies section
- [ ] Scope & Boundaries section
- [ ] Standards & Best Practices section
- [ ] Tool Usage section
- [ ] Examples section (in body, not just frontmatter)

### Recommended Sections

- [ ] Command Integration
- [ ] Collaboration Framework
- [ ] Quality Assurance
- [ ] Edge Cases & Limitations

### Content Quality

- [ ] Clear and concise writing
- [ ] Specific guidance (not vague)
- [ ] Actionable recommendations
- [ ] Realistic examples
- [ ] Proper markdown formatting

## Security Validation

### Tool Permissions

- [ ] Minimal necessary tools granted
- [ ] No unrestricted Bash access
- [ ] Bash commands use specific patterns
- [ ] WebSearch only for research-specialist
- [ ] File modification tools justified
- [ ] Each tool has clear purpose

### Security Patterns

- [ ] No dangerous command patterns
- [ ] Input validation mentioned if using Bash
- [ ] File path validation if using Write
- [ ] Context detection if using Write
- [ ] Error handling for tool failures

### Sensitive Operations

- [ ] No access to .env files
- [ ] No sudo/privileged operations
- [ ] No destructive rm -rf commands
- [ ] Proper delegation for security tasks

## Independence Validation

### Self-Sufficiency

- [ ] Agent can operate with specified tools only
- [ ] Core functionality doesn't require other agents
- [ ] No circular dependencies
- [ ] Graceful degradation documented

### Delegation Patterns

- [ ] Clear conditions for delegation
- [ ] Specific agents/commands to delegate to
- [ ] Fallback behavior if delegation unavailable
- [ ] Context handoff protocol defined

### Operational Independence

- [ ] Can make decisions within scope
- [ ] Doesn't require approval for core tasks
- [ ] Has error recovery strategies
- [ ] Documents limitations clearly

## Integration Validation

### Command Integration

- [ ] References to relevant commands
- [ ] Commands are accessible (exist)
- [ ] Integration enhances functionality
- [ ] Doesn't create hard dependencies
- [ ] Fallback when commands unavailable

### Agent Collaboration

- [ ] Collaboration patterns defined
- [ ] Information handoff protocols
- [ ] Conflict resolution approaches
- [ ] No overlapping responsibilities

### Ecosystem Fit

- [ ] Doesn't overlap with existing agents
- [ ] Fills specific need/gap
- [ ] Complements other agents
- [ ] Clear differentiation from similar agents

## Quality Metrics

### Clarity (20 points)

- [ ] 5pts: Clear role definition
- [ ] 5pts: Specific activation triggers
- [ ] 5pts: Well-defined scope
- [ ] 5pts: Unambiguous examples

### Completeness (20 points)

- [ ] 5pts: All required sections present
- [ ] 5pts: Examples cover key scenarios
- [ ] 5pts: Tool permissions justified
- [ ] 5pts: Integration patterns documented

### Security (25 points)

- [ ] 10pts: Minimal tool permissions
- [ ] 10pts: No dangerous patterns
- [ ] 5pts: Security considerations documented

### Independence (20 points)

- [ ] 10pts: Self-sufficient operation
- [ ] 5pts: Graceful degradation
- [ ] 5pts: No circular dependencies

### Documentation (15 points)

- [ ] 5pts: Clear and concise writing
- [ ] 5pts: Specific actionable guidance
- [ ] 5pts: Good examples

### Total Score: ____ / 100

**Grading**:
- 90-100: Excellent
- 75-89: Good (minor improvements needed)
- 60-74: Acceptable (several improvements needed)
- <60: Needs major revision

## Common Issues and Fixes

### Issue: Missing Activation Clause

**Problem**:
```yaml
description: Angular developer for Angular projects.
```

**Fix**:
```yaml
description: Angular developer for component development, state management. Use immediately when working with Angular projects or implementing features.
```

### Issue: Incomplete Examples

**Problem**:
```xml
<example>request: "Build feature"</example>
```

**Fix**:
```xml
<example>Context: New feature needed. request: "Build user profile component" assistant: "I'll create Angular component with form and validation" <commentary>Direct Angular development activates this agent</commentary></example>
```

### Issue: Overly Permissive Tools

**Problem**:
```yaml
tools: Read, Write, Edit, Bash, WebSearch, TodoWrite
```

**Fix**:
```yaml
tools: Read, Edit, Bash(npm *), Grep, Glob
```

### Issue: No Delegation Strategy

**Problem**:
No mention of when/how to delegate

**Fix**:
```markdown
## Delegation Strategy

**To research-specialist**:
- When: Current information needed
- Provide: Technology stack, error details
- Fallback: Use known best practices
```

### Issue: Vague Scope

**Problem**:
```markdown
## Scope
Handles all development tasks
```

**Fix**:
```markdown
## Scope & Boundaries

**Within Scope**:
- Angular component development
- State management with NgRx
- Performance optimization

**Out of Scope**:
- Backend API development → NestJS developer
- Infrastructure → DevOps engineer
```

## Validation Process

### Step 1: Automated Checks

Run validation script:
```bash
python scripts/validate_agent.py agent-file.md --verbose
```

### Step 2: Manual Review

- [ ] Read entire agent file
- [ ] Check activation examples make sense
- [ ] Verify tools are appropriate
- [ ] Test examples mentally
- [ ] Check for overlaps with other agents

### Step 3: Integration Testing

- [ ] Test agent in real scenarios
- [ ] Verify activation triggers work
- [ ] Check delegation patterns
- [ ] Validate tool permissions
- [ ] Confirm independence

### Step 4: Documentation Review

- [ ] All sections clear and complete
- [ ] Examples are helpful
- [ ] Integration patterns documented
- [ ] Limitations acknowledged

### Step 5: Security Audit

- [ ] Review tool permissions
- [ ] Check for security risks
- [ ] Validate Bash restrictions
- [ ] Confirm WebSearch delegation

## Continuous Validation

### When to Re-Validate

- [ ] After major edits
- [ ] When adding new tools
- [ ] If activation patterns change
- [ ] When integrating with new commands/agents
- [ ] Periodically (quarterly) for quality

### Version Control

- [ ] Track changes to agents
- [ ] Document reasons for modifications
- [ ] Test after each change
- [ ] Maintain backward compatibility when possible

### Quality Metrics Tracking

- [ ] Activation success rate
- [ ] User satisfaction
- [ ] Delegation frequency
- [ ] Error rates
- [ ] Tool usage patterns
