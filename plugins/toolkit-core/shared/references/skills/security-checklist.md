# Security Checklist

Validate security before deploying skills.

## Least Privilege Access Control

Use minimal `allowed-tools` for skill requirements.

### Permission Patterns

**Read-only workflows**:

```yaml
allowed-tools:
  - Read
  - Grep
  - Glob
```

Use for: Analysis, research, auditing tasks

**Safe file operations** (no execution):

```yaml
allowed-tools:
  - Read
  - Write
  - Edit
```

Use for: Document processing, data transformation

**Research tasks**:

```yaml
allowed-tools:
  - WebSearch
  - WebFetch
  - Read
```

Use for: Information gathering, documentation lookup

**Full access** (omit `allowed-tools`):

- Requires user confirmation for each operation
- Use only when skill needs unrestricted capabilities

## Input Validation

Validate all user inputs before tool execution.

**Validation checklist**:

- Check parameter types match expected format
- Validate file paths (no directory traversal: `../`)
- Sanitize user-provided strings
- Verify file extensions match expected types
- Reject requests outside skill domain

**Example validation logic**:

```markdown
Before executing PDF rotation:

1. Verify file exists and has .pdf extension
2. Validate angle is numeric and in range [0, 360]
3. Check output path doesn't overwrite system files
4. Confirm file size within acceptable limits
```

## Credential Management

Never hardcode sensitive information.

**Prohibited**:

- API keys in SKILL.md or scripts
- Passwords in configuration files
- Access tokens in examples
- Database connection strings with credentials

**Required**:

- Reference environment variables: `$API_KEY`, `$DB_PASSWORD`
- Instruct to use secret management tools
- Document credential setup separately
- Use placeholder values in examples: `YOUR_API_KEY_HERE`

## Output Sanitization

Prevent data leakage in responses.

**Sanitization rules**:

- Don't echo sensitive user inputs verbatim
- Redact credentials from error messages
- Avoid exposing file system paths unnecessarily
- Filter out internal system information
- Truncate large outputs to prevent token exhaustion

**Example**:

```markdown
# Bad

Error: Failed to connect to database postgres://admin:P@ssw0rd@localhost/db

# Good

Error: Failed to connect to database (check credentials in .env file)
```

## Operating Limits

Define boundaries to prevent abuse.

**Recommended limits**:

```markdown
- Maximum API calls per activation: 10-20
- Maximum file operations: 5-10
- Maximum file size processing: 10MB (adjust by domain)
- Operation timeout: 30 seconds per task
- Maximum loop iterations: 100
```

**Implement circuit breakers**:

```markdown
If exceeding limits:

1. Stop execution immediately
2. Report limit exceeded with details
3. Suggest user intervention or parameter adjustment
```

## Script Security

For skills with bundled scripts.

**Script checklist**:

- Include error handling (don't punt to Claude)
- Validate all command-line arguments
- Use absolute paths or validated relative paths
- Avoid shell injection vulnerabilities
- Document all dependencies and versions
- Test with malicious inputs

**Shell injection prevention**:

```python
# Bad
os.system(f"convert {user_input}.pdf output.pdf")

# Good
import subprocess
subprocess.run(["convert", f"{validated_input}.pdf", "output.pdf"], check=True)
```

## Skill Activation Security

Prevent unintended activations.

**Description security**:

- Make domain-specific to reduce false positives
- Avoid overlapping with system/security-critical operations
- Test negative cases (shouldn't activate)

**Conflict prevention**:

- Don't overlap with other skills' domains
- Clearly document skill boundaries
- Test multi-skill scenarios for conflicts

## Audit Trail

Log skill operations for security monitoring.

**Logging recommendations**:

```markdown
Log (if applicable):

- Skill activation timestamp
- User request summary (sanitized)
- Tools called and parameters
- Success/failure outcome
- Error messages (sanitized)

Don't log:

- Raw user inputs containing credentials
- Full file contents
- Sensitive API responses
```

## Security Testing

Validate security before deployment.

**Test scenarios**:

1. **Input validation bypass**: Try directory traversal, SQL injection patterns
2. **Privilege escalation**: Attempt operations outside allowed-tools
3. **Resource exhaustion**: Submit requests exceeding operating limits
4. **Information disclosure**: Check if errors leak sensitive data
5. **Credential exposure**: Verify no credentials in outputs/logs

**Testing checklist**:

- Malicious file paths: `../../../etc/passwd`
- Oversized inputs: Files >100MB, strings >10k chars
- Special characters: `;`, `|`, `&`, `$()`, backticks
- Boundary values: 0, -1, MAX_INT, empty strings
- Rapid repeated requests: >100 in 1 second

## Compliance Considerations

Consider regulatory requirements.

**Data protection**:

- GDPR: Handle personal data appropriately
- PII: Detect and protect personally identifiable information
- Data retention: Document what data is stored/logged

**Access control**:

- Implement role-based access if applicable
- Audit who can modify/deploy skills
- Track skill usage and modifications

## Incident Response

Prepare for security issues.

**If vulnerability discovered**:

1. Immediately disable affected skill
2. Notify users/team
3. Document the vulnerability
4. Develop and test fix
5. Deploy patched version
6. Review other skills for similar issues

## Security Review Schedule

Regular security audits.

**Recommended schedule**:

- Initial deployment: Full security checklist
- Monthly: Review activation logs for anomalies
- Quarterly: Re-test with updated threat scenarios
- After incidents: Comprehensive security audit

## Quick Validation

Before deploying, verify:

- [ ] Used minimal `allowed-tools`
- [ ] No hardcoded credentials
- [ ] Input validation implemented
- [ ] Output sanitization applied
- [ ] Operating limits defined
- [ ] Scripts have error handling
- [ ] Activation description specific (reduces false positives)
- [ ] Tested with malicious inputs
- [ ] Logging doesn't expose sensitive data
- [ ] Team reviewed security considerations
