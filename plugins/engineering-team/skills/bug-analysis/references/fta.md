# Fault Tree Analysis (FTA) — when bugs have multiple converging causes

Source: Bell Labs (Watson, 1962) for missile-systems reliability analysis; standardised in NUREG-0492 (NRC, 1981). Used in safety-critical industries (aerospace, nuclear, medical devices) and applicable to complex software incidents.

## The idea

For bugs that require **multiple simultaneous conditions** to manifest, the 5-Whys linear chain misses the structure. FTA represents the failure as a **tree of events** combined by AND / OR gates:

- **AND gate**: all child events must occur for the parent event.
- **OR gate**: any child event occurring causes the parent.

The **top event** is the observed symptom. Working downward decomposes it into combinations of more elementary causes (basic events).

## Simple notation

```
        TOP EVENT (observed symptom)
        |
       AND
       / \
      /   \
   E1     E2
   (basic) |
          OR
          /\
         /  \
        E3   E4
       (basic)(basic)
```

Read as: TOP happens when E1 AND (E3 OR E4) all occur.

## When to use vs 5 Whys + Ishikawa

| Pattern of failure                                    | Best tool      |
| ----------------------------------------------------- | -------------- |
| Single chain of cause-and-effect                      | 5 Whys         |
| Multiple contributing factors, weakly coupled         | Ishikawa       |
| Multiple necessary conditions that ALL fired together | FTA            |
| Safety-critical, regulated context (FDA / aviation)   | FTA (mandated) |

If removing any one contributing factor would have prevented the bug → FTA (the gate is AND between them).

If the bug would have happened anyway with any single factor → 5 Whys (one chain dominates).

## Worked example — race condition in checkout

**Top event**: User charged twice for one order.

```
     User charged twice
            |
           AND
          / | \
         /  |  \
        E1  E2  E3
```

Where:

- **E1**: User clicks "Pay" twice within 500ms ([Verified — session-replay logs]).
- **E2**: Endpoint is not idempotent ([Verified — `src/api/checkout.ts:42` — no idempotency-key handling]).
- **E3**: Front-end button is not debounced ([Verified — `web/checkout/PayButton.tsx:18`]).

All three were necessary. Fixing any one prevents the bug. The fix proposal should pick the most cost-effective single mitigation OR fix multiple for defence in depth.

This decomposition is invisible in a 5-Whys chain ("Why double charge? → Endpoint not idempotent. Why? → Was deemed unnecessary..."). FTA exposes that three independent gaps had to align.

## When NOT to use

- Most software bugs are linear-cause-chain — FTA is overkill, use 5 Whys.
- Quick triage where speed of analysis matters more than rigour.
- Bugs already understood — FTA is for analysis, not communication.

## Anti-patterns

- **FTA for trivial bugs**: ceremony without value.
- **Tree that grows too deep**: more than 4 levels suggests bad decomposition or mixing levels of abstraction.
- **Gates inverted**: AND vs OR matters; double-check. AND = all required; OR = any sufficient.
- **Basic events that aren't basic**: a "basic event" should be directly observable / verifiable. If a leaf still requires further analysis, it's not basic — keep decomposing.

## Output in `bug-analysis`

Use sparingly. Include FTA only when the failure genuinely required multiple converging conditions. In that case, render the tree as a Mermaid `flowchart` or as nested bullet points. Keep it to one tree per analysis; if the situation has multiple distinct top events, run separate analyses.

## Cross-reference

- For depth-first single chain: [`5-whys.md`](./5-whys.md).
- For breadth-first categorisation: [`ishikawa.md`](./ishikawa.md).
