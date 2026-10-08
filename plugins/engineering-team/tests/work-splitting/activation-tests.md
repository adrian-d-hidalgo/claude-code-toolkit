# work-splitting — activation tests

Companion corpus to `activation-evals.json`. The skill is **preloaded on `code-planner`** (full SKILL.md injected into the agent's system prompt at startup) and available via runtime discovery for any other agent or for the main conversation when a work item needs splitting.

## Scope

Fires when the user asks to split a work item (story / task / bug / spike / chore / enabler) into smaller pieces that each pass INVEST. Methodology anchors: Lawrence 2009 (9 patterns), Cohn SPIDR ~2017, Adzic Hamburger Method ~2013, Cockburn Elephant Carpaccio ~2013, Denne MMF 2004. INVEST quality bar (Wake 2003) is cross-referenced from `development-plan/references/decomposition.md` §2.

## Positive coverage

- Explicit splitting request with named technique (SPIDR / Lawrence / Hamburger / Carpaccio).
- Spanish triggers ("divide esta historia / tarea").
- Bug-splitting (after RCA when scoping the fix).
- Enabler-splitting (e.g. a too-big infrastructure task).
- Workflow-step language ("multi-step checkout").
- Vertical-slicing language ("each slice should ship something usable").

## Negative coverage

- Implementation (software-developer).
- PRD authoring (prd-writer at user-level).
- Full development plan (development-plan + code-planner).
- Code review (code-reviewer).
- Architecture design (software-architect).
- ADR authoring (adr skill).
- Bug RCA (bug-analysis skill — work-splitting fires AFTER the bug is understood).
- Test plan (test-plan skill).

## Edge cases

- **Spike already small + has exit criterion** — skill should fire and respond "no need to split; the trigger doesn't apply" rather than fabricating a split.
- **Story already INVEST-passing** — skill should fire and push back politely against splitting-for-the-sake-of-splitting.
- **Technique-agnostic request** — skill picks technique per fit and explains the choice.

## Notes for the runner

- The skill is preloaded on `code-planner`; routing rate for `code-planner` invocations may be 100% as a result.
- Description is a pure routing trigger: names intents (split this story / task / bug / work item), named techniques (SPIDR, hamburger, carpaccio), Spanish phrasing.
- Outcome is the gate; routing rate is informational.
