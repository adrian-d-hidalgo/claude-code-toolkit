---
name: mermaid
description: Use when the user asks to create, draw, design, or visualize a diagram — flowchart, sequence diagram, ER diagram, state diagram, class diagram, C4 diagram, mindmap, Gantt, timeline, user journey, quadrant, sankey, gitGraph, architecture diagram. Trigger phrases include "create a diagram", "draw", "visualize", "diagrama mermaid", "haz un flowchart", "diagrama de secuencia".
allowed-tools:
  - Read
  - Grep
  - Glob
---

# mermaid skill

Emits clear, focused Mermaid diagram **content** by selecting the optimal type for the use case, consulting the per-type reference for valid syntax, and honestly flagging when Mermaid is not the right tool. The reference files in `references/` are the source of truth for syntax — read the relevant one before authoring a diagram. Output is a Mermaid code block the caller embeds wherever (Markdown doc, MDX, Notion, wiki, GitHub issue). The skill does **not** write files.

## Scope and boundaries

This skill handles:

- Mermaid diagram type selection with rationale.
- Valid Mermaid syntax generation for all current diagram types via per-type references.
- Diagram optimization (subgraphs, styling, direction, labels).
- Alternative-tool recommendations when Mermaid is insufficient.

This skill does not handle:

- Architectural design decisions (decide the architecture first; this skill draws it).
- UX flow strategy.
- Code analysis to derive diagrams from a large codebase — discover first, then use this skill.

## Diagram type matrix

| Type                                    | Best for                                         | Strengths                                              | Notation anchor                       | Reference                                       |
| --------------------------------------- | ------------------------------------------------ | ------------------------------------------------------ | ------------------------------------- | ----------------------------------------------- |
| `flowchart`                             | Process flows, decision trees, algorithms        | Most flexible; subgraphs, styling, multiple directions | Generic flowchart                     | [flowchart.md](./references/flowchart.md)       |
| `sequenceDiagram`                       | API calls, auth flows, message passing over time | Time axis explicit; activations, alt/opt/par/loop      | UML 2.5.1 Sequence                    | [sequence.md](./references/sequence.md)         |
| `classDiagram`                          | OOP design, class relationships, inheritance     | UML-compliant; visibility, generics                    | UML 2.5.1 Class                       | [class.md](./references/class.md)               |
| `stateDiagram-v2`                       | State machines, lifecycles, status transitions   | Composite states, parallel regions                     | UML 2.5.1 State Machine               | [state.md](./references/state.md)               |
| `erDiagram`                             | Database schemas, entity relationships           | Cardinality notation (Crow's Foot derived)             | Chen ER (1976) + Crow's Foot          | [er.md](./references/er.md)                     |
| `journey`                               | User journey mapping, satisfaction over steps    | Score per step; multi-actor                            | UX journey-mapping practice           | [journey.md](./references/journey.md)           |
| `gantt`                                 | Project timelines, task scheduling, milestones   | Dependencies, sections, milestones                     | Gantt chart (Henry Gantt, 1910s)      | [gantt.md](./references/gantt.md)               |
| `pie`                                   | Single-axis proportional data                    | Simple, scannable                                      | Pie chart convention                  | [pie.md](./references/pie.md)                   |
| `quadrantChart`                         | 2×2 prioritization (impact/effort, etc.)         | Clear positioning                                      | 2×2 matrix convention                 | [quadrant.md](./references/quadrant.md)         |
| `gitGraph`                              | Branching strategies, merge visualization        | Branch/merge/tag operations                            | Git visualization convention          | [gitgraph.md](./references/gitgraph.md)         |
| `C4Context`/`C4Container`/`C4Component` | System architecture at multiple zoom levels      | Standardized C4 model                                  | Simon Brown's C4 model                | [c4.md](./references/c4.md)                     |
| `mindmap`                               | Brainstorming, hierarchical concepts             | Quick visual outline                                   | Tony Buzan mindmap convention         | [mindmap.md](./references/mindmap.md)           |
| `timeline`                              | Chronological events                             | Era / period grouping                                  | Timeline convention                   | [timeline.md](./references/timeline.md)         |
| `sankey`                                | Flow quantities (energy, traffic, conversion)    | Width = magnitude                                      | Sankey diagram (Matthew Sankey, 1898) | [sankey.md](./references/sankey.md)             |
| `xychart-beta`                          | Bar / line charts inline                         | Lightweight                                            | Cartesian chart convention            | [xychart.md](./references/xychart.md)           |
| `block`                                 | UI layout sketches, hardware diagrams            | Grid-style blocks                                      | Block-diagram convention              | [block.md](./references/block.md)               |
| `architecture-beta`                     | Cloud / service architecture                     | Icon support                                           | Cloud-architecture convention         | [architecture.md](./references/architecture.md) |

## Selection framework

Pick by the **primary question** the diagram answers:

| User intent                                     | Diagram                                     |
| ----------------------------------------------- | ------------------------------------------- |
| "How does this process flow?"                   | `flowchart`                                 |
| "Who talks to whom and when?"                   | `sequenceDiagram`                           |
| "What is the data model?"                       | `erDiagram`                                 |
| "What states does X go through?"                | `stateDiagram-v2`                           |
| "What classes/types and how related?"           | `classDiagram`                              |
| "What does the user experience step by step?"   | `journey`                                   |
| "What is the project schedule?"                 | `gantt`                                     |
| "How is the system structured at high level?"   | `C4Context` → `C4Container` → `C4Component` |
| "How do these concepts cluster?"                | `mindmap`                                   |
| "How big is each portion?"                      | `pie` or `sankey`                           |
| "Where does each item sit on impact vs effort?" | `quadrantChart`                             |
| "Branching / merge history?"                    | `gitGraph`                                  |
| "What happened over time?"                      | `timeline`                                  |
| "What is the cloud / service architecture?"     | `architecture-beta`                         |

When the request is ambiguous, ask the user one disambiguating question (e.g., "¿quieres ver el flujo de mensajes en tiempo (sequence) o el flujo de pasos del proceso (flowchart)?").

## When Mermaid is the wrong fit

Recommend an alternative tool — and **stop attempting Mermaid** — when the request involves:

| Need                                                     | Recommend                                    |
| -------------------------------------------------------- | -------------------------------------------- |
| Detailed UML stereotypes / deployment diagrams           | **PlantUML**                                 |
| Hand-drawn / freeform sketches                           | **Excalidraw**                               |
| Complex multi-page architecture with heavy custom shapes | **draw.io / diagrams.net**                   |
| Interactive collaborative diagrams                       | **Lucidchart**, **Miro**                     |
| Data-driven dynamic visualizations                       | **D3.js**, **Observable Plot**               |
| High-fidelity UI mockups                                 | **Figma**                                    |
| Network topology with vendor icons                       | **draw.io** with Cisco / AWS shape libraries |
| BPMN process notation (full BPMN 2.0)                    | **bpmn.io**, **Camunda Modeler**             |

State the limitation honestly: "Mermaid no soporta X bien; te recomiendo <herramienta>. Si quieres una versión simplificada en Mermaid, puedo hacerla."

## Common syntax optimization (across all types)

- **Direction**: `TD` (top-down), `LR` (left-right), `BT`, `RL`. Default `TD` for processes; `LR` for sequence-like or wide diagrams.
- **Subgraphs** (where supported): group related nodes with `subgraph Name … end`. Improves readability dramatically.
- **Styling**: define `classDef` once, apply with `class A,B classname`. Avoid inline styles per-node.
- **Link styles**: `linkStyle 0 stroke:#f00,stroke-width:2px` for emphasis on critical paths.
- **Labels**: use semantic labels (`A -->|approves| B`) over generic arrows.
- **Comments**: `%% This is a comment` — use to mark sections in long diagrams.
- **Node IDs vs labels**: short IDs (`A`, `B1`) for graph structure; descriptive text in `[label]` brackets.
- **Escaping**: wrap labels with special characters in quotes: `A["Label with (parens)"]`.

Per-type optimizations and version-specific syntax live in the per-type references.

## Workflow

1. **Understand the need** — what is being visualized; who is the audience; level of detail.
2. **Recommend type with rationale** — name the diagram type and a one-sentence reason. Offer an alternative if the request is ambiguous.
3. **Read the per-type reference** under `references/<type>.md` for canonical syntax, version requirements, and gotchas. Do not author the diagram from memory.
4. **Design structure** — list nodes, relationships, groupings before writing syntax.
5. **Write valid Mermaid** — produce in a fenced ` ```mermaid ` block. Validate mentally against the per-type reference.
6. **Optimize legibility** — apply subgraphs, styling, direction, semantic labels.
7. **Note alternatives** — if Mermaid is suboptimal for the request, say so and recommend the better tool.

## Output contract

Always:

1. Open with the type recommendation and rationale (1–2 sentences).
2. Provide the diagram in a fenced ` ```mermaid ` code block.
3. Include `%%` comments for non-obvious sections in long diagrams.
4. End with one of:
   - "¿Quieres que ajuste la dirección, agrupe nodos, o agregue estilos?"
   - Note about Mermaid limitation + alternative tool, if applicable.

## Quality checklist (before delivery)

- [ ] Diagram type is the optimal fit for the use case (or alternative tool noted).
- [ ] Rationale for type choice is explicit.
- [ ] Syntax is valid for the chosen Mermaid version — verified against the per-type reference.
- [ ] Diagram is focused — not overloaded with unrelated nodes.
- [ ] Direction (`TD` / `LR`) chosen deliberately.
- [ ] Subgraphs used when nodes naturally group (where the type supports them).
- [ ] Labels are semantic (verbs on edges, nouns on nodes).
- [ ] Styling (`classDef`) applied only when it adds clarity.
- [ ] Limitations honestly stated when relevant.

## Key principles

- **Rationale first**: never just dump syntax. Always explain the type choice in 1 line.
- **Read the reference**: per-type syntax lives in `references/`; do not guess.
- **Honest about limits**: if PlantUML / draw.io fits better, say so.
- **One diagram, one question**: do not try to answer multiple questions in one diagram. Suggest splitting.
- **Validate syntax mentally**: each diagram type has strict syntax — wrong arrow style or missing semicolons break it.
- **Optimize for the reader**: subgraphs and direction matter as much as content.

## Reference index

Per-diagram-type references, each anchored to its notation of origin and including syntax skeleton, common patterns, Mermaid version requirements, gotchas, and worked examples:

- [flowchart.md](./references/flowchart.md)
- [sequence.md](./references/sequence.md)
- [class.md](./references/class.md)
- [state.md](./references/state.md)
- [er.md](./references/er.md)
- [journey.md](./references/journey.md)
- [gantt.md](./references/gantt.md)
- [pie.md](./references/pie.md)
- [quadrant.md](./references/quadrant.md)
- [gitgraph.md](./references/gitgraph.md)
- [c4.md](./references/c4.md)
- [mindmap.md](./references/mindmap.md)
- [timeline.md](./references/timeline.md)
- [sankey.md](./references/sankey.md)
- [xychart.md](./references/xychart.md)
- [block.md](./references/block.md)
- [architecture.md](./references/architecture.md)
