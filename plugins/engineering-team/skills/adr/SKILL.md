---
name: adr
description: Use when the user asks to write, draft, capture, supersede, or document an Architecture Decision Record. Trigger phrases include "ADR", "architecture decision record", "decision record", "registro de decisión", "design decision doc", "RFC for [architecture change]", "document this decision", "supersede ADR-NNNN", "write the decision for [X]".
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(ls *)
---

# ADR skill

Produces Architecture Decision Record **content** using Michael Nygard's canonical format. Each ADR captures **one** architecturally significant decision in a way that survives team turnover and helps future readers understand why the system is the way it is. The output is content the caller persists wherever (a file under `docs/adr/`, a wiki page, an attachment to a design review). The skill does **not** write files — caller decides storage and naming.

## Methodology anchor

- **Canonical format**: Michael Nygard, _Documenting Architecture Decisions_ (2011). This skill uses Nygard by default.
- **Extended variant**: MADR (Markdown Any Decision Records) 3.0 — more structured, adds Decision Drivers and per-option pros/cons. Used only when the project's existing ADRs are MADR, or the user explicitly requests it. See `references/madr-extension.md` for the full schema.
- **Slot in arc42**: ADRs fit arc42 Section 9 (Architecture Decisions) when the project uses arc42 for broader architecture documentation.

## What an ADR is — and is not

An ADR **is**:

- A single, scoped decision (one ADR = one decision).
- Immutable once accepted (do not edit; supersede with a new ADR).
- Numbered sequentially (`0001-`, `0002-`, …) and ordered chronologically.
- Short — 1 to 2 pages typically.
- Versioned in the repo it documents (`docs/adr/`, `architecture/decisions/`).

An ADR **is not**:

- A PRD (those are product, not architecture).
- A design exploration ("we might do X or Y") — write an RFC for exploration; an ADR records what was chosen.
- A runbook or operational doc.
- A long technical spec — that is a different artifact; ADRs reference tech-specs.

## Canonical ADR structure (Nygard)

```markdown
# ADR-NNNN: [Short noun phrase capturing the decision]

## Status

[Proposed | Accepted | Deprecated | Superseded by ADR-NNNN]

Date: YYYY-MM-DD

## Context

[The forces at play, including technological, political, social, and project-local. Describe the problem and constraints in 1-3 short paragraphs. Cite related ADRs, PRDs, or tech-specs.]

[Use neutral, factual language. State the situation, not preferences. Mention deadlines and resource constraints if they shape the decision.]

## Decision

[The change being proposed or made, in active voice: "We will use Postgres for transactional state" — not "Postgres should be used".]

[One paragraph for simple decisions. For complex ones, use a numbered list of components of the decision.]

## Consequences

[What becomes easier or harder because of this decision. Both positive and negative consequences. This is the most-read section in 6 months when someone asks "why did we do this?"]

**Positive**:

- [consequence]

**Negative / trade-offs**:

- [consequence]

**Neutral**:

- [consequence — operational impact, learning curve, etc.]
```

Optional sections — include only when they add value:

```markdown
## Alternatives Considered

- **Option A**: [name] — rejected because [reason]
- **Option B**: [name] — rejected because [reason]

## References

- Related ADRs: ADR-NNNN [title]
- Related PRDs: [link]
- External sources: [docs, RFCs, papers]
```

## Numbering convention

- Format: `NNNN-kebab-case-title.md` (e.g., `0042-use-postgres-for-transactional-state.md`).
- Sequential, never reused (even after deprecation).
- Find the next number by listing files in the ADR directory and incrementing the highest.

## Status transitions

| From → To                         | When                                                      |
| --------------------------------- | --------------------------------------------------------- |
| (new) → Proposed                  | First draft, awaiting review.                             |
| Proposed → Accepted               | Reviewed and adopted.                                     |
| Proposed → Rejected               | Reviewed and not adopted (rare to keep — usually delete). |
| Accepted → Deprecated             | Decision no longer recommended; not yet replaced.         |
| Accepted → Superseded by ADR-NNNN | Replaced by a newer decision; old ADR points to new one.  |

When superseding: the OLD ADR's status changes (with a link to the new one); the OLD content stays untouched. The NEW ADR explicitly states "Supersedes ADR-NNNN" in its Context section.

## Workflow

1. **Verify it's a decision**, not exploration. If the user is exploring options, suggest writing an RFC first; the ADR comes after the decision.
2. **Find the ADR directory.** Common paths: `docs/adr/`, `docs/architecture/decisions/`, `architecture/decisions/`. If none exists, ask the user where to create it.
3. **Find the next number.** List existing ADRs, take the highest, add 1, zero-pad to 4 digits.
4. **Write a short noun-phrase title** describing the decision (not the question). "Use Postgres for transactional state" — not "What database to use".
5. **Capture Context concisely.** Forces, constraints, related work. Do not editorialize; state facts.
6. **State the Decision in active voice.** "We will…". Crisp, unambiguous.
7. **Enumerate Consequences honestly.** Trade-offs visible. The negative consequences section **must** be filled — if you cannot list any, the decision is not really being weighed.
8. **List alternatives considered** briefly (optional but encouraged). Why each was rejected.
9. **Link to related ADRs / PRDs / tech-specs.**
10. **Set status appropriately.** New ADRs are usually `Proposed` and move to `Accepted` after review. Do not write directly to `Accepted` unless the decision is already taken.

If the underlying decision is unclear, ask the user one focused clarifying question before drafting.

## Output contract

Produce a single markdown file at the correct path with the correct number. After writing, output a summary:

```
ADR-NNNN created: <title>
Path: <path>
Status: <status>
Length: <lines>
Next steps: review with <stakeholders> and update Status to Accepted upon approval
```

## Examples

### Good title

> ADR-0042: Use Postgres for transactional state

(Noun phrase; decision is in the title.)

### Bad title

> ADR-0042: Database choice
> ADR-0042: Should we use Postgres or DynamoDB?

(Too vague / phrased as a question.)

### Good Context paragraph

> Our current event-sourced storage in DynamoDB satisfies query patterns for the catalog read API but causes complexity for the new ledger service, which requires multi-row ACID transactions. The ledger team has 6 weeks to ship the MVP and the org has prior Postgres operational experience.

### Bad Context paragraph

> We need to pick a database. Postgres is good but DynamoDB is also good. After a lot of discussion we decided…

(Editorializing, lacks specific forces.)

### Good Consequences section

> **Positive**:
>
> - ACID transactions natively supported
> - Existing team operational experience
> - Strong tooling (pgcli, pg_dump, pgbouncer)
>
> **Negative**:
>
> - Adds a second database technology to operate
> - Introduces failover complexity (Patroni or RDS Multi-AZ)
> - Cross-database queries require app-level joins
>
> **Neutral**:
>
> - Schema migration tooling (Flyway/Liquibase) needs to be added to CI

## Anti-patterns to reject

- ADRs that are 10+ pages — that is a tech-spec, not an ADR.
- ADRs without negative consequences listed.
- Editing an Accepted ADR (supersede with a new one instead).
- ADRs that document multiple decisions in one file.
- Status fields that do not match reality ("Accepted" but never reviewed).
- ADRs without numbers or with reused numbers.
- ADRs without dates.
- Vague decisions like "We will improve our caching" — which cache, what change, in what scope?
- Marketing-speak ("revolutionary new approach").

## Communication

- Lead with the decision, not the analysis. Readers want to know **what** was decided.
- Quote constraints (deadlines, team skills, budget) when they shape the decision.
- Honest trade-offs build trust; sanitized ADRs lose value fast.
- Cite sources (RFCs, vendor docs) so readers can dig deeper.

## Reference index

- [`references/madr-extension.md`](./references/madr-extension.md) — MADR 3.0 variant for projects that use it.
