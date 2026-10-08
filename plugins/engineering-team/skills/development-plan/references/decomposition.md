# Decomposition techniques

Pick the technique that fits the work; do not force one. Three primary techniques + one hybrid pattern. Each anchored to its source so future readers understand the convention being applied.

## §1 — Story Mapping (Jeff Patton, 2014)

Source: Jeff Patton, _User Story Mapping: Discover the Whole Story, Build the Right Product_ (O'Reilly, 2014).

### When to use

The feature is **a user journey** — discoverable activities and tasks performed by one or more roles, in a recognisable order. Examples: onboarding flow, checkout flow, support agent triage workflow.

### Structure

Two axes:

- **Horizontal (the backbone)**: high-level activities in the order the user does them. Read left to right as a narrative.
- **Vertical (the slices)**: alternative ways or depths of doing the activity, prioritized top to bottom.

Each cell is a **story** (or a cluster of stories). A "release slice" is a horizontal cut across the map — the smallest version of the journey that still delivers value end-to-end.

### Producing a story map (from a tech-spec)

1. Identify the **user(s)** and the **outcome** they pursue.
2. List **activities** (verbs) the user does, left → right, in a typical session.
3. Under each activity, list **tasks** (more granular steps) needed to perform it.
4. Slice horizontally: MVP (the thinnest end-to-end path), then Release 2, Release 3.

### Output mapping to `tasks.md`

Each cell in the MVP horizontal slice becomes one task (or one spike if there's an unknown). Order in `tasks.md` follows the journey left → right.

### Anti-patterns

- Building all of activity A before starting activity B (defeats the journey-cut).
- Cells too coarse — "Build checkout" is an activity, not a task.
- Cells too fine — "Add `aria-label` to the discount input" — that's an implementation detail of a task.

## §2 — Vertical Slicing (Mike Cohn, 2004)

Source: Mike Cohn, _User Stories Applied: For Agile Software Development_ (Addison-Wesley, 2004). Quality bar: **INVEST** criteria (Bill Wake, 2003).

<!-- canonical INVEST reference — work-splitting and other skills cross-link here -->

### When to use

Default for most product features. Stories must each deliver **thin end-to-end value** through every architectural layer touched (DB, service, API, UI, observability).

### The slicing principle

Slice the feature by **value increment**, not by architectural layer. Bad slice: "Build the database schema", "Build the API", "Build the UI". Good slice: "User can redeem a discount code on the cart page (DB column + service method + API endpoint + UI button + telemetry)".

### INVEST quality bar

| Letter | Meaning     | Check                                                                                   |
| ------ | ----------- | --------------------------------------------------------------------------------------- |
| I      | Independent | Can be built and shipped without sibling stories.                                       |
| N      | Negotiable  | Details can shift during implementation; not a contract on every implementation detail. |
| V      | Valuable    | Delivers user-perceived value or unblocks another story that does.                      |
| E      | Estimable   | Team has enough info to size it. If not, split or spike.                                |
| S      | Small       | Fits in one sprint / one PR by default. If not, split.                                  |
| T      | Testable    | Has acceptance criteria you can verify.                                                 |

### Common splitting heuristics

- **Workflow steps**: split by step in the user's flow.
- **Operational variations**: split by data variation (one type first, others later).
- **Major effort** : the 80% common case first; rare variants next.
- **Simple/complex**: simple path first; complex path next.
- **Defer performance**: functional correctness first; performance hardening next.
- **Spike-then-build**: when an unknown blocks estimation, spike → decision → build.

### Output mapping to `tasks.md`

Each vertical slice = one task. Tasks reference AC IDs from the PRD; each AC is covered by ≥1 task.

### Anti-patterns

- Horizontal slicing as default (database → API → UI as separate stories). Only acceptable when each layer alone delivers value (e.g., the API is a deliverable shipped to external consumers).
- "Story" that takes 2+ weeks — split it.
- Story without acceptance criteria (it's a wish, not a story).
- Story whose AC mentions implementation detail ("uses Redis", "uses gRPC"). AC is about behavior, not tech.

## §3 — Work Breakdown Structure (PMBOK 7, 2021)

Source: Project Management Body of Knowledge (PMBOK Guide) 7th edition, PMI 2021. Also: NASA SP-2010-3403 WBS Handbook (deeper hierarchy guidance).

### When to use

The work is **highly structured**, has **strong dependencies**, or operates in a **regulated** environment where deliverable hierarchy is mandated. Examples: data migrations, compliance projects, multi-system rollouts.

### Structure

Hierarchical decomposition of total scope into deliverables. Each level is a **finer-grained deliverable** of the level above. The lowest level — **work packages** — are individually estimable, schedulable, and assignable.

### Numbering convention

Dotted decimal: `1`, `1.1`, `1.1.1`, `1.1.2`, `1.2`, `2` … Up to 4 levels typical; deeper than 6 is over-decomposed.

### 100% rule

Every level of the WBS represents **100% of the work** of its parent — no scope outside, no scope missing. This rule is what makes WBS rigorous (and tedious).

### Output mapping to `tasks.md`

Each lowest-level work package = one task in `tasks.md`. The numbering carries through (`1.2.3` → `T-1.2.3`).

### When NOT to use WBS

- Small product features (the rigour is overhead).
- Highly uncertain scope (WBS assumes you can decompose; story mapping accepts that you can't).
- Pure agile / iterative shops where the hierarchy ossifies before validation.

### Anti-patterns

- Over-decomposition (work packages of 1 hour each — pure ceremony).
- Hierarchy by **organization** (which team does it) instead of by deliverable. Use a RACI matrix for org assignment; keep WBS about deliverables.
- WBS that does not satisfy 100% rule (gaps or overlaps).

## §4 — Hybrid pattern (large epic with both journey and infrastructure)

When the epic has both:

- A **user-facing journey** (perfect for story mapping)
- A **structural / infrastructural spine** (migrations, platform work)

Use **both** techniques side-by-side:

- Story map for the journey → vertically-sliced tasks numbered `T-S-NN`.
- WBS for the infra spine → work-package tasks numbered `T-I-NN`.
- Dependency graph in `plan.md` shows how `T-S-NN` depend on `T-I-NN`.

State the hybrid choice in `plan.md` §2 with a one-sentence rationale.

## Selection guide (quick reference)

| Situation                                                          | Technique                                   |
| ------------------------------------------------------------------ | ------------------------------------------- |
| Feature = user journey across roles or steps                       | Story Mapping                               |
| Feature = single capability needing thin end-to-end slices         | Vertical Slicing                            |
| Migration / compliance / regulated / heavy structural dependencies | WBS                                         |
| Large epic = journey + infra spine                                 | Hybrid (S-map + WBS)                        |
| Pure spike / research / unknown scope                              | Lite plan only; sequence is the deliverable |

## Cross-technique anti-patterns

- Mixing techniques implicitly (the reader can't tell whether T-04 is a story-map cell or a WBS work package). Always declare in §2.
- Using a heavyweight technique for a 5-task feature (WBS for a small UI change is ceremony).
- Using a lightweight technique for a multi-quarter regulated effort (story mapping for a SOX-control migration loses the rigour the auditor needs).
- Decomposing into too many sub-tasks for one plan — apply the two-tier scope-size guidance:
  - **≥ 13 sub-tasks → propose phased plans** (split into Phase 1, Phase 2, etc. with explicit handoff). The 12-task threshold is grounded in Miller (1956) on working-memory capacity, doubled for written artefacts.
  - **≥ 20 sub-tasks → hard fail**: refuse single-plan; require phasing. Past 20, the plan is unreviewable in a single pass.
