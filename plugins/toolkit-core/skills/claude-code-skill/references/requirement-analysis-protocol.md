# Requirement Analysis Protocol

Structured protocol for analyzing skill requirements before implementation. Follow this workflow at the start of every skill creation.

## Phase 1: Requirement Gathering

### Step 1.1: Capture Initial Request

Document exactly what user requested:

```markdown
**User Request**: [Copy exact words]

**Context**: [Any background information provided]

**Constraints**: [Limitations, preferences, restrictions mentioned]
```

### Step 1.2: Identify Missing Information

Check if you have clarity on:

- [ ] **What**: Specific functionality needed
- [ ] **When**: Activation scenarios (trigger phrases, contexts)
- [ ] **Who**: Target users and skill level
- [ ] **Scope**: Boundaries (what skill should NOT do)
- [ ] **Success criteria**: How to measure if skill works
- [ ] **Examples**: 3-5 concrete usage scenarios

**If ANY unchecked**: Proceed to Step 1.3
**If ALL checked**: Skip to Phase 2

### Step 1.3: Ask Clarifying Questions

**Question template** (ask max 3 questions):

```markdown
To create the most effective skill, I need to clarify:

1. [Specific question about functionality]
2. [Question about scope or boundaries]
3. [Question about usage examples]

Please provide concrete examples if possible.
```

**Question guidelines**:

- Max 20 words per question
- Focus on unknowns that affect architecture
- Request concrete examples, not abstract descriptions
- Avoid asking what can be inferred

**Wait for user response before continuing**

### Step 1.4: Validate Understanding

After gathering information, confirm with user:

```markdown
**I understand you need a skill that**:

- [Functionality summary in 1 sentence]
- Activates when: [Trigger scenarios]
- Does NOT handle: [Out of scope items]

**Example usage**:

1. [Concrete example 1]
2. [Concrete example 2]

Is this correct? (Proceed if yes, clarify if no)
```

## Phase 2: Skill Classification

### Step 2.1: Determine Skill Type

Classify skill into primary pattern:

**Patterns**:

1. **Processing Skill** (transforms/manipulates data)
   - Examples: PDF processor, image converter, code formatter
   - Indicators: "process", "transform", "convert", "modify"

2. **Analysis Skill** (examines/evaluates data)
   - Examples: Code reviewer, security auditor, data analyzer
   - Indicators: "analyze", "review", "evaluate", "audit"

3. **Generation Skill** (creates new content)
   - Examples: Documentation writer, code scaffolder, report generator
   - Indicators: "create", "generate", "build", "scaffold"

4. **Research Skill** (gathers external information)
   - Examples: API documentation finder, market researcher, tool comparator
   - Indicators: "find", "research", "compare", "lookup"

5. **Management Skill** (organizes/coordinates)
   - Examples: Project manager, task coordinator, workflow orchestrator
   - Indicators: "manage", "organize", "coordinate", "track"

**Classification**: [Select ONE primary pattern]

### Step 2.2: Identify Complexity Level

**Simple** (<200 lines SKILL.md, no scripts):

- Single, straightforward operation
- No external dependencies
- Minimal decision logic
- Example: "Format JSON consistently"

**Moderate** (200-500 lines SKILL.md, maybe scripts/references):

- Multiple related operations
- Some decision logic
- May need documentation references
- Example: "Process PDFs (rotate, merge, extract)"

**Complex** (500 lines SKILL.md + multiple resources):

- Many interconnected operations
- Significant decision logic
- Requires scripts and references
- Example: "Full project scaffolder with templates"

**Complexity**: [Simple|Moderate|Complex]

### Step 2.3: Assess Resource Needs

For each category, evaluate need:

#### Scripts Decision

**Create script if**:

```
[ ] Same code rewritten repeatedly (identical logic)
[ ] Deterministic operation (no AI judgment needed)
[ ] Complex computation better executed than described
[ ] Token efficiency gained (run without loading code)
[ ] Error handling too complex for inline instructions
```

**Count**: [Number of scripts needed: 0-5+]

**If ANY checked**: Plan scripts in Phase 3
**If NONE checked**: No scripts needed

#### References Decision

**Create reference if**:

```
[ ] Information repeatedly looked up (>3 times per task)
[ ] Extensive documentation needed (>100 lines)
[ ] Domain knowledge required (schemas, APIs, patterns)
[ ] Examples collection (10+ examples)
[ ] Would make SKILL.md exceed 500 lines
```

**Count**: [Number of references needed: 0-5+]

**If ANY checked**: Plan references in Phase 3
**If NONE checked**: No references needed

#### Assets Decision

**Create asset if**:

```
[ ] Template used in output (not loaded to context)
[ ] Boilerplate code repeatedly copied (>50 lines)
[ ] Images/icons needed in skill output
[ ] Standard document templates required
[ ] File/folder structure template needed
```

**Count**: [Number of assets needed: 0-5+]

**If ANY checked**: Plan assets in Phase 3
**If NONE checked**: No assets needed

## Phase 3: Content Structure Planning

### Step 3.1: Define SKILL.md Core

**Core content** (always in SKILL.md):

```markdown
**Required sections**:

1. Task identification (what triggers this skill)
2. Primary workflow (step-by-step process)
3. 3-5 concrete examples
4. Decision points (when to use resources)
5. Success criteria

**Length target**: [Target lines: estimate based on complexity]

**Keep in SKILL.md** (don't extract to resources):

- Core workflow instructions
- Primary decision logic
- Essential examples (3-5)
- Resource loading triggers
```

### Step 3.2: Plan Scripts

For each script identified in Step 2.3:

```markdown
**Script 1**: [Name]

- Purpose: [What it does in 1 sentence]
- Inputs: [Parameters needed]
- Outputs: [What it returns/produces]
- Dependencies: [Required packages]
- Error handling: [Key error scenarios]

Location: scripts/[name].py

**Script 2**: [If needed]
...
```

**Script checklist per script**:

- [ ] Error handling defined (no punting to Claude)
- [ ] Input validation planned
- [ ] Dependencies documented
- [ ] Usage examples included
- [ ] Cross-platform compatible (forward slashes)

### Step 3.3: Plan References

For each reference identified in Step 2.3:

```markdown
**Reference 1**: [Name]

- Content: [What information it contains]
- Size: [Estimated lines]
- Access pattern: [When loaded from SKILL.md]
- Organization: [Structure approach]

Location: references/[name].md

**Reference 2**: [If needed]
...
```

**Reference organization**:

- 1 level deep (not nested)
- Loaded conditionally (not all upfront)
- Quick lookup structure (tables, lists)
- No duplication with SKILL.md

### Step 3.4: Plan Assets

For each asset identified in Step 2.3:

```markdown
**Asset 1**: [Name]

- Type: [Template|Boilerplate|Image|Config]
- Purpose: [How it's used]
- Size: [Estimate if large]
- Modification: [How users customize it]

Location: assets/[name].[ext] or assets/[folder]/

**Asset 2**: [If needed]
...
```

**Asset usage**:

- Never loaded to context (unlimited size ok)
- Copied/modified by AI for user
- Document usage instructions in SKILL.md

### Step 3.5: Define Progressive Disclosure

Map when each resource loads:

```markdown
**Always loaded**: SKILL.md core (automatic)

**Load conditionally**:

1. references/[name].md → When: [Condition]
2. references/[name].md → When: [Condition]
3. scripts/[name].py → Executed when: [Condition]

**Never loaded**: assets/\* (used for output)
```

## Phase 4: Validation & Adjustment

### Step 4.1: Complexity Check

**Total content estimate**:

- SKILL.md: [estimated lines]
- References: [count] files, [total lines]
- Scripts: [count] files
- Assets: [count] files/folders

**Red flags** (reconsider structure if ANY true):

- [ ] SKILL.md >500 lines → Extract to references
- [ ] > 10 references → Consider splitting skill or better organization
- [ ] > 5 scripts → May be too complex, consider simplifying
- [ ] References >2 levels deep → Flatten structure
- [ ] Duplicated content → Consolidate or remove

### Step 4.2: Token Efficiency Estimate

**Baseline** (without skill):

- User describes task each time
- Estimate: [baseline tokens per task]

**With skill**:

- SKILL.md loaded: [estimated tokens]
- Average references loaded: [estimated tokens]
- Total per task: [estimated tokens]

**Reduction**: [(baseline - skill) / baseline × 100%]

**Target**: 40-50% reduction
**If below target**: Simplify or add progressive disclosure

### Step 4.3: Activation Clarity

**Test description draft**:

```
[Draft 1-2 sentence activation description combining What + When + Specific triggers]
```

**Mental test cases**:

- Positive triggers (should activate): [3+ examples]
- Negative triggers (should NOT activate): [3+ examples]
- Edge cases (ambiguous): [2+ examples]

**Clarity score**:

- [ ] Specific enough (not too generic)
- [ ] Includes key domain terms
- [ ] Clear boundaries (what NOT to do)
- [ ] Minimal false positive risk

**If ANY unchecked**: Revise description

## Phase 5: Implementation Roadmap

### Step 5.1: Create Task Breakdown

Based on analysis, generate ordered tasks:

```markdown
**Implementation Tasks**:

1. Initialize structure
   - Run: python scripts/init_skill.py skill-name
   - Verify: Directory structure created

2. Define activation description
   - Review: references/activation-examples.md
   - Draft: [description]
   - Validate: Mental test cases

3. Configure security
   - Determine: allowed-tools based on needs
   - Review: references/security-checklist.md
   - Define: [tools list]

4. Build SKILL.md core
   - Template: assets/templates/SKILL-template.md
   - Content: [sections to write]
   - Length: Target [X] lines

5. Create scripts (if applicable)
   - Script 1: [name] - [purpose]
   - Script 2: [name] - [purpose]
   - Validate: Error handling, documentation

6. Create references (if applicable)
   - Reference 1: [name] - [content]
   - Reference 2: [name] - [content]
   - Organize: 1 level deep, conditional loading

7. Create assets (if applicable)
   - Asset 1: [name] - [type]
   - Asset 2: [name] - [type]
   - Document: Usage instructions

8. Test thoroughly
   - Activation: 5+ positive, 5+ negative, 3+ edge
   - Functionality: All workflows end-to-end
   - Models: Haiku, Sonnet, Opus
   - Metrics: Activation 90%+, completion 85%+

9. Validate completeness
   - Run: python scripts/validate_skill.py
   - Review: references/deployment-checklist.md
   - Fix: Any issues found

10. Deploy
    - Restart Claude Code
    - Monitor: Activation in real usage
    - Iterate: Based on feedback
```

### Step 5.2: Estimate Effort

**Time estimate**:

- Simple skill: 1-2 hours
- Moderate skill: 3-6 hours
- Complex skill: 8-16 hours

**Your estimate**: [X hours based on complexity]

### Step 5.3: Confirm with User

Present roadmap to user:

```markdown
**Skill Plan Summary**:

**Type**: [Pattern type]
**Complexity**: [Simple|Moderate|Complex]
**Resources**:

- SKILL.md core (~[X] lines)
- Scripts: [count]
- References: [count]
- Assets: [count]

**Estimated effort**: [X hours]

**Next steps**:

1. [First task]
2. [Second task]
3. [Third task]

Ready to proceed? (yes = continue, no = adjust plan)
```

## Quick Reference

### When to Use This Protocol

**Always use for**:

- Creating new skill from scratch
- Major skill refactoring
- User unclear on requirements

**Can skip for**:

- Minor skill updates
- Bug fixes
- Content clarifications

### Protocol Shortcuts

**For simple skills** (single operation, <200 lines):

- Phase 1: Minimal (just confirm examples)
- Phase 2: Quick classification
- Phase 3: SKILL.md only, no resources
- Phase 4: Skip
- Phase 5: Simplified roadmap

**For skill updates** (existing skill modification):

- Phase 1: Identify what changed
- Phase 2: Re-assess only affected resources
- Phase 3: Plan changes only
- Phase 4: Validate changes don't break existing
- Phase 5: Update specific tasks

### Decision Flowchart

```
Start
  ↓
Clear requirements?
  ├─ No → Phase 1: Gather & Clarify → Wait for user
  └─ Yes → Phase 2: Classify (pattern + complexity)
            ↓
         Phase 3: Plan structure (SKILL.md + resources)
            ↓
         Phase 4: Validate (complexity, tokens, activation)
            ↓
         Looks good?
            ├─ No → Revise Phase 3 → Re-validate
            └─ Yes → Phase 5: Create roadmap → Present to user → Implement
```

## Examples

### Example 1: Simple Skill (JSON Formatter)

**Phase 1**: User wants "format JSON consistently"

- Clear requirements: Yes
- Examples provided: Yes
- Scope defined: Just formatting, no validation

**Phase 2**:

- Type: Processing Skill
- Complexity: Simple (<200 lines)
- Resources: None needed

**Phase 3**:

- SKILL.md: Core formatting instructions (~150 lines)
- Scripts: None (AI handles formatting)
- References: None
- Assets: None

**Phase 4**:

- Complexity: ✓ Under 500 lines
- Tokens: 80% reduction (no repeated formatting instructions)
- Activation: "format JSON", "prettify JSON" ✓

**Phase 5**: 3 tasks (initialize, write SKILL.md, test) - 1 hour

### Example 2: Moderate Skill (PDF Processor)

**Phase 1**: User wants "process PDFs"

- Unclear: What operations? → Ask
- User clarifies: Rotate, merge, extract text
- Examples: 5 provided

**Phase 2**:

- Type: Processing Skill
- Complexity: Moderate (300 lines + scripts)
- Resources: Scripts needed

**Phase 3**:

- SKILL.md: Workflow, operation selection (~250 lines)
- Scripts: 3 (rotate, merge, extract)
- References: 1 (extraction methods guide)
- Assets: None

**Phase 4**:

- Complexity: ✓ Within limits
- Tokens: 60% reduction (scripts execute without loading code)
- Activation: "process PDF", "rotate PDF", "merge PDF" ✓

**Phase 5**: 9 tasks - 4 hours

### Example 3: Complex Skill (Project Scaffolder)

**Phase 1**: User wants "scaffold projects"

- Unclear: What frameworks? → Ask
- User clarifies: React, Vue, Angular support
- Unclear: What features? → Ask
- User clarifies: TypeScript, testing, linting

**Phase 2**:

- Type: Generation Skill
- Complexity: Complex (500 lines + extensive resources)
- Resources: Scripts, references, assets needed

**Phase 3**:

- SKILL.md: Framework selection, configuration workflow (~450 lines)
- Scripts: 2 (scaffold generator, dependency installer)
- References: 3 (framework patterns, configuration guide, best practices)
- Assets: 3 (React template/, Vue template/, Angular template/)

**Phase 4**:

- Complexity: ✓ At limit
- Tokens: 50% reduction (templates not loaded, references conditional)
- Activation: "create React project", "scaffold app", "new project" ✓

**Phase 5**: 10 tasks - 12 hours

## Protocol Checklist

Before moving from analysis to implementation:

- [ ] Phase 1: Requirements clear (all questions answered)
- [ ] Phase 2: Skill classified (pattern + complexity determined)
- [ ] Phase 3: Resources planned (SKILL.md, scripts, references, assets)
- [ ] Phase 4: Validated (complexity, tokens, activation checked)
- [ ] Phase 5: Roadmap created and confirmed with user
- [ ] User approved plan before starting implementation
