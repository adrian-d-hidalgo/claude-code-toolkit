# Normalization and trade-offs

Codd's normal forms eliminate specific anomaly classes from relational schemas. Each form is a constraint on functional dependencies — they are not stages of "more normalization is better."

## The forms

- **1NF** — atomic attribute values; no repeating groups in a single cell. Eliminates the "comma-separated list in a column" anti-pattern.
- **2NF** — 1NF + every non-key attribute fully depends on the entire composite key (not just part). Eliminates partial-key redundancy.
- **3NF** — 2NF + no transitive dependencies (non-key attributes do not depend on other non-key attributes). Eliminates update anomalies on attribute-of-attribute redundancy.
- **BCNF** — stricter 3NF; every determinant is a candidate key. Closes the residual 3NF anomaly cases.
- **4NF / 5NF** — eliminate multi-valued and join dependencies; rarely material in application schemas; cite them when they apply.

The practical default in OLTP relational stores is **3NF with deliberate, justified denormalisation per measured access pattern.**

## When to denormalise

Denormalisation is a deliberate trade against integrity for read-cost reduction. Use when:

- A specific read path is measured to be hot AND requires multiple joins.
- The joined attribute changes rarely (low write amplification).
- The cost of stale or inconsistent copies is bounded and acceptable.

Do not denormalise:

- Before measuring the access pattern.
- For "intuitive" performance reasons.
- When the joined attribute updates frequently (write amplification compounds).
- When integrity is regulatory (financial ledger, healthcare record).

## Common trade-offs

| Trade-off | Normalised wins when | Denormalised wins when |
|---|---|---|
| Write throughput | Reads tolerate join cost | Writes are bottleneck and reads are hot |
| Storage cost | Cardinality of repeated values is high | Cardinality low; repetition is cheap |
| Integrity surface | Same value lives in one place | Application can enforce consistency on writes |
| Query latency | Joins are fast on engine (indexed, in-cache) | Joins exceed latency budget under measured load |
| Schema evolution | Changing one attribute touches one column | Schema change must propagate to redundant copies |
| Multi-engine portability | Standard joins port across engines | Hard to port when denormalisation pattern is engine-specific |

## Anti-patterns

- **"Pre-denormalising for performance"** without measurement — pays write cost for unmeasured read benefit.
- **3NF "for its own sake"** when the access pattern is read-dominated and the join hurts — purity without justification.
- **Denormalising into a single wide table** because the engine supports it — surfaces multi-collection access patterns into one row and obscures invariants.
- **Mixing normalised and denormalised representations of the same attribute** without an authoritative source — read paths see inconsistency.

## How this maps to the modelling decision

In the `data-modeling` workflow, normalisation choice is part of step 3 (modelling family selection). Pick 3NF for OLTP relational by default; deviate only after step 5–7 (schema sketch + indexes + trade-offs) reveal a measured access pattern that warrants it.
