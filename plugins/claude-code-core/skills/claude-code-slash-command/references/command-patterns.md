# Command Patterns

Complete pattern library for creating Claude Code commands.

## Action/Development Command Pattern

### Structure Template

```markdown
---
description: [Clear, specific task description]
allowed-tools: [Minimal required tools]
argument-hint: [expected parameters]
model: sonnet
---

[Opening statement parsing arguments from $ARGUMENTS]

## [Section 1: Task Definition & Scope]

Clear objective, inputs, outputs, success criteria

## [Section 2: Prerequisites & Safety]

- Git status checks
- Environment validation
- Dependency verification
- Backup procedures

## [Section 3: Context Detection Implementation]

**Before creating any files**:
1. Check for .claude/ directory
2. Verify directory structure
3. Create structure if needed
4. Determine category/location
5. Provide feedback

## [Section 4: Implementation Steps]

1. [Step 1 with clear action]
2. [Step 2 with clear action]
3. [Step 3 with clear action]

## [Section 5: Research Integration] (optional)

When to use research, how to invoke, handling failures

## [Section 6: Error Recovery]

- Error capture and context
- Research integration
- Progressive fixes
- Validation steps
- Rollback procedures

## [Section 7: Validation Protocol]

- Output verification
- Functional testing
- Performance checks
```

### Real Examples

**Example: setup-testing command**

Purpose: Configure testing tools and frameworks

Key sections:
- Prerequisites: Check package.json, git status
- Context: Detect project type (Angular, React, Node)
- Execution: Install dependencies, create config files
- Validation: Run test suite, verify configuration

**Example: create-component command**

Purpose: Generate component with tests and styles

Key sections:
- Prerequisites: Verify framework installed
- Context: Detect component directory structure
- Execution: Generate files from templates
- Validation: Compile check, import verification

## Research Command Pattern

### Structure Template

```markdown
---
description: [Specific research focus]
allowed-tools: Read, Grep, Glob
argument-hint: [context-parameters]
model: sonnet
---

[Opening statement parsing arguments from $ARGUMENTS]

## Domain-Specific Source Credibility

**Tier 1** (Highest Trust):
- [Domain-specific authoritative sources]

**Tier 2** (High Trust):
- [Validated community sources]

**Tier 3** (Moderate Trust):
- [Community content with some validation]

**Tier 4** (Low Trust):
- [Unvalidated or outdated sources]

## Progressive Search Strategy

Execute searches in order, moving to next level if insufficient results:

**Level 1 - Highly Specific**:
- "[exact-context]" [technology] [version]

**Level 2 - Technology Focused**:
- "[core-terms]" [technology-category] [timeframe]

**Level 3 - Pattern Recognition**:
- "[pattern-keywords]" [technology-family] [solution-type]

**Level 4 - Conceptual**:
- "[underlying-concept]" [approach-category] [principles]

## Reincidence Handling

**Check for reincidence parameters**:
- `--previous-terms` → Avoid same searches, jump to alternatives
- `--failed-approaches` → Exclude solution types, focus on different methodologies
- `--context-refinement` → Use more specific terms, add environmental context

**Refinement Strategies**:
- Level 1 failed → Jump to Level 3
- No exact matches → Pattern-based broader searches
- Solutions don't apply → Add environmental context
- Outdated information → Prioritize recency filters

## Information Synthesis Framework

[How to combine and evaluate findings]

## Output Structure

[Expected output format with confidence indicators]
```

### Real Examples

**Example: error-fixes command**

Purpose: Research technical error solutions

Credibility:
- Tier 1: Official docs, security advisories
- Tier 2: Stack Overflow >10 upvotes, GitHub issues
- Tier 3: Technical blogs, 3-10 upvotes
- Tier 4: Unvalidated, deprecated

Search progression:
- Level 1: "[exact-error]" [technology] [version]
- Level 2: "[error-pattern]" [technology] "solution"
- Level 3: [error-category] [technology-family] "fix"
- Level 4: [problem-domain] "troubleshooting"

**Example: best-practices command**

Purpose: Research development standards

Credibility:
- Tier 1: Official style guides, framework docs
- Tier 2: Established blog authors, conference talks
- Tier 3: Community wikis, professional forums
- Tier 4: Personal opinions, outdated guides

## Meta/Core Command Pattern

Commands that create or manage other commands.

### Structure Template

```markdown
---
description: [Meta-operation description]
allowed-tools: Write, Edit, MultiEdit, Read, Grep, Glob
argument-hint: [meta-parameters]
model: sonnet
---

## Standards Compliance

- Architectural pattern adherence
- Security requirement validation
- Integration capability verification

## Quality Assurance

- Independence testing
- Collaboration validation
- Documentation completeness

## System Integration

- Auto-update procedures
- Reference consistency checks
- Circular dependency prevention

## Context Detection Implementation

[Mandatory section for proper file placement]

## Implementation Protocol

[Step-by-step meta-operation execution]
```

### Real Examples

**Example: create-command (this skill's purpose)**

Purpose: Generate new command with architectural compliance

Key sections:
- Standards: Template selection, security config
- Quality: Independence validation, testing
- Integration: Reference updates, ecosystem integration
- Context: Detect .claude/, create structure

**Example: validate-commands command**

Purpose: Check command compliance with standards

Key sections:
- Standards: YAML validation, structure checks
- Quality: Security audit, independence verification
- Integration: Ecosystem compatibility checks

## Pattern Selection Guide

**Choose Action/Development when**:
- Command performs development tasks
- Modifies files or runs operations
- Needs bash execution
- Creates or updates project artifacts

**Choose Research when**:
- Command gathers current information
- No file modifications needed
- Requires web search
- Provides recommendations without execution

**Choose Meta/Core when**:
- Command creates/manages other commands
- Validates ecosystem components
- Updates system documentation
- Meta-level operations

## Common Patterns

### Prerequisites Pattern

```markdown
## Prerequisites & Safety

- **Git status**: Warn if uncommitted changes
- **Dependencies**: Verify required tools installed
- **Permissions**: Check write access
- **Backups**: Create if destructive operation
```

### Context Detection Pattern

```markdown
## Context Detection Implementation

**Before creating any files**:

1. Check for .claude/ directory: `Glob("**/.claude")`
2. Verify directory structure: Check .claude/commands/**
3. Create structure if needed: mkdir -p .claude/commands/[category]
4. Determine category: Based on command type and purpose
5. Create file: .claude/commands/[category]/[name].md
6. Provide feedback: "Created command at [path]"
```

### Error Recovery Pattern

```markdown
## Error Recovery

1. **Capture context**: Error message, stack trace, environment
2. **Research solution**: Use research commands if applicable
3. **Apply fixes progressively**:
   - Try safe/recommended fixes first
   - Test after each fix
   - Move to experimental if needed
4. **Validate**: Ensure fix resolves issue without side effects
5. **Document**: Record solution for future reference
6. **Rollback**: If all fixes fail, restore previous state
```

### Validation Pattern

```markdown
## Validation Protocol

1. **Syntax check**: Verify file syntax/compilation
2. **Functional test**: Execute core functionality
3. **Integration test**: Verify ecosystem integration
4. **Performance check**: Ensure acceptable execution time
5. **Security audit**: Verify no vulnerabilities introduced
```

## Anti-Patterns to Avoid

**Overly permissive tools**:
❌ `allowed-tools: Bash`
✅ `allowed-tools: Bash(npm *), Bash(git status)`

**Missing context detection**:
❌ Directly creating files without checking location
✅ Detect .claude/, create structure, validate placement

**No error handling**:
❌ Execute operations without try/catch or validation
✅ Implement error recovery and rollback procedures

**Circular dependencies**:
❌ Command A requires Command B which requires Command A
✅ Independent execution with optional integration

**Monolithic commands**:
❌ Single command doing multiple unrelated tasks
✅ Focused commands with clear single responsibility

**Hardcoded knowledge**:
❌ Embedding specific version info or solutions
✅ Research integration for current information
