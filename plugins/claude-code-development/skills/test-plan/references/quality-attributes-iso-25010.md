# ISO/IEC 25010:2023 — Quality attributes for test planning

The 2023 revision lists **10 product quality characteristics**, each decomposed into sub-characteristics. The 2023 edition added **Safety** and **Flexibility** as top-level attributes alongside the 8 from the 2011 edition.

Pick the attributes that matter for **this** change. Blanket-covering all 10 is waste; ignoring relevant ones is a gap.

## The 10 attributes

### 1. Functional Suitability

Whether the system does what it is supposed to do.

- Sub-characteristics: Functional completeness, functional correctness, functional appropriateness.
- Default test types: unit, integration, E2E, contract.
- Skip when: this change does not alter behavior visible to any caller.

### 2. Performance Efficiency

How well the system performs under expected and stress conditions.

- Sub-characteristics: Time behavior, resource utilization, capacity.
- Default test types: load (k6, Gatling), stress, soak, spike, profiler-based hot-path analysis.
- Skip when: change touches only build-time logic or non-runtime code.

### 3. Compatibility

How well the system interoperates and coexists with other systems / versions.

- Sub-characteristics: Co-existence, interoperability.
- Default test types: contract (Pact), API version regression, cross-browser, cross-platform.
- Skip when: internal-only change with no consumer.

### 4. Usability

How well users can operate the system to achieve their goals.

- Sub-characteristics: Appropriateness recognisability, learnability, operability, user error protection, user interface aesthetics, accessibility.
- Default test types: usability sessions, A/B tests, accessibility scans (axe-core, Pa11y, WCAG 2.2 AA), heuristic evaluation.
- Skip when: change is purely backend with no UX surface.

### 5. Reliability

How well the system maintains its level of performance under stated conditions.

- Sub-characteristics: Maturity, availability, fault tolerance, recoverability.
- Default test types: chaos (Litmus, Chaos Mesh, AWS FIS), failover drills, retry / circuit-breaker tests, RTO / RPO drills.
- Skip when: stateless change with no failure recovery semantics.

### 6. Security

How well the system protects information and data.

- Sub-characteristics: Confidentiality, integrity, non-repudiation, accountability, authenticity, resistance.
- Default test types: SAST (Semgrep, CodeQL), DAST (ZAP, Burp), dependency scan (osv-scanner, Snyk), penetration testing.
- Skip when: change has no authentication, authorization, data handling, or trust boundary.

### 7. Maintainability

How well the system can be effectively and efficiently modified.

- Sub-characteristics: Modularity, reusability, analysability, modifiability, testability.
- Default test types: architecture tests (dependency-cruiser, ts-arch, ArchUnit), complexity metrics (gocyclo, radon, sonarjs), mutation testing (Stryker, mutmut, PIT).
- Skip when: change is a one-off script with no future evolution expected.

### 8. Portability

How well the system can be transferred between environments.

- Sub-characteristics: Adaptability, installability, replaceability.
- Default test types: cross-OS smoke, container portability, install / uninstall lifecycle.
- Skip when: deployment target is fixed and not changing.

### 9. Safety (added in 2023)

How well the system avoids unacceptable risks to human life, health, property, or environment.

- Sub-characteristics: Operational constraint, risk identification, fail-safe, hazard warning, safe integration.
- Default test types: hazard analysis (FMEA), fail-safe verification, watchdog tests.
- Required when: medical, automotive, aerospace, industrial control. Optional for general software unless lives depend on uptime.

### 10. Flexibility (added in 2023)

How well the system adapts to changes in requirements or environment.

- Sub-characteristics: Adaptability, scalability, extensibility, modifiability.
- Default test types: scale-out / scale-in drills, feature-flag rollout tests, A/B harness validation, configuration-change drills.
- Skip when: system has a fixed configuration and no expected variance.

## Picking attributes for a plan

1. Walk the 10 attributes. For each, ask: "Does this change affect this attribute?"
2. Default-include Functional Suitability for any behavioral change.
3. Include Security, Performance, Reliability when the change touches their surface.
4. Include Usability and Accessibility for any UI change.
5. Include Safety for regulated domains.
6. Skip silent attributes — every attribute included costs test budget; do not pay for nothing.

## Output format in a test plan

In Section 6.1 of the plan (Test Approach), list **each in-scope attribute** with the test types and tools chosen. Mark out-of-scope attributes in 6.2 with rationale.

Example:

| In scope                  | Why                          | Test types                            | Tools                              |
| ------------------------- | ---------------------------- | ------------------------------------- | ---------------------------------- |
| Functional Suitability    | New checkout flow added      | Unit, integration, E2E                | Vitest, testcontainers, Playwright |
| Performance Efficiency    | p95 latency budget < 300 ms  | Load, smoke                           | k6                                 |
| Security                  | Handles PII (email, address) | SAST, dep-scan, threat-model review   | Semgrep, osv-scanner               |
| Accessibility (Usability) | Public-facing UI             | Automated a11y + manual screen-reader | axe-core, Playwright a11y          |

Out of scope:

| Attribute   | Why out                                         |
| ----------- | ----------------------------------------------- |
| Portability | Single-platform deploy; no new platform target. |
| Safety      | Not a regulated domain.                         |
| Flexibility | No configuration surface changed.               |

## Source

- ISO/IEC 25010:2023 — Systems and software engineering — Systems and software quality models — Product quality model.
- ISO/IEC 25023:2016 — Measurement of system and software product quality (companion measurement standard).
