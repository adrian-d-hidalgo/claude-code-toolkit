# STRIDE — six threat categories per component

Source: Loren Kohnfelder & Praerit Garg, Microsoft (1999); popularised in Howard & Lipner, _Writing Secure Code_ (2nd ed., 2002).

## The six letters

| Letter | Category               | Violates (CIA triad +) | Examples                                                                                                               |
| ------ | ---------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **S**  | Spoofing               | Authentication         | Forged session token, impersonated user, phishing-derived credentials, SAML response replay                            |
| **T**  | Tampering              | Integrity              | Modified request payload, MITM injection, DB row mutation by unprivileged role                                         |
| **R**  | Repudiation            | Non-repudiation        | User denies action with no audit log; admin deletes log entries; signed audit log missing                              |
| **I**  | Information disclosure | Confidentiality        | PII in logs, error message leaking internal paths, side-channel timing attack                                          |
| **D**  | Denial of service      | Availability           | Amplification attack, resource exhaustion via expensive query, slowloris connection holding                            |
| **E**  | Elevation of privilege | Authorization          | Regular user reaches admin endpoint; IDOR (insecure direct object reference); privilege escalation via deserialisation |

## How to apply per component

For each component in scope, ask: "Can S happen here? Can T happen here?" etc.

For each YES:

1. Describe the specific threat (attacker, method, target).
2. Rate likelihood (L / M / H / Critical) and impact (L / M / H / Critical).
3. Identify the current mitigation (cited by file:line).
4. State residual risk after mitigation.
5. Propose additional mitigation if residual > Low.

For each NO: state it explicitly as N/A with rationale (e.g. "Component is read-only, no D — but DoS at the calling layer is in scope for the calling component").

## Worked example — Component: `payment-service`

| STRIDE | Threat                                          | L   | I        | Current mitigation                                                                               | Residual                                    | Evidence                                                   |
| ------ | ----------------------------------------------- | --- | -------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------- | ---------------------------------------------------------- |
| S      | Attacker forges payment-service client-cert     | L   | H        | mTLS with rotating CA (`infra/mtls.tf:24`); cert pinning in caller (`src/clients/payment.ts:12`) | Low                                         | [Verified — `infra/mtls.tf:24`]                            |
| T      | Modify charge amount between client and gateway | M   | H        | Server-side recomputation against catalog (`src/orders/charge.ts:33`); HMAC on signed payload    | Low                                         | [Verified — `src/orders/charge.ts:33`]                     |
| R      | User denies payment authorisation               | L   | H        | Stripe charge ID + signed receipt + audit log (`src/audit/payment.ts:8`)                         | Low                                         | [Verified — `src/audit/payment.ts:8`]                      |
| I      | Card-holder name in logs                        | M   | Critical | Redaction middleware (`src/middleware/redact.ts:12`)                                             | Medium — wildcard regex may miss new fields | [Verified — middleware exists; Inference on wildcard miss] |
| D      | DoS via expensive charge-status polling         | M   | M        | Polling rate limited to 1/sec/user; circuit breaker on Stripe                                    | Low                                         | [Verified — `src/clients/payment.ts:rate-limit`]           |
| E      | Regular user calls admin refund endpoint        | L   | H        | RBAC at middleware (`src/middleware/rbac.ts:8`); endpoint-level scope check                      | Low                                         | [Verified — `src/middleware/rbac.ts:8`]                    |

## When letters don't apply

Be explicit. Examples:

- **No S in a callback handler** that only accepts signed webhook payloads with vendor signature verification → mark S as "N/A — vendor signature verification at `src/webhooks/stripe.ts:5`".
- **No R in a read-only public endpoint** (nothing to repudiate) → "N/A — read-only, no state change".
- **No E in a single-tenant single-role process** → "N/A — single privilege level".

Skipping letters silently is an anti-pattern — see `anti-patterns.md`.

## STRIDE vs STRIDE-per-Element vs STRIDE-per-Interaction

Three styles (Shostack 2014):

1. **STRIDE-per-Element** (default): apply all 6 letters to each component (process / data store / data flow / external entity). What this skill defaults to.
2. **STRIDE-per-Interaction**: apply letters per data-flow interaction. More precise but heavier; use for high-stakes flows.
3. **STRIDE-per-Trust-Zone**: apply at trust-boundary crossings only. Lightest; use for quick triage.

State which style you used in the output.

## Anti-patterns

- Applying all 6 letters to a trivial component without thought (e.g. STRIDE on a static-asset CDN) — pads the doc without value.
- Skipping a letter because "we have HTTPS" — HTTPS mitigates T over the network but doesn't cover T at rest or T inside the service.
- Repeating the same mitigation for every letter — sign of insufficient analysis.
- Likelihood × Impact ratings without rationale — opaque to the reader.

## Cross-reference

- For risk-centric depth: [`pasta.md`](./pasta.md).
- For qualitative severity language: [`dread.md`](./dread.md).
- For where to apply STRIDE (boundary mapping): [`trust-boundaries.md`](./trust-boundaries.md).
