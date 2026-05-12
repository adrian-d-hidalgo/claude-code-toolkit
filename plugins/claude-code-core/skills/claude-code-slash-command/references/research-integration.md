# Research Integration

How to integrate research capabilities into action/development commands.

## When to Integrate Research

Add research integration when commands need:

1. **Current information**: Latest versions, recent best practices
2. **Error resolution**: Solutions to unexpected errors
3. **Technology comparison**: Choosing between tools/libraries
4. **Best practices**: Current standards and patterns

## Integration Pattern

### Basic Structure

```markdown
## Research Integration

**When to use research**:

- [Specific scenario 1]
- [Specific scenario 2]
- [Specific scenario 3]

**Research invocation**:
```

If [condition requiring current information]:

1. Use: [Appropriate research command from .claude/commands/research/]
2. Provide: [Specific context needed for research]
3. Handle: Research failure gracefully with fallback

```

**Fallback approaches**:
- [Fallback 1 if research unavailable]
- [Fallback 2]
```

### Identifying Research Needs

**Indicators that research integration is beneficial**:

- ❓ Command deals with rapidly changing technology
- ❓ Error messages may have version-specific solutions
- ❓ Best practices evolve frequently
- ❓ Multiple tool options with trade-offs
- ❓ Version compatibility issues common

**Example scenarios**:

- Angular version updates (research latest migration guide)
- NPM package installation errors (research current solutions)
- Testing framework selection (research comparison)
- Build optimization (research current techniques)

## Research Command Selection

### Available Research Commands

**Development domain** (`.claude/commands/research/development/`):

- `api-documentation.md` - API docs and implementation guides
- `error-fixes.md` - Technical error solutions
- `best-practices.md` - Development standards
- `tools-comparison.md` - Technology comparison

**Business domain** (`.claude/commands/research/business/`):

- `market-analysis.md` - Market trends
- `competition.md` - Competitive intelligence

**General domain** (`.claude/commands/research/general/`):

- `information.md` - General knowledge research

### Selecting Appropriate Command

**Match scenario to research type**:

| Scenario                     | Research Command  |
| ---------------------------- | ----------------- |
| "How to configure X in Y?"   | api-documentation |
| "Error: ECONNREFUSED"        | error-fixes       |
| "What's the best way to...?" | best-practices    |
| "Should I use X or Y?"       | tools-comparison  |
| "Market opportunity for..."  | market-analysis   |
| "Who are competitors in...?" | competition       |
| "What is / How does...?"     | information       |

## Implementation Examples

### Example 1: Error Resolution

```markdown
## Error Recovery

When errors occur:

1. **Capture context**:
   - Error message and stack trace
   - Environment ([OS], [Node version], [package versions])
   - Configuration state

2. **Research current solutions**:
```

If error not in common patterns:

1.  Use: /research-development-fixes
2.  Provide: Full error message, technology stack, versions
3.  Context: Configuration details, steps that led to error

```

3. **Apply fixes progressively**:
- Try solutions from Tier 1-2 sources first
- Test after each fix
- Move to experimental if needed

4. **Fallback** (if research unavailable):
- Try common generic solutions
- Check offline documentation
- Suggest manual investigation
```

### Example 2: Tool Selection

```markdown
## Technology Selection

When choosing between tools:

1. **Define requirements**:
   - Performance needs
   - Feature requirements
   - Team experience
   - Project constraints

2. **Research comparison**:
```

If choosing between multiple options:

1.  Use: /research-development-tools
2.  Provide: Tool names, use case, requirements
3.  Context: Project type, team size, constraints

```

3. **Evaluate results**:
- Weight by credibility tier
- Consider project-specific factors
- Balance trade-offs

4. **Fallback** (if research unavailable):
- Use most established/popular option
- Suggest manual research
- Provide general considerations
```

### Example 3: Best Practices Validation

```markdown
## Implementation Validation

Before finalizing implementation:

1. **Research current standards**:
```

To validate approach:

1.  Use: /research-development-best-practices
2.  Provide: Technology, specific practice area
3.  Context: Use case, architecture, constraints

```

2. **Compare implementation**:
- Check against found standards
- Identify deviations and rationale
- Update if better practices found

3. **Fallback** (if research unavailable):
- Use framework defaults
- Follow established patterns
- Note for later validation
```

## Graceful Degradation

### Handling Research Unavailability

**Research commands may be unavailable when**:

- Not installed in project
- Network issues
- Rate limiting

**Graceful degradation pattern**:

```markdown
Try:
Call research command with context
Catch research_unavailable:

1. Log: "Research unavailable, using fallback approach"
2. Execute: Fallback solution (generic/conservative)
3. Suggest: Manual research if critical
   Continue:
   Proceed with available information
```

### Fallback Strategy Examples

**For error resolution**:

- Try common generic solutions (restart, clear cache, reinstall)
- Check command-local knowledge base
- Provide error context for manual investigation

**For tool selection**:

- Default to most established option
- Use framework recommendations
- List options with general pros/cons

**For best practices**:

- Follow framework defaults
- Use conservative/safe patterns
- Document need for validation

## Testing Research Integration

### Test Scenarios

**Scenario 1: Research Available & Successful**

- Given: Research command available
- When: Condition triggers research
- Then: Research executes, provides results, command uses them
- Verify: Better outcome than fallback

**Scenario 2: Research Available but No Results**

- Given: Research command available
- When: Research returns no useful results
- Then: Fallback approach activates
- Verify: Command completes successfully

**Scenario 3: Research Unavailable**

- Given: Research command not available
- When: Condition triggers research
- Then: Fallback approach immediately
- Verify: Command completes with conservative approach

**Scenario 4: Research Fails/Errors**

- Given: Research command errors
- When: Research execution fails
- Then: Error handled gracefully, fallback activates
- Verify: Command doesn't crash

## Best Practices

1. **Always provide fallback**: Never depend solely on research
2. **Pass sufficient context**: More context = better research results
3. **Handle failures gracefully**: Research errors shouldn't break command
4. **Use specific research commands**: Match scenario to research type
5. **Document research usage**: Clear when/why research is called
6. **Test without research**: Ensure fallback path works
7. **Cache when appropriate**: Don't repeat identical research

## Anti-Patterns

❌ **No fallback**:

```markdown
Research solution
Apply solution

# What if research fails?
```

❌ **Insufficient context**:

```markdown
Research "error fix"

# Missing: error details, stack, versions
```

❌ **Silent failure**:

```markdown
Try research, if fails do nothing

# User unaware of degraded behavior
```

❌ **Over-reliance**:

```markdown
Research for everything

# Slow, unnecessary for known solutions
```

✅ **Good pattern**:

```markdown
If unknown_error:
Research with full context
If research_successful:
Apply researched solution
Else:
Apply conservative fallback
Notify user of limitation
```
