# Risk scoring rubric

Anchored to ISTQB Foundation Level 4.0 (2023) risk-based testing chapter. Risk = **likelihood × impact**, each on a 1–5 scale. Both axes need calibration to avoid the "5 × 5 = test everything" failure mode.

## Likelihood (1–5)

Estimate of how often the failure can occur in production given the current state of the system.

| Score | Definition                                                                                                   | Calibration anchor                                       |
| ----- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| 5     | Almost certain — the failure is happening now or has happened in the last 30 days.                           | A defect in this area exists in the open bug tracker.    |
| 4     | Likely — similar failures have shipped in the last 6 months OR new code with no prior testing in this area.  | Net-new code, no integration tests yet.                  |
| 3     | Possible — the code path is exercised but not heavily; failures occur under unusual conditions.              | Code touched in this release but not the primary change. |
| 2     | Unlikely — the code path is well-tested and stable; failures would require non-trivial environmental issues. | Stable area, no recent changes, regression suite green.  |
| 1     | Rare — the code path is exercised only by adversaries or edge inputs that the system gates.                  | Defense-in-depth code; primary path is unrelated.        |

## Impact (1–5)

Estimate of the cost of the failure when it occurs.

| Score | Definition                                                                                | Calibration anchor                                   |
| ----- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 5     | Catastrophic — direct revenue loss, regulatory exposure, data loss, customer trust event. | PII breach, money flow, healthcare, safety-critical. |
| 4     | Severe — major UX breakage for a large fraction of users; clear customer complaints.      | Checkout broken, login broken, payment delayed.      |
| 3     | Moderate — visible defect affecting some users; workaround exists; some support load.     | Wrong copy on a high-traffic page, slow feature.     |
| 2     | Minor — visible only in specific conditions; no operational impact.                       | Cosmetic UI glitch in low-traffic flow.              |
| 1     | Negligible — visible only to internal users or in admin paths.                            | Internal admin panel formatting.                     |

## Calibration rules

- **Never give every row Likelihood 5 × Impact 5.** If everything is critical, prioritization is broken; revisit calibration.
- **Tie likelihood to recent history.** A "possible" failure that has not occurred in 12 months is not Likelihood 3; it is closer to 2 or 1.
- **Tie impact to a concrete worst case**, not a hypothetical. "Could cause revenue loss" is not Impact 5; "would drop the buy button for 100% of EU users" is.
- **Recalibrate per release.** Risk scores from six months ago do not necessarily apply now.

## Score → Tier → Coverage policy

| Score | Tier   | Coverage policy                                                                                                                                                                                              |
| ----- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ≥15   | **P0** | Full-path coverage. Unit + integration + E2E + load + (for catastrophic-impact) chaos. Property-based testing on inputs. Mutation score ≥70% on the changed code. Manual exploratory session before release. |
| 10–14 | **P1** | Full happy path + common edge cases. Unit + integration + at-least-one E2E. Load test if performance is in scope. Mutation score ≥50%.                                                                       |
| 5–9   | **P2** | Smoke + happy path. Unit tests for new logic; one integration test for the changed surface. Skip load unless the change is performance-relevant.                                                             |
| <5    | **P3** | Visual / smoke only. A single end-to-end smoke that confirms the change is live. No new unit tests required if covered by regression.                                                                        |

## When to deviate

The rubric is a default, not a contract. Acceptable deviations and the rationale that must be recorded:

- **Regulatory floor**: regulated environments (medical, finance, aerospace) have minimum coverage even for P3. The regulation overrides the tier.
- **Stakeholder override**: PM or QE Lead can promote a P2 to P1 if business judgment justifies it. The plan must record the rationale.
- **Capacity constraint**: temporary downgrade of a P1 to P2 with documented compensating control (feature flag, dark launch) and a remediation date.

Every deviation appears in the Risk Analysis section with a one-line rationale.

## Example scoring

| Risk                                        | L   | I   | Score | Tier | Rationale                                                          |
| ------------------------------------------- | --- | --- | ----- | ---- | ------------------------------------------------------------------ |
| Discount code reuse via concurrent requests | 3   | 5   | 15    | P0   | Similar issue in last release (L=3); revenue + abuse vector (I=5). |
| Tax miscalculation in DE / FR               | 2   | 5   | 10    | P1   | Tax logic stable but edge regions; regulatory penalty if wrong.    |
| Cart icon misaligned at 320 px              | 2   | 2   | 4     | P3   | Cosmetic on rare viewport.                                         |
| Sign-up flow drops at OTP                   | 4   | 4   | 16    | P0   | Recent OTP provider change; blocks acquisition.                    |

## Anti-patterns in scoring

- **Score inflation**: everything 4–5 because "it matters". Forces P0 across the board, kills prioritization.
- **Score deflation**: everything 1–2 because "we'll catch it in prod". Defers risk to incident response.
- **Scoring without history**: pure intuition with no prior-incident anchor.
- **Single-person scoring**: the QE lead alone. Risk scoring is more reliable as a cross-functional 15-minute review with PM + tech lead.

## Source

- ISTQB Foundation Level Syllabus v4.0 (2023), section "Risk-Based Testing".
- ISO/IEC/IEEE 29119-3:2021, Annex E (Risk-based testing).
- _Pragmatic Software Testing_, Rex Black (2007) — practical calibration of likelihood/impact scales.
