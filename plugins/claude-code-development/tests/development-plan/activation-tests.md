# development-plan — activation tests

Companion corpus to `activation-evals.json`. The skill is **preloaded** on `tech-lead` (full SKILL.md injected into the agent's system prompt at startup) and available via runtime discovery for any other agent or for the main conversation.

## Scope

The `development-plan` skill fires when the user asks to convert an approved spec (PRD + tech-spec + ADRs) into an executable plan: `plan.md` (strategy + sequencing) + `tasks.md` (ordered tasks with AC traceability and per-task DoD). Format aligned with GitHub spec-kit. Decomposition via story mapping (Patton), vertical slicing (Cohn / INVEST), or WBS (PMBOK 7) per fit.

## Positive coverage (pos-01 … pos-09)

- Full plan from approved spec.
- Spanish trigger ("plan de desarrollo").
- `tasks.md` decomposition request.
- Explicit `plan.md` + `tasks.md` spec-kit format.
- WBS for a structured / regulated migration.
- PR sequencing with expand–contract + flag.
- Strangler-fig sequencing.
- Story-map decomposition.
- Lite plan when PRD is not yet final.

## Negative coverage (neg-01 … neg-08)

- Implementation (software-developer).
- PRD authoring (prd-writer).
- Test-plan authoring (test-plan skill / quality-engineer).
- Architecture design (software-architect).
- PR review (code-reviewer).
- Threat-model authoring (security-engineer).
- ADR authoring (adr skill).
- Cross-feature quarterly roadmap (product / engineering management).

## Edge coverage (edge-01 … edge-03)

- "Release readiness checklist" — overlaps semantically with the **test-plan** skill's variant; should NOT fire development-plan.
- Regulated environment (IEC 62304) — development-plan extends DoD with traceability fields per the regulation; should fire.
- Missing tech-spec — skill should fire, flag the gap, propose lite-plan stub.

## Notes for the runner

- This skill's `description` is a pure routing trigger — names the intent (development plan / implementation plan / tasks.md / PR sequencing / spike identification) and the explicit Spanish triggers. No internal mechanism, no negative scope ("does not cover X") — per our own meta-skill anti-pattern rules.
- When invoked by `tech-lead`, the skill is already in the agent's system prompt at startup; runtime invocation is a no-op (preloaded ≠ second-load).
- When invoked from the main conversation, the skill is loaded via the `Skill` tool just like any other on-demand skill.
