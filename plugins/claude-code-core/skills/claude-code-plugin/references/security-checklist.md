# Security Checklist

Comprehensive security validation for Claude Code plugins and MCP servers.

## Plugin Security

### Configuration Security

- [ ] **No hardcoded secrets** in plugin.json
- [ ] **Environment variables** used for all credentials
- [ ] **${VARIABLE}** syntax used correctly
- [ ] **.env files** in .gitignore
- [ ] **.env.example** provided with dummy values
- [ ] **Minimal permissions** in allowed-tools (if creating skill)
- [ ] **No wildcard permissions** unless necessary

### File Security

- [ ] **No sensitive data** in committed files
- [ ] **Proper file permissions** on scripts (chmod 755 for executables)
- [ ] **No world-writable files**
- [ ] **.gitignore** includes: .env, _.key, _.pem, secrets/, credentials.json

### Documentation Security

- [ ] **README** clearly states required credentials
- [ ] **Installation guide** mentions security best practices
- [ ] **Environment variables** documented with purpose
- [ ] **No example keys** that could be real
- [ ] **Security warnings** for production deployment

## MCP Server Security

### Input Validation

- [ ] **All user inputs validated** before processing
- [ ] **Length limits** enforced on string inputs
- [ ] **Type checking** for all parameters
- [ ] **Pattern matching** for structured inputs (email, URL, etc.)
- [ ] **Whitelist validation** over blacklist when possible
- [ ] **SQL injection prevention** in database queries
- [ ] **Command injection prevention** in shell commands
- [ ] **Path traversal prevention** in file operations

**Example validation**:

```python
def validate_input(user_input: str, max_length: int = 1000) -> str:
    # Length check
    if len(user_input) > max_length:
        raise ValueError(f"Input exceeds maximum length of {max_length}")

    # Pattern check (alphanumeric, spaces, basic punctuation)
    if not re.match(r'^[a-zA-Z0-9\s\-_.@]+$', user_input):
        raise ValueError("Input contains invalid characters")

    return user_input
```

### Authentication & Authorization

- [ ] **API keys** never hardcoded
- [ ] **Credentials** loaded from environment
- [ ] **Access control** implemented for sensitive operations
- [ ] **User permissions** checked before execution
- [ ] **Rate limiting** prevents abuse
- [ ] **Session management** if applicable
- [ ] **Token expiration** enforced

### Secret Management

- [ ] **Environment variables** for all secrets
- [ ] **Never log secrets** in application logs
- [ ] **Encryption at rest** for stored sensitive data
- [ ] **Secure transmission** (HTTPS/TLS) for API calls
- [ ] **Secret rotation** strategy documented
- [ ] **No secrets in error messages**

**Example secret handling**:

```python
import os
from cryptography.fernet import Fernet

# Load from environment only
API_KEY = os.getenv("API_KEY")
if not API_KEY:
    raise ValueError("API_KEY environment variable required")

# Never log the actual key
logger.info("API key loaded successfully")  # ✓ Good
logger.info(f"API key: {API_KEY}")         # ✗ BAD!

# Encrypt sensitive data at rest
encryption_key = os.getenv("ENCRYPTION_KEY").encode()
cipher = Fernet(encryption_key)
encrypted = cipher.encrypt(sensitive_data.encode())
```

### Data Security

- [ ] **Sensitive data** encrypted at rest
- [ ] **Sensitive data** encrypted in transit
- [ ] **PII data** handled according to regulations (GDPR, CCPA)
- [ ] **Data retention** policies documented
- [ ] **Secure deletion** of sensitive data
- [ ] **No sensitive data** in logs
- [ ] **Database credentials** properly secured

### Error Handling

- [ ] **No sensitive info** in error messages
- [ ] **Generic errors** shown to users
- [ ] **Detailed errors** only in logs
- [ ] **Stack traces** not exposed to users
- [ ] **Graceful degradation** on errors
- [ ] **Error logging** doesn't include secrets

**Example error handling**:

```python
try:
    result = process_with_api_key(API_KEY, data)
except APIError as e:
    # Log detailed error (server-side only)
    logger.error(f"API call failed: {e}", exc_info=True)

    # Return generic error to user
    raise McpError(
        ErrorCode.InternalError,
        "External service unavailable. Please try again later."
    )
```

### Network Security

- [ ] **HTTPS** used for all external connections
- [ ] **TLS verification** not disabled
- [ ] **Certificate validation** enforced
- [ ] **Timeout settings** prevent hanging connections
- [ ] **Connection pooling** configured securely
- [ ] **Firewall rules** documented
- [ ] **Port restrictions** documented

### Dependency Security

- [ ] **Dependencies** up to date
- [ ] **Known vulnerabilities** resolved
- [ ] **Dependency scanning** in CI/CD
- [ ] **Package integrity** verified (checksums)
- [ ] **Minimal dependencies** used
- [ ] **Trusted sources** only

**Scan for vulnerabilities**:

```bash
# Python
pip install safety
safety check

# TypeScript
npm audit
npm audit fix

# .NET
dotnet list package --vulnerable
```

### Code Security

- [ ] **No eval()** or exec() with user input
- [ ] **No dangerous functions** (pickle with untrusted data)
- [ ] **No shell=True** in subprocess calls with user input
- [ ] **Parameterized queries** for database operations
- [ ] **File operations** restricted to allowed paths
- [ ] **Code review** performed
- [ ] **Static analysis** tools used

**Unsafe patterns to avoid**:

```python
# ✗ BAD: SQL injection risk
query = f"SELECT * FROM users WHERE name = '{user_input}'"

# ✓ GOOD: Parameterized query
query = "SELECT * FROM users WHERE name = ?"
cursor.execute(query, (user_input,))

# ✗ BAD: Command injection risk
os.system(f"ls {user_input}")

# ✓ GOOD: Safe subprocess usage
subprocess.run(["ls", user_input], shell=False)

# ✗ BAD: Arbitrary code execution
eval(user_input)

# ✓ GOOD: Parse and validate
parsed = json.loads(user_input)  # Only if expecting JSON
```

### Rate Limiting

- [ ] **Per-user rate limits** implemented
- [ ] **Per-endpoint rate limits** configured
- [ ] **Burst protection** in place
- [ ] **Rate limit errors** handled gracefully
- [ ] **Backoff strategy** documented

**Example rate limiter**:

```python
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self, max_calls=10, window=60):
        self.max_calls = max_calls
        self.window = window
        self.calls = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        self.calls[key] = [t for t in self.calls[key] if now - t < self.window]

        if len(self.calls[key]) >= self.max_calls:
            return False

        self.calls[key].append(now)
        return True

limiter = RateLimiter(max_calls=10, window=60)

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    user_id = get_user_id()

    if not limiter.is_allowed(user_id):
        raise McpError(
            ErrorCode.InternalError,
            "Rate limit exceeded. Please try again in a moment."
        )

    # Process request
```

### Logging Security

- [ ] **No secrets** in logs
- [ ] **No PII** in logs (or anonymized)
- [ ] **Log level** appropriately set
- [ ] **Log rotation** configured
- [ ] **Log retention** policy defined
- [ ] **Logs protected** from unauthorized access

**Safe logging**:

```python
import logging

logger = logging.getLogger(__name__)

# ✗ BAD: Logging sensitive data
logger.info(f"User {user_id} logged in with password {password}")

# ✓ GOOD: Logging without sensitive data
logger.info(f"User {user_id} logged in successfully")

# ✗ BAD: Logging API keys
logger.debug(f"API request: {api_key}")

# ✓ GOOD: Logging without keys
logger.debug(f"API request initiated")
```

## Deployment Security

### Pre-Deployment

- [ ] **Security audit** completed
- [ ] **Vulnerability scan** passed
- [ ] **Code review** approved
- [ ] **Test coverage** includes security tests
- [ ] **Documentation** reviewed for security info leaks

### Production Environment

- [ ] **Environment variables** set in production
- [ ] **Debug mode** disabled
- [ ] **Verbose logging** disabled
- [ ] **HTTPS** enforced
- [ ] **Firewall** configured
- [ ] **Monitoring** in place
- [ ] **Alerting** configured for security events

### Secrets in Production

- [ ] **Secret management system** used (AWS Secrets Manager, etc.)
- [ ] **Secrets rotation** automated
- [ ] **Access logging** enabled
- [ ] **Least privilege** access to secrets
- [ ] **Backup secrets** secured

## Compliance

### GDPR (if handling EU user data)

- [ ] **Data minimization** practiced
- [ ] **User consent** obtained
- [ ] **Right to erasure** implemented
- [ ] **Data portability** supported
- [ ] **Privacy policy** published

### HIPAA (if handling health data)

- [ ] **Encryption** at rest and in transit
- [ ] **Access controls** implemented
- [ ] **Audit logging** enabled
- [ ] **BAA** in place with third parties

### SOC 2

- [ ] **Access controls** documented
- [ ] **Change management** process
- [ ] **Incident response** plan
- [ ] **Monitoring and logging** in place

## Security Testing

### Manual Testing

- [ ] **Input validation** tested with malicious inputs
- [ ] **Authentication bypass** attempted
- [ ] **Authorization tested** for privilege escalation
- [ ] **Error handling** tested for info disclosure
- [ ] **Rate limiting** tested for bypass

### Automated Testing

- [ ] **SAST** (Static Application Security Testing) tools run
- [ ] **Dependency scanning** automated
- [ ] **Secret scanning** in CI/CD
- [ ] **Security tests** in test suite

**Example security test**:

```python
@pytest.mark.asyncio
async def test_sql_injection_prevention():
    """Test that SQL injection is prevented."""
    malicious_input = "'; DROP TABLE users; --"

    with pytest.raises(McpError):
        await server.call_tool(
            "search_users",
            {"query": malicious_input}
        )

@pytest.mark.asyncio
async def test_path_traversal_prevention():
    """Test that path traversal is prevented."""
    malicious_path = "../../etc/passwd"

    with pytest.raises(McpError):
        await server.call_tool(
            "read_file",
            {"path": malicious_path}
        )
```

## Incident Response

- [ ] **Incident response plan** documented
- [ ] **Contact information** for security team
- [ ] **Escalation process** defined
- [ ] **Breach notification** process ready
- [ ] **Rollback procedure** documented
- [ ] **Backup and restore** tested

## Security Disclosure

- [ ] **Security policy** published (SECURITY.md)
- [ ] **Vulnerability reporting** process defined
- [ ] **Response time** commitment stated
- [ ] **Hall of fame** for researchers (optional)

**Example SECURITY.md**:

```markdown
# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities to security@example.com

We will respond within 48 hours and provide a timeline for fixes.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Security Best Practices

- Never commit .env files
- Rotate API keys regularly
- Use HTTPS for all connections
- Keep dependencies updated
```

## Final Verification

Run this checklist before every release:

1. **Scan for secrets**: `git secrets --scan` or similar
2. **Check dependencies**: `npm audit` or `safety check`
3. **Run security tests**: Full test suite including security scenarios
4. **Code review**: At least one other developer reviews
5. **Documentation review**: Verify no secrets in docs
6. **Environment check**: Confirm production env vars set
7. **Monitoring**: Verify alerting works
8. **Rollback plan**: Confirm rollback procedure ready
