# PASTA — Process for Attack Simulation and Threat Analysis

Source: Marco Morana, Tony UcedaVelez, _Risk-Centric Threat Modeling: Process for Attack Simulation and Threat Analysis_ (Wiley, 2015).

## When to use PASTA over STRIDE

| Situation                                                               | Methodology |
| ----------------------------------------------------------------------- | ----------- |
| Quick component-by-component threat enumeration                         | STRIDE      |
| Need to tie threats to business risk (regulated, SOC2, board reporting) | PASTA       |
| Multi-team / cross-functional security review                           | PASTA       |
| Need attack-simulation rigour (red-team prep)                           | PASTA       |
| Low-stakes feature / simple surface                                     | STRIDE      |

STRIDE is technical-first; PASTA is business-first. They produce different artefacts and answer different questions.

## The seven stages

### Stage 1 — Define business objectives

State the business outcome the system enables. What does loss-of-it cost? What regulations apply?

- Example: "checkout service enables $X/year revenue; downtime SLA: 99.95%; PCI-DSS L1 in scope".
- Output: stated business objectives + regulatory scope.

### Stage 2 — Define technical scope

Enumerate technical assets: services, endpoints, data stores, third-party dependencies, network topology, deployment topology.

- Read the actual infrastructure (`infra/`, `terraform/`, `helm/`) — every named asset exists.
- Output: asset inventory.

### Stage 3 — Application decomposition

Decompose the application into components and trust boundaries. Map data flows.

- Often rendered as a data-flow diagram (DFD) — use the `mermaid` skill if visualising.
- Output: component map + DFD + trust-boundary inventory.

### Stage 4 — Threat analysis

Identify threats per component. STRIDE can be embedded here for the per-component enumeration, OR use MITRE ATT&CK technique mapping for adversary-aligned analysis.

- Output: threat catalogue with attacker-objective framing.

### Stage 5 — Vulnerability analysis

For each threat, identify vulnerabilities (specific weaknesses) that enable it.

- Cite CVEs, CWEs, observed weaknesses in code (read the code), known-issue tickets.
- Output: vulnerability list mapped to threats.

### Stage 6 — Attack simulation

Walk through plausible attack paths combining vulnerabilities. Often rendered as attack trees (Schneier 1999).

- For high-stakes targets, can be paired with active red-teaming (out of scope for this skill — separate engagement).
- Output: attack-path narratives.

### Stage 7 — Risk + impact analysis

Tie attack paths back to business objectives (Stage 1). Score business-impact, likelihood. Produce risk-prioritized mitigation plan.

- Use FAIR (Factor Analysis of Information Risk, 2005) or qualitative L/M/H if FAIR is overkill.
- Output: prioritised mitigation roadmap with business-risk rationale.

## How this skill applies PASTA

For PASTA invocations, emit content per stage (or a subset the user requests):

```markdown
## Stage 1 — Business objectives

- …

## Stage 2 — Technical scope

- …

## Stage 3 — Application decomposition (with DFD)

- …

## Stage 4 — Threat analysis

- … (STRIDE-per-component can be used here)

## Stage 5 — Vulnerability analysis

- …

## Stage 6 — Attack simulation

- … (attack tree if helpful)

## Stage 7 — Risk + impact + mitigation roadmap

- …
```

For partial-PASTA requests ("just stages 3 + 4" or "PASTA stages 1-3 only — we'll do 4-7 after the architect is done"), produce what was asked.

## Anti-patterns

- **PASTA for a simple feature**: ceremony. Use STRIDE.
- **Skipping Stage 1 / Stage 7**: those are the business-anchoring stages. Skipping them turns PASTA into STRIDE with extra paperwork.
- **Quantitative business-impact numbers without finance input**: "$8M loss in 24h downtime" requires finance team buy-in. Tag as `[Inference]` or `[Unverified]` if you're estimating.
- **Attack tree without basic events at the leaves**: leaves should be actions a real attacker could perform. "Attacker compromises CEO laptop" without a method is not a leaf.

## Cross-reference

- For per-component depth inside Stage 4: [`stride.md`](./stride.md).
- For trust boundaries (used in Stage 3): [`trust-boundaries.md`](./trust-boundaries.md).
- Schneier attack trees: external reading (Schneier, _Attack Trees_, 1999).
- FAIR risk quantification: external (Open Group, FAIR Standard).
