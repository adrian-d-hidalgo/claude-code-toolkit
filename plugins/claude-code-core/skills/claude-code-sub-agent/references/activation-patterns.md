# Activation Patterns Reference

Complete guide for crafting effective agent activation descriptions and triggers.

## Activation Description Formula

```
[Role] specialist for [domain/technologies] - [key capabilities].
Use immediately when [activation conditions].
Examples: [4-6 detailed examples]
```

## Component Breakdown

### 1. Role Definition

**Format**: `[Role] specialist`

**Examples**:
- ✅ "Senior NestJS developer specialist"
- ✅ "Security and compliance specialist"
- ✅ "User experience design specialist"
- ❌ "Developer" (too generic)
- ❌ "Expert in everything" (too broad)

### 2. Domain/Technologies

**Format**: `for [specific domains/technologies]`

**Examples**:
- ✅ "for API design, microservices architecture, database integration"
- ✅ "for security audits, vulnerability analysis, compliance assessment"
- ✅ "for UX research, usability testing, interface optimization"
- ❌ "for software development" (too vague)

### 3. Key Capabilities

**Format**: `[capability1], [capability2], and [technology] best practices`

**Examples**:
- ✅ "authentication/authorization, testing strategies, and Node.js best practices"
- ✅ "threat modeling, security implementation, and defensive security measures"
- ❌ "does everything well" (not specific)

### 4. Activation Clause (CRITICAL)

**MUST include**: "Use immediately when"

**Format**: `Use immediately when [specific trigger conditions]`

**Examples**:
- ✅ "Use immediately when working with NestJS projects, designing APIs, implementing business logic, or making backend architectural decisions"
- ✅ "Use immediately when current information is needed, technical troubleshooting is required, or comprehensive analysis is necessary"
- ✅ "Use immediately when users need UX validation, interface design, or usability improvements"
- ❌ "Use when needed" (too vague)
- ❌ "Use for development" (not specific enough)

## Activation Examples Structure

### Required Format

```xml
<example>
Context: [Situation description]
request: "[Exact user request]"
assistant: "[Agent's response approach]"
<commentary>[Why this agent activates for this scenario]</commentary>
</example>
```

### Example Count
- **Minimum**: 4 examples
- **Recommended**: 4-6 examples
- **Maximum**: 6 examples

### Example Diversity

Cover different activation scenarios:

1. **Direct activation** - User explicitly requests agent's expertise
2. **Context-triggered** - Situation matches agent's domain
3. **Delegation scenario** - Another agent hands off
4. **Edge case** - Complex scenario requiring specialist
5. **Negative case** (optional) - When NOT to activate

## Complete Examples

### Example 1: Technical Specialist

```yaml
description: Angular developer specialist for component development, state management, performance optimization, testing strategies, and Angular best practices. Use immediately when working with Angular projects, implementing features, optimizing performance, or making architectural decisions. Examples: <example>Context: Building new Angular feature. request: "Create a data table component with sorting" assistant: "I'll build an Angular component with Material table and sorting logic" <commentary>Direct Angular development work</commentary></example> <example>Context: Performance issue reported. request: "App is slow when loading large lists" assistant: "I'll implement virtual scrolling and optimize change detection" <commentary>Angular-specific performance optimization</commentary></example> <example>Context: Architecture decision needed. request: "How should we structure state management?" assistant: "I'll design NgRx store architecture with best practices" <commentary>Angular architectural decisions</commentary></example> <example>Context: Testing needed. request: "Add tests for this component" assistant: "I'll create Jasmine unit tests and integration tests" <commentary>Angular testing expertise</commentary></example>
```

### Example 2: Cross-Domain Specialist

```yaml
description: Security and compliance specialist for security architecture, threat modeling, vulnerability analysis, security implementation, and defensive security measures. Use immediately when security assessment needed, compliance requirements must be evaluated, or security vulnerabilities require analysis. Examples: <example>Context: New payment feature. request: "Review security for payment processing" assistant: "I'll perform threat modeling and compliance assessment for PCI requirements" <commentary>Security evaluation for critical feature</commentary></example> <example>Context: Compliance needed. request: "What security controls for HIPAA?" assistant: "I'll provide security requirements and implementation guidelines for HIPAA compliance" <commentary>Compliance guidance expertise</commentary></example> <example>Context: Vulnerability found. request: "SQL injection found in search" assistant: "I'll analyze the vulnerability and provide remediation with parameterized queries" <commentary>Security vulnerability analysis</commentary></example> <example>Context: Architecture review. request: "Design authentication for API" assistant: "I'll design OAuth 2.0 with JWT and security best practices" <commentary>Security architecture design</commentary></example>
```

### Example 3: Orchestration Agent

```yaml
description: Research orchestration specialist for deep investigation across multiple sources. Use immediately when current information is needed, technical troubleshooting is required, or comprehensive analysis is necessary from any context. Examples: <example>Context: Current tech info needed. request: "Find latest Angular 19 features" assistant: "I'll research current Angular developments and new features" <commentary>Information requiring recent web search</commentary></example> <example>Context: Error troubleshooting. request: "Build error: Cannot resolve @angular/core" assistant: "I'll investigate this error and find current solutions" <commentary>Error resolution needing current solutions</commentary></example> <example>Context: Tool comparison. request: "Compare Prisma vs TypeORM" assistant: "I'll research and compare with current market data" <commentary>Technology comparison requiring current information</commentary></example> <example>Context: From another agent. request: "Angular update failed with dependency conflicts" assistant: "I'll research current solutions for this specific conflict" <commentary>Troubleshooting initiated by other agents</commentary></example>
```

## Trigger Keywords by Agent Type

### Technical Development Agents
- "working with [technology]"
- "implementing features"
- "designing [architecture component]"
- "optimizing performance"
- "making architectural decisions"
- "building [technology-specific component]"

### Cross-Domain Specialists
- "security assessment needed"
- "compliance requirements"
- "quality improvement"
- "infrastructure setup"
- "deployment planning"

### Orchestration Agents
- "current information needed"
- "research required"
- "troubleshooting needed"
- "comprehensive analysis"
- "comparison required"

### Design/Strategy Agents
- "UX validation needed"
- "product requirements"
- "user research"
- "design system"
- "usability testing"

## Common Activation Mistakes

### ❌ Too Generic
```
Use when you need help
```
**Problem**: Doesn't specify what kind of help or when

### ❌ Missing Examples
```
Use immediately when working with React
```
**Problem**: No examples to demonstrate activation patterns

### ❌ Incomplete Examples
```
<example>request: "Build feature" assistant: "OK"</example>
```
**Problem**: Missing Context and commentary

### ❌ Wrong Example Count
```
Examples: <example>...</example> [only 2 examples]
```
**Problem**: Below minimum of 4 examples

### ❌ Overlapping Triggers
```
Agent A: Use immediately when doing any development
Agent B: Use immediately when writing code
Agent C: Use immediately when building features
```
**Problem**: All three trigger for same scenarios

## Best Practices

### ✅ Specific Triggers
```
Use immediately when working with NestJS projects, designing APIs, implementing business logic, or making backend architectural decisions
```

### ✅ Complete Examples
Each example has all 4 components:
1. Context
2. request
3. assistant
4. commentary

### ✅ Diverse Scenarios
Examples cover:
- Direct requests
- Contextual activation
- Delegation scenarios
- Edge cases

### ✅ Clear Boundaries
```
Context: Frontend styling needed
request: "Style this component"
assistant: "This requires frontend expertise - delegating to frontend specialist"
<commentary>Recognizes out-of-scope and delegates appropriately</commentary>
```

## Testing Activation Patterns

### Validation Checklist

- [ ] "Use immediately when" present
- [ ] 4-6 examples included
- [ ] Each example has Context, request, assistant, commentary
- [ ] Examples show diverse scenarios
- [ ] Triggers don't overlap with other agents
- [ ] Clear boundaries demonstrated
- [ ] Activation conditions are specific and measurable

### Conflict Testing

Test against existing agents:
1. List all agent activation triggers
2. Identify potential overlaps
3. Refine triggers to be more specific
4. Add examples showing differentiation
