# journey

**Notation anchor**: User journey mapping (UX practice; Forrester, Adaptive Path). No formal standard; Mermaid implements a lightweight version with per-step satisfaction scores.
**Best for**: user journey mapping, satisfaction over steps, multi-actor flows.
**Mermaid version**: stable since v8.x.

## Syntax skeleton

```mermaid
journey
    title My working day
    section Go to work
      Make tea: 5: Me
      Go upstairs: 3: Me
      Do work: 1: Me, Cat
    section Go home
      Go downstairs: 5: Me
      Sit down: 5: Me
```

## Structure

| Element | Syntax                                      |
| ------- | ------------------------------------------- |
| Title   | `title <text>`                              |
| Section | `section <name>` (groups steps visually)    |
| Step    | `<step>: <score>: <actor>[, <actor>...]`    |
| Score   | 1 (worst) to 5 (best)                       |
| Actors  | Comma-separated list; rendered with avatars |

## Conventions

- Score = user satisfaction at that step. 1 = pain point, 5 = delight.
- Each section corresponds to a stage of the journey (Awareness, Consideration, Onboarding, Use, Retention, Advocacy — common stages in journey-mapping practice).
- Multiple actors per step show concurrent participants (e.g., User + Support agent).
- The diagram shows **satisfaction**, not duration. For duration / timing, use Gantt or timeline.

## Gotchas

- Step scores are integers 1–5 only. Mermaid does not render fractional scores.
- Long step labels truncate visually; keep each step to ~4–6 words.
- Multiple actors per step share the same satisfaction score — there is no per-actor differentiation. To show divergent experiences, split into separate steps.

## Worked example — SaaS onboarding journey

```mermaid
journey
    title New user onboarding to first value
    section Discovery
      Land on marketing page: 4: User
      Read pricing: 3: User
      Click "Try free": 5: User
    section Signup
      Enter email: 4: User
      Verify email: 2: User
      Set password: 3: User
      Choose workspace name: 4: User
    section First value
      Skip product tour: 5: User
      Find empty dashboard: 1: User
      Open docs: 2: User
      Connect first data source: 3: User, Support
      See first chart: 5: User
    section Activation
      Invite teammate: 4: User
      Save first report: 5: User, Teammate
```

The friction in "Verify email" (score 2) and "Find empty dashboard" (score 1) is visible without prose — that is the value of a journey diagram.

## Worked example — multi-actor support escalation

```mermaid
journey
    title Tier-1 → Tier-2 escalation for billing dispute
    section Customer side
      Receive incorrect invoice: 1: Customer
      Contact support chat: 3: Customer, Tier1
      Wait for response: 2: Customer
    section Tier-1
      Triage ticket: 4: Tier1
      Attempt resolution: 3: Tier1, Customer
      Escalate to billing: 4: Tier1, Tier2
    section Tier-2
      Investigate billing system: 3: Tier2
      Issue refund: 5: Tier2, Customer
      Send confirmation: 5: Tier2, Customer
    section Follow-up
      Read post-incident email: 4: Customer
      Rate experience: 4: Customer
```

## When to use a different diagram

- For **timing / scheduling** (durations, deadlines): use `gantt`.
- For **process flow with decisions**: use `flowchart`.
- For **state changes the user does not directly experience**: use `stateDiagram-v2`.
- For **interaction details between systems**: use `sequenceDiagram`.

Journey diagrams are about felt experience; use them when satisfaction-over-steps is the question.
