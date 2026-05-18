# DREAD — qualitative severity language only

Source: Microsoft, ~2003. Formally deprecated by Microsoft (2010) for quantitative use; still commonly invoked as a qualitative aide-mémoire.

## The five dimensions

| Letter | Dimension                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------- |
| **D**  | **Damage** — what's the worst case if exploited? (data loss, financial, reputational, compliance impact) |
| **R**  | **Reproducibility** — how reliably can the attack be repeated?                                           |
| **E**  | **Exploitability** — how much skill / access is needed?                                                  |
| **A**  | **Affected users** — what fraction of users / data is affected?                                          |
| **D**  | **Discoverability** — how easy is it for an attacker to find the vulnerability?                          |

## Why quantitative DREAD is deprecated

Microsoft's original framework asked teams to score each dimension 1–10 and sum them, producing a "DREAD score" out of 50. Two problems:

1. **Non-comparable**: a score of 7 in Damage means different things to different teams. Inter-rater reliability is poor.
2. **Scores aren't risk**: summing 10 across the five doesn't capture the actual likelihood × impact distribution. CVSS does this better with a documented vector.

Microsoft moved to STRIDE + CVSS for quantitative work. Use CVSS 3.1 vectors when you need a comparable score across findings.

## Why qualitative DREAD is still useful

DREAD's five dimensions are a **useful checklist** when discussing severity informally:

- During a threat review meeting, asking "what's the D-R-E-A-D on this?" produces five focused conversations.
- The "Discoverability" axis is especially useful — STRIDE doesn't surface it explicitly.
- Easier vocabulary for engineers who haven't internalised CVSS.

Use DREAD as qualitative language:

```
This threat has high Damage (full PII export) but low Discoverability
(requires authenticated insider access to a non-public endpoint).
Affected users would be 100% if exploited. Reproducibility: high.
Exploitability: medium (requires craft-able malicious payload).
```

That's a richer description than a CVSS vector alone.

## How this skill uses DREAD

- **Qualitative-only**. Never produce "DREAD score: 38" in the output.
- Use the dimensions as supplementary descriptors alongside likelihood × impact (or CVSS) — not as primary severity.
- Especially helpful for finding-specific commentary in the threat-model output's "Notes" or "Discussion" rows.

## Anti-patterns

- **Quantitative DREAD scoring** in any output. Use CVSS 3.1 if you need a score.
- **DREAD as replacement for STRIDE**: DREAD is severity language; STRIDE is enumeration framework. They serve different purposes.
- **Selective DREAD on only a few findings**: either apply consistently or omit entirely.

## Cross-reference

- For threat enumeration: [`stride.md`](./stride.md).
- For risk-centric framing: [`pasta.md`](./pasta.md).
- For quantitative scoring: CVSS 3.1 (external — FIRST.org).
