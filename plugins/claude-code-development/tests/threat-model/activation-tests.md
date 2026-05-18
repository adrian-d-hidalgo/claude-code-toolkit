# threat-model — activation tests

Companion corpus to `activation-evals.json`. The skill is **preloaded on `security-engineer`** and **runtime-available** to `software-architect` (during design) and `software-developer` (when implementing security-sensitive code).

## Scope

Fires when the user asks to enumerate / analyse / model threats over a defined surface. Methodology anchors: STRIDE (Howard & Lipner 2002), PASTA (UcedaVelez 2015), DREAD qualitative-only, trust boundaries (Shostack 2014), attack trees (Schneier 1999).

Does NOT fire for: implementing mitigations, incident RCA (→ bug-analysis), per-PR security review (→ code-reviewer with security focus), compliance certification (→ security-engineer broader scope), VEX drafting (→ security-engineer broader scope), pen-testing (out of scope).

## Positive coverage

- Explicit threat-modelling requests.
- Named methodology invocations (STRIDE, PASTA, attack tree).
- "Where can this be attacked".
- Trust-boundary analysis.
- Spanish triggers.

## Negative coverage

- Implementation of mitigations (developer).
- Incident RCA (bug-analysis).
- PR review (code-reviewer).
- Architecture design (architect).
- Compliance scoping (security-engineer broader scope).
- PRD authoring.
- Pen-testing.
- Work-splitting.

## Edge cases

- **Re-review** (existing model older than N months) — skill fires, produces updated model + diff.
- **Design-stage** (no code yet) — skill fires, marks "no code-grounded verification possible; mitigations are proposed, not verified".
- **VEX request** — skill does NOT fire (security-engineer agent broader scope).
