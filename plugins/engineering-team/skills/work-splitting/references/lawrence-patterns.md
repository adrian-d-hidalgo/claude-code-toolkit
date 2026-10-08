# Lawrence patterns — 9 ways to split a user story

Source: Richard Lawrence, "Patterns for Splitting User Stories" (2009). Industry-canonical reference for story-splitting techniques. Originally written for user stories; the patterns generalise to any backlog item (task, bug, enabler, spike) with light adaptation.

## §1 — Workflow steps

The item describes a multi-step user workflow; ship one step at a time.

**When to use**: the value is in completing the workflow, but each step alone has standalone meaning.

**Example**: "User completes checkout" → split into:

- S-01: User reviews cart (read-only, no payment)
- S-02: User enters shipping address
- S-03: User selects payment method (one method only)
- S-04: User confirms order (writes the order)
- S-05: User receives confirmation (email + page)

Each step ships independently behind a feature flag; the workflow lights up step by step.

## §2 — Business-rule variations

Multiple business rules bundled in one item; split per rule.

**When to use**: the item says "and" or "or" between distinct rules.

**Example**: "Apply discount codes (percentage OR flat-amount OR free-shipping)" → split into:

- S-01: Apply percentage discount
- S-02: Apply flat-amount discount (depends on S-01 if shared infrastructure)
- S-03: Apply free-shipping discount

Each rule passes INVEST on its own. Avoid "implement all three at once" unless they share so much code that splitting costs more than the value.

## §3 — Happy / unhappy path

Split happy path from edge cases / error handling / unhappy variants.

**When to use**: the item has a clear "main path" and several edge cases that are independently valuable to handle.

**Example**: "User submits feedback form" → split:

- S-01: Happy path — valid input, submission succeeds
- S-02: Validation errors (empty fields, wrong format)
- S-03: Server error handling (5xx → retry banner)
- S-04: Network failure (offline → queue + retry)

Ship the happy path first; layer edge cases as confidence grows.

## §4 — Input options / platform

Split per platform, input type, or device.

**When to use**: the item works on multiple platforms / devices / input modalities, and the platforms have non-trivial implementation differences.

**Example**: "Users can authenticate with OAuth" → split:

- S-01: OAuth with Google (one provider)
- S-02: OAuth with GitHub
- S-03: OAuth with Microsoft Entra ID

OR by device:

- S-01: Desktop web (mouse + keyboard)
- S-02: Mobile web (touch)
- S-03: Native mobile (iOS + Android)

## §5 — Data types & variations

Multiple data shapes or variations bundled.

**When to use**: the item processes "different kinds of X", and each kind has non-trivial handling.

**Example**: "Import contacts from CSV / vCard / Google Contacts" → split per source.

## §6 — Defer performance

Functional correctness first; performance hardening later.

**When to use**: the item works correctly but performance is unknown / non-trivial.

**Example**: "Search across 50M products" → split:

- S-01: Search works correctly (slow is acceptable for now; baseline measured)
- S-02: Search meets p95 < 200ms SLO (Enabler — performance hardening)

The performance task is an `Enabler / Architecture` (per SAFe 6.0 — see `../../development-plan/SKILL.md` Class subsection).

## §7 — Operations (CRUD)

Split per operation: Create / Read / Update / Delete.

**When to use**: the item bundles full CRUD on an entity; some operations are higher value or simpler.

**Example**: "Admin manages users" → split:

- S-01: Admin views users (Read)
- S-02: Admin creates a user (Create)
- S-03: Admin updates a user's role (Update — limited fields)
- S-04: Admin deletes a user (Delete — with confirmation)

Read first is often the cheapest and unblocks downstream. Delete usually last (highest blast radius).

## §8 — Browser compatibility

Split per browser / browser version.

**When to use**: cross-browser support is non-trivial and not all browsers are equally important.

**Example**: "Feature works on all supported browsers" → split:

- S-01: Chrome + Edge (modern Chromium)
- S-02: Firefox
- S-03: Safari (often has the most quirks)
- S-04: Legacy IE / older browsers (only if explicitly supported)

## §9 — Simple / complex

Ship the simple case first; layer complexity.

**When to use**: the item has a 90/10 distribution — 90% of usage is simple, 10% needs the full complexity.

**Example**: "User adds an event to calendar" → split:

- S-01: Single non-recurring event (simple)
- S-02: Recurring event (daily / weekly / monthly)
- S-03: Recurring with exceptions / overrides (advanced — rare in usage)

The simple case usually delivers most of the value. The complex case can be deferred or marked as "stretch".

## Selecting among the 9

Don't try them in order. Read the item, see which "shape" matches:

- Multi-step workflow? → §1.
- "And/or" in the description? → §2 or §5.
- Edge cases mentioned? → §3.
- Multiple platforms / browsers / devices? → §4 or §8.
- Performance language? → §6.
- CRUD language? → §7.
- 90/10 distribution? → §9.

Often two or more patterns combine. Cite which patterns you applied; e.g. "Lawrence §1 (workflow) + §3 (happy/unhappy path)".

## Anti-pattern reminder

None of these patterns produce _horizontal_ slices ("build the DB", "build the API"). Every Lawrence pattern produces sub-items that each deliver vertically-sliced user value. If your splits look horizontal, you're not applying Lawrence — re-read the source pattern.
