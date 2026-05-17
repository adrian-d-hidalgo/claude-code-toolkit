# claude-code-development

Opinionated senior **engineering team** for Claude Code. Five role-specific sub-agents (developer, architect, code reviewer, quality engineer, security engineer) plus four methodology-anchored skills (ADR, test plan, git commit messages, Mermaid diagrams) — wired together so the right artifact shows up at the right moment.

## What it ships

### Sub-agents

| Agent                | Auto-trigger                                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `software-developer` | The user asks to write, modify, refactor, debug, implement, or fix code. Includes a large-change batching protocol for migrations, cross-module refactors, and rewrites.                                                                                                           |
| `software-architect` | The user asks to design a new system, evaluate architectural shapes (monolith / modular-monolith / microservices / serverless), choose data store or API protocol, draw C4, plan modernization (strangler-fig, branch-by-abstraction, parallel-run), define NFRs, or produce ADRs. |
| `code-reviewer`      | The user asks to review, audit, evaluate, assess, or check existing code or a PR; identify tech debt; scrutinize AI-generated code. Runs analyzers before forming an opinion; uses Conventional Comments severity.                                                                 |
| `quality-engineer`   | The user asks for a test strategy, layer plan, E2E plan with Playwright, contract tests with Pact, performance with k6, chaos plan, quality gates, AC traceability matrix. Anchors to ISO 25010 attributes; reasons in risk, not coverage %.                                       |
| `security-engineer`  | The user asks for threat modeling (STRIDE), AuthN/AuthZ design, OWASP review (web / API / LLM / Agentic), encryption + key management, compliance scoping (SOC2 / GDPR / HIPAA / PCI / EU AI Act), VEX drafting, security code review.                                             |

### Skills (methodology-anchored, bundled in this plugin)

| Skill        | Methodology anchor                                                                                                                                    | When it fires                                                                                                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adr`        | Michael Nygard's canonical ADR (2011) + MADR 3.0 extension                                                                                            | "write an ADR", "decision record", "RFC for [decision]". **Preloaded** in `software-architect`.                                                                                                                     |
| `test-plan`  | ISO/IEC/IEEE 29119-3:2021 + ISTQB FL 4.0 risk-based testing + ISO 25010:2023 quality attributes                                                       | "test plan", "QA plan", "release test plan", "plan de pruebas". **Preloaded** in `quality-engineer`.                                                                                                                |
| `git-commit` | Conventional Commits 1.0.0 + diff-first + log-first protocol + repo-aware format detection                                                            | "commit message", "commit msg please", "draft a commit subject", squash-mode for collapsing a branch. **Runtime discovery** — not preloaded.                                                                        |
| `mermaid`    | Mermaid syntax with per-type notation anchors (C4 by Simon Brown; UML 2.5.1; ER Chen + Crow's Foot; BPMN; etc.). 17 per-diagram-type reference files. | "draw / visualize / create a diagram", named types (flowchart, sequence, ER, state, class, C4, journey, gantt, mindmap, timeline, sankey, quadrant, gitgraph, architecture). **Preloaded** in `software-architect`. |

### Skill wiring (preload vs runtime)

| Agent                | Preloaded skills | Runtime-only skills                                       |
| -------------------- | ---------------- | --------------------------------------------------------- |
| `software-architect` | `adr`, `mermaid` | —                                                         |
| `quality-engineer`   | `test-plan`      | —                                                         |
| `software-developer` | —                | `git-commit` (used when committing — on-demand by design) |
| `code-reviewer`      | —                | —                                                         |
| `security-engineer`  | —                | —                                                         |

Preload injects the full skill body into the agent's system prompt at startup (deterministic, paid every invocation). Runtime discovery loads via the `Skill` tool only when the agent decides to invoke it (paid only when used). The choice follows the "always vs sometimes" rule documented in `claude-code-core/skills/claude-code-skill/references/section-guide.md`.

## How the agents stay disciplined

### Single-responsibility scope

Each agent declines work that has no component for its role:

- `software-architect` declines pure code implementation, deep code review, or runtime SLO operation.
- `code-reviewer` declines net-new feature authoring, test strategy design, threat modeling.
- `quality-engineer` declines routine unit-test implementation (developer does it once the strategy is set).
- `security-engineer` declines mitigation implementation, runtime SOC operation, foundational cloud-account / IAM provisioning.
- `software-developer` declines pure architecture, code review of someone else's PR, organization-level test strategy, security audits with no implementation step.

### `software-developer` core principles

Four core rules + fifteen tech-agnostic engineering practices + twelve comment-philosophy rules:

1. **Think Before Coding** — state assumptions, surface tradeoffs, push back when simpler exists.
2. **Simplicity First** — minimum code that solves the problem; no speculative features.
3. **Surgical Changes** — touch only what the task requires; match existing style.
4. **Goal-Driven Execution** — define success criteria; loop until verified.

Each is stated with a _reason_ and (where applicable) an _exception_ so the model generalises rather than overfits to the rule's wording.

Highlights of the engineering rules: read first, blast-radius / reversibility, rule of three (not premature abstraction), YAGNI, bounded Boy Scout, Conventional Commits, enumerated failure modes, idempotency by default, log-level contract, config as data + secrets out of source, failing test first, fail-fast in libraries vs degrade gracefully in user-facing services, self-review before claiming done, measure before optimising, surface risks at the start.

Sources cited inline: _Software Engineering at Google_, _Site Reliability Engineering_, _The Pragmatic Programmer_, _Code Complete 2_, _Clean Code_, 12factor.net, Conventional Commits 1.0.0, _The Staff Engineer's Path_ (Tanya Reilly).

### Large-change protocol

When work exceeds ~500 net LoC, >10 files, or >3 modules, `software-developer` switches to a batching discipline: declare the change strategy (strangler-fig / parallel-change / branch-by-abstraction / big-bang), plan batches ≤300 LoC each ordered mechanical → semantic, enforce invariants (build green / tests green / types valid / lints clean) between batches, commit per batch with Conventional Commits, respect a context budget (≤20 files per turn), report progress per batch.

## Install

```bash
claude plugin marketplace add github:adrian-d-hidalgo/claude-code-toolkit
# Or, from a local checkout:
# claude plugin marketplace add file:///path/to/claude-code-toolkit
claude plugin install claude-code-development@claude-code-toolkit
```

Once installed, the agents appear under the `claude-code-development:` prefix in `/agents`. Bundled skills appear under the same prefix in `/skills`. Both auto-invoke based on user intent matched against each component's `description`.

Explicit invocation also works:

```text
@"software-architect (agent)" design the architecture for the new fraud-detection service
/claude-code-development:adr write the decision record for picking Postgres over DynamoDB
```

## Activation evaluation

Each agent and skill ships an activation-test corpus under `tests/<name>/activation-evals.json`:

- `tests/software-developer/`, `tests/software-architect/`, `tests/code-reviewer/`, `tests/quality-engineer/`, `tests/security-engineer/` — 23-27 cases each (positive / negative / edge).
- `tests/adr/`, `tests/test-plan/`, `tests/git-commit/`, `tests/mermaid/` — 19 cases each (8 positive / 8 negative / 3 edge).

Run all corpora against your local `claude` binary:

```bash
python3 scripts/run_activation_evals.py --all plugins/claude-code-development --live --judge
```

Reports land in `.eval-runs/`. Sub-agents are evaluated on **outcome quality** (LLM-as-judge), not routing accuracy — Claude rationally chooses not to delegate for small tasks. The judge scores `understood_intent`, `action_appropriate`, and `meta_skill_was_correct_route` per case; the aggregate outcome is the pass gate. `delegation_rate` is reported as informational.

## Where to look next

- Agents: [`agents/`](./agents/) — full system prompt per agent.
- Skills: [`skills/`](./skills/) — SKILL.md + references per skill.
- Tests: [`tests/`](./tests/) — activation-eval corpora.

To author or modify any component, invoke the matching meta-skill in `claude-code-core` (`claude-code-skill`, `claude-code-sub-agent`, `claude-code-slash-command`, `claude-code-plugin`, `claude-code-hook`, `claude-code-claude-md`). Those own the conventions and validators for their component type.
