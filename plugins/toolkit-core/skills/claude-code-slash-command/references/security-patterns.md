# Security Patterns

Security guidelines for Claude Code command `allowed-tools` and safe operations.

## Principle of Least Privilege

**Core rule**: Grant minimum permissions required for command functionality.

### Evaluation Process

For each command, ask:

1. What tools does this command **absolutely need**?
2. Can tool permissions be **further restricted**?
3. Are there **safer alternatives** to achieve the same goal?

## Tool Permission Patterns

### Read-Only Pattern

**Use for**: Research commands, analysis, validation

```yaml
allowed-tools:
  - Read
  - Grep
  - Glob
```

**Can**:

- Read any files
- Search file contents
- Find files by pattern

**Cannot**:

- Modify files
- Execute commands
- Access web

### File Operations Pattern

**Use for**: File generation, updates, refactoring

```yaml
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
```

**Can**:

- Read and analyze files
- Create new files
- Modify existing files
- Search and find files

**Cannot**:

- Execute shell commands
- Access network
- Modify system settings

### Development Pattern

**Use for**: Development tasks, build operations, git workflow

```yaml
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(npm *)
  - Bash(git *)
  - Bash(ng *)
  - Glob
  - Grep
```

**Key**: Restrict Bash to specific command prefixes

**Can**:

- File operations
- Run npm commands
- Execute git commands
- Run Angular CLI

**Cannot**:

- Execute arbitrary bash commands
- Modify system files outside project
- Access network directly (use research integration)

### Restricted Bash Pattern

**Use for**: Commands needing specific system operations

```yaml
allowed-tools:
  - Bash(npm install *)
  - Bash(npm run test)
  - Bash(git status)
  - Bash(git add *)
  - Bash(git commit *)
```

**Best practice**: List exact commands or prefixes, never `Bash` alone

**Example restrictions**:

- `Bash(npm install *)` - Can install packages, nothing else
- `Bash(git status)` - Can only check status, not modify
- `Bash(npm run *)` - Can run any npm script (evaluate if too broad)

## Security Validation Checklist

### Input Validation

- [ ] All user inputs are validated before use
- [ ] Path parameters checked for directory traversal
- [ ] Command parameters sanitized
- [ ] File names validated against malicious patterns
- [ ] Arguments length-checked to prevent overflow

### Safe File Operations

- [ ] File paths are absolute or properly resolved
- [ ] Check file existence before operations
- [ ] Validate file permissions before writes
- [ ] Never overwrite without confirmation or backup
- [ ] Implement rollback for destructive operations

### Command Execution Safety

- [ ] No string interpolation in bash commands
- [ ] Use parameter arrays instead of string concatenation
- [ ] Validate command outputs before using
- [ ] Set timeouts for long-running operations
- [ ] Implement error handling for all executions

### Data Protection

- [ ] Never log sensitive information (tokens, passwords, keys)
- [ ] Sanitize outputs before displaying
- [ ] Don't expose internal paths unnecessarily
- [ ] Validate external input thoroughly
- [ ] Respect .gitignore and .claudeignore

## Common Security Issues

### Shell Injection

**Vulnerable**:

```markdown
Run: `bash -c "npm install ${packageName}"`
```

**Why**: `packageName` could contain `; rm -rf /`

**Secure**:

```yaml
allowed-tools:
  - Bash(npm install *)
```

Then: `npm install ${packageName}` (restricted to npm install prefix)

### Path Traversal

**Vulnerable**:

```markdown
Write to: `${userPath}/config.json`
```

**Why**: `userPath` could be `../../../../etc/passwd`

**Secure**:

```markdown
1. Validate userPath contains no ../
2. Resolve to absolute path
3. Verify path is within project directory
4. Then write file
```

### Overwrite Without Backup

**Vulnerable**:

```markdown
Write file to ${existingFile}
```

**Why**: Could destroy important data

**Secure**:

```markdown
1. Check if file exists
2. If exists, ask user confirmation or create backup
3. Implement rollback procedure
4. Then write file
```

### Unrestricted Tool Access

**Vulnerable**:

```yaml
allowed-tools:
  - Bash
  - Write
```

**Why**: Can execute any bash command, write anywhere

**Secure**:

```yaml
allowed-tools:
  - Bash(npm *)
  - Bash(git status)
  - Write
  - Read
  - Glob
```

Plus: Validate write paths

## Tool Permission Matrix

### Bash Restrictions

| Pattern             | Risk Level  | Use Case                    |
| ------------------- | ----------- | --------------------------- |
| `Bash`              | 🔴 Critical | NEVER - unrestricted access |
| `Bash(npm *)`       | 🟡 Medium   | Package operations          |
| `Bash(git *)`       | 🟡 Medium   | Version control             |
| `Bash(npm install)` | 🟢 Low      | Specific install only       |
| `Bash(git status)`  | 🟢 Low      | Read-only git info          |

### File Operation Risks

| Tool         | Risk               | Mitigation                         |
| ------------ | ------------------ | ---------------------------------- |
| `Write`      | Overwrite files    | Validate paths, backup, confirm    |
| `Edit`       | Modify incorrectly | Validate old_string exists once    |
| `MultiEdit`  | Batch errors       | Validate all edits before applying |
| `Bash(rm *)` | Data loss          | AVOID - use Edit/Write instead     |

## Domain-Specific Patterns

### Angular Commands

```yaml
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(ng *)
  - Bash(npm install *)
  - Bash(npm run *)
  - Glob
  - Grep
```

Rationale:

- `ng *` for Angular CLI operations
- `npm install *` for dependency management
- `npm run *` for scripts (validate if too broad for specific use)
- File tools for component generation

### Testing Commands

```yaml
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash(npm test)
  - Bash(npm run test:*)
  - Bash(jest *)
  - Glob
  - Grep
```

Rationale:

- Specific test commands only
- File tools for test file generation
- No arbitrary bash access

### Build Commands

```yaml
allowed-tools:
  - Read
  - Bash(npm run build)
  - Bash(npm run build:*)
  - Bash(webpack *)
  - Glob
  - Grep
```

Rationale:

- Build commands only (no Write - builds are reproducible)
- Analysis tools to inspect results
- No file modifications

### Git Workflow Commands

```yaml
allowed-tools:
  - Read
  - Bash(git status)
  - Bash(git add *)
  - Bash(git commit *)
  - Bash(git diff *)
  - Bash(git log *)
  - Grep
  - Glob
```

Rationale:

- Common git operations
- No push/pull (could be destructive)
- No reset/rebase (explicitly request if needed)
- Read for analyzing files before commit

## Security Audit Questions

Before finalizing allowed-tools:

1. **Necessity**: Is each tool truly required?
2. **Alternatives**: Can we use safer tool?
3. **Restrictions**: Can Bash be restricted further?
4. **Validation**: Do we validate all inputs?
5. **Rollback**: Can we undo destructive operations?
6. **Exposure**: Do we expose sensitive information?
7. **Boundaries**: Do we respect project boundaries?
8. **Documentation**: Are security implications documented?

## Testing Security

### Test Scenarios

**Path traversal test**:

```
Input: ../../../../etc/passwd
Expected: Validation error, operation blocked
```

**Shell injection test**:

```
Input: package; rm -rf /
Expected: Restricted to allowed command prefix
```

**Overwrite test**:

```
Input: Write to existing critical file
Expected: Backup created or confirmation requested
```

**Privilege escalation test**:

```
Input: Bash command outside allowed prefixes
Expected: Tool permission error
```

## Security Updates

As security best practices evolve:

1. **Review quarterly**: Audit allowed-tools for all commands
2. **Update patterns**: Apply new security patterns
3. **Test regressions**: Ensure updates don't break functionality
4. **Document changes**: Record security improvements
5. **Notify users**: If breaking changes required for security
