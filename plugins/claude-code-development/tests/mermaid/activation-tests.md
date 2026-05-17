# Activation tests — mermaid (skill)

Canonical corpus: [activation-evals.json](./activation-evals.json).

## Shape

- **Positive**: explicit Mermaid / named-type requests (flowchart, sequence, ER, state, class, C4, journey, Gantt, mindmap, timeline, sankey, quadrant, architecture, gitGraph), "draw" / "visualize" / "create a diagram" phrasings in any language.
- **Negative**: architecture design decisions (architect agent), code analysis to derive a diagram (Explore-then-draw), high-fidelity UI mockups (Figma), test plans / ADRs / implementation, pure knowledge questions about diagram types, vendor-icon-heavy network topology (draw.io).
- **Edge**: ambiguous diagram-type requests (skill triggers and disambiguates); suboptimal-for-Mermaid requests (skill should still trigger and recommend the alternative tool).

Target accuracy: ≥0.90.
