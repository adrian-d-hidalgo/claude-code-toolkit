---
name: data-modeling
description: Use when the user asks to design or model a database schema, choose a normalization strategy, decide between OLTP and OLAP modeling, evaluate indexes / partitions / constraints, design a dimensional model (star, snowflake) versus a normalized one, anchor an analytical model to a business process, model an event-sourced or document-oriented store, or assess an existing model against access patterns. Trigger phrases include "design a schema for", "model this data", "normalization or denormalization", "star schema or normalized", "OLTP or OLAP", "access patterns first", "should this be 3NF", "review my schema", "Kimball dimensional", "fact and dimension", "document model vs relational", "single-table design", "event sourcing schema", "diseña el esquema", "modela los datos". The skill enforces access-pattern-first design, business-process anchoring for analytical models, and explicit trade-off justification — stack-agnostic; never assumes SQL, batch processing, or a specific storage engine.
allowed-tools:
  - Read
  - Grep
  - Glob
---

# data-modeling skill

Produces a structured data model decision: workload profile → access patterns → modeling family → concrete schema (or set of schemas) → indexes / partitions / constraints → trade-offs justified. The output is content the caller persists wherever (ERD doc, DDL file, design doc, ADR). No files imposed.

This skill is **stack-agnostic**. It must not assume SQL, batch processing, a specific cloud, or a particular query layer. Tools-by-stack guidance lives in the per-project CLAUDE.md / ADRs, not in this skill.

## Methodology anchor

- **Codd's normalization (1970)** — 1NF, 2NF, 3NF, BCNF for relational integrity. Reference: [`references/normalization-and-tradeoffs.md`](./references/normalization-and-tradeoffs.md).
- **Kimball dimensional modeling (1996)** — facts + conformed dimensions for analytical workloads; "pick a business process first" is the entry rule. Reference: [`references/dimensional-modeling.md`](./references/dimensional-modeling.md).
- **Inmon enterprise data warehouse (1992)** — fully normalized integrated EDW feeding subject-area marts; complementary, not in conflict, with Kimball.
- **Kleppmann _Designing Data-Intensive Applications_ (2017)** — workload-driven model selection (OLTP / OLAP / streaming), encoding evolution, late-binding.
- **Single-table design** (DeBrie 2020, AWS DynamoDB community) — access-pattern-first design for wide-column / key-value stores; one collection serving multiple entity types when access patterns demand it.
- **Event sourcing** (Fowler 2005; Vernon 2013) — model as append-only log of immutable events; derived state via projections.

## The four questions before any schema

A schema written before answering these will model the wrong shape. Answer in order:

1. **Workload** — Is this OLTP (transactional, high write rate, low-latency point reads/writes), OLAP (analytical, scan-heavy aggregations), streaming (continuous events), search, hybrid? Trade-off table in [`references/workload-decision-tree.md`](./references/workload-decision-tree.md).
2. **Consumers** — Who reads this data, with what queries, at what frequency, with what freshness SLA? List the top 5 access patterns explicitly.
3. **Producers** — Who writes this data, at what rate, with what consistency expectation (strong vs eventual)?
4. **NFRs** — Latency budget (p50, p95, p99); availability target; durability requirement; size projection at 1y, 3y, 5y; cost ceiling.

Answers shape the model. Skipping these is the dominant source of "the schema fights the queries" pain.

## Modeling family selection

The four answers above point to a family. The decision tree:

- **OLTP, relational invariants matter, multi-entity joins** → normalized relational (3NF / BCNF) with selective denormalization where measured access patterns warrant it.
- **OLAP, analytical aggregations, conformed dimensions across marts** → Kimball dimensional (star / snowflake), business-process-anchored.
- **OLAP, integrated enterprise warehouse with downstream marts** → Inmon normalized EDW + Kimball marts on top.
- **High-volume key-value / wide-column with bounded access patterns** → single-table design (one collection, multiple entity types, GSIs per access pattern).
- **Document-natural, schema-flexible, aggregate-oriented** → document model with embedded sub-entities per the aggregate-design principle (DDD).
- **Domain has natural event history, audit is first-class** → event-sourced with projection-derived read models.
- **Streaming, continuous event flow, derived views downstream** → log-structured with schema registry; downstream projections per consumer.

A model spanning workload boundaries (OLTP + OLAP in one schema) is a smell — split into a transactional store with a derived analytical store, even if the same engine can technically serve both.

## Trade-offs to surface explicitly

For every modeling decision, surface the trade-off with rationale. Common axes (with criteria for picking):

| Trade-off | Pick A when | Pick B when |
|---|---|---|
| Normalize vs denormalize | Writes dominant; joins acceptable; relational integrity matters | Reads dominant; join cost prohibitive; access patterns stable |
| Strong vs eventual consistency | Reader cannot tolerate stale | Reader tolerates staleness for availability / partition tolerance |
| Schema-on-write vs schema-on-read | Domain mature; producers few; cost of replays high | Domain exploratory; producers many / heterogeneous; cost of replays low |
| Star vs snowflake (Kimball) | Aggregate-friendly; reader optimisation primary | Storage efficiency primary; dimension hierarchies deep |
| Single-table vs multi-collection | Access patterns bounded and known; engine rewards single-key access | Access patterns evolve; multi-engine portability matters |
| Push vs pull ingestion | Producers control backpressure; latency budget tight | Producers unreliable; consumer must throttle |
| Synchronous vs asynchronous write | Read-after-write consistency required | Write throughput dominates over read latency |

A model that picks one side without naming the trade-off is `[Inference]` at best — the reader cannot tell whether the choice was deliberate or accidental.

## Indexes, partitions, constraints — first-class decisions

Treat these as part of the schema, not as performance tuning to add later:

- **Indexes** — list every index with its serving access patterns. An unindexed access pattern is a future performance incident; an unused index is write-amplification debt.
- **Partitions** — name the partition key and the rationale (even distribution, locality, retention boundary). A partition strategy that does not match access patterns creates hot partitions.
- **Constraints** — primary key, foreign keys, unique constraints, check constraints, NOT NULL. Each constraint is a runtime invariant; missing constraints push invariants into application code where drift is invisible.
- **Concurrency / isolation** — what isolation level the model requires (read-committed, repeatable-read, serializable). Many "rare bugs" are isolation-level mismatches.

## Output structure

Caller adapts to its destination (design doc, ADR, schema PR, wiki). Suggested structure:

```markdown
## Workload profile
- Workload type: <OLTP | OLAP | streaming | hybrid>.
- Top 5 access patterns: <ranked, with frequency and latency budget>.
- Producers + write rate + consistency expectation.
- NFRs: latency (p50/p95/p99), availability, durability, size projection, cost ceiling.
- Evidence level: [Verified | Inference | Unverified | Verified-external — <source>]

## Business process anchor (analytical models only)
- Process modelled: <e.g., "order fulfilment", "subscription renewal">.
- Grain of the fact: <one fact row per …>.

## Model
- Family: <normalized | Kimball star | Kimball snowflake | document | single-table | event-sourced>.
- Entities (or facts + dimensions, or aggregates, or event types).
- Relationships / references.
- Schema (DDL agnostic — names + types + constraints).
- ERD (textual or Mermaid via the `mermaid` skill).

## Indexes, partitions, constraints
- Indexes: <name, columns, serving access patterns>.
- Partition strategy: <key, rationale, expected distribution>.
- Constraints: <PK, FK, UNIQUE, CHECK, NOT NULL — each with rationale>.
- Isolation / concurrency expectations.

## Trade-offs and rationale
- Decision: <e.g., chose denormalised join column on `orders.customer_email`>.
- Rationale: <which access pattern, which trade-off axis, what was given up>.
- Evidence level per row.

## Alternatives considered and rejected
- <Alternative>: rejected because <criterion>.

## Open questions
- <Questions for the caller / architect / data consumer>.
```

## Workflow

1. **Answer the four questions** — workload, consumers, producers, NFRs. Refuse to model without them; ask explicitly if unknown.
2. **Enumerate access patterns** — top 5, ranked by frequency × latency-sensitivity.
3. **Select the modeling family** via the decision tree.
4. **Anchor analytical models to a business process** (Kimball) — name it before naming the fact.
5. **Sketch the schema** — entities / facts / aggregates / event types, relationships, types, constraints.
6. **Place indexes and partitions** per access pattern.
7. **Surface trade-offs** explicitly with rationale.
8. **Tag every claim** per `${CLAUDE_PLUGIN_ROOT}/references/evidence-rule.md`.
9. **List alternatives considered and rejected** with the criterion for rejection.
10. **Self-check** before emission.

## Self-check (mandatory)

- [ ] The four questions are answered (workload, consumers, producers, NFRs).
- [ ] Top 5 access patterns enumerated with frequency + latency budget.
- [ ] Modeling family choice justified against the decision tree.
- [ ] Analytical models name the business process before the fact.
- [ ] Indexes listed with serving access patterns.
- [ ] Partition strategy named (or "single-partition justified by <criterion>").
- [ ] Constraints listed with rationale per constraint.
- [ ] Trade-offs surfaced (not implied).
- [ ] Alternatives considered and rejected listed.
- [ ] No stack assumption baked in (no SQL-only, batch-only, cloud-only, single-engine assumptions).
- [ ] Every claim tagged with an evidence level.
- [ ] No `Status:` or other tracker-lifecycle field embedded.

## Anti-patterns to reject

- **Schema before access patterns** — modelling the entities first and the queries later inverts the design and produces "the schema fights the queries."
- **Copying the source-system schema into the warehouse** — analytical models should be anchored to the business process, not to the operational schema.
- **Fixed time granularity** — hardcoding a day / hour grain in the fact table couples the model to current reporting needs; favour the finest meaningful grain.
- **Hidden trade-offs** — choosing denormalisation without surfacing what was given up (write cost, integrity surface) reads as accidental.
- **Indexes added "later"** — indexes are part of the schema, not tuning. Same for partitions and constraints.
- **Single store for OLTP + OLAP** — when the workloads are both significant, split with a derived analytical store; same engine technically serving both is not the same as designing for both.
- **Coupling to a specific engine** — Postgres-only syntax, DynamoDB-only access patterns, dbt-only transformation idioms. Express decisions in terms of concepts; cite engines only as examples.
- **Treating documents as "schemaless"** — document stores have schemas; they are just enforced at read time. Surface the implicit schema.
- **Strong consistency by default everywhere** — pays a coordination cost that not every consumer needs; ask the consumer.
- **Modelling without naming the consumer** — "we'll figure out the queries later" almost always loses to "the queries we designed for now."

## Communication

- Lead with **workload + business process + family choice**; readers need the bottom-line model shape first.
- Surface trade-offs explicitly per decision. A reader cannot evaluate a model whose trade-offs are implied.
- Tag every modelling claim with an evidence level per `${CLAUDE_PLUGIN_ROOT}/references/evidence-rule.md`.
- Never bake a stack into the model. Mention engines as examples or appendix only.

## Scope and boundaries

This skill handles:

- Selecting the modelling family by workload and access patterns.
- Producing a schema sketch with constraints and indexes.
- Surfacing trade-offs and rejected alternatives.
- Anchoring analytical models to business processes.

This skill does not handle:

- Choosing the storage engine — that is `software-architect`'s decision (relational vs document vs columnar vs streaming engine).
- Implementing migrations — that is `schema-evolution` for the plan, `software-developer` for the execution.
- Data-quality tests — strategy is `quality-engineer`; data-engineer plans data-contract tests via the schema-evolution skill.
- Pipeline orchestration / scheduling — out of scope; lives in CI/CD or platform tooling.
- ADR authoring — invoke `adr` skill when the modelling decision is architecturally significant.

## Reference index

- [`references/normalization-and-tradeoffs.md`](./references/normalization-and-tradeoffs.md) — 1NF/2NF/3NF/BCNF with trade-offs.
- [`references/dimensional-modeling.md`](./references/dimensional-modeling.md) — Kimball star/snowflake, conformed dimensions, business-process anchoring.
- [`references/workload-decision-tree.md`](./references/workload-decision-tree.md) — OLTP/OLAP/streaming/hybrid → family selection.
- `${CLAUDE_PLUGIN_ROOT}/references/evidence-rule.md` (plugin-root) — citation convention for claims.
- `${CLAUDE_PLUGIN_ROOT}/references/code-grounded-analysis.md` (plugin-root) — read existing schemas, queries, and consumers before proposing changes.
