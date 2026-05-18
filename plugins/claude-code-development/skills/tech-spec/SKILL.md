---
name: tech-spec
description: Use when the user asks to write, draft, or scope a technical specification complementing an approved PRD. Trigger phrases include "tech spec", "technical specification", "design doc", "engineering design", "RFC for [system change]", "documento técnico", "diseño técnico", "implementation design", "platform design", "translate this PRD into engineering reality".
allowed-tools:
  - Read
  - Grep
  - Glob
---

# tech-spec skill

Produces engineering-side technical specifications that complement an approved PRD. Where the PRD answers **what and why**, the tech spec answers **how** — at a level of detail that lets engineering plan, build, and operate the change. Output is content the caller persists wherever (a file under `docs/`, a wiki page, a ticket body, an attachment to a design review). No filenames imposed.

## Methodology anchor

- **C4 model** — Simon Brown. Context · Container · Component · (rarely) Code levels. Use `claude-code-development:mermaid` skill for diagram rendering.
- **arc42** — Stefan Zörner et al. (open-source architecture-documentation template). Tech-spec is a slice of arc42; full arc42 sits adjacent in projects that adopt it.
- **ADR (Michael Nygard, 2011)** — link OUT to ADRs via `claude-code-development:adr` skill for significant decisions; never inline 3-page rationales in the spec.
- **DORA Four Keys** — for instrumentation planning (deploy frequency, lead time, MTTR, change failure rate).
- **Twelve-Factor App** — config, processes, port-binding, etc.
- **Well-Architected pillars** (cross-cloud) — operational excellence, security, reliability, performance, cost, sustainability.

For per-component threat enumeration, prefer the `claude-code-development:threat-model` skill (STRIDE / PASTA) rather than inlining a full threat model in the spec.

## What a tech spec is — and is not

A tech spec **is**:

- Anchored to an approved PRD (cite it by reference; do not duplicate).
- Engineering-detailed: architecture, contracts, data, deployment, observability, security, rollout.
- Linking out to ADRs for major decisions (one ADR per decision).
- Sized to the change: lite for low-risk, full for high-blast-radius.

A tech spec **is not**:

- A PRD (no business rationale or customer testimonials).
- A re-debate of "whether to build" (decided upstream).
- An ADR (one decision); the spec assembles many ADRs into a coherent design.
- A runbook or operational doc (those live separately, referenced from the spec).
- A development plan with task breakdown (use `claude-code-development:development-plan` + `claude-code-development:work-splitting` for that).
- Carrying a lifecycle `Status:` field — that's the project tracker's job.

## Scope and boundaries

This skill handles:

- Producing the canonical tech-spec content structure (full or lite).
- Translating PRD goals into measurable technical targets.
- Authoring API contracts as schemas (not prose).
- Authoring data models with concrete columns / indexes / migrations.
- Specifying deployment, observability, rollout, rollback explicitly.

This skill does not handle:

- Authoring the PRD (use `prd-writer` skill at user-level).
- Authoring individual ADRs (use `claude-code-development:adr`).
- Drawing diagrams (use `claude-code-development:mermaid`).
- Building threat models (use `claude-code-development:threat-model`).
- Decomposing into tasks (use `claude-code-development:development-plan` + `claude-code-development:work-splitting`).
- Implementing the code (software-developer agent).

## Canonical content structure

The full template (16 sections — Summary / PRD Context / Goals & Non-Goals / Architecture / API Contracts / Data Model / Sequence Flows / Deployment / Observability / Security & Privacy / Performance & Capacity / Failure Modes / Rollout / Open Questions / References / Approvals) lives in [`references/template.md`](./references/template.md). Read it before authoring from scratch.

For most specs, all sections apply. A **lite spec** (low-risk / small scope) collapses to: Summary · Architecture (C4 L1+L2 only) · API contracts · Data model · Rollout · Risks. The lite rules and reduction guidance live in the template reference.

## Workflow

1. **Confirm PRD exists and is approved.** If no PRD: tech-spec is acceptable for pure-platform work (Postgres upgrade, observability migration) but flag the absence explicitly. Block for product features.
2. **Read the PRD for context.** Capture: user-observable goals, constraints, scope, non-goals.
3. **Read the actual code / infra / prior ADRs.** Spec without code-grounded reading is fiction. Every component / file / symbol / service named in the spec exists in the repo (or is `to create`).
4. **Translate user-observable goals into measurable technical targets.** "Feels instant" → "p95 latency < 300 ms at expected load". Be explicit about the conversion.
5. **Draft architecture using C4 Levels 1+2.** Level 3 only where complexity warrants. Diagrams go through `mermaid` skill.
6. **Identify ADR-worthy decisions** — link OUT to ADRs (author via `adr` skill if missing). Don't inline.
7. **Define API contracts** with concrete schemas (OpenAPI / AsyncAPI / Protobuf), not prose.
8. **Specify data model** with table-level detail, indexes, migration steps (expand-contract default).
9. **Add sequence diagrams** for non-trivial flows via `mermaid`.
10. **Specify deployment, observability, security, rollout** — all four non-optional for production systems.
11. **Threat model** — for security-sensitive scope, invoke `threat-model` skill rather than inlining a brief STRIDE.
12. **Plan rollback** — what's the trigger, what's the method, how long.
13. **Run boundary self-check** before delivering.

## Self-check (boundary — mandatory before emission)

- [ ] Spec does NOT re-debate whether to build the feature (that's PRD).
- [ ] Spec does NOT contain marketing language or customer testimonials.
- [ ] Business metrics (NPS, retention) are NOT primary success criteria here (they're in PRD).
- [ ] Observability, security, rollback sections are PRESENT (not "TBD" placeholders).
- [ ] Major architecture decisions are LINKED to ADRs, not re-argued inline.
- [ ] Every named file / module / service exists in the repo or is `to create` (code-grounded).
- [ ] Diagrams use `mermaid` skill output, not ASCII art for non-trivial cases.
- [ ] API contracts are SCHEMAS (OpenAPI / AsyncAPI / Protobuf), not prose.
- [ ] Data model has indexes + migration steps, not just column lists.
- [ ] Every claim is tagged with evidence level per the engineering-team evidence-rule convention (at the plugin-root references directory) (especially capacity numbers, latency targets, cost estimates).
- [ ] NO `Status:` lifecycle field embedded.

## Output structure (suggested top-level outline)

```markdown
# Tech Spec: <Feature / System name>

> Companion PRD: <link>
> Related ADRs: ADR-NNNN (link), ADR-NNNN (link)
> Reviewers: <suggestion — never invocation>

## 1. Summary

## 2. PRD Context (one paragraph max)

## 3. Goals & Non-Goals (technical)

## 4. Architecture (C4 levels)

## 5. API Contracts

## 6. Data Model

## 7. Sequence Flows

## 8. Deployment & Topology

## 9. Observability Plan

## 10. Security & Privacy (or link to threat-model skill output)

## 11. Performance & Capacity

## 12. Failure Modes & Recovery

## 13. Rollout Plan

## 14. Open Questions

## 15. References

## 16. Approvals (caller's lifecycle)
```

Full per-section detail and worked examples in [`references/template.md`](./references/template.md).

## Anti-patterns to reject

- Tech specs that re-state the PRD instead of linking.
- 30-page specs that are really 5 ADRs glued together (use ADR skill, link out).
- Sections marked "TBD" for security or observability (non-negotiable).
- API contracts as prose instead of schema.
- Architecture diagrams without rationale (link ADR).
- Skipping rollback plan ("we'll figure it out").
- Specs that don't cite the PRD they implement.
- Hidden trade-offs — every decision has costs; surface them.
- `Status:` lifecycle field in the output.
- Component names not present in the repo (no `to create` tag, no source).

## Communication

- Engineering audience — assume technical literacy.
- Numbers over adjectives (latency, throughput, instance counts, $/month).
- Link out aggressively (ADRs, runbooks, dashboards, related specs).
- Uncertainty marked explicitly via `Open Questions` and evidence levels.
- Match depth to risk: small change → lite spec; high-blast-radius → full spec.

## Reference index

- [`references/template.md`](./references/template.md) — full 16-section canonical structure with worked examples per section + lite-spec collapse rules.
