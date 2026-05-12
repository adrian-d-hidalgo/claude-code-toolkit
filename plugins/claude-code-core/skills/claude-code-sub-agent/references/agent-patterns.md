# Agent Patterns Reference

Complete pattern library for common agent types with structure examples.

## Pattern 1: Technical Specialist Agent

**Use Case**: Domain-specific technical expertise (e.g., Angular, React, Python)

**Structure**:

```yaml
---
name: [technology]-specialist
description: [Technology] specialist for [capabilities]. Use immediately when working with [technology] projects or [specific scenarios]. Examples: [4-6 examples]
tools: Read, Edit, MultiEdit, Bash([technology-commands]), Grep, Glob, LS
model: sonnet
---
```

**Key Sections**:

- Core Competencies: Technology-specific expertise
- Standards & Best Practices: Framework/language standards
- Tool Usage: Technology-specific commands and tools
- Command Integration: References to relevant slash commands

## Pattern 2: Cross-Domain Specialist

**Use Case**: Expertise spanning multiple domains (e.g., Security, DevOps)

**Structure**:

```yaml
---
name: [domain]-specialist
description: [Domain] specialist for [cross-cutting concerns]. Use immediately when [scenarios requiring cross-domain expertise]. Examples: [4-6 examples]
tools: Read, Grep, Glob, TodoWrite
model: sonnet
---
```

**Key Sections**:

- Core Competencies: Cross-domain expertise areas
- Collaboration Framework: How to work with other specialists
- Standards & Best Practices: Industry standards
- Integration Patterns: Orchestration with other agents

## Pattern 3: Orchestration Agent

**Use Case**: Coordination and delegation (e.g., research-specialist, claude-code-specialist)

**Structure**:

```yaml
---
name: [function]-specialist
description: [Function] orchestration specialist for [orchestration scope]. Use immediately when [coordination scenarios]. Examples: [4-6 examples]
tools: Read, Grep, Glob, TodoWrite, [WebSearch for research only]
model: sonnet
---
```

**Key Sections**:

- Orchestration Protocols: Delegation logic
- Command Integration: When to use commands vs agents
- Collaboration Patterns: Agent coordination strategies
- Independence: Graceful degradation when dependencies unavailable

## Pattern 4: Read-Only Analyst

**Use Case**: Analysis and reporting without modifications

**Structure**:

```yaml
---
name: [analysis-type]-analyst
description: [Analysis type] specialist for [analysis capabilities]. Use immediately when analysis or investigation needed for [scenarios]. Examples: [4-6 examples]
tools: Read, Grep, Glob
model: sonnet
---
```

**Key Sections**:

- Analysis Methodologies: Approach to investigation
- Reporting Standards: How to present findings
- Tool Patterns: Efficient read/search patterns
- Limitations: What NOT to do (no modifications)

## Pattern 5: Strategy/Design Agent

**Use Case**: High-level design and planning (e.g., UX, Product)

**Structure**:

```yaml
---
name: [role]-[function]
description: [Role] specialist for [design/strategy capabilities]. Use immediately when [strategic scenarios]. Examples: [4-6 examples]
tools: Read, Grep, Glob, TodoWrite
model: sonnet
---
```

**Key Sections**:

- Design Methodologies: Approach to design/strategy
- Business Integration: Alignment with goals
- Collaboration Protocols: Working with technical teams
- Validation: Success criteria and metrics

## Common Anti-Patterns to Avoid

### ❌ Overly Broad Scope

```yaml
description: Full-stack developer for everything. Use always.
```

**Problem**: No clear activation trigger, overlaps with everything

### ❌ Missing Activation Examples

```yaml
description: React specialist for React development.
```

**Problem**: No "Use immediately when" clause, no examples

### ❌ Excessive Tool Permissions

```yaml
tools: Read, Write, Edit, MultiEdit, Bash, WebSearch, TodoWrite, Grep, Glob
```

**Problem**: Violates minimal permission principle

### ❌ Circular Dependencies

```markdown
## When to Delegate

- Always call security-specialist before any action
- Always call devops-engineer for any command
- Always call architect before proceeding
```

**Problem**: Cannot operate independently

## Best Practices

### ✅ Clear Activation Triggers

```yaml
description: NestJS developer specialist for API design, microservices, database integration. Use immediately when working with NestJS projects, designing APIs, or implementing business logic.
```

### ✅ Specific Tool Permissions

```yaml
tools: Read, Edit, Bash(npm *), Bash(nest *), Grep, Glob, LS
```

### ✅ Defined Scope and Boundaries

```markdown
## Scope & Boundaries

**Within Scope**:

- NestJS application development
- API design and implementation
- Database integration with TypeORM/Prisma

**Out of Scope**:

- Frontend development → Delegate to frontend specialist
- Infrastructure → Delegate to devops-engineer
- Security audits → Delegate to security-engineer
```

### ✅ Complete Activation Examples

```yaml
Examples: <example>Context: Building new NestJS API. request: "Create user authentication module" assistant: "I'll design the auth module with NestJS guards and JWT" <commentary>Direct NestJS development work activates this agent</commentary></example> [Add 3-5 more examples]
```

## Integration Patterns

### Command Integration

```markdown
## Command Integration

**Relevant Commands**:

- `/development:angular:update-version`: For Angular upgrades
- `/development:angular:setup-quality`: For quality tooling

**Usage Pattern**: Reference commands for specific workflows, maintain independence
```

### Agent Collaboration

```markdown
## Collaboration Framework

**With research-specialist**:

- Delegate when current information needed
- Provide: technology stack, error details, context

**With security-engineer**:

- Consult for security reviews
- Hand off: authentication implementation details
```

### Graceful Degradation

```markdown
## Fallback Strategies

**If research-specialist unavailable**:

- Use known best practices
- Document assumptions
- Proceed with standard patterns

**If commands unavailable**:

- Implement manually with available tools
- Provide step-by-step guidance
```
