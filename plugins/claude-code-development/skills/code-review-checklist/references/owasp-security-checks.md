# OWASP-aligned security checks for code review

Source: OWASP Code Review Guide v2.0 (2017) + OWASP Top 10 (2021 for Web, 2023 for API, 2025 for LLM, 2025 for Agentic).

This reference enumerates security-focused checks for the per-PR review. For deep threat modelling, invoke `claude-code-development:threat-model`.

## Web OWASP Top 10 (2021)

For each category, look for diff patterns that introduce or fail to mitigate:

### A01:2021 — Broken Access Control

- Endpoint missing auth middleware?
- IDOR (Insecure Direct Object Reference) — query by user-provided ID without authorization check?
- Path traversal via user input?
- CORS misconfiguration (`Access-Control-Allow-Origin: *` on credentialed endpoints)?
- JWT scope check missing on action endpoints?

### A02:2021 — Cryptographic Failures

- Plaintext sensitive data in logs / database / cache?
- Weak hash (MD5, SHA-1) for passwords or tokens?
- Random number generator (RNG) appropriate to use (cryptographic for tokens; non-crypto OK for IDs)?
- Hard-coded keys / secrets?
- TLS misconfiguration (insecure ciphers, missing HSTS)?

### A03:2021 — Injection

- SQL: parameterised queries used? Or is concatenation present?
- NoSQL: query construction safe?
- Command injection: any `exec` / `eval` / `system` with user input?
- LDAP / XML / template injection?

### A04:2021 — Insecure Design

- Trust boundaries respected? See `../../threat-model/references/trust-boundaries.md`.
- Missing rate limiting on auth-sensitive endpoints?
- Lack of defence-in-depth?

### A05:2021 — Security Misconfiguration

- Verbose error messages exposing stack traces / internals?
- Default credentials or weak defaults?
- Unnecessary features enabled (debug endpoints, admin APIs without auth)?
- Missing security headers (`Content-Security-Policy`, `X-Frame-Options`, `Strict-Transport-Security`)?

### A06:2021 — Vulnerable and Outdated Components

- New dependency: latest version with security patches? Active maintenance?
- Lockfile diff reviewed for unexpected transitive bumps?

### A07:2021 — Identification and Authentication Failures

- Password storage: bcrypt / Argon2 / scrypt with appropriate cost?
- Session management: random session IDs, secure cookies, expiration?
- MFA enforcement gaps?
- Token refresh logic correct?

### A08:2021 — Software and Data Integrity Failures

- Deserialisation of untrusted input?
- Code signing / supply chain (CI/CD pipeline integrity)?

### A09:2021 — Security Logging and Monitoring Failures

- Auth events logged (success + failure)?
- Logs free of sensitive data (passwords, tokens, full card numbers)?
- Alerts on auth-failure spikes?

### A10:2021 — Server-Side Request Forgery (SSRF)

- Outbound HTTP calls with user-controlled URLs → SSRF risk → block or allowlist?

## API OWASP Top 10 (2023)

For APIs, additional checks beyond web:

- **API1**: Broken Object Level Authorization (IDOR-equivalent).
- **API2**: Broken Authentication.
- **API3**: Broken Object Property Level Authorization (overexposing properties in responses).
- **API4**: Unrestricted Resource Consumption (DoS, lack of rate limit / size limit).
- **API5**: Broken Function Level Authorization.
- **API6**: Unrestricted Access to Sensitive Business Flows (e.g. checkout abuse).
- **API7**: Server-Side Request Forgery.
- **API8**: Security Misconfiguration.
- **API9**: Improper Inventory Management (deprecated endpoints still active).
- **API10**: Unsafe Consumption of APIs (trusting third-party API responses without validation).

## LLM OWASP Top 10 (2025)

For code involving LLMs:

- **LLM01**: Prompt Injection.
- **LLM02**: Sensitive Information Disclosure.
- **LLM03**: Supply Chain (model weights, fine-tuning data).
- **LLM04**: Data and Model Poisoning.
- **LLM05**: Improper Output Handling (LLM output rendered without escaping).
- **LLM06**: Excessive Agency (LLM allowed to take more action than scoped).
- **LLM07**: System Prompt Leakage.
- **LLM08**: Vector and Embedding Weaknesses.
- **LLM09**: Misinformation.
- **LLM10**: Unbounded Consumption.

## Agentic OWASP Top 10 (2025)

For autonomous-agent code:

- Tool permissions: least privilege enforced?
- Memory isolation: cross-task or cross-user contamination prevented?
- Loop guards: prevent runaway agent loops?
- Human-in-the-loop for high-blast-radius actions?

## How to use in the review

Walk the relevant Top 10 list for the area touched by the PR (web / API / LLM / agentic). For each category:

- Scan the diff for code that introduces or fails to mitigate.
- Tag findings under the `security` category in the output.
- Severity: `blocking` for confirmed vulnerability; `required` for missing mitigation; `suggestion` for defense-in-depth opportunity.

If the PR introduces a non-trivial new security surface, in addition to per-PR findings, recommend invoking `threat-model` skill for a fuller analysis.

## Anti-patterns

- **Checking every OWASP category on every PR**: ceremony. Apply categories relevant to the diff.
- **Generic security comments**: "consider security implications" — useless. Be specific: which vulnerability, which line, which mitigation.
- **Blocking on theoretical issues**: if you can't articulate the attack scenario, the finding is `suggestion`, not `blocking`.
- **Approving security-sensitive PRs without explicit security review**: when auth / PII / payments / external surface is touched, security category must be walked deliberately.

## Cross-reference

- For deep threat modelling: `../../threat-model/SKILL.md`.
- For systemic security audit: `../../code-audit/SKILL.md`.
