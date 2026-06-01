# Workload decision tree

The workload profile is the single biggest determinant of the modelling family. Pick the workload first; the family follows.

## Five workload archetypes

| Workload | Defining traits | Reader expectations | Family fit |
|---|---|---|---|
| **OLTP** | High write rate; point reads/writes by primary key; multi-row transactions; relational integrity matters | Low latency (ms); strong consistency on read-after-write | Normalised relational (3NF / BCNF); selective denormalisation per access pattern |
| **OLAP** | Read-dominant; scan-heavy aggregations; few writes (bulk); long-running queries acceptable | Sub-second to minutes; eventual consistency tolerated; rich filter dimensions | Kimball dimensional (star / snowflake); columnar storage natural |
| **Streaming** | Continuous event flow; late-arriving data; backpressure handling required | Low latency per event; replay capability; ordered processing within partition | Log-structured + schema registry; downstream projections per consumer |
| **Search** | Full-text queries; relevance ranking; faceting | Sub-second; relevance > recall trade-off explicit | Inverted-index store; document model natural |
| **Key-value / wide-column at scale** | Bounded, known access patterns; massive horizontal scale; single-region or multi-region | Single-digit ms; eventual consistency configurable per request | Single-table / wide-column design; access-pattern-first |

## Hybrid workloads — split, don't blend

When a single dataset must serve significantly different workloads (e.g., the same orders data feeding both the transactional checkout and the analytics warehouse), split into a transactional store and a derived analytical store linked by CDC or events.

Symptoms that signal a needed split:

- The same engine fights itself (write-heavy OLTP and scan-heavy OLAP queries contending for the same resources).
- Schema decisions that help one workload hurt the other (e.g., adding an aggregate column for analytics inflates write amplification on OLTP).
- The freshness SLA for analytics is dragging operational performance.

A single engine that technically serves both is not the same as a model designed for both — the latter is rare and usually time-bound.

## How the family follows from the workload

```
Workload?
├─ OLTP
│   └─ Family: normalised relational (3NF / BCNF)
│       └─ Denormalise per measured access pattern
├─ OLAP
│   ├─ Subject-area mart / business-process answer? → Kimball dimensional (star, snowflake)
│   └─ Integrated enterprise warehouse? → Inmon normalised EDW + Kimball marts on top
├─ Streaming
│   └─ Family: log-structured (append-only, schema-registry-versioned)
│       └─ Projections per consumer for read-side
├─ Search
│   └─ Family: inverted-index document model
└─ Key-value / wide-column at scale
    └─ Family: single-table or wide-column, access-pattern-first
        └─ GSIs / secondary indexes per access pattern
```

## Trade-off axes per workload

| Workload | Primary axis to weigh |
|---|---|
| OLTP | Consistency vs write throughput; integrity surface vs read cost |
| OLAP | Storage cost vs query latency; aggregate freshness vs source-fidelity |
| Streaming | Latency per event vs throughput; ordering guarantee vs partition independence |
| Search | Relevance vs recall; index freshness vs write cost |
| Key-value | Access patterns known up-front vs schema flexibility later |

The axis to weigh determines which trade-off questions the `data-modeling` workflow surfaces in step 7 (trade-offs explicit).

## Anti-patterns specific to workload classification

- **Treating "the database" as workload-neutral** — engines have biases; pretending one is workload-neutral leads to fighting the engine.
- **Calling everything OLTP** — an analytics workload modelled as OLTP suffers; an OLTP workload modelled as OLAP loses transactional integrity.
- **Streaming used as a write-buffer for a slow OLTP** — when the downstream is still OLTP-shaped, streaming added complexity without architectural benefit.
- **Skipping the hybrid split when it is needed** — pretending one model can serve both workloads gracefully; usually one of them suffers silently.

## How this maps to the modelling decision

In the `data-modeling` workflow, this reference informs step 1 (workload) and step 3 (family selection). The decision tree above is canonical; deviations from it must be justified explicitly in the trade-offs section.
