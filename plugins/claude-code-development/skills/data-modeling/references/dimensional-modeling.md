# Dimensional modeling — Kimball

Dimensional modelling organises analytical data into **facts** (measurements of a business event) surrounded by **dimensions** (descriptive context). The four-step process is non-negotiable and the most common modelling error is skipping step 1.

## The four steps (Kimball)

1. **Pick the business process** — name the process that produced the data (e.g., "order fulfilment", "subscription renewal", "shipment despatch"). Not a system, not a table — a process the business recognises.
2. **Declare the grain** — one fact row per `<unit of observation>`. The grain must be the lowest meaningful one for the chosen process.
3. **Identify the dimensions** — descriptive attributes that contextualise the fact (customer, product, time, store, channel). Dimensions are conformed across facts that share them.
4. **Identify the facts** — measurements at the declared grain (quantity, price, count, duration). Additive over the grain if possible.

Skipping step 1 produces a model anchored to the operational schema instead of the business process — the dominant root cause of "the warehouse doesn't answer business questions."

## Star vs snowflake

- **Star** — one fact table joined to denormalised dimension tables. One join per dimension. Most reporting tools optimise for this.
- **Snowflake** — dimensions are themselves normalised across multiple tables (hierarchies). Saves storage; adds join complexity.

Default star. Snowflake only when dimension hierarchies are deep and storage matters more than query simplicity.

## Conformed dimensions

A dimension is **conformed** when it carries the same identity, attributes, and grain across every fact that references it. Conformance is what allows facts from different processes to be analysed together (e.g., orders and shipments both reference the same customer dimension and join correctly).

Failing conformance ("customer dimension in mart A is not the same as in mart B") creates the worst kind of warehouse problem — silent miscomparison.

## Slowly Changing Dimensions (SCD)

When a dimension attribute changes over time, choose the SCD type explicitly:

- **Type 0** — keep original; ignore changes. Use for immutable attributes (birth date).
- **Type 1** — overwrite. Use when history is not material to analysis.
- **Type 2** — add a new row with effective dates. Use when history matters (most common in analytical contexts).
- **Type 3** — keep a "previous value" column. Use when only the immediately prior value matters.
- **Type 6** — combination (Type 1 + 2 + 3). Use when multiple history views are needed.

SCD choice is per attribute, not per dimension — different attributes within one dimension can use different types.

## Fact types

- **Transaction fact** — one row per event at the declared grain (most common).
- **Periodic snapshot fact** — one row per period per entity (e.g., daily inventory snapshot).
- **Accumulating snapshot fact** — one row per entity with multiple date columns for milestones (e.g., order lifecycle from placement to delivery).

Pick the type that matches the analytical question, not the source-system shape.

## Anti-patterns

- **No business process declared** — the model anchors to a source table; queries that span processes return nonsense.
- **Grain not declared explicitly** — "one row per order item, sometimes one row per order" produces unsummable measurements.
- **Non-additive measures presented as additive** — averages cannot sum; percentages cannot sum across dimensions without weighting.
- **Conformance broken silently** — two marts referencing differently-defined customer dimensions; queries across them return ambiguous results.
- **SCD type chosen globally for the dimension** — different attributes need different types; pick per attribute.
- **Junk dimension dumping ground** — combining many low-cardinality flags into a single junk dimension is acceptable; using it as a catch-all is not.
- **Fact-to-fact join** — facts join to dimensions, not to each other. A fact-to-fact join usually means the model misses a shared conformed dimension.

## How this maps to the modelling decision

In the `data-modeling` workflow, dimensional modelling applies when step 3 selects an OLAP family. The four steps replace the generic schema-sketch step (step 5) — business process first, grain second, dimensions third, facts fourth, in that order.
