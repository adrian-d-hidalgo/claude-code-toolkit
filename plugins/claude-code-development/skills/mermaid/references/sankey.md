# sankey

**Notation anchor**: Sankey diagram (Matthew Henry Phineas Riall Sankey, 1898) — directed flow where line width represents quantity.
**Best for**: flow quantities (energy, traffic, conversion funnels, money flow, attribution).
**Mermaid version**: stable since v10.3 (named `sankey-beta` in early versions; alias remains).

## Syntax skeleton

```
sankey-beta

Visitors,Landing page,1000
Landing page,Pricing page,400
Landing page,Bounce,600
Pricing page,Signup form,180
Pricing page,Exit,220
Signup form,Activated user,90
Signup form,Abandoned signup,90
```

## Structure

- Header: `sankey-beta` (or `sankey` in current versions; both work).
- Rows: `source,target,value` — CSV-style.
- Each row defines one **flow** from source to target with a numeric magnitude.
- Sources and targets are created implicitly by appearing in any row.

## Conventions

- Use a single unit consistently (units = visitors, € spent, watts, requests, etc.). Sankey makes proportions visible; mixing units silently misleads.
- Source on the left, target on the right by default. Mermaid arranges nodes by data flow.
- Width of the band = value. Larger bands draw more attention.
- For conversion funnels, "leakage" flows (Bounce, Exit, Abandoned) make drop-off visually obvious.

## Gotchas

- Sankey rejects rows with non-numeric values silently. Validate the third column is a number.
- Negative values are not supported. For "outflow" or "loss", model as a flow to a sink node ("Lost", "Refunded", etc.).
- The diagram can be wide. For >8 flow stages or >25 nodes, consider splitting into two diagrams (per stage / per dimension).
- Mermaid auto-colors each band — do not expect categorical color mapping. For brand-aligned colors, export to a real charting library.

## Worked example — signup funnel

```
sankey-beta

Marketing site visitor,Pricing page,1000
Marketing site visitor,Other page,2500
Marketing site visitor,Bounce,6500

Pricing page,Signup form,300
Pricing page,Exit,700

Signup form,Email verified,180
Signup form,Abandoned at email,120

Email verified,Onboarded,120
Email verified,Stalled,60

Onboarded,Active week 1,90
Onboarded,Inactive,30
```

This shows where users drop in the funnel at a glance — most marketing visitors bounce; of pricing-page visitors, most leave without signup; of signups, most complete email verification but a third stall after.

## Worked example — energy flow audit

```
sankey-beta

Grid input,Building,1000
Solar panels,Building,200

Building,Lighting,150
Building,HVAC,500
Building,Servers,250
Building,Outlets,200
Building,Idle / loss,100

HVAC,Cooling,300
HVAC,Heating,150
HVAC,Ventilation,50

Servers,Compute,180
Servers,Idle / waste,70
```

Two inputs (grid + solar), one main consumer (Building) split into 5 buckets, two further decomposed.

## Worked example — money flow / attribution

```
sankey-beta

Revenue,COGS,400
Revenue,Gross profit,600

COGS,Cloud infra,180
COGS,Third-party APIs,120
COGS,Support,100

Gross profit,Salaries,400
Gross profit,Marketing,80
Gross profit,R&D,60
Gross profit,Operating margin,60
```

## When to use a different diagram

- For **stage-by-stage counts** without flow continuity, use a `bar chart` (`xychart-beta`).
- For **proportions at a single point** (no flow), use `pie`.
- For **paths through a system** (not quantities), use `flowchart`.

Sankey shines when the question is "where does the quantity go" — when width has to encode magnitude.
