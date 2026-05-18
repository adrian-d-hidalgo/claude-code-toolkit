# tech-lead — activation tests

Companion corpus to `activation-evals.json`. Sub-agents are evaluated on **outcome quality** (LLM-as-judge), not routing accuracy — Claude rationally chooses not to delegate for small or repo-mismatched tasks. The judge scores `understood_intent`, `action_appropriate`, and `meta_skill_was_correct_route` per case.

## Scope

The `tech-lead` agent fires when the user asks to convert an approved PRD + tech-spec into an executable development plan: ordered tasks, dependencies, PR sequencing, spikes, Definition of Done per task, AC traceability. It declines for product / architecture / test-plan / security / coding / sprint-planning / cross-feature roadmap work.

## Positive coverage (pos-01 … pos-10)

- Full plan from approved spec.
- Spanish trigger ("plan de desarrollo").
- `tasks.md` decomposition.
- PR sequencing for rollout.
- Traceability matrix from AC to tasks.
- Spike identification with time-boxes and exit criteria.
- Sequencing strategy choice (expand–contract / flag / strangler).
- Story-mapping decomposition for a journey-based epic.
- Strangler-fig sequencing for a rewrite.
- Handoff plan a developer can pick up tomorrow.

## Negative coverage (neg-01 … neg-08)

- Implementation (software-developer).
- PRD authoring (prd-writer / product-manager).
- Test-plan authoring (quality-engineer / test-plan skill).
- Architecture design (software-architect).
- PR review (code-reviewer).
- Sprint-planning capacity allocation (engineering-management territory).
- Threat-model authoring (security-engineer).
- ADR authoring (adr skill / software-architect).

## Edge coverage (edge-01 … edge-03)

- Lite-plan when PRD is not yet final (supported variant — agent should fire and produce lite output).
- Missing PRD — agent should fire, flag the gap, propose lite plan or escalate.
- Cross-feature quarterly roadmap — out of scope (per-feature tool, not roadmap tool).

## Notes for the runner

- The agent ships with the `development-plan` skill **preloaded** — its system prompt at startup includes the full SKILL.md body. The skill is therefore a property of the agent at invocation time, not a separate runtime load.
- Outcome metric is the gate; routing rate is informational. Expect routing rates to vary depending on whether the prompt provides enough context for Claude to confidently delegate vs. inline.
