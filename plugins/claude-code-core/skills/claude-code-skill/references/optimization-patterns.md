# Token Optimization Patterns

Techniques for achieving 40-50% token reduction vs monolithic prompts.

## Target Metrics

- 40-50% token reduction vs baseline
- Maintain or improve output quality
- Faster response times through efficiency

## Progressive Disclosure

Load only what's needed when needed.

### Three-Level Strategy

**Level 1: Metadata** (always loaded):

```yaml
---
name: pdf-processor
description: >
  Processes PDF files including rotation, merging, text extraction.
  Use when working with PDFs or document processing tasks.
---
```

Keep description under 200 words.

**Level 2: SKILL.md** (loaded on activation):

- Keep <500 lines
- Essential instructions only
- Reference external files for details

**Level 3: Resources** (loaded as needed):

- Extensive documentation in references/
- Scripts execute without loading
- Assets never loaded to context

### SKILL.md Size Management

**Before** (monolithic, 1500 lines):

```markdown
# PDF Processor

[500 lines of overview]
[500 lines of detailed procedures]
[500 lines of examples and edge cases]
```

**After** (optimized, 400 lines):

```markdown
# PDF Processor

## Overview

[50 lines of essential information]

## Workflow

[100 lines of core procedures]

## Examples

[50 lines of common patterns]
See references/advanced-examples.md for complete examples

## Edge Cases

[50 lines of critical edge cases]
See references/edge-case-guide.md for comprehensive coverage

## API Reference

[50 lines of common operations]
See references/api-docs.md for complete API documentation
```

## Concise Writing

Remove 30%+ unnecessary words.

### Before/After Examples

**Example 1**:

```markdown
# Before (82 tokens)

I need you to carefully search through the web to find the most recent
and up-to-date information about the latest features in the React framework
that have been released recently, and then provide a comprehensive summary.

# After (18 tokens)

Search latest React features and summarize.

# Reduction: 78%
```

**Example 2**:

```markdown
# Before (45 tokens)

When you encounter a situation where the user requests help with processing
PDF files, you should follow the procedures outlined below.

# After (12 tokens)

For PDF processing requests, follow these procedures:

# Reduction: 73%
```

**Example 3**:

```markdown
# Before (67 tokens)

It is very important that you make absolutely certain to carefully validate
all of the user's input parameters before you proceed with executing any
operations on the files in question.

# After (12 tokens)

Validate all input parameters before execution.

# Reduction: 82%
```

### Concise Writing Patterns

**Use bullet points**:

```markdown
# Before

The skill should first analyze the request, then it should validate the inputs,
and after that it should execute the operation, and finally it should verify
the output.

# After

Workflow:

- Analyze request
- Validate inputs
- Execute operation
- Verify output
```

**Remove filler words**:

- Remove: very, really, actually, basically, essentially, quite, rather
- Remove: please, kindly, I think, in my opinion
- Remove: it is important to note that, as you can see, clearly

**Use active voice**:

```markdown
# Before (passive)

The file should be validated by the script before processing is performed.

# After (active)

Script validates file before processing.
```

**Eliminate redundancy**:

```markdown
# Before

Repeat the validation process again to re-check and verify once more.

# After

Re-run validation.
```

## Response Length Guidance

Set expectations for output conciseness.

```markdown
## Output Format

Provide concise responses:

- Use bullet points over paragraphs
- Limit explanations to 3-5 sentences unless detail requested
- Show code examples only when explicitly needed
- Offer "Need more details?" for complex topics
```

## Strategic Caching

Cache frequently-used content in SKILL.md, details in references/.

### What to Cache in SKILL.md

**Cache** (frequently needed):

- Common code templates
- Essential workflow steps
- Critical validation rules
- Frequently-used examples

**Don't cache** (rarely needed):

- Comprehensive API documentation
- Extensive example collections
- Detailed troubleshooting guides
- Historical information

### Example: API Integration Skill

```markdown
# In SKILL.md (cached, always loaded)

## Common Patterns

**Basic GET request**:
\`\`\`python
response = requests.get(url, headers=headers)
\`\`\`

**POST with JSON**:
\`\`\`python
response = requests.post(url, json=data, headers=headers)
\`\`\`

For complete API reference: references/api-docs.md
For authentication patterns: references/auth-guide.md
For error handling: references/error-handling.md
```

## References Organization

Organize to minimize loading unnecessary content.

### Domain-Based Organization

```
references/
├── basic-operations.md      # Load for simple tasks
├── advanced-operations.md   # Load for complex tasks
├── api-reference.md         # Load when API details needed
└── troubleshooting.md       # Load when errors occur
```

### Feature-Based Organization

```
references/
├── rotation-guide.md    # Load only for rotation tasks
├── merging-guide.md     # Load only for merging tasks
├── extraction-guide.md  # Load only for extraction tasks
└── common-patterns.md   # Load for all tasks
```

### When to Load References

```markdown
# In SKILL.md

If task is PDF rotation:
→ Follow workflow below
→ For advanced rotation options: references/rotation-guide.md

Else if task is PDF merging:
→ Refer to references/merging-guide.md for complete procedures

Else if task encounters errors:
→ Consult references/troubleshooting.md
```

## Template Efficiency

Reusable templates reduce repeated generation.

### Output Templates

```markdown
## Report Template

Use this structure for analysis reports:

# [Analysis Title]

## Summary

[2-3 sentence overview]

## Findings

- [Finding 1]
- [Finding 2]
- [Finding 3]

## Recommendations

1. [Action 1]
2. [Action 2]

## Next Steps

[Immediate actions]
```

Claude fills template instead of generating structure from scratch.

### Code Templates

```markdown
## FastAPI Endpoint Template

\`\`\`python
@app.post("/[endpoint-name]")
async def [function_name](data: [Schema]): # Validate input # Process data # Return response
return {"status": "success", "data": result}
\`\`\`
```

## Conditional Loading

Load content based on task complexity.

```markdown
## Workflow

**For basic tasks**:

1. [Simple step 1]
2. [Simple step 2]
3. Done

**For advanced tasks**:

1. [Complex step 1]
2. Refer to references/advanced-guide.md
3. [Complex step 3]
4. Validate with references/validation-rules.md
```

Only advanced tasks trigger loading additional references.

## Measurement

Track token efficiency improvements.

### Baseline Measurement

```markdown
Test scenario without skill:

- User request: "Rotate PDF 90 degrees"
- Claude response: [generates rotation code from scratch]
- Tokens used: 2400
```

### With Skill Measurement

```markdown
Same scenario with skill:

- User request: "Rotate PDF 90 degrees"
- Skill activates: Uses scripts/rotate_pdf.py
- Tokens used: 1200

Efficiency gain: (2400 - 1200) / 2400 = 50%
```

### Tracking Over Time

```markdown
Metrics log:

- v1.0.0: 2400 tokens avg (baseline)
- v1.1.0: 1800 tokens avg (25% reduction)
- v1.2.0: 1200 tokens avg (50% reduction) ← target achieved
```

## Quick Wins

Immediate optimizations for any skill:

1. **Move examples to references/**
   Keep 3-5 examples in SKILL.md, rest in references/examples.md

2. **Eliminate filler words**
   Remove very, really, quite, basically, essentially

3. **Use bullet points**
   Convert paragraphs to bulleted lists

4. **Add response guidance**
   "Be concise. Bullet points over paragraphs."

5. **Create templates**
   Define output structures instead of generating from scratch

6. **Organize references by domain**
   Load only relevant domain content

7. **Cache common patterns**
   Keep frequently-used templates in SKILL.md

8. **Use scripts for repeated code**
   Don't regenerate same code each time

9. **Set SKILL.md size limit**
   Target <500 lines, move excess to references/

10. **Measure and iterate**
    Track tokens before/after, iterate to achieve 40-50% reduction
