---
name: threat-model
description: Use when the user asks to threat-model a system, feature, surface, or change. Trigger phrases include "threat model", "modelo de amenazas", "STRIDE on X", "PASTA analysis", "attack tree for", "where can this be attacked", "auth threat model", "API threat model", "what are the security threats", "amenazas de seguridad".
allowed-tools:
  - Read
  - Grep
  - Glob
---

# threat-model skill

Produces a structured threat model of a system, feature, or surface: components in scope → trust boundaries → per-component STRIDE (or PASTA for risk-centric depth) → mitigations → residual risk. Output is content the caller persists wherever (security review doc, design doc appendix, Jira ticket, wiki). No files imposed.

## Methodology anchor

- **STRIDE** — Microsoft (Howard & Lipner, _Writing Secure Code_, 2002). Per-component: Spoofing · Tampering · Repudiation · Information disclosure · Denial of service · Elevation of privilege. Default for component-by-component threat enumeration. Reference: [`stride.md`](./references/stride.md).
- **PASTA** — Process for Attack Simulation and Threat Analysis (Marco Morana, Tony UcedaVelez, _Risk-Centric Threat Modeling_, 2015). Seven-stage risk-centric methodology. Use for higher-stakes / regulated systems where business-risk framing matters. Reference: [`pasta.md`](./references/pasta.md).
- **DREAD** — Microsoft, deprecated formally but still used qualitatively: Damage · Reproducibility · Exploitability · Affected users · Discoverability. Useful as a _qualitative_ severity language; quantitative DREAD scoring is unreliable. Reference: [`dread.md`](./references/dread.md).
- **Trust boundaries** — Adam Shostack, _Threat Modeling: Designing for Security_ (2014). Where authority changes (process / network / persistence / user-role transitions). Reference: [`trust-boundaries.md`](./references/trust-boundaries.md).
- **Attack trees** — Bruce Schneier (~1999). For multi-step attacker objectives decomposed into sub-goals.

## Scope and boundaries

This skill handles:

- Threat enumeration over a defined surface (component / feature / endpoint / data flow).
- Trust-boundary mapping.
- STRIDE per component (default) or PASTA (risk-centric).
- Mitigation proposals + residual-risk statements.
- CVSS scoring for findings where applicable.

This skill does not handle:

- Implementing the mitigations (software-developer / infra team).
- Architectural redesign for security (software-architect, informed by this analysis).
- Penetration testing or active exploitation (out of scope — separate engagement).
- Compliance certification (security-engineer agent, drawing from this analysis).
- Incident response or RCA on a security breach (bug-analysis + security-engineer).

## Output structure

Caller adapts. Suggested:

```markdown
## Scope

- Components in scope: <list with concrete names from the codebase>.
- Out of scope: <what's deliberately not analysed and why>.
- Methodology used: STRIDE | PASTA (cite stages) | Attack tree.
- Evidence levels noted per claim per the engineering-team evidence-rule convention (at the plugin-root references directory).

## Trust boundaries

- B1: <boundary name> — between <component> and <component>; authority change: <what>.
- B2: …
- Diagram: (caller renders via `mermaid` skill if needed).

## STRIDE per component (or PASTA stages, per chosen methodology)

### Component: <name>

| STRIDE | Threat                                          | Likelihood | Impact   | Current mitigation                                               | Residual risk                     | Evidence                                                              |
| ------ | ----------------------------------------------- | ---------- | -------- | ---------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| S      | Attacker forges session token                   | M          | H        | JWT with rotating signing key (`src/auth/jwt.ts:42`)             | Low — verified rotation cadence   | [Verified — src/auth/jwt.ts:42 + cron pg_cron schedule]               |
| T      | Order amount tampered between client and server | H          | H        | Server-side recomputation of total (`src/orders/total.ts:18`)    | Low                               | [Verified — src/orders/total.ts:18]                                   |
| R      | Repudiation of order placement                  | L          | M        | Append-only audit log to S3                                      | Medium — no signing               | [Verified — `infra/audit-log.tf` + Inference on no signing]           |
| I      | Card numbers exposed in logs                    | L          | Critical | Card-number redaction middleware (`src/middleware/redact.ts:12`) | Low                               | [Verified — src/middleware/redact.ts:12 + grep for raw card patterns] |
| D      | Checkout endpoint DDoS                          | M          | M        | API gateway rate limit 1k rps/IP                                 | Medium — single-IP attackers only | [Verified — `infra/api-gw.tf:rate-limit`]                             |
| E      | Regular user escalates to admin                 | L          | Critical | RBAC enforced at middleware (`src/middleware/rbac.ts:8`)         | Low                               | [Verified — src/middleware/rbac.ts:8]                                 |

### Component: <next>

…

## Mitigations proposed (where residual risk > Low)

- M-01: Add JWT signature on audit log entries (mitigates R for `Component: orders`). Owner suggestion: backend team. Effort: S.
- M-02: …

## CVSS scoring (where applicable)

- Finding F-01: <description> — CVSS 3.1 vector `AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N` — Base score 7.5 (High). [Verified — calculated from observed conditions]

## Residual risk summary

- Overall residual risk: Low | Medium | High.
- Highest-residual findings: <list>.
- Sign-off required from: <suggestion — never invocation>.
```

## Workflow

1. **Define scope precisely** — components, endpoints, data flows, in scope vs out of scope. Read the actual code (`Read`, `Grep`, `Glob`) — every component named exists in the repo (or is tagged `to create` for in-design work).
2. **Map trust boundaries** — every place where authority changes (user → API → service → DB; tenant A → tenant B; public → internal; etc.). Per Shostack 2014.
3. **Choose methodology**:
   - Default: STRIDE per component.
   - High-stakes / regulated: PASTA (7 stages — business context → tech scope → application decomposition → threat analysis → vulnerability analysis → attack simulation → risk analysis).
   - Multi-step attacker objective: Attack tree.
4. **Enumerate threats per component / stage**. Don't pad — if a STRIDE letter doesn't apply (e.g. an internal-only service has no E for external users), say so explicitly with rationale.
5. **Score likelihood × impact** per threat (qualitative L/M/H/Critical) and/or CVSS 3.1 vector for findings significant enough to track.
6. **Identify current mitigations** by reading code / config / docs. Tag evidence levels.
7. **Propose additional mitigations** for any threat where residual risk > Low.
8. **State residual risk** explicitly per component and overall.
9. **Self-check** before emission.

## Self-check (mandatory)

- [ ] Scope explicit (in / out of scope).
- [ ] Trust boundaries enumerated (not implicit).
- [ ] Every component in scope analysed per the chosen methodology.
- [ ] STRIDE letters that don't apply are explicitly N/A with rationale (not silently skipped).
- [ ] Each threat has a likelihood × impact rating.
- [ ] Current mitigations tagged `[Verified]` (read in code/config) — not assumed.
- [ ] Residual risk stated per threat and overall.
- [ ] Proposed mitigations are concrete (file/function/library named) — not "improve security".
- [ ] CVSS scores cited where computed (otherwise omit — don't fabricate).
- [ ] No `Status:` or other lifecycle field.
- [ ] No invented component names — every name exists in the repo or is `to create`.
- [ ] Tone is technical / risk-based, not alarmist.

## Anti-patterns to reject

See [`anti-patterns.md`](./references/anti-patterns.md). Highlights:

- "Boil-the-ocean threat model" — every system component analysed for every STRIDE letter regardless of relevance. Ceremony, not value.
- No residual-risk statement — "we have a mitigation" without saying what risk remains.
- Trust boundaries missing — the model shows components but not where authority changes.
- Quantitative DREAD scoring (4.5 / 7.2 / etc.) — DREAD scores are non-comparable in practice; use qualitative only.
- Mitigation proposed but no owner / effort — unactionable.
- Threat model without code-grounded reading — fictional components, fictional mitigations.
- Including the threat model's own `Status: Draft / Final` field — lifecycle lives in the project's tracker.

## Communication

- Lead with **scope + methodology + residual-risk summary**. Stakeholders want the bottom line first.
- Cite mitigations by file:line. Vague "we have rate limiting" without source is hand-waving.
- Tag every threat with an evidence level per the engineering-team evidence-rule convention (at the plugin-root references directory).
- When threats sound speculative, tag `[Unverified]` honestly and state what would verify (penetration test, instrumentation, code audit).

## Reference index

- [`references/stride.md`](./references/stride.md) — 6 letters, worked examples per letter.
- [`references/pasta.md`](./references/pasta.md) — 7 stages, when to use over STRIDE.
- [`references/dread.md`](./references/dread.md) — qualitative use, why quantitative is deprecated.
- [`references/trust-boundaries.md`](./references/trust-boundaries.md) — definition + diagramming convention.
- [`references/anti-patterns.md`](./references/anti-patterns.md) — boil-the-ocean, missing trust boundaries, quantitative DREAD, etc.
