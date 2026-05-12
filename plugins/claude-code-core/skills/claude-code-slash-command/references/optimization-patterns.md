# Optimization Patterns

Performance optimization techniques for Claude Code commands.

## Optimization Goals

1. **Fast execution**: Minimize command runtime
2. **Efficient resource usage**: Minimize memory and disk I/O
3. **Good user experience**: Provide feedback, don't block unnecessarily
4. **Token efficiency**: Minimize context usage for commands

## Command Execution Optimization

### Batch Operations

**Problem**: Multiple individual file operations are slow

**Solution**: Batch file operations together

```markdown
❌ Slow:
For each file:
  Read file
  Process
  Write file

✅ Fast:
Read all files in parallel
Process all
Write all in parallel
```

**Implementation**:
```markdown
## Implementation Steps

1. **Collect file paths**: Use Glob once to get all files
2. **Parallel reads**: Read multiple files concurrently
3. **Process batch**: Process all content
4. **Parallel writes**: Write multiple files concurrently
```

### Conditional Execution

**Problem**: Running unnecessary operations

**Solution**: Check conditions before expensive operations

```markdown
❌ Wasteful:
Always run expensive operation
Then check if needed

✅ Efficient:
Check if needed first
If yes, run expensive operation
```

**Example**:
```markdown
## Installation Check

**Before installing dependencies**:
1. Check if already installed
2. Check if versions compatible
3. If all present and compatible, skip installation

**Then install** only if needed
```

### Caching Results

**Problem**: Repeating same operations multiple times

**Solution**: Cache results of expensive operations

```markdown
**Cache strategy**:
1. Check if result already computed
2. If cached and fresh, use cached result
3. If not cached or stale, compute
4. Store result for future use
```

**Example**:
```markdown
## Package Version Check

First check:
- Read package.json → Parse → Cache
- Use cached version for subsequent checks
- Only re-read if file modified
```

## File Operation Optimization

### Minimize File Reads

**Problem**: Reading files multiple times

**Solution**: Read once, process multiple times

```markdown
❌ Inefficient:
Read file for check A
Read same file for check B
Read same file for operation C

✅ Efficient:
Read file once
Perform check A on content
Perform check B on content
Perform operation C on content
```

### Smart Glob Patterns

**Problem**: Over-broad glob patterns find too many files

**Solution**: Use specific patterns to filter early

```markdown
❌ Slow:
Glob("**/*")  # Finds everything
Then filter for .ts files

✅ Fast:
Glob("**/*.ts")  # Finds only .ts files
```

### Incremental Processing

**Problem**: Processing large files or many files at once

**Solution**: Process incrementally with progress feedback

```markdown
## Large File Processing

1. **Estimate size/count** for progress tracking
2. **Process in chunks**:
   - Read chunk
   - Process chunk
   - Write chunk
   - Report progress
3. **Complete** when all chunks processed
```

## Search Optimization

### Targeted Grep

**Problem**: Searching entire codebase when subset sufficient

**Solution**: Limit search scope

```markdown
❌ Slow:
Grep(pattern, path=".")  # Searches everything

✅ Fast:
Grep(pattern, path="src", glob="*.ts")  # Specific location and type
```

### Early Termination

**Problem**: Continuing search after finding what's needed

**Solution**: Stop searching when sufficient results found

```markdown
**Search strategy**:
1. Search with head_limit for quick results
2. If sufficient results, stop
3. If insufficient, broaden search

Example:
Grep(pattern, head_limit=10)  # Stop after 10 matches
```

## Command Structure Optimization

### Progressive Disclosure

**Problem**: Loading all documentation at once

**Solution**: Load only what's needed when needed

```markdown
**Command structure**:

## Main Command Body
[Core instructions - always loaded]

## Detailed Documentation
[Detailed guide - reference when needed]

Load references/detailed-guide.md when:
- User explicitly requests details
- Error handling needs specifics
- Complex scenario encountered
```

### Token Reduction

**Problem**: Lengthy command files use excessive tokens

**Solution**: Apply concise writing, move content to references

```markdown
**Optimization techniques**:
1. Remove unnecessary words (target 30% reduction)
2. Use bullet points instead of prose
3. Move extensive examples to references/
4. Use tables for comparison data
5. Reference external docs instead of copying
```

**Before** (verbose):
```markdown
This command is designed to help you set up the testing infrastructure for your project. It will install the necessary dependencies and create configuration files.
```

**After** (concise):
```markdown
Sets up project testing: installs dependencies, creates configuration.
```

### Reference Structure

**Problem**: Single monolithic command file

**Solution**: Split into main command + references

```markdown
**Main command** (<500 lines):
- Task identification
- Core workflow steps
- Key decisions points

**References** (deep-dive):
- references/detailed-patterns.md
- references/advanced-examples.md
- references/troubleshooting.md
```

## Execution Flow Optimization

### Fail Fast

**Problem**: Continuing execution when prerequisites missing

**Solution**: Validate prerequisites first, fail immediately if missing

```markdown
## Prerequisites & Validation

**Check before execution**:
1. Required tools installed
2. Required files present
3. Required permissions available

**If any missing**:
- Report specific missing item
- Suggest resolution
- Exit immediately (don't waste time on doomed execution)
```

### Parallel Execution

**Problem**: Sequential execution when operations independent

**Solution**: Run independent operations in parallel

```markdown
❌ Sequential (slow):
Install dependencies
Run tests
Build project
# Total: sum of all times

✅ Parallel (fast):
In parallel:
  Install dependencies
  Run linter
  Build documentation
# Total: max of individual times
```

### Lazy Evaluation

**Problem**: Computing values that may not be needed

**Solution**: Compute only when actually used

```markdown
❌ Eager (wasteful):
expensive_value = compute_expensive_operation()
if condition:
  use(expensive_value)
# Computed even if condition false

✅ Lazy (efficient):
if condition:
  expensive_value = compute_expensive_operation()
  use(expensive_value)
# Only computed when needed
```

## User Experience Optimization

### Progress Feedback

**Problem**: Long-running operations with no feedback

**Solution**: Provide progress updates

```markdown
## Long Operation Pattern

For operations > 5 seconds:

1. **Start message**: "Installing dependencies..."
2. **Progress updates**: "Installed 10/50 packages..."
3. **Completion**: "✅ Installation complete (15.3s)"

For operations > 30 seconds:
- Provide estimated time remaining
- Show current step of multi-step process
```

### Incremental Results

**Problem**: No output until command fully completes

**Solution**: Show results as they become available

```markdown
## Search Results Pattern

Instead of:
- Search everything
- Then show all results

Do:
- Start search
- Show results as found
- Continue searching
- User sees progress immediately
```

### Error Recovery Speed

**Problem**: Slow error recovery process

**Solution**: Quick rollback and clear guidance

```markdown
## Fast Error Recovery

On error:
1. **Immediate rollback** (if changes made)
2. **Clear error message** (no debugging needed)
3. **Specific solution** (not generic advice)
4. **Quick retry** (if applicable)

User back to working state quickly
```

## Measurement and Monitoring

### Performance Metrics

**Track key metrics**:

```markdown
**Command execution**:
- Total execution time
- Time per major step
- Number of files processed
- Cache hit rate

**Resource usage**:
- Peak memory usage
- Disk I/O operations
- Network requests made
```

### Benchmark Common Operations

**Establish baselines**:

```markdown
**Typical performance**:
- Small project (<100 files): <5s
- Medium project (100-500 files): <15s
- Large project (>500 files): <60s

**If exceeding baseline**:
- Investigate bottlenecks
- Apply optimization patterns
- Consider splitting command
```

### Profiling Bottlenecks

**Identify slow operations**:

```markdown
## Performance Profiling

1. **Add timing logs** to major operations
2. **Run on representative workload**
3. **Identify slowest operations**
4. **Optimize bottlenecks first** (80/20 rule)
5. **Measure improvement**
6. **Iterate**
```

## Anti-Patterns

### Over-Optimization

```markdown
❌ Premature optimization:
Optimizing before measuring
Optimizing rare paths
Complex caching for 0.1s operations

✅ Measure first:
Profile to find bottlenecks
Optimize common paths
Target operations >1s
```

### Sacrificing Clarity

```markdown
❌ Unreadable but fast:
Complex optimizations
No comments
Hard to maintain

✅ Balance:
Clear, maintainable code
Optimize proven bottlenecks
Document optimizations
```

### Ignoring Caching

```markdown
❌ Repeated work:
Read same file 10 times
Recompute same values
Search same patterns

✅ Smart caching:
Read once, use many times
Cache computed values
Reuse search results
```

## Optimization Checklist

Before finalizing command:

- [ ] Validated prerequisites early (fail fast)
- [ ] Batched file operations where possible
- [ ] Used specific glob patterns (not **/*)
- [ ] Minimized file reads (read once, use many)
- [ ] Provided progress feedback for long operations
- [ ] Parallel execution for independent operations
- [ ] Command file <500 lines (moved to references)
- [ ] Removed unnecessary verbose text (30%+ reduction)
- [ ] Cached expensive computations
- [ ] Benchmarked on typical project size
- [ ] Optimized identified bottlenecks
- [ ] Documented performance expectations

## Performance Guidelines by Command Type

### Action/Development Commands

**Target**: <10s for typical operations

**Focus**:
- Fast prerequisite validation
- Efficient file operations
- Quick error recovery
- Progress feedback

### Research Commands

**Target**: <30s for comprehensive search

**Focus**:
- Progressive search (stop when sufficient)
- Parallel web requests
- Early result display
- Level-jumping optimization

### Creation/Meta Commands

**Target**: <5s for file creation

**Focus**:
- Minimal validation overhead
- Fast template loading
- Quick directory creation
- Immediate feedback
