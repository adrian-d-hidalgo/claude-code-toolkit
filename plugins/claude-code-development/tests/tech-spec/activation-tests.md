# tech-spec — activation tests

Companion corpus to `activation-evals.json`. **Migrated from `~/.claude/skills/tech-spec/` to the plugin** in this iteration; now preloaded on `software-architect`.

## Scope

Fires when the user asks to write or scope a technical specification for an approved (or near-approved) PRD. Methodology anchors: C4 (Simon Brown), arc42, ADR (Nygard), DORA Four Keys, Twelve-Factor, Well-Architected.

Does NOT fire for: PRD authoring (prd-writer), individual ADRs (adr skill), diagrams alone (mermaid), threat models (threat-model), full development plan / sub-task breakdown (development-plan + work-splitting), code implementation (software-developer), test plan (test-plan), code review (code-reviewer).

## Positive coverage

- Explicit tech-spec / design-doc / RFC / documento técnico requests.
- Both English and Spanish triggers.
- Platform-only work (no PRD) — explicitly allowed.
- Lite spec requests.

## Negative coverage

- PRD authoring.
- Implementation.
- Single ADR (use adr skill).
- Test plan.
- PR review.
- Development plan / sub-tasks.
- Threat model alone.
- Diagram alone.

## Edge cases

- **Lite spec** (explicit collapse to 6 sections).
- **No PRD** for pure-platform work — allowed; spec flags the absence.
- **PRD in draft** — fires; skill flags risk.

## Notes for the runner

- Skill now lives at `plugins/claude-code-development/skills/tech-spec/` (migrated from user-level).
- Preloaded on `software-architect` alongside `adr` and `mermaid`.
- Description is a pure routing trigger; behavior leakage and negative scope ("Does NOT cover X") removed per meta-skill anti-pattern rules.
