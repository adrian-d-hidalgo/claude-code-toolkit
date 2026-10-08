# Code smells — Fowler taxonomy

Source: Martin Fowler with Kent Beck, _Refactoring: Improving the Design of Existing Code_ (2nd ed., 2018). The original 1999 edition introduced the term; the 2018 edition refreshes the catalog for modern code.

## What "smell" means

A code smell is a **surface indicator** that something might be wrong with the deeper structure. Smells are heuristics, not proofs — they suggest investigation. Many smells have well-named refactoring techniques to remediate.

## The catalog (abridged)

For an audit, focus on smells that drive concrete refactoring work. Each entry: name + symptom + Fowler refactoring technique.

### Bloaters

- **Long Method** — method exceeds ~30 lines (rough). → Extract Method, Extract Class.
- **Large Class** — class accumulates many responsibilities. → Extract Class, Extract Subclass.
- **Primitive Obsession** — using primitives where a small class would clarify intent. → Replace Primitive with Object.
- **Long Parameter List** — many parameters; hard to call correctly. → Introduce Parameter Object, Preserve Whole Object.
- **Data Clumps** — same group of fields / parameters always appearing together. → Extract Class.

### Object-orientation abusers

- **Switch Statements** — switch on type code, especially recurring. → Replace Conditional with Polymorphism, Replace Type Code with Subclasses.
- **Temporary Field** — field used only in some methods. → Extract Class, Introduce Null Object.
- **Refused Bequest** — subclass uses little of inherited interface. → Replace Inheritance with Delegation.
- **Alternative Classes with Different Interfaces** — classes do similar things via different APIs. → Rename Method, Move Method, Extract Superclass.

### Change preventers

- **Divergent Change** — class changes for multiple unrelated reasons. → Extract Class.
- **Shotgun Surgery** — one logical change requires edits in many places. → Move Method, Move Field, Inline Class.
- **Parallel Inheritance Hierarchies** — every time you subclass X, you must also subclass Y. → Move Method, Move Field.

### Dispensables

- **Comments (explanatory)** — comments compensating for unclear code. → Rename, Extract Method.
- **Duplicated Code** — same/similar code in multiple places. → Extract Method, Pull Up Method, Form Template Method.
- **Lazy Class** — class doing too little to justify existing. → Inline Class.
- **Data Class** — class is just fields + accessors, no behavior. → Move Method, Encapsulate Field.
- **Dead Code** — never invoked. → Delete.
- **Speculative Generality** — abstraction designed for unrealised future needs. → Inline Class, Inline Method, Remove Parameter, Rename Method.

### Couplers

- **Feature Envy** — method uses other class's data more than its own. → Move Method.
- **Inappropriate Intimacy** — classes know too much about each other's internals. → Move Method, Move Field, Hide Delegate.
- **Message Chains** — `a.b().c().d()` — caller couples to chain structure. → Hide Delegate, Extract Method.
- **Middle Man** — class that just forwards everything. → Inline Class, Remove Middle Man.

### Other

- **Insider Trading** — modules sharing data inappropriately. → Move Method, Hide Delegate.

## How `code-audit` uses smells

For each finding that matches a smell, name the smell in the finding:

```markdown
### F-03 — `OrdersController` is 1200 lines

- **Severity**: required
- **Category**: maintainability
- **Smell**: Large Class
- **Location**: `src/orders/OrdersController.ts:1-1200`
- **Recommendation**: Apply Extract Class to split per responsibility:
  - `OrderCreator` (lines 1-300, creation flow)
  - `OrderQuerier` (lines 301-700, read queries)
  - `OrderUpdater` (lines 701-1200, mutations)
- **Impact**: M (slows changes, makes code review difficult)
- **Effort**: H (refactor touches many callers + tests)
- **Quadrant**: Major Project / Thankless boundary — verify with team
```

Naming the smell makes the recommendation more actionable: there's a named refactoring technique (Extract Class) the reviewer can look up.

## When smells don't apply

Not every problem is a smell. Anti-pattern: forcing every finding into a smell taxonomy when the issue is genuinely outside the catalog (algorithmic bug, security vulnerability, missing observability). State the finding plainly; mark `Smell: N/A` if the catalog doesn't fit.

## Smell-tracking caveats

- **Smells are heuristics**. A 50-line method may be perfectly clear and not need extraction. A 10-line method may be too clever and need refactoring. Judgment > heuristic.
- **Refactoring without tests is dangerous**. Recommend tests before recommending the refactor (per `quality-engineer` agent's "no behavior change without tests" rule).
- **Smell-driven refactoring chains**: removing one smell can introduce another (e.g. extracting many small classes creates Lazy Class candidates). Audit holistically.

## Cross-reference

- For per-PR observation of smells: `../../code-review-checklist/SKILL.md`.
- For prioritising refactor work: [`impact-effort.md`](./impact-effort.md).
- Fowler book — the definitive catalog (2nd ed., 2018).
