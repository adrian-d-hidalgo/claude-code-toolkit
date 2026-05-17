# MADR 3.0 extension

When to use MADR (Markdown Any Decision Records) instead of canonical Nygard:

- The project's existing ADRs already use MADR.
- The user explicitly requests MADR.
- The decision has 3+ realistic alternatives and per-option pros/cons make it more readable.

For everything else, default to Nygard. MADR adds structure at the cost of brevity.

## Schema

```markdown
# [Title — short noun phrase]

- Status: [Proposed | Accepted | Deprecated | Superseded by ADR-NNNN]
- Date: YYYY-MM-DD
- Deciders: [names or roles who reviewed and approved]
- Technical story: [link to ticket, PRD, or issue]

## Context and Problem Statement

[1–3 paragraphs describing the problem, constraints, and why a decision is needed now.]

## Decision Drivers

- [Driver 1 — e.g. "Must support 10k RPS at p95 < 80 ms"]
- [Driver 2 — e.g. "Team has prior Postgres operational experience"]
- [Driver 3]

## Considered Options

- Option A — [one-line description]
- Option B — [one-line description]
- Option C — [one-line description]

## Decision Outcome

Chosen option: "Option A", because [justification that maps back to the Decision Drivers].

### Positive Consequences

- [Consequence 1]
- [Consequence 2]

### Negative Consequences

- [Consequence 1]
- [Consequence 2]

## Pros and Cons of the Options

### Option A — [name]

- Good, because [reason 1]
- Good, because [reason 2]
- Bad, because [reason]
- Bad, because [reason]

### Option B — [name]

- Good, because …
- Bad, because …

### Option C — [name]

- Good, because …
- Bad, because …

## Links

- Refines: [link to a higher-level ADR or arc42 section]
- Refined by: [link to ADRs that elaborate this one]
- Related: [related ADRs, PRDs, tech-specs]
```

## Differences from Nygard

| Aspect               | Nygard                 | MADR                                    |
| -------------------- | ---------------------- | --------------------------------------- |
| Title                | `# ADR-NNNN: Decision` | `# Decision` (number lives in filename) |
| Status               | Section with prose     | Bullet at the top                       |
| Deciders             | Not explicit           | Required bullet                         |
| Technical story link | Not explicit           | Required bullet                         |
| Decision drivers     | Implicit in Context    | Required section                        |
| Alternatives         | Optional, short        | Required, with per-option pros/cons     |
| Length               | 1–2 pages              | 2–4 pages typical                       |

## Authoring rules specific to MADR

- **Decision Drivers must be testable.** "Performance matters" is not a driver; "p95 < 80 ms at 5k RPS" is.
- **Every option must have at least one Bad bullet.** No option is purely positive; the absence of trade-offs means the option was not analyzed.
- **The chosen option's justification must reference the drivers by number or name.** Hand-wave justifications ("it felt right") defeat the format's purpose.
- **Refines / Refined-by linking is bidirectional.** When an ADR refines another, update both files.

## Numbering and lifecycle

Same as Nygard: `NNNN-kebab-case-title.md`, sequential, immutable once accepted, supersede instead of editing. Status transitions are identical.

## Source

- MADR project: <https://adr.github.io/madr/>
- Spec v3.0: <https://github.com/adr/madr/blob/main/template/adr-template.md>
