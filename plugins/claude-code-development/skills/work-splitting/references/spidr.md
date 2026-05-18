# SPIDR — Mike Cohn's 5 splitting techniques

Source: Mike Cohn, refinement of his story-splitting work within the Agile Estimating & Planning lineage (~2017). SPIDR is a memorable 5-letter mnemonic: **S**pike · **P**ath · **I**nterface · **D**ata · **R**ules.

## §1 — Spike

An unknown blocks estimation; produce a time-boxed investigation task whose deliverable is a **decision + evidence**, not production code.

**When to use**:

- "I don't know if X is feasible / fast enough / available on our plan / compatible with Y."
- The estimate ranges from "small" to "huge" with no clear midpoint.
- A POC will collapse the range.

**Discipline**:

- Time-box: 1–3 days typical (longer is suspect).
- Objective **exit criterion**: a measurable / observable thing that ends the spike. "Verified that pgvector handles 50M vectors at p95 < 100ms on r6i.4xlarge with HNSW index" — not "explored vector databases".
- The spike's output is a **decision document** (or a paragraph) the downstream work can consume.

**Anti-pattern**: open-ended "research" with no exit criterion. Becomes a rabbit hole.

## §2 — Path

The same capability is reached via multiple paths (different URLs, different entry points, different API endpoints, different parameter combinations).

**When to use**: "Users can search products via the search bar, the category filter, OR a direct URL with query params" — three paths to the same capability.

**Split**: one path per sub-item. Ship the most-used path first.

**Example**:

- S-01: Search via search bar (highest usage)
- S-02: Search via category filter
- S-03: Search via deep-link URL with query params

## §3 — Interface

The same capability is exposed through multiple interfaces (UI, API, CLI, mobile native, webhook, etc.).

**When to use**: "Users can mute notifications from the web UI, the mobile app, and the API" — three interfaces, one capability.

**Split**: one interface per sub-item. Ship the highest-leverage interface first (usually the one the most users touch, or the one that unblocks downstream consumers).

**Example**:

- S-01: Mute via web UI (highest usage)
- S-02: Mute via mobile app
- S-03: Mute via REST API (unblocks integrations)

## §4 — Data

The same capability handles multiple data types, formats, sources, or schemas.

**When to use**: "Import contacts from CSV, vCard, and Google Contacts" — three data sources, one capability.

**Split**: one data type / source per sub-item.

**Example**:

- S-01: Import from CSV (most common)
- S-02: Import from vCard
- S-03: Import from Google Contacts (depends on OAuth scope work)

Often overlaps with Lawrence §5 (data variations) — they're the same idea.

## §5 — Rules

Multiple business rules bundled in one item.

**When to use**: "Apply discounts: percentage OR flat-amount OR free-shipping, with cap of $50 per order" — multiple distinct rules.

**Split**: one rule per sub-item; the cross-cutting cap becomes a shared enabler or a constraint applied incrementally.

**Example**:

- S-01: Apply percentage discount (no cap yet)
- S-02: Apply flat-amount discount
- S-03: Apply free-shipping discount
- S-04 (Enabler): Enforce $50/order cap across all discount types

Overlaps with Lawrence §2 (business-rule variations).

## Choosing among S / P / I / D / R

| Trigger in the description                            | Letter |
| ----------------------------------------------------- | ------ |
| Unknown / "we'd need to investigate"                  | **S**  |
| Multiple paths to the same place                      | **P**  |
| Multiple interfaces / channels (UI, API, CLI, mobile) | **I**  |
| Multiple data types, formats, sources                 | **D**  |
| Multiple business rules combined                      | **R**  |

Multiple letters can apply. Cite which letter(s) you applied: "SPIDR — S then I" means "first spike the unknown, then split per interface".

## Anti-patterns

- **Spike that produces code, not a decision**: the deliverable of S is evidence + a decision, not a prototype merged to main. If the spike ships code, it was a Story, not a Spike.
- **Path split that bundles paths sharing 99% of code**: if all paths boil down to one function call with different params, splitting adds ticket overhead without reducing risk. Just implement the function and the wiring; don't split.
- **Interface split that delivers no usable interface alone**: each I split must be independently usable. Shipping "the data layer that no UI uses yet" violates Interface — that's a horizontal slice.
- **Data split bundling sources with no separate value**: if all three import sources route to the same parser with format-detection, the split is artificial. Just implement.
- **Rules split that ships no usable rule alone**: each R split must enforce a usable rule independently.

## Cross-reference

Reference INVEST quality bar from `../../development-plan/references/decomposition.md` §2. Each SPIDR sub-item passes INVEST.
