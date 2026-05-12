# Tool Security Reference

Security guidelines for configuring agent allowed-tools permissions.

## Security Principle: Minimal Necessary Permissions

**Rule**: Grant only tools required for agent's specific function.

## Tool Categories by Risk Level

### Always Safe (Read-Only)
- `Read` - Read any file
- `Grep` - Search file contents
- `Glob` - Find files by pattern
- `LS` - List directory contents

**Use when**: Agent needs to analyze, research, or review code

### Coordination Tools
- `TodoWrite` - Manage task lists

**Use when**: Agent orchestrates workflows or manages tasks

### File Modification (Moderate Risk)
- `Edit` - Edit existing files
- `Write` - Create new files
- `MultiEdit` - Edit multiple files
- `NotebookEdit` - Edit Jupyter notebooks

**Use when**: Agent implements changes, creates code/docs

**Security checks**:
- Validate file paths
- Avoid overwriting critical files
- Check context detection for Write

### System Commands (High Risk)
- `Bash([specific-command])` - Restricted shell commands

**Format**: `Bash(command pattern)`

**Examples**:
- ✅ `Bash(npm *)` - NPM commands only
- ✅ `Bash(git status)` - Specific git command
- ✅ `Bash(ng generate *)` - Angular CLI generators
- ❌ `Bash` - Unrestricted access (NEVER)
- ❌ `Bash(*)` - Wildcard access (NEVER)

**Use when**: Agent needs specific development tools

**Security checks**:
- Use specific command patterns
- Avoid destructive commands
- Never grant unrestricted Bash

### External Access (Critical Risk)
- `WebSearch` - Search the web
- `WebFetch` - Fetch web content

**RESTRICTION**: WebSearch ONLY for research-specialist

**All other agents**: Delegate to research-specialist

**Use when**: ONLY if agent is research-specialist

## Tool Permission Patterns by Agent Type

### Technical Development Agents

**Example**: Angular/React/NestJS developer

```yaml
tools: Read, Edit, MultiEdit, Bash(npm *), Bash(ng *), Grep, Glob, LS
```

**Rationale**:
- Read/Edit/MultiEdit: Implement features
- Bash(npm *): Package management
- Bash(ng *): Framework CLI tools
- Grep/Glob/LS: Code navigation

**NOT granted**:
- WebSearch: Delegate to research-specialist
- Unrestricted Bash: Security risk
- Write: Use Edit for existing files

### Cross-Domain Specialists

**Example**: Security, DevOps, Quality

```yaml
tools: Read, Grep, Glob, TodoWrite
```

**Rationale**:
- Read-only analysis and recommendations
- TodoWrite for task coordination
- No modification permissions

**NOT granted**:
- File modification: Recommendations only
- Bash: Analysis role, not execution

### Orchestration Agents

**Example**: research-specialist, claude-code-specialist

```yaml
tools: Read, Grep, Glob, TodoWrite, WebSearch
```

**Rationale**:
- Coordination and research
- WebSearch for research-specialist ONLY
- No direct modifications

**Special case**:
- WebSearch: research-specialist ONLY

### Read-Only Analysts

**Example**: code-reviewer, performance-analyzer

```yaml
tools: Read, Grep, Glob
```

**Rationale**:
- Pure analysis role
- No modifications or coordination
- Maximum security

## Dangerous Patterns to AVOID

### ❌ Unrestricted Bash
```yaml
tools: Read, Write, Bash
```
**Problem**: Full shell access, can run any command

**Fix**: Use specific patterns
```yaml
tools: Read, Write, Bash(npm install *), Bash(git status)
```

### ❌ WebSearch for Non-Research Agents
```yaml
name: angular-developer
tools: Read, Edit, WebSearch
```
**Problem**: WebSearch should only be for research-specialist

**Fix**: Delegate instead
```markdown
## Research Integration

When current information needed:
- Delegate to research-specialist
- Provide: technology stack, error details
- Fallback: Use known best practices
```

### ❌ Excessive Permissions
```yaml
tools: Read, Write, Edit, MultiEdit, Bash, WebSearch, TodoWrite, Grep, Glob, LS, NotebookEdit
```
**Problem**: Violates minimal permission principle

**Fix**: Grant only what's needed
```yaml
tools: Read, Edit, Grep, Glob
```

### ❌ Write Without Context Detection
```yaml
tools: Write, Edit
# No context detection section in agent
```
**Problem**: May create files in wrong locations

**Fix**: Add context detection if using Write
```markdown
## File Operations

Before creating files:
1. Use Glob("**/.claude") to detect project structure
2. Determine appropriate location
3. Create with full path
4. Provide feedback about location
```

## Security Validation Checklist

### Before Granting Tools

- [ ] Each tool has clear justification
- [ ] Minimal set for agent's function
- [ ] No unrestricted Bash access
- [ ] WebSearch only for research-specialist
- [ ] File modification tools justified
- [ ] Bash commands are specific patterns

### Bash Command Patterns

- [ ] Uses specific command prefix: `Bash(npm *)`
- [ ] No wildcards at root: `Bash(*)`
- [ ] No dangerous commands: `Bash(rm -rf *)`
- [ ] Commands match agent's domain
- [ ] Fallback behavior if command fails

### WebSearch Restrictions

- [ ] Only granted to research-specialist
- [ ] Other agents have delegation pattern
- [ ] Fallback when research unavailable
- [ ] Clear delegation protocol

### File Operations

- [ ] Write tool has context detection
- [ ] Edit used for existing files
- [ ] File paths validated
- [ ] No critical file modifications
- [ ] Proper error handling

## Tool Permission Examples

### Example 1: NestJS Developer
```yaml
name: nestjs-developer
tools: Read, Edit, MultiEdit, Bash(npm *), Bash(nest *), Bash(npx *), Grep, Glob, LS
```

**Analysis**:
- ✅ Read/Edit/MultiEdit: Feature implementation
- ✅ Bash(npm *): Package management
- ✅ Bash(nest *): NestJS CLI
- ✅ Bash(npx *): Tool execution
- ✅ Grep/Glob/LS: Code navigation
- ✅ NO WebSearch: Delegates to research-specialist

### Example 2: Security Engineer
```yaml
name: security-engineer
tools: Read, Grep, Glob, TodoWrite
```

**Analysis**:
- ✅ Read-only analysis
- ✅ TodoWrite for security tasks
- ✅ NO modifications: Recommendations only
- ✅ NO Bash: Analysis role
- ✅ NO WebSearch: Delegates to research-specialist

### Example 3: Research Specialist
```yaml
name: research-specialist
tools: WebSearch, Read, Grep, Glob
```

**Analysis**:
- ✅ WebSearch: ONLY agent with this permission
- ✅ Read/Grep/Glob: Research and analysis
- ✅ NO modifications: Research only
- ✅ NO Bash: Research role

### Example 4: Code Reviewer
```yaml
name: code-reviewer
tools: Read, Grep, Glob
```

**Analysis**:
- ✅ Pure read-only
- ✅ NO modifications: Review only
- ✅ NO TodoWrite: Not coordination role
- ✅ NO WebSearch: Delegates if needed

## Testing Tool Permissions

### Security Test Scenarios

1. **Attempt unauthorized operation**
   - Agent tries to use tool not in allowed-tools
   - Expected: Blocked by system

2. **Bash command restriction**
   - Agent tries `Bash(rm -rf *)` when only `Bash(npm *)` allowed
   - Expected: Blocked

3. **WebSearch delegation**
   - Non-research agent needs current info
   - Expected: Delegates to research-specialist

4. **File modification validation**
   - Agent uses Write tool
   - Expected: Has context detection section

### Permission Audit Process

1. List all tools in allowed-tools
2. Justify each tool for agent's function
3. Check for overly permissive patterns
4. Verify Bash restrictions are specific
5. Confirm WebSearch only for research-specialist
6. Validate no unrestricted access

## Common Fixes

### Over-Permissioned Agent

**Before**:
```yaml
tools: Read, Write, Edit, Bash, WebSearch, TodoWrite
```

**After**:
```yaml
tools: Read, Edit, Grep, Glob
# Removed: Write (use Edit), Bash (not needed), WebSearch (delegate), TodoWrite (not coordinator)
```

### Missing Bash Restrictions

**Before**:
```yaml
tools: Read, Edit, Bash
```

**After**:
```yaml
tools: Read, Edit, Bash(npm *), Bash(ng generate *)
```

### WebSearch Misuse

**Before**:
```yaml
name: angular-developer
tools: Read, Edit, WebSearch
```

**After**:
```yaml
name: angular-developer
tools: Read, Edit, Grep, Glob
# Added delegation section in agent body for research needs
```
