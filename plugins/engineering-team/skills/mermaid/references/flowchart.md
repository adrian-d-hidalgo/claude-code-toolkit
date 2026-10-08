# flowchart

**Notation anchor**: generic flowchart convention. No formal standard; Mermaid implements its own dialect.
**Best for**: process flows, decision trees, algorithms, workflows.
**Mermaid version**: stable since v1.x.

## Syntax skeleton

```mermaid
flowchart TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
```

## Direction

| Token       | Direction          |
| ----------- | ------------------ |
| `TD` / `TB` | Top-down (default) |
| `LR`        | Left-to-right      |
| `BT`        | Bottom-up          |
| `RL`        | Right-to-left      |

Use `TD` for processes you read top-to-bottom; `LR` for pipelines and timelines.

## Node shapes

| Syntax       | Shape             | Use                       |
| ------------ | ----------------- | ------------------------- |
| `A[Label]`   | Rectangle         | Default process step      |
| `A(Label)`   | Rounded rectangle | Step with rounded UI feel |
| `A([Label])` | Stadium           | Start / end               |
| `A[[Label]]` | Subroutine        | Reusable sub-process      |
| `A[(Label)]` | Cylinder          | Database / storage        |
| `A((Label))` | Circle            | Connector / state         |
| `A>Label]`   | Asymmetric        | Asynchronous trigger      |
| `A{Label}`   | Rhombus           | Decision                  |
| `A{{Label}}` | Hexagon           | Preparation step          |
| `A[/Label/]` | Parallelogram     | Input / output            |
| `A[\Label\]` | Trapezoid         | Manual operation          |

## Edge styles

| Syntax        | Meaning                |
| ------------- | ---------------------- | --- | ------------- |
| `A --> B`     | Solid arrow            |
| `A --- B`     | Solid line (no arrow)  |
| `A -.-> B`    | Dotted arrow           |
| `A ==> B`     | Thick arrow (emphasis) |
| `A -->        | label                  | B`  | Labeled arrow |
| `A & B --> C` | Multi-source           |
| `A --> B & C` | Multi-target           |

## Subgraphs (grouping)

```mermaid
flowchart LR
    subgraph Frontend
        UI --> Router
    end
    subgraph Backend
        API --> DB[(Postgres)]
    end
    Router --> API
```

Subgraphs improve readability dramatically when nodes cluster naturally. Use them.

## Styling

```mermaid
flowchart TD
    A[Critical Path] --> B[Step]
    classDef critical fill:#fee,stroke:#f00,stroke-width:2px
    class A critical
```

Avoid inline `style A fill:#fee` — define `classDef` once and apply with `class`.

## Gotchas

- Labels with parentheses or special chars must be quoted: `A["Label (with parens)"]`.
- Empty labels render as the node ID — set an explicit label even when short.
- Long labels reflow only inside `"..."`-quoted text; multi-line uses `<br>`.

## Worked example — CI/CD pipeline

```mermaid
flowchart TD
    A[Push to main] --> B{Lint passes?}
    B -->|No| F[Block merge]
    B -->|Yes| C[Run tests]
    C --> D{All green?}
    D -->|No| F
    D -->|Yes| E[Deploy to staging]
    E --> G{Manual approval?}
    G -->|Yes| H[Deploy to prod]
    G -->|No| I[Hold]
    classDef block fill:#fee,stroke:#f00
    class F,I block
```

## Worked example — request lifecycle with subgraphs

```mermaid
flowchart LR
    User((User)) --> CDN
    subgraph Edge
        CDN --> WAF[Web App Firewall]
    end
    subgraph Origin
        WAF --> LB[Load balancer]
        LB --> API
        API --> Cache[(Redis)]
        API --> DB[(Postgres)]
    end
    API --> Resp([Response])
    Resp --> User
```
