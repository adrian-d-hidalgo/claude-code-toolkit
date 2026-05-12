# Context Detection

Implementation patterns for detecting and respecting project structure before file operations.

## Why Context Detection Matters

**Problem**: Commands that create files without checking location can:

- Create files in wrong directory
- Pollute root directory
- Miss existing project structure
- Break user's organization system

**Solution**: Always detect context first, then create files in appropriate location.

## Context Detection Protocol

### Step 1: Detect .claude/ Directory

```bash
# Check for project-specific .claude/ directory
Glob("**/.claude", path=current_working_directory)
```

**Outcomes**:

- **Found**: Use project-specific .claude/commands/
- **Not found**: Use global ~/.claude/commands/
- **Multiple found**: Use closest to current working directory

### Step 2: Verify Directory Structure

```bash
# Check if commands directory exists
Glob(".claude/commands/**")
```

**Outcomes**:

- **Exists**: Use existing structure
- **Not exists**: Create structure first

### Step 3: Determine Category

Based on command type:

**Action/Development commands**:

- `.claude/commands/core/` - Meta-operations
- `.claude/commands/development/` - Development tasks
- `.claude/commands/[technology]/` - Tech-specific (angular, react, etc.)

**Research commands**:

- `.claude/commands/research/development/` - Technical research
- `.claude/commands/research/business/` - Business research
- `.claude/commands/research/general/` - General information

### Step 4: Create Directory Structure

If directories don't exist:

```bash
# Create necessary directories
mkdir -p .claude/commands/[category]/[subcategory]
```

**Safety checks**:

- Verify parent directory exists
- Check write permissions
- Handle creation errors gracefully

### Step 5: Create File & Provide Feedback

```bash
# Create command file
Write(.claude/commands/[category]/[subcategory]/[name].md, content)

# Provide clear feedback
Output: "Created command at .claude/commands/[category]/[subcategory]/[name].md"
```

## Implementation Template

### For Creation Commands

````markdown
## Context Detection Implementation

**Before creating any files**:

1. **Detect .claude/ directory**:
   ```bash
   Use Glob("**/.claude") to find project structure
   ```
````

2. **Verify commands directory**:

   ```bash
   Use Glob(".claude/commands/**") to check existing structure
   ```

3. **Create directory structure if needed**:

   ```bash
   Create .claude/commands/[category]/ if missing
   ```

4. **Determine appropriate category**:
   - Based on command type (action vs research)
   - Based on technology/domain
   - Based on purpose (core/development/research)

5. **Create file in correct location**:

   ```bash
   .claude/commands/[category]/[subcategory]/[command-name].md
   ```

6. **Provide clear feedback about file location**:
   ```
   "Created [type] command at [full-path]"
   ```

**Never create files in root directory unless explicitly intended.**

````

### For Validation Commands

```markdown
## Context Detection Validation

**Check that creation commands implement**:

1. **Directory detection logic**:
   - [ ] Uses Glob to find .claude/
   - [ ] Handles missing directories
   - [ ] Creates structure as needed

2. **Proper file placement**:
   - [ ] Determines correct category
   - [ ] Creates in appropriate subdirectory
   - [ ] Avoids root directory creation

3. **User feedback**:
   - [ ] Reports file location clearly
   - [ ] Confirms successful creation
   - [ ] Explains directory structure choice
````

## Real-World Examples

### Example 1: create-component Command

**Scenario**: Creating Angular component generation command

**Context Detection**:

1. Detect .claude/ → Found at project root
2. Check .claude/commands/ → Exists
3. Determine category → development/angular/
4. Check if category exists → No
5. Create directory → `.claude/commands/development/angular/`
6. Create file → `.claude/commands/development/angular/create-component.md`
7. Feedback → "Created Angular component command at .claude/commands/development/angular/create-component.md"

### Example 2: api-documentation Command

**Scenario**: Creating API documentation research command

**Context Detection**:

1. Detect .claude/ → Found at project root
2. Check .claude/commands/research/ → Exists
3. Determine domain → research/development/
4. Check if domain exists → Yes
5. Create file → `.claude/commands/research/development/api-documentation.md`
6. Feedback → "Created research command at .claude/commands/research/development/api-documentation.md"

### Example 3: Global Command (No Project Context)

**Scenario**: User in directory without .claude/

**Context Detection**:

1. Detect .claude/ → Not found in project
2. Check global ~/.claude/commands/ → Exists
3. Determine category → development/
4. Create file → `~/.claude/commands/development/[name].md`
5. Feedback → "Created global command at ~/.claude/commands/development/[name].md (no project .claude/ found)"

## Directory Structure Standards

### Project-Specific Structure

```
project-root/
├── .claude/
│   └── commands/
│       ├── core/                    # Meta-operations
│       │   └── commands/            # Command management
│       ├── development/             # Development tasks
│       │   ├── angular/            # Angular-specific
│       │   ├── testing/            # Testing-specific
│       │   └── build/              # Build-specific
│       └── research/                # Research commands
│           ├── development/        # Technical research
│           ├── business/           # Business research
│           └── general/            # General research
```

### Global Structure

```
~/.claude/
└── commands/
    ├── core/                    # Meta-operations
    ├── development/             # Development tasks
    │   └── [technology]/       # Technology-specific
    └── research/                # Research commands
        ├── development/        # Technical research
        ├── business/           # Business research
        └── general/            # General research
```

## Error Handling

### Missing .claude/ Directory

**Detection**:

```bash
Glob("**/.claude") returns empty
```

**Options**:

1. **Use global**: Default to ~/.claude/commands/
2. **Ask user**: "No .claude/ found. Create in current project or use global?"
3. **Create project**: Create .claude/commands/ in current directory

**Recommendation**: Default to global with informative message

### Permission Issues

**Detection**:

```bash
mkdir fails or Write fails with permission error
```

**Handling**:

1. Report specific error
2. Suggest permission fix: `chmod`
3. Offer alternative location if available
4. Provide manual creation instructions

### Multiple .claude/ Directories

**Detection**:

```bash
Glob("**/.claude") returns multiple results
```

**Resolution**:

1. Use closest to current working directory
2. If ambiguous, prefer parent over deeper nested
3. Report choice to user: "Found multiple .claude/ directories, using [chosen]"

## Validation Checklist

Before merging/approving creation command:

- [ ] Implements Glob to detect .claude/
- [ ] Handles missing .claude/ gracefully
- [ ] Creates directory structure as needed
- [ ] Determines correct category automatically
- [ ] Never creates files in root unless explicitly for root
- [ ] Provides clear feedback about file location
- [ ] Documents context detection in command file
- [ ] Tests with and without existing .claude/
- [ ] Tests with missing subdirectories
- [ ] Tests with permission issues

## Common Mistakes

### Mistake 1: Assuming Structure Exists

```markdown
❌ Bad:
Write(.claude/commands/development/command.md, content)
```

**Problem**: Fails if .claude/commands/development/ doesn't exist

```markdown
✅ Good:

1. Detect .claude/
2. Check .claude/commands/development/
3. Create directory if needed
4. Write file
```

### Mistake 2: Hardcoded Paths

```markdown
❌ Bad:
Write(~/.claude/commands/command.md, content)
```

**Problem**: Ignores project-specific .claude/

```markdown
✅ Good:

1. Detect .claude/ (project or global)
2. Use detected location
3. Write file to detected location
```

### Mistake 3: No User Feedback

```markdown
❌ Bad:
Write([detected-path]/command.md, content)
[No output]
```

**Problem**: User doesn't know where file was created

```markdown
✅ Good:
Write([detected-path]/command.md, content)
Output: "Created command at [detected-path]/command.md"
```

### Mistake 4: Creating in Root Directory

```markdown
❌ Bad:
Write(./command.md, content)
```

**Problem**: Pollutes project root or arbitrary directory

```markdown
✅ Good:
Write(.claude/commands/[category]/command.md, content)
```

## Testing Context Detection

### Test Scenarios

**Scenario 1: Fresh Project**

- Given: Project with no .claude/
- When: Create command
- Then: Should create .claude/commands/[category]/ and file
- Verify: Directory structure created correctly

**Scenario 2: Existing Structure**

- Given: Project with .claude/commands/
- When: Create command
- Then: Should use existing structure
- Verify: No duplicate directories

**Scenario 3: Global Fallback**

- Given: No project .claude/, global ~/.claude/ exists
- When: Create command
- Then: Should use global ~/.claude/commands/
- Verify: File in global location

**Scenario 4: No .claude/ Anywhere**

- Given: No .claude/ in project or global
- When: Create command
- Then: Should create structure in appropriate location
- Verify: Structure created with proper permissions

**Scenario 5: Permission Denied**

- Given: .claude/ exists but no write permission
- When: Create command
- Then: Should report error clearly with resolution steps
- Verify: Helpful error message provided
