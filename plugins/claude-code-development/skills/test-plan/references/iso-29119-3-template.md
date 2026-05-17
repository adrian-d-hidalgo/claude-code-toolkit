# ISO/IEC/IEEE 29119-3:2021 — Canonical test plan template

Full 18-section structure. Copy, fill, prune unused sections only with rationale in Change Control.

```markdown
# Test Plan: [Feature / Release Name]

> **Plan ID**: TP-[NNNN]
> **Status**: Draft | Approved | In Execution | Completed
> **Author**: [name + role]
> **Last updated**: YYYY-MM-DD
> **Companion artifacts**: PRD [link], Tech Spec [link], Release [version]
> **Approvers**: [QE lead, Tech lead, PM]

## 1. Introduction

### 1.1 Purpose

[1–2 sentences: what this plan covers and why.]

### 1.2 Scope of testing

**In scope**:

- [feature / component / integration]
- [user journey]

**Out of scope**:

- [explicit non-coverage with rationale]

### 1.3 References

- PRD: [link]
- Tech Spec: [link]
- Related ADRs: ADR-NNNN
- Org test strategy: [link]
- Applicable standards: ISO/IEC/IEEE 29119-3:2021, ISO/IEC 25010:2023, ISTQB FL 4.0

## 2. Test Items

| Item        | Version                    | Owner  |
| ----------- | -------------------------- | ------ |
| Service A   | v1.4.0                     | team-x |
| Component B | feature/checkout-v2 branch | team-y |

## 3. Features to Be Tested

Map to PRD acceptance criteria. One row per AC or feature. NOT test cases — those live separately and are referenced.

| Feature / AC ID | Description                      | Risk | Priority |
| --------------- | -------------------------------- | ---- | -------- |
| AC-1            | User completes checkout in <90 s | High | P0       |
| AC-2            | Discount codes validated         | Med  | P1       |

## 4. Features Not to Be Tested

| Feature         | Reason                                           |
| --------------- | ------------------------------------------------ |
| Mobile UI       | Already covered in TP-0042 (mobile release plan) |
| Admin dashboard | No changes in this release                       |

## 5. Risk Analysis

For each major component or scenario:

| Risk ID | Description                                  | Likelihood (1–5) | Impact (1–5) | Score | Test priority |
| ------- | -------------------------------------------- | ---------------- | ------------ | ----- | ------------- |
| R1      | Discount code abuse via concurrent requests  | 3                | 5            | 15    | P0            |
| R2      | Cart abandonment on slow third-party payment | 4                | 4            | 16    | P0            |
| R3      | Tax mis-calculation in EU regions            | 2                | 5            | 10    | P1            |

Coverage policy by risk tier (see `risk-scoring.md`):

- Score ≥15 (P0): full path coverage + edge cases + load + chaos for critical paths.
- Score 10–14 (P1): full happy path + common edge cases.
- Score 5–9 (P2): smoke + happy path.
- Score <5 (P3): visual / smoke only.

## 6. Test Approach

### 6.1 Test types in scope

Per ISO 25010 attributes — pick relevant ones for THIS plan.

| Test type         | Quality attribute (ISO 25010)        | Tool                           | Owner           |
| ----------------- | ------------------------------------ | ------------------------------ | --------------- |
| Unit              | Functional Suitability               | Vitest / pytest / Go test      | Developers      |
| Integration       | Functional Suitability + Reliability | testcontainers + native runner | Developers + QE |
| E2E               | Functional Suitability + Usability   | Playwright                     | QE-led          |
| Contract          | Compatibility                        | Pact                           | Developers      |
| Load              | Performance Efficiency               | k6                             | QE + SRE        |
| Security baseline | Security                             | Semgrep + ZAP                  | SecEng          |
| A11y              | Usability (a11y)                     | axe-core + Playwright a11y     | UX + QE         |

### 6.2 Out-of-scope test types

[E.g., chaos testing not in this plan; deferred to TP-0043.]

### 6.3 Test design techniques (ISTQB)

- Equivalence partitioning + Boundary value analysis for input validation.
- Decision tables for business rules with multiple conditions.
- State transition testing for stateful flows (order lifecycle, etc.).
- Use case testing for end-to-end user journeys.
- Pairwise / orthogonal-array for combinatorial input spaces.
- Exploratory testing sessions for un-specified edge cases (charters per session).

## 7. Test Environment

| Environment   | Purpose              | Data                   | Access           |
| ------------- | -------------------- | ---------------------- | ---------------- |
| `pr-XXX`      | Per-PR ephemeral     | Synthetic (anonymized) | Auto-provisioned |
| `staging`     | Pre-prod integration | Sanitized prod-like    | QE + dev         |
| `perf`        | Load testing         | Synthetic at scale     | SRE-managed      |
| `prod-shadow` | Final smoke          | Real, read-only        | Auto             |

Configuration drift is managed via IaC; the plan flags any deltas from the agreed environment baseline.

## 8. Test Data

- **Source**: synthetic generator / anonymized prod / fixtures.
- **PII handling**: anonymization strategy; no real PII in non-prod.
- **Data setup**: per-test fixtures; teardown policy.
- **Seed determinism**: seed values, replay strategy.

## 9. Schedule

| Phase                | Start      | End        | Owner   | Deliverable                  |
| -------------------- | ---------- | ---------- | ------- | ---------------------------- |
| Test design          | YYYY-MM-DD | YYYY-MM-DD | QE      | Test cases mapped to ACs     |
| Test implementation  | YYYY-MM-DD | YYYY-MM-DD | Dev     | Automated tests in repo      |
| Cycle 1 (in dev)     | YYYY-MM-DD | YYYY-MM-DD | All     | Test results, defect log     |
| Bug-fix iterations   | YYYY-MM-DD | YYYY-MM-DD | Dev     | Fixed defects, re-tested     |
| Cycle 2 (regression) | YYYY-MM-DD | YYYY-MM-DD | QE      | Full regression run          |
| Sign-off             | YYYY-MM-DD | YYYY-MM-DD | QE lead | Plan closed; report attached |

## 10. Roles and Responsibilities (RACI)

| Activity         | QE Lead | Developers | PM  | Tech Lead | SRE | SecEng |
| ---------------- | ------- | ---------- | --- | --------- | --- | ------ |
| Plan ownership   | R/A     | C          | C   | C         | C   | I      |
| Test case design | R/A     | C          | C   | C         | I   | I      |
| Unit test impl   | C       | R/A        | I   | I         | I   | I      |
| E2E impl         | A       | R          | C   | C         | I   | I      |
| Load test design | R/A     | C          | I   | C         | C   | I      |
| Security tests   | C       | C          | I   | C         | I   | R/A    |
| Sign-off         | R/A     | C          | C   | C         | I   | I      |

R = Responsible, A = Accountable, C = Consulted, I = Informed. Exactly one A per row.

## 11. Entry Criteria

Testing begins when:

- [ ] Code complete for in-scope items.
- [ ] Test environment provisioned and validated.
- [ ] Test data prepared.
- [ ] Smoke tests passing on dev environment.
- [ ] PRD + tech-spec linked and approved.
- [ ] No P0 defects open from prior cycle.

## 12. Exit Criteria

Testing complete when:

- [ ] All P0 acceptance criteria pass.
- [ ] All P1 acceptance criteria pass OR have approved deferrals.
- [ ] No P0 defects open.
- [ ] P1 defects: triaged with owner + due date.
- [ ] Test coverage metrics meet targets (per Risk Analysis).
- [ ] Performance SLOs validated under expected load.
- [ ] Security scan passing (no critical findings).
- [ ] A11y scan passing per WCAG 2.2 AA.
- [ ] Regression suite green.
- [ ] Test results reviewed and signed off by QE lead, Tech lead, PM.

## 13. Quality Metrics and Targets

| Metric                         | Target                                     | Measured by        |
| ------------------------------ | ------------------------------------------ | ------------------ |
| Test coverage (changed code)   | ≥80% line, ≥70% branch                     | coverage tool      |
| Test pass rate                 | ≥98% (excluding known flaky in quarantine) | CI                 |
| Flake rate                     | <2% over 7 days                            | CI history         |
| Mutation score (P0 components) | ≥70%                                       | Stryker / mutmut   |
| Defect density                 | TBD per release baseline                   | bug tracker        |
| Defect escape rate             | <X per release                             | post-prod tracking |
| MTTD (escaped defects)         | <Y hours                                   | observability      |
| Time-to-fix (P0 / P1)          | <Z hours/days                              | tracker            |

## 14. Risks to the Test Plan Itself

| Risk                          | Likelihood | Impact | Mitigation                           |
| ----------------------------- | ---------- | ------ | ------------------------------------ |
| Test environment instability  | M          | H      | SRE on standby; fallback to staging  |
| Test data unavailable on time | L          | M      | Pre-provision; synthetic gen ready   |
| Late spec changes             | M          | H      | Time buffer; re-scope policy in plan |
| Flaky tests blocking cycle    | M          | M      | Auto-quarantine + 72 h fix rule      |

## 15. Deliverables

- This Test Plan document (signed).
- Test cases (linked in test case management system / repo).
- Automated test suites (in code repo).
- Test execution report (post-cycle).
- Defect log (linked to bug tracker).
- Coverage and quality metrics report.
- Sign-off record.

## 16. Communication Plan

- **Daily standup**: test progress vs plan.
- **Mid-cycle review**: blocker triage.
- **Pre-sign-off review**: exit criteria check.
- **Stakeholder updates**: weekly to PM, tech lead.

## 17. Change Control

Plan changes require:

- Author proposes change with rationale.
- Approver sign-off (QE Lead + Tech Lead).
- Version bump and changelog entry below.

### Changelog

| Date       | Version | Change  | Approver |
| ---------- | ------- | ------- | -------- |
| YYYY-MM-DD | 1.0     | Initial | [name]   |

## 18. Approvals

- [ ] QE Lead — [name + date]
- [ ] Tech Lead — [name + date]
- [ ] Product Manager — [name + date]
- [ ] Security (if security-sensitive) — [name + date]
- [ ] SRE (if reliability-sensitive) — [name + date]
```

## Lite plan (≤6 sections)

For low-risk changes (P3 or below across the board), collapse to:

1. Scope (in/out)
2. Risk (1–3 rows max)
3. Approach (1–2 test types)
4. Environment (which one)
5. Entry / Exit (≤3 bullets each)
6. Sign-off (single approver)

Use lite plans for documentation edits, copy changes, dependency bumps, internal admin tooling. Anything user-facing with money flow or PII handling gets the full plan.
