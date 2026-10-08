# mindmap

**Notation anchor**: Mindmap convention (Tony Buzan, 1970s) — radial hierarchical thinking with a central concept and branches.
**Best for**: brainstorming, hierarchical concept organization, lecture notes, taxonomy outlines.
**Mermaid version**: stable since v9.3.

## Syntax skeleton

```mermaid
mindmap
  root((Project plan))
    Discovery
      Customer interviews
      Synthesis
      Opportunity sizing
    Design
      Wireframes
      Hi-fi mockups
      Design review
    Build
      Backend
        Auth
        API
        DB
      Frontend
        Components
        State management
    Test
      Unit
      Integration
      E2E
      UAT
    Release
      Code freeze
      Staging deploy
      Production launch
```

## Structure

- Indentation defines hierarchy. Two spaces per level is the convention.
- The first node (after `mindmap`) is the root; everything else nests under it.
- There is no explicit edge syntax — indentation IS the edge.

## Root shapes

| Syntax         | Shape                     |
| -------------- | ------------------------- |
| `root((text))` | Circle (default for root) |
| `root[text]`   | Square                    |
| `root(text)`   | Rounded rectangle         |
| `root))text((` | Bang shape                |
| `root)text(`   | Cloud                     |
| `root{{text}}` | Hexagon                   |

Other nodes use:

| Syntax     | Shape               |
| ---------- | ------------------- |
| `text`     | Default (no border) |
| `[text]`   | Square              |
| `(text)`   | Rounded             |
| `((text))` | Circle              |
| `))text((` | Bang                |
| `)text(`   | Cloud               |
| `{{text}}` | Hexagon             |

## Icons

```mermaid
mindmap
  root((Tech stack))
    ::icon(fa fa-server)
    Backend
      Node.js
      Postgres
    ::icon(fa fa-laptop-code)
    Frontend
      React
      Tailwind
```

`::icon(...)` adds a Font Awesome icon to the node below it. Icons must be enabled in the Mermaid config; default Mermaid setups do not include them.

## Markdown formatting

Node labels accept basic Markdown:

```mermaid
mindmap
  root((**Bold** and _italic_))
    First branch
      Has `inline code`
```

## Gotchas

- Mindmap is **strictly hierarchical** — no cross-links between branches. For graphs with sideways relationships, use `flowchart` instead.
- Indentation matters. Mixing tabs and spaces breaks the diagram silently.
- Mermaid renders mindmaps with limited size — for >50 nodes the layout becomes unreadable; split into multiple maps.
- The root must be on its own line; you cannot nest content under the same line as `mindmap`.
- Icons require Font Awesome integration; in environments without it the `::icon` lines are ignored.

## Worked example — taxonomy

```mermaid
mindmap
  root((Software testing))
    Layers
      Static
      Unit
      Integration
      End-to-end
    Quality attributes
      Functional
      Performance
      Security
      Accessibility
      Reliability
    Strategies
      Risk-based
      Coverage-based
      Mutation
      Property-based
      Exploratory
    Standards
      ISO 29119
      ISO 25010
      ISTQB
```

## Worked example — brainstorm

```mermaid
mindmap
  root((Q3 features))
    Must-have
      Single sign-on
      Audit log
      Multi-factor auth
    Nice-to-have
      Dark mode
      Custom dashboards
      Bulk import
    Risky bets
      AI summarisation
      Real-time collab
    Deferred
      Mobile app
      Whitelabeling
```

## When to use a different diagram

- For **sideways relationships** between concepts (not just hierarchy), use `flowchart`.
- For **chronological** organization, use `timeline`.
- For **scored / weighted** priorities, use `quadrantChart`.

Mindmaps are best when the structure is purely tree-shaped and the goal is rapid visual outlining.
