# Test plan extensions for regulated environments

Regulated environments require traceability and evidence collection beyond the ISO 29119-3 baseline. This reference maps the canonical sections to common regulatory frameworks.

## FDA QSR / 21 CFR Part 820 — Medical devices (US)

Applies to: software as a medical device (SaMD), software in a medical device (SiMD).

| 29119-3 section   | FDA QSR extension                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| 1.3 References    | Add: predicate device 510(k), Design History File index, risk file (ISO 14971).                               |
| 2 Test Items      | Each item linked to a Design Output (Software Requirements Specification + Design Specifications).            |
| 5 Risk Analysis   | Anchored to ISO 14971 risk management file; severity / occurrence / detectability per the device risk matrix. |
| 9 Schedule        | Verification activities must be in the Design Verification Plan.                                              |
| 12 Exit Criteria  | Validation per Intended Use Statement; Design Validation Report attached.                                     |
| 15 Deliverables   | Verification & Validation Reports (Design History File evidence); Software Configuration Item identification. |
| 17 Change Control | All changes routed through Engineering Change Order with regulatory impact assessment.                        |

## IEC 62304 — Medical device software lifecycle

Applies to: medical device software at any safety class (A, B, C).

| Required additions                                                                                               |
| ---------------------------------------------------------------------------------------------------------------- |
| Software Safety Classification (A / B / C) — drives required activities.                                         |
| SOUP (Software of Unknown Provenance) inventory — third-party components with their own risk analysis.           |
| Traceability matrix: System Requirements → Software Requirements → Software Items → Software Units → Test Cases. |
| Software Problem Resolution — defects link to risk file and CAPA system.                                         |
| Software Configuration Management — every test result tied to a specific Software Configuration Item.            |

## ISO 13485 — Quality management for medical devices

Applies to: organizations producing medical devices, beyond the software itself.

Test plan must reference: QMS procedure ID for V&V, training records of authoring / approving personnel, audit-trail of plan revisions.

## PCI-DSS v4.0 — Payment card industry

Applies to: any system that stores, processes, or transmits cardholder data.

| 29119-3 section    | PCI-DSS v4.0 extension                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| 1.2 Scope          | Cardholder Data Environment (CDE) boundary explicitly identified.                                                    |
| 5 Risk Analysis    | Mapped to PCI-DSS requirements 6.4 (change control) and 11 (regular testing).                                        |
| 6 Test Approach    | Required: vulnerability scanning (req 11.3.1), penetration testing (req 11.4), file integrity monitoring (req 11.5). |
| 7 Test Environment | Pre-prod environment must be isolated from production CDE per req 6.5.2.                                             |
| 11 Entry Criteria  | Authenticated vulnerability scan clean within the last quarter.                                                      |
| 12 Exit Criteria   | No high-severity findings open; ASV scan attestation if external.                                                    |
| 15 Deliverables    | ROC (Report on Compliance) evidence; SAQ (Self-Assessment Questionnaire) attestation.                                |

## EU AI Act — High-risk AI systems

Applies to: AI systems in Annex III categories (CV in hiring, credit scoring, biometric ID, critical infrastructure, education, law enforcement, migration, justice).

| Required extensions                                                                    |
| -------------------------------------------------------------------------------------- |
| Conformity assessment evidence (Annex IV technical documentation).                     |
| Risk management system per Article 9 — continuous, iterative, throughout lifecycle.    |
| Test plan must include performance, robustness, cybersecurity evaluation (Article 15). |
| Fundamental rights impact assessment for public-authority deployers (Article 27).      |
| Post-market monitoring plan referenced.                                                |
| Logging requirements: automated log generation per Article 12.                         |
| Human oversight measures (Article 14) — tested before deployment.                      |

## ISO 26262 — Automotive functional safety

Applies to: electrical / electronic systems in road vehicles.

ASIL classification (A / B / C / D) drives required test rigor. Plan must reference:

- Item Definition.
- Hazard Analysis and Risk Assessment (HARA).
- Functional Safety Concept.
- Technical Safety Requirements.
- Software Test Plan per ISO 26262-6.
- Coverage requirements per ASIL (statement / branch / MC/DC).

## DO-178C — Avionics software

Applies to: airborne software certified by FAA / EASA.

Software Level (A–E) drives required objectives. Plan additions:

- Software Verification Plan (DO-178C §6).
- Test coverage targets per level (Level A: MC/DC; Level B: decision; Level C: statement).
- Independence requirements for verification activities.
- Tool qualification when test tooling output is part of certification evidence.

## NIST SP 800-53 — US Federal information systems

Applies to: federal agencies and contractors (FedRAMP, etc.).

Plan references: System Security Plan (SSP), Security Assessment Plan (SAP), Security Assessment Report (SAR). Control families relevant to testing: CA (Assessment, Authorization, Monitoring), CM (Configuration Management), SI (System and Information Integrity).

## Common extension principles across frameworks

1. **Traceability matrix is non-negotiable.** Every regulatory framework expects: requirement → design → test case → test result, bidirectionally navigable.
2. **Evidence is the artifact, not the activity.** "We tested X" is not sufficient; the test report, signed and dated, is.
3. **Independence requirements.** Some frameworks (DO-178C, IEC 61508 SIL 3+) require the test author to be independent of the implementation author.
4. **Tool qualification.** When test tooling output is evidence, the tooling itself may need qualification (DO-330, ISO 26262-8).
5. **Change control discipline.** Every change to a regulated system triggers a documented impact assessment — never silent merges.
6. **Audit trail.** Plan revisions, approvals, and execution records must survive audit (typically 7–10 years for medical / financial).

## When to use this reference

Add the relevant extension to the canonical 29119-3 template before drafting. Do **not** retrofit regulatory compliance after the plan is approved — the framework's lifecycle requirements would be missed.

If the user's domain regulation is not listed here, ask the user to name the framework and adapt the principles above.
