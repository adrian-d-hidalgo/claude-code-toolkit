# Multi-Skill Coordination Patterns

Patterns for skills collaborating on complex multi-domain tasks.

## Coordination Strategies

### Hierarchical Pattern (Supervisor Delegation)

One skill coordinates multiple specialized skills.

**Structure**:
```
Coordinator Skill (high-level orchestration)
  ├─→ Specialist Skill A (domain 1)
  ├─→ Specialist Skill B (domain 2)
  └─→ Specialist Skill C (domain 3)
```

**Example**: Full-stack development skill
```markdown
When building full-stack application:
1. Identify required components (frontend, backend, database)
2. Delegate frontend to react-specialist skill
3. Delegate backend to fastapi-specialist skill
4. Delegate database to postgres-specialist skill
5. Coordinate outputs into cohesive application
```

**Implementation in SKILL.md**:
```markdown
## Multi-Component Workflow

For full-stack tasks:
1. Analyze requirements
2. Identify needed specializations:
   - Frontend → Delegate to react-specialist
   - Backend → Delegate to fastapi-specialist
   - Database → Delegate to postgres-specialist
3. Coordinate components
4. Integrate outputs
5. Validate complete system
```

### Peer Collaboration Pattern (Dynamic)

Skills invoke each other as needed without hierarchy.

**Structure**:
```
Skill A ←→ Skill B
   ↓         ↓
   └────→ Skill C
```

**Example**: PDF processor + Research
```markdown
When best practices needed:
- Delegate to research-specialist for current best practices
- Apply findings to PDF processing implementation
- Return optimized result
```

**Implementation in SKILL.md**:
```markdown
## Best Practices Integration

When processing PDFs:
1. Execute core operation
2. If best practices unclear:
   - Delegate to research-specialist:
     "Search PDF processing best practices for [specific operation]"
   - Apply recommended approach
3. Continue workflow with optimized method
```

### Service Composition Pattern (Pipeline)

Sequential skill invocations forming processing pipeline.

**Structure**:
```
Input → Skill A → Skill B → Skill C → Output
```

**Example**: Data analysis pipeline
```markdown
1. Data extraction skill → Extracts data from sources
2. Data cleaning skill → Cleans and validates data
3. Analysis skill → Performs statistical analysis
4. Visualization skill → Creates charts and reports
```

**Implementation in SKILL.md**:
```markdown
## Analysis Pipeline

For data analysis tasks:
1. Extract data (data-extraction-specialist)
2. Clean data (data-cleaning-specialist)
3. Analyze (statistical-analysis-specialist)
4. Visualize (visualization-specialist)
5. Generate report combining all outputs
```

## Coordination Best Practices

### Clear Skill Boundaries

Define what each skill handles and doesn't handle.

**Single Responsibility**:
```markdown
# PDF Processor Skill
Handles: PDF rotation, merging, splitting, text extraction
Doesn't handle: Creating PDFs from scratch (delegate to pdf-generator skill)

# PDF Generator Skill
Handles: Creating PDFs from HTML, markdown, images
Doesn't handle: Modifying existing PDFs (delegate to pdf-processor skill)
```

### Explicit Handoff Protocols

Document how to invoke other skills.

**Handoff template**:
```markdown
When [condition]:
1. Prepare context for target skill:
   - [Information 1]
   - [Information 2]
2. Delegate to [target-skill]:
   "[Specific request format]"
3. Receive result
4. Apply to current workflow:
   - [Integration step 1]
   - [Integration step 2]
```

**Example**:
```markdown
When current information needed:
1. Prepare research context:
   - Technology: [FastAPI]
   - Topic: [authentication patterns]
   - Version: [latest]
2. Delegate to research-specialist:
   "Search FastAPI authentication best practices for JWT tokens"
3. Receive recommended patterns
4. Apply to implementation:
   - Implement suggested pattern
   - Follow security guidelines
```

### Avoid Overlapping Domains

Prevent activation conflicts.

**Domain separation**:
```yaml
# Skill 1: PDF Processing
description: >
  Processes existing PDF files (rotation, merging, extraction).
  Use when working with PDF files or document processing.

# Skill 2: Document Generation
description: >
  Generates new PDF documents from HTML, markdown, templates.
  Use when creating PDFs from scratch or generating reports.

# No overlap: "processing existing" vs "generating new"
```

### Test Multi-Skill Scenarios

Validate coordination works in practice.

**Test scenarios**:
```markdown
Test: PDF processing with best practices

Input: "Process PDF using current best practices"

Expected coordination:
1. pdf-processor skill activates
2. Recognizes need for best practices
3. Delegates to research-specialist
4. research-specialist searches current PDF best practices
5. pdf-processor applies recommendations
6. Returns optimized result

Validation:
- Both skills activated appropriately
- Information passed correctly
- No conflicts or duplicate work
- Final output incorporates best practices
```

## Coordination Patterns

### Pattern 1: Sequential Delegation

Tasks requiring step-by-step specialization.

```markdown
## Sequential Workflow

Task: Build and deploy web application

1. Design phase:
   - Delegate to architecture-specialist
   - Receive architecture design

2. Implementation phase:
   - Frontend: Delegate to react-specialist
   - Backend: Delegate to fastapi-specialist
   - Database: Delegate to postgres-specialist

3. Testing phase:
   - Delegate to testing-specialist
   - Receive test results

4. Deployment phase:
   - Delegate to devops-specialist
   - Confirm deployment success
```

### Pattern 2: Parallel Delegation

Independent tasks executed simultaneously.

```markdown
## Parallel Workflow

Task: Full-stack code review

Execute in parallel:
- Frontend review → react-specialist
- Backend review → fastapi-specialist
- Database review → postgres-specialist
- Security review → security-specialist

Aggregate results:
- Combine findings from all specialists
- Prioritize critical issues
- Generate comprehensive report
```

### Pattern 3: Conditional Delegation

Delegate based on runtime conditions.

```markdown
## Conditional Workflow

Task: Process document

Analyze document type:
- If PDF → Delegate to pdf-processor
- Else if Excel → Delegate to excel-processor
- Else if Word → Delegate to word-processor
- Else → Handle with general document processor
```

### Pattern 4: Iterative Refinement

Repeated consultation for quality improvement.

```markdown
## Iterative Workflow

Task: Optimize code implementation

1. Implement initial solution
2. Delegate to code-reviewer for analysis
3. If issues found:
   - Apply suggested improvements
   - Repeat from step 2
4. When no critical issues:
   - Delegate to performance-specialist for optimization
5. Final validation
```

## Communication Protocols

### Request Format

Structure requests to other skills clearly.

**Template**:
```markdown
Delegate to [skill-name]:
"[Specific action] for [context] focusing on [specific aspect]"
```

**Examples**:
```markdown
Delegate to research-specialist:
"Search FastAPI authentication best practices for production environments"

Delegate to mermaid-specialist:
"Create sequence diagram for OAuth2 authentication flow including token refresh"

Delegate to testing-specialist:
"Generate integration tests for REST API endpoints covering success and error cases"
```

### Context Passing

Provide sufficient context without overload.

**Minimal context** (preferred):
```markdown
Delegate with context:
- Technology: FastAPI
- Task: Authentication
- Requirement: JWT tokens
```

**Excessive context** (avoid):
```markdown
Delegate with full history:
- Previous 10 conversation messages
- Complete codebase context
- All prior decisions
```

### Result Integration

Apply results from other skills effectively.

**Integration template**:
```markdown
After receiving [result] from [skill]:
1. Validate result format
2. Extract relevant information:
   - [Key point 1]
   - [Key point 2]
3. Apply to current task:
   - [Application step 1]
   - [Application step 2]
4. Continue workflow
```

## Conflict Resolution

### Overlapping Activations

When multiple skills could handle request.

**Prevention**:
- Make descriptions mutually exclusive
- Define clear domain boundaries
- Test for overlaps and iterate

**Detection**:
```markdown
If multiple skills activate:
1. Identify primary skill based on specificity
2. Others provide supporting information
3. Primary skill coordinates final output
```

### Contradictory Recommendations

When skills provide conflicting advice.

**Resolution strategy**:
```markdown
When conflict detected:
1. Identify source of contradiction
2. Consult authoritative source (research-specialist)
3. Apply domain-specific expertise to decide
4. Document decision rationale
5. Proceed with chosen approach
```

## Performance Considerations

### Minimize Delegation Overhead

Only delegate when beneficial.

**Delegate when**:
- Task outside current skill's domain
- Specialized expertise required
- Token efficiency gained through delegation

**Don't delegate when**:
- Simple task within current skill's capability
- Overhead exceeds benefit
- Can handle with existing resources

### Optimize Coordination

Reduce token usage in multi-skill workflows.

**Techniques**:
- Pass only essential context
- Use parallel delegation when possible
- Cache results from repeated delegations
- Avoid delegation loops

## Example: Complex Multi-Skill Workflow

**Task**: Design, implement, test, and document REST API

**Coordination**:
```markdown
1. Architecture Design
   Delegate to architecture-specialist:
   - Define API structure
   - Recommend patterns
   - Identify technology stack

2. Implementation (parallel)
   A. Backend:
      Delegate to fastapi-specialist:
      - Implement endpoints
      - Add validation
      - Handle errors

   B. Database:
      Delegate to postgres-specialist:
      - Design schema
      - Create migrations
      - Optimize queries

3. Testing
   Delegate to testing-specialist:
   - Generate unit tests
   - Create integration tests
   - Validate coverage

4. Documentation
   Delegate to documentation-specialist:
   - API reference
   - Usage examples
   - Deployment guide

5. Integration
   - Combine all components
   - Validate complete system
   - Generate final deliverable
```

## Quick Reference

**Hierarchical**: One coordinator delegates to specialists
**Peer Collaboration**: Skills invoke each other as needed
**Service Composition**: Sequential pipeline processing
**Parallel**: Multiple specialists work simultaneously
**Conditional**: Delegate based on runtime conditions
**Iterative**: Repeated consultation for refinement

**Best Practices**:
- Clear skill boundaries (single responsibility)
- Explicit handoff protocols
- Avoid overlapping domains
- Test multi-skill scenarios
- Pass minimal context
- Optimize delegation overhead
