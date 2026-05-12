# Reincidence Protocol

Handling repeated research attempts when initial searches fail to find satisfactory results.

## What is Reincidence?

**Reincidence** = When a research command is invoked again after previous attempts failed to produce useful results.

**Purpose**: Avoid repeating failed approaches, progressively refine search strategy.

## Core Principle

**Never repeat the same search that already failed.**

Instead:

- Use different search terms
- Try alternative methodologies
- Add environmental context
- Broaden or narrow scope strategically

## Parameter System

### Reincidence Parameters

Research commands should accept these optional parameters:

**`--previous-terms="[term1, term2, term3]"`**

- Terms already searched unsuccessfully
- Command should avoid these exact searches
- Jump to alternative formulations

**`--failed-approaches="[approach1, approach2]"`**

- Solution types that didn't work
- Methodologies that didn't apply
- Command should exclude these approaches

**`--context-refinement="[additional-context]"`**

- More specific environmental details
- Version numbers, OS, configuration
- Command should incorporate into searches

### Parameter Processing

```markdown
## Reincidence Handling

**Check for reincidence parameters at start**:

Parse arguments for:

- `--previous-terms=` → Extract failed search terms
- `--failed-approaches=` → Extract solution types to avoid
- `--context-refinement=` → Extract additional context

**If reincidence parameters present**:

1. Skip Level 1 searches (already failed)
2. Jump to Level 3 (broader patterns)
3. Incorporate additional context into all searches
4. Exclude failed approach patterns from results
5. Prioritize alternative methodologies
```

## Progressive Refinement Strategies

### Strategy 1: Level Jumping

**Normal progression**: Level 1 → 2 → 3 → 4

**With reincidence**: Skip failed levels

**Example**:

- First attempt: Level 1 searches failed
- Reincidence: Start at Level 3, skip 1 and 2

### Strategy 2: Term Variation

**Avoid exact repetition**, use variations:

**Failed term**: `"error connecting to database"`

**Variations**:

- `"database connection failure"`
- `"cannot connect to database"`
- `"database connection refused"`
- `"database connection timeout"`

### Strategy 3: Scope Adjustment

**If narrow searches failed**, broaden:

**Failed**: `"Angular 17 SSR hydration error"`

**Broader**:

- `"Angular SSR hydration issues"`
- `"Angular server-side rendering problems"`
- `"hydration errors in SPAs"`

**If broad searches failed**, narrow:

**Failed**: `"API best practices"`

**Narrower**:

- `"REST API security best practices 2024"`
- `"GraphQL API performance optimization"`
- `"API rate limiting implementation"`

### Strategy 4: Environmental Context

**Add specifics** when generic searches fail:

**Failed**: `"npm install fails"`

**With context**:

- `"npm install fails Mac M1 node 20"`
- `"npm ERR! EACCES permission denied"`
- `"npm install behind corporate proxy"`

### Strategy 5: Alternative Methodologies

**If direct solutions failed**, try patterns:

**Failed**: Searching for exact error message solution

**Alternative**:

- Search for underlying concept/pattern
- Look for similar error categories
- Find related technology workarounds
- Research architectural alternatives

## Implementation Template

### Research Command with Reincidence

```markdown
---
description: Research [topic] with reincidence support
allowed-tools: Read, Grep, Glob
argument-hint: [search-context] [--previous-terms] [--failed-approaches] [--context-refinement]
model: sonnet
---

## Parse Arguments

From "$ARGUMENTS":

- **Search Context**: [primary search topic]
- **Previous Terms**: Extract from --previous-terms= (optional)
- **Failed Approaches**: Extract from --failed-approaches= (optional)
- **Context Refinement**: Extract from --context-refinement= (optional)

## Reincidence Detection

**Check if this is a reincidence case**:

- If --previous-terms provided → This is reincidence
- If --failed-approaches provided → This is reincidence
- If --context-refinement provided → This is enhanced search

**Adjust strategy accordingly**:

- Reincidence detected → Skip to Level 3, use variations
- Enhanced search → Incorporate refinement into all levels
- First attempt → Use standard Level 1-4 progression

## Progressive Search Strategy

### Level 1 - Highly Specific

[Skip if reincidence with previous-terms]

- "[exact-context]" [technology] [version]
- Avoid previous-terms if provided

### Level 2 - Technology Focused

[Skip if reincidence with previous-terms]

- "[core-terms]" [technology] [timeframe]
- Use term variations, not exact previous-terms

### Level 3 - Pattern Recognition

[Start here if reincidence]

- "[pattern-keywords]" [technology-family]
- Broader scope than Level 1-2
- Incorporate context-refinement
- Exclude failed-approaches patterns

### Level 4 - Conceptual

[Always attempt with fresh perspective]

- "[underlying-concept]" [principles]
- Completely different angle
- Alternative methodologies

## Refinement Strategies

**If Level 1 failed** (indicated by previous-terms):
→ Jump to Level 3 with term variations

**If no exact matches** found:
→ Use pattern-based searches with broader technology context

**If solutions don't apply** (indicated by failed-approaches):
→ Add environmental context from context-refinement
→ Focus on alternative solution categories

**If information outdated**:
→ Add recency filters: "2024", "latest", "recent"
→ Prioritize recent community discussions
```

## Reincidence Communication

### Invocation Pattern

**First attempt** (no reincidence):

```markdown
Call: /research-command "Angular hydration error"
```

**Second attempt** (with reincidence):

```markdown
Call: /research-command "Angular hydration error" --previous-terms="Angular SSR hydration error,hydration mismatch Angular 17" --failed-approaches="restart dev server,clear cache"
```

**Third attempt** (refined):

```markdown
Call: /research-command "Angular hydration error" --previous-terms="..." --failed-approaches="..." --context-refinement="Mac M1,Node 20,Angular 17.2,development mode"
```

### Response Pattern

Research command should communicate what it's doing differently:

```markdown
**Reincidence detected**: Previous search terms found, adjusting strategy.

**Skipping Level 1-2**: Already attempted, starting with broader pattern searches.

**Incorporating context**: Mac M1, Node 20, Angular 17.2, development mode

**Avoiding approaches**: restart dev server, clear cache

**Searching with variations**:

- Level 3: "Angular hydration issues SSR"
- Level 3: "server-side rendering hydration problems"
- Level 4: "client-server state mismatch patterns"
```

## Real-World Example

### Scenario: API Error Resolution

**First Attempt**:

```
Input: "Error: ECONNREFUSED connecting to API"
Strategy: Level 1 - Exact error message
Result: Generic solutions (restart, check network)
Outcome: Didn't solve problem
```

**Second Attempt (Reincidence)**:

```
Input: "Error: ECONNREFUSED connecting to API"
       --previous-terms="ECONNREFUSED,connection refused"
       --failed-approaches="restart server,check firewall"

Strategy: Level 3 - Pattern-based
Searches:
- "API connection issues development environment"
- "localhost API connection problems"
- "CORS proxy configuration"
Result: Found CORS configuration issue
Outcome: Problem solved
```

**Why it worked**:

- Skipped exact error searches (already failed)
- Broadened to environmental patterns
- Excluded failed solution types
- Found root cause (CORS) instead of symptoms

## Validation

### Research Command Reincidence Checklist

- [ ] Accepts --previous-terms parameter
- [ ] Accepts --failed-approaches parameter
- [ ] Accepts --context-refinement parameter
- [ ] Parses reincidence parameters correctly
- [ ] Skips failed search levels when detected
- [ ] Uses term variations instead of exact repeats
- [ ] Incorporates context refinement into searches
- [ ] Excludes failed approach patterns from results
- [ ] Communicates strategy adjustments
- [ ] Documents reincidence handling in command

### Testing Reincidence

**Test Case 1: Parameter Parsing**

- Input: Command with --previous-terms
- Expected: Parameters extracted correctly
- Verify: Command acknowledges reincidence

**Test Case 2: Level Skipping**

- Input: Reincidence with previous Level 1 terms
- Expected: Starts at Level 3
- Verify: Doesn't repeat Level 1 searches

**Test Case 3: Term Variation**

- Input: previous-terms="exact term"
- Expected: Uses variations, not exact term
- Verify: Different search formulations

**Test Case 4: Context Integration**

- Input: context-refinement="Node 20, Mac M1"
- Expected: All searches include context
- Verify: Context appears in search queries

**Test Case 5: Approach Exclusion**

- Input: failed-approaches="restart,clear cache"
- Expected: Results don't suggest these
- Verify: Alternative solutions provided

## Anti-Patterns

### Anti-Pattern 1: Ignoring Reincidence

```markdown
❌ Bad:
[Receives --previous-terms]
[Searches with same terms anyway]
```

**Problem**: Wastes time repeating failed searches

### Anti-Pattern 2: Not Communicating Strategy

```markdown
❌ Bad:
[Adjusts strategy silently]
[User doesn't know what changed]
```

**Problem**: User can't tell if reincidence is working

### Anti-Pattern 3: Insufficient Variation

```markdown
❌ Bad:
Failed: "Angular error"
Retry: "Angular errors" # Barely different
```

**Problem**: Too similar, likely same results

### Anti-Pattern 4: No Context Incorporation

```markdown
❌ Bad:
[Receives context-refinement="Node 20"]
[Searches without including Node 20]
```

**Problem**: Missing critical environmental context

## Best Practices

1. **Always acknowledge reincidence**: Tell user you detected it
2. **Explain strategy change**: Communicate what you're doing differently
3. **Use significant variations**: Don't just tweak wording
4. **Incorporate all context**: Use context-refinement in every search
5. **Document learnings**: Note what worked for future attempts
6. **Provide alternatives**: If searches still fail, suggest different approaches
7. **Know when to stop**: After 3-4 attempts, suggest human escalation or different strategy
