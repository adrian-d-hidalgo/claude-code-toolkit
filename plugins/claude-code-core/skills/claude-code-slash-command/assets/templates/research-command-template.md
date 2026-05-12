---
description: Research [specific topic/domain] with [specific focus] and reincidence protocol
allowed-tools: Read, Grep, Glob
argument-hint: [primary-context] [--previous-terms] [--failed-approaches] [--context-refinement]
model: sonnet
---

Research [topic] for "$ARGUMENTS" with progressive search methodology and reincidence protocol compliance.

## Parse Arguments

From "$ARGUMENTS":
- **Primary Context**: [Main search topic or question]
- **Previous Terms** (optional): Extract from `--previous-terms="[terms]"`
- **Failed Approaches** (optional): Extract from `--failed-approaches="[approaches]"`
- **Context Refinement** (optional): Extract from `--context-refinement="[context]"`

## Domain-Specific Source Credibility

Evaluate sources using domain-specific tier system:

**Tier 1 - Highest Trust** (Prioritize in results):
- [Domain-specific authoritative source 1] (e.g., Official documentation)
- [Domain-specific authoritative source 2] (e.g., Maintainer responses)
- [Domain-specific authoritative source 3] (e.g., Security advisories)
- [Domain-specific authoritative source 4] (e.g., Regulatory publications)

**Tier 2 - High Trust** (Strong validation):
- [Validated community source 1] (e.g., Stack Overflow >10 upvotes)
- [Validated community source 2] (e.g., GitHub issues with resolution)
- [Validated community source 3] (e.g., Expert technical blogs)
- [Validated community source 4] (e.g., Peer-reviewed studies)

**Tier 3 - Moderate Trust** (Use with caution):
- [Community source 1] (e.g., Medium community validation 3-10 upvotes)
- [Community source 2] (e.g., Technical articles with examples)
- [Community source 3] (e.g., Conference presentations)
- [Community source 4] (e.g., Professional forums)

**Tier 4 - Low Trust** (Avoid or use only as last resort):
- [Unvalidated source 1] (e.g., Unvalidated solutions)
- [Outdated source 1] (e.g., Significantly different versions)
- [Questionable source 1] (e.g., Deprecated approaches)
- [Promotional content] (e.g., Unvalidated marketing claims)

**Source Evaluation Criteria**:
- Recency (prioritize content from last 12 months for tech, 24 months for general)
- Author credibility (maintainers > contributors > users)
- Community validation (upvotes, verification, peer review)
- Technical accuracy (tested examples, working code)
- Relevance to specific context (version, environment, use case)

## Reincidence Detection & Handling

**Check for reincidence parameters**:

```markdown
If --previous-terms provided:
  → This is a reincidence case (previous search failed)
  → Skip Level 1 searches (already attempted)
  → Use term variations instead of exact repeats
  → Jump to Level 3 for broader patterns

If --failed-approaches provided:
  → Exclude these solution types from results
  → Focus on alternative methodologies
  → Filter out similar approach patterns

If --context-refinement provided:
  → Incorporate into all search levels
  → Add to search queries for specificity
  → Use to narrow or focus results
```

**Refinement Strategies**:

1. **Level 1 failed** → Jump directly to Level 3
2. **No exact matches** → Use pattern-based searches with broader technology context
3. **Solutions don't apply** → Add environmental context from context-refinement
4. **Information outdated** → Prioritize recency filters ("2024", "latest", "current")

## Progressive Search Strategy

Execute searches in order, advancing to next level if insufficient results:

### Level 1 - Highly Specific

**[Skip this level if --previous-terms provided]**

Target: Exact match for specific context and current version.

**Search Queries**:
1. `"[exact-error-or-question]" [technology] [version/year]`
2. `"[specific-terminology]" [technology] [precise-context]`
3. `[exact-use-case] [technology] [environment]`

**Expected Sources**: Official docs, recent GitHub issues, specific Stack Overflow answers

**Success Criteria**: 3+ Tier 1-2 sources with exact context match

**If insufficient**: Proceed to Level 2

### Level 2 - Technology Focused

**[Skip this level if reincidence detected]**

Target: Technology-specific solutions with broader context.

**Search Queries**:
1. `"[core-problem-terms]" [technology-category] [general-timeframe]`
2. `[technology] [problem-domain] [broader-context]`
3. `[related-concepts] [technology-family] [solution-type]`

**Term Variations** (use if previous-terms exist):
- Vary terminology while keeping core meaning
- Use synonyms and related technical terms
- Rephrase problem from different angle

**Expected Sources**: Technical blogs, Stack Overflow, framework guides, community docs

**Success Criteria**: 5+ Tier 2-3 sources with applicable solutions

**If insufficient**: Proceed to Level 3

### Level 3 - Pattern Recognition

**[Start here if reincidence detected]**

Target: Broader patterns and approaches that apply to problem domain.

**Search Queries**:
1. `"[pattern-keywords]" [technology-family] [solution-category]`
2. `[core-problem-type] [methodology] [industry-context]`
3. `[underlying-pattern] [approach-type] [best-practices]`

**Incorporate context-refinement**:
- Add environmental details to queries
- Include version, OS, configuration specifics
- Use refined context to filter results

**Exclude failed-approaches**:
- Filter out solution types already attempted
- Focus on alternative methodologies
- Look for different architectural approaches

**Expected Sources**: Architecture articles, design pattern docs, comparative analyses

**Success Criteria**: Multiple applicable patterns with adaptation guidance

**If insufficient**: Proceed to Level 4

### Level 4 - Conceptual & Alternative Approaches

Target: Underlying concepts, principles, and alternative strategies.

**Search Queries**:
1. `[underlying-concept] [approach-category] [general-principles]`
2. `[problem-domain] [established-solutions] [industry-standards]`
3. `[alternative-methodology] [different-technology-family] [comparable-use-case]`

**Think differently**:
- Consider different technology stacks with similar problems
- Look for conceptual solutions adaptable to context
- Research alternative approaches to same goal

**Expected Sources**: CS fundamentals, architecture principles, cross-technology patterns

**Success Criteria**: Conceptual understanding with adaptation path

## Information Synthesis Framework

### Evaluate Findings

For each source found:

1. **Assess Credibility**: Apply tier system
2. **Check Relevance**: Match to original context
3. **Validate Currency**: Confirm information is current
4. **Test Applicability**: Verify fits use case
5. **Cross-Reference**: Compare with other sources

### Synthesize Information

**Combine findings into coherent answer**:

1. **Identify Common Themes**: What appears across multiple sources?
2. **Note Conflicts**: Where do sources disagree?
3. **Prioritize by Credibility**: Weight Tier 1-2 sources higher
4. **Adapt to Context**: Tailor to specific user situation
5. **Provide Alternatives**: Multiple approaches when applicable

### Confidence Indicators

Tag synthesized information with confidence level:

- **High Confidence** (✅): 3+ Tier 1-2 sources agree, recent, directly applicable
- **Medium Confidence** (⚠️): 2+ Tier 2-3 sources, mostly applicable, may need adaptation
- **Low Confidence** (❓): Single source or Tier 3-4 only, requires validation
- **Speculative** (💭): Inferred from patterns, needs testing

## Output Structure

### Summary

**[Primary Finding or Answer]**

[Concise 2-3 sentence summary of research findings]

**Confidence Level**: [High/Medium/Low/Speculative] - [Brief justification]

### Detailed Findings

#### Approach 1: [Recommended Solution/Information]

**Source Tier**: [1/2/3/4]

**Description**:
[Detailed explanation of this approach]

**Implementation**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Pros**:
- [Advantage 1]
- [Advantage 2]

**Cons**:
- [Limitation 1]
- [Limitation 2]

**Source References**:
- [Source 1 with tier indicator]
- [Source 2 with tier indicator]

#### Approach 2: [Alternative Solution/Information]

[Same structure as Approach 1]

#### Approach 3: [Additional Option if applicable]

[Same structure]

### Considerations

**Environmental Factors**:
- [Factor 1 affecting applicability]
- [Factor 2 affecting applicability]

**Prerequisites**:
- [Requirement 1]
- [Requirement 2]

**Potential Issues**:
- [Issue 1 to watch for]
- [Issue 2 to watch for]

### Search Metadata

**Search Levels Executed**: [1, 2, 3, 4]

**Reincidence Detected**: [Yes/No]
- Previous terms avoided: [list if applicable]
- Failed approaches excluded: [list if applicable]
- Context refinement used: [details if applicable]

**Total Sources Evaluated**: [number]
- Tier 1: [count]
- Tier 2: [count]
- Tier 3: [count]
- Tier 4: [count]

**Search Strategy Notes**:
[Any notable adjustments made during search, why certain levels were skipped, etc.]

## Reincidence Protocol Summary

**If this search didn't fully resolve the issue**, user can reinvoke with:

```bash
[command-name] "[refined-context]" \
  --previous-terms="[terms-used-in-this-search]" \
  --failed-approaches="[approaches-that-didnt-work]" \
  --context-refinement="[additional-environmental-details]"
```

**For next attempt, consider adding**:
- More specific version numbers
- Operating system details
- Configuration specifics
- Error messages or logs
- Steps already attempted

## Integration Notes

**This research command can be called by**:
- Action commands needing current information
- Other research commands for broader context
- Agents requiring domain knowledge

**Provides**:
- Structured findings with confidence levels
- Multiple approaches with trade-offs
- Source credibility assessment
- Reincidence parameters for failed searches

## Example Output

[Provide a concrete example of what the output would look like for a typical query in this domain]
