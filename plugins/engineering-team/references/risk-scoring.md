# Risk scoring and prioritization — transversal convention

Engineering-team agents that produce findings, recommendations, or backlog items **score by likelihood × impact** and prioritize accordingly. The scoring lets the reader sort, threshold, and budget; an unscored list is just an opinion.

Different disciplines use different scales — security uses CVSS, QE uses ISO 25010 attributes, code-reviewer uses impact×effort, architect uses NFR targets. The common shape is: identify factors, score each, derive a priority, recommend an action.

## The common shape

Every scored item carries four fields:

1. **Likelihood** — how often the failure / event / cost is expected to occur (qualitative scale OR quantified probability).
2. **Impact** — what happens when it occurs (user-visible, business-visible, operational, security).
3. **Priority** — derived from likelihood × impact, mapped to an action threshold.
4. **Action** — concrete recommendation: do now, do this iteration, schedule, accept-and-monitor, defer.

A finding without these four reads as "here is a thing" — the reader cannot decide what to do with it.

## Scales per discipline

### Security — CVSS v4

- Likelihood: exploitability (Attack Vector, Attack Complexity, Privileges Required, User Interaction).
- Impact: Confidentiality, Integrity, Availability impact + Subsequent System impact.
- Priority: CVSS base score → Critical (9.0–10.0), High (7.0–8.9), Medium (4.0–6.9), Low (0.1–3.9).
- Action: thresholds tied to environment policy (often Critical/High block release; Medium tracked; Low backlog).

### Quality engineering — Risk × ISO 25010 attribute weight

- Likelihood: defect probability (recency of change, complexity, test coverage gap).
- Impact: which ISO 25010 attribute fails — Functional suitability, Reliability, Performance efficiency, Security, Usability, Maintainability, Portability, Compatibility — weighted by user/business sensitivity.
- Priority: top-quintile risk × top-weight attribute → must-test; bottom quintile → accept.
- Action: test layer (unit/integration/E2E/contract) + frequency (per-commit, per-release, periodic).

### Code review — impact × effort for tech debt

- Likelihood (impact in this context): how much pain the issue causes — reader confusion, defect surface, future-change cost.
- Effort: cost to fix — lines touched, blast radius, coordination required.
- Priority: high-impact-low-effort → fix now; high-impact-high-effort → schedule; low-impact-low-effort → opportunistic; low-impact-high-effort → reject.
- Action: in-PR fix request, follow-up issue, or explicit accept-and-document.

### Architecture — NFR target compliance

- Likelihood: probability the design fails to meet the NFR under realistic load / failure modes / scale.
- Impact: which NFR fails (latency, availability, durability, scalability, security, cost) and by how much.
- Priority: NFR-blocking → must redesign before build; NFR-degraded → mitigate; NFR-met-with-margin → accept.
- Action: alternative design, mitigation (caching, circuit breaker, redundancy), fitness function to monitor.

### Data engineering — Data quality risk × SLA impact

- Likelihood: probability of contract violation (schema drift, freshness miss, completeness failure).
- Impact: downstream consumers affected × business criticality of their use case.
- Priority: contract-blocking + critical consumer → fix now; SLA-degraded → mitigate; cosmetic → backlog.
- Action: contract test, freshness alert, schema-evolution plan with rollback.

## How to write a scored finding

Template, adapt per discipline:

```markdown
**Finding [F-NN]**: <one-line description of the issue/risk/opportunity>

- Location: <file:line | system component | dataset.field>
- Evidence level: [Verified | Inference | Unverified | Verified-external — <source>]
- Likelihood: <scale value> — <rationale>
- Impact: <scale value> — <rationale, including who/what is affected>
- Priority: <Critical | High | Medium | Low> (derived from L×I per <scale name>)
- Recommended action: <concrete next step>
- Effort estimate: <S | M | L | XL> or <hours/days range>
- Owner suggestion: <role, not person>
```

## Threshold semantics — what each priority means

- **Critical**: block the release / PR / decision. Fixing is the only acceptable outcome.
- **High**: must be addressed this iteration. Acceptable to ship behind a flag with a closure date.
- **Medium**: schedule for the next iteration. Tracked, not blocking.
- **Low**: backlog. Address opportunistically or when adjacent work touches it.
- **Accept**: explicit decision NOT to fix, with rationale. Different from "Low" — Accept means the cost of fixing exceeds the cost of the risk and the team has agreed.

Explicit thresholds prevent priority inflation (everything ends up High).

## Anti-patterns

- **Unscored finding** — reader has no way to decide; finding gets lost in the list.
- **Single-axis scoring** — likelihood without impact, or vice versa, loses the multiplicative signal.
- **Priority without action** — "this is High" is not enough; what should happen?
- **Tag inflation toward Critical** — when 70% of findings are Critical, none are. Score honestly relative to the scale.
- **Scoring at the wrong granularity** — a single Priority on a 40-item list is useless; score each.
- **Confusing accept-and-monitor with do-nothing** — Accept is a decision with rationale; "we ignored it" is not.
- **Borrowing a scale from a different discipline** — using CVSS for tech debt or impact×effort for security misses the relevant factors. Pick the scale that fits the discipline.
- **Stale priority** — when the system changes, re-score. Yesterday's Medium is today's High if the affected surface grew.

## How each agent applies this

| Agent | Scale used |
|---|---|
| code-reviewer | Impact × effort for tech debt; CVE severity for security findings (delegating analysis to security-engineer for STRIDE). |
| quality-engineer | Risk × ISO 25010 attribute weight per test layer. |
| security-engineer | CVSS v4 for vulnerabilities; STRIDE per-component with residual risk after mitigations. |
| software-architect | NFR target compliance per ADR option; fitness functions to monitor compliance. |
| data-engineer | Data quality risk × SLA impact per dataset / contract. |
| debugger | Not used — debugger produces a single root cause, not a prioritised list. Severity for the bug itself comes from `bug-analysis`. |
| code-planner | Not used directly — code-planner aggregates findings from other agents into a backlog ordered by Direct-Value vs Enabler classification (SAFe 6.0). |
| software-developer | Not used directly — developer implements decisions already scored upstream. May surface a new finding with a draft score for upstream review. |

## Cross-reference

Each agent body has a short section pointing to this file, not duplicating the convention. Discipline-specific scale details live in each agent's body.
