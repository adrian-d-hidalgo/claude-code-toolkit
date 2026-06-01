# claude-code-development

Opinionated senior **engineering team** for Claude Code. Eight function-specific sub-agents (developer, architect, code planner, code reviewer, quality engineer, security engineer, debugger, data engineer) plus **sixteen methodology-anchored skills** (ADR, test plan, development plan, work-splitting, bug-analysis, threat-model, tech-spec, debugging-protocol, code-audit, code-review-checklist, git-commit, Mermaid diagrams, external-research, coding-practices, data-modeling, schema-evolution). The agents are **composable LEGO pieces** — they emit content, not files; they suggest consults, never invoke other agents (orchestrator-worker model per Anthropic's multi-agent guidance); orchestration lives in the caller's `CLAUDE.md` / `AGENTS.md`. Single-responsibility scope, least-privilege tooling, no `Status:` fields imposed.

**Agents are organized by function, not by role.** A real-world senior engineer or team lead does many things (planning, reviewing, threat-modelling, debugging, mentoring, …). This plugin models each as a distinct function so they can be invoked independently. The `code-planner` agent (renamed from `tech-lead` in v2.0) reflects this: it covers the code-planning function — capacity allocation, mentoring, and cross-feature roadmap are functions humans perform that no agent in this team represents.

## What it ships

### Sub-agents

| Agent                | Auto-trigger                                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `software-developer` | The user asks to write, modify, refactor, debug, implement, or fix code. Includes a large-change batching protocol for migrations, cross-module refactors, and rewrites.                                                                                                           |
| `software-architect` | The user asks to design a new system, evaluate architectural shapes (monolith / modular-monolith / microservices / serverless), choose data store or API protocol, draw C4, plan modernization (strangler-fig, branch-by-abstraction, parallel-run), define NFRs, or produce ADRs. |
| `code-planner`       | The user asks to turn an approved PRD + tech-spec + ADRs into an executable development plan: ordered tasks with dependencies, PR sequencing, time-boxed spikes for unknowns, and a Definition of Done per task tied to acceptance criteria. **Scope: code-planning function only** (capacity, mentoring, roadmap are not represented as agents in this team).                                       |
| `code-reviewer`      | The user asks to review, audit, evaluate, assess, or check existing code or a PR; identify tech debt; scrutinize AI-generated code. Runs analyzers before forming an opinion; uses Conventional Comments severity.                                                                 |
| `quality-engineer`   | The user asks for a test strategy, layer plan, E2E plan with Playwright, contract tests with Pact, performance with k6, chaos plan, quality gates, AC traceability matrix. Anchors to ISO 25010 attributes; reasons in risk, not coverage %.                                       |
| `security-engineer`  | The user asks for threat modeling (STRIDE), AuthN/AuthZ design, OWASP review (web / API / LLM / Agentic), encryption + key management, compliance scoping (SOC2 / GDPR / HIPAA / PCI / EU AI Act), VEX drafting, security code review.                                             |
| `debugger`           | The user asks to debug, investigate, reproduce, diagnose, or root-cause a defect, regression, intermittent failure, mystery bug, performance anomaly, or "works on my machine" report. Read-only; inventories the project's debugging surface before improvising; hypothesis-driven; exits at root cause + minimal reproduction. |
| `data-engineer`      | The user asks to model a database schema, choose a normalization strategy, plan a migration with backfill, design data contracts, evaluate indexes / partitions / constraints, plan schema evolution (expand/contract, dual-write, parallel-run), document lineage. Read-only; access-pattern-first; storage-engine choice belongs to architect. |

### Skills (methodology-anchored, bundled in this plugin)

| Skill                   | Methodology anchor                                                                                                                                        | When it fires                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `adr`                   | Michael Nygard's canonical ADR (2011) + MADR 3.0 extension                                                                                                | "write an ADR", "decision record", "RFC for [decision]". **Preloaded** on `software-architect`.                                                                       |
| `test-plan`             | ISO/IEC/IEEE 29119-3:2021 + ISTQB FL 4.0 risk-based testing + ISO 25010:2023 quality attributes                                                           | "test plan", "QA plan", "release test plan". **Preloaded** on `quality-engineer`.                                                                                     |
| `development-plan`      | GitHub spec-kit + Story Mapping (Patton 2014) + Vertical Slicing (Cohn / INVEST) + WBS (PMBOK 7) + SAFe 6.0 (Direct Value vs Enabler) + expand–contract   | "development plan", "implementation plan", "plan de desarrollo", "break this spec into tasks". **Preloaded** on `code-planner`.                                          |
| `work-splitting`        | Lawrence patterns (2009) + Cohn SPIDR (~2017) + Adzic Hamburger Method (~2013) + Cockburn Elephant Carpaccio (~2013) + Denne MMF (2004) + Wake INVEST     | "split this story / task / bug", "this is too big", "vertical slice this", "SPIDR", "hamburger method", "elephant carpaccio". **Preloaded** on `code-planner`.           |
| `bug-analysis`          | 5 Whys (Toyoda / Ohno) + Ishikawa Fishbone (1968) + Fault Tree Analysis (Bell Labs 1962) + Blameless Postmortem (Allspaw 2012 + Google SRE 2016) + Pareto | "analyse this bug", "root cause", "post-mortem", "RCA", "5 whys", "fishbone". **Preloaded** on `code-planner`; runtime on `software-developer` + `security-engineer`.    |
| `threat-model`          | STRIDE (Howard & Lipner 2002) + PASTA (UcedaVelez 2015) + DREAD qualitative + Trust Boundaries (Shostack 2014) + Attack Trees (Schneier 1999)             | "threat model", "STRIDE", "PASTA", "attack tree", "modelo de amenazas". **Preloaded** on `security-engineer`; runtime on `software-architect` + `software-developer`. |
| `tech-spec`             | C4 model (Brown) + arc42 + IEEE 1016-2009 + Google design-doc convention + RFC 2119 + Well-Architected pillars                                            | "tech spec", "design doc", "RFC for [system change]", "documento técnico". **Preloaded** on `software-architect`.                                                     |
| `debugging-protocol`    | Hypothesis-driven debugging (Zeller 2009) + Delta Debugging (Zeller / Hildebrandt 1999) + git bisect + Observability-First (Majors 2022)                  | "debug this", "investigate the [perf/intermittent/mystery] issue", "find the regression", "git bisect this". **Runtime** on `software-developer`.                     |
| `code-audit`            | Conventional Comments + Impact × Effort 2×2 + SQALE (Letouzey 2010) + Fowler code smells (2018) + Architecture Fitness Functions (Ford 2017)              | "audit our codebase", "tech-debt analysis", "code smells in", "SQALE assessment". **Preloaded** on `code-reviewer`.                                                   |
| `code-review-checklist` | Google Engineering Practices Code Review (2019) + Wiegers Peer Reviews (2002) + OWASP Code Review Guide v2 (2017) + SmartBear empirical practice          | "review this PR", "code review", "is this safe to merge", "review the diff". **Preloaded** on `code-reviewer`.                                                        |
| `git-commit`            | Conventional Commits 1.0.0 + diff-first + log-first protocol + repo-aware format detection                                                                | "commit message", "commit msg please", "draft a commit subject". **Runtime** on `software-developer`.                                                                 |
| `mermaid`               | Mermaid syntax with per-type notation anchors (C4 by Brown; UML 2.5.1; ER Chen + Crow's Foot; etc.). 17 per-diagram-type references                       | "draw / visualize / create a diagram". **Preloaded** on `software-architect`.                                                                                         |
| `external-research`     | Source-priority pyramid (official docs > release notes > issue tracker > RFCs > comparative analyses > forums) + triangulation + `[Verified-external]` citation discipline (URL + access date + version) | "investiga", "research this", "is X a known issue", "check the changelog", "compare A vs B", "what does the spec say". **Preloaded** on every agent in the team. |
| `coding-practices`      | ~25 tech-agnostic coding principles across 7 categories (read/scope, abstraction/coupling, state/errors, change-mgmt, ops/evolution, API/collab, naming) + strict comment philosophy (default = no comment; 4 taxative exceptions; delete-on-sight list) with imperative + reason + source citation per rule | "apply coding practices", "review against coding rules", "is this YAGNI", "audit comment style", "make illegal states unrepresentable", "deep modules". **Preloaded** on `software-developer` and `security-engineer`. |
| `data-modeling`         | Access-pattern-first design + Codd normalization (1NF–BCNF) + Kimball dimensional modeling (business process → grain → dimensions → facts) + workload decision tree (OLTP / OLAP / streaming / hybrid) + storage-engine-agnostic | "design a schema for", "model this data", "normalization or denormalization", "OLTP or OLAP", "Kimball dimensional", "single-table design". **Preloaded** on `data-engineer`. |
| `schema-evolution`      | Expand/contract (Sadalage 2006) + idempotent backfills + consumer-driven evolution + rollback per step + data-contracts (schema + semantics + ownership + freshness SLA) + storage-engine-agnostic | "plan this migration", "expand contract migration", "dual-write strategy", "add NOT NULL safely", "rename a column without breaking". **Preloaded** on `data-engineer`. |

### Skill wiring (preload vs runtime)

| Agent                | Preloaded skills                                                                            | Runtime-available skills                                           |
| -------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `code-planner`       | `development-plan`, `work-splitting`, `bug-analysis`, `external-research`                   | —                                                                  |
| `software-architect` | `adr`, `mermaid`, `tech-spec`, `external-research`                                          | `threat-model` (when designing security-sensitive surface)         |
| `code-reviewer`      | `code-review-checklist`, `code-audit`, `external-research`                                  | —                                                                  |
| `quality-engineer`   | `test-plan`, `external-research`                                                            | `work-splitting`, `bug-analysis`                                   |
| `security-engineer`  | `threat-model`, `coding-practices`, `external-research`                                     | `bug-analysis`, `work-splitting`                                   |
| `software-developer` | `coding-practices`, `external-research`                                                     | `bug-analysis`, `debugging-protocol`, `threat-model`, `git-commit` |
| `debugger`           | `bug-analysis`, `debugging-protocol`, `external-research`                                   | —                                                                  |
| `data-engineer`      | `data-modeling`, `schema-evolution`, `external-research`                                    | —                                                                  |

Preload injects the full skill body into the agent's system prompt at startup (deterministic, paid every invocation). Runtime invocation loads via the `Skill` tool only when the agent decides to use it (paid only when used). The choice follows the "always vs sometimes" rule documented in `claude-code-core/skills/claude-code-skill/references/section-guide.md`.

### Transversal practices (apply to every agent in the team)

These are baked into all eight agents — no project's `CLAUDE.md` should have to re-specify them:

- **Evidence levels** — every recommendation / finding / decision tagged `[Verified]` / `[Inference]` / `[Unverified]` / `[Verified-external]` with source citation. Convention: [`references/evidence-rule.md`](./references/evidence-rule.md).
- **Code-grounded analysis** — agents read the actual repo before producing outputs. Every file / module / symbol named in the output exists in the repo or is tagged `to create`. No invented names. Convention: [`references/code-grounded-analysis.md`](./references/code-grounded-analysis.md).
- **Risk scoring and prioritisation** — findings, recommendations, and backlog items carry likelihood × impact → priority → action, scaled per discipline (CVSS, ISO 25010, impact×effort, NFR target). Convention: [`references/risk-scoring.md`](./references/risk-scoring.md).
- **Tool-surface inventory** — agents inventory the project's available tooling (linters, type-checkers, test runners, profilers, codegraph + observability MCPs, project scripts) before opining; never fabricate MCPs or vendor tools not registered in the session. Convention: [`references/tool-surface-inventory.md`](./references/tool-surface-inventory.md).
- **Output shape varies with the ask** — agents emit only what was asked. The "Reporting format" lists are the _maximal_ shape; one-section requests get one-section outputs.
- **No silent drift** — when reality contradicts the spec / plan / prior decision, surface the contradiction; never paper over.
- **Outputs are content, never files** — agents emit structured content the caller persists wherever (exception: `software-developer` writes code, which is its job). No filenames or paths imposed.
- **No `Status:` fields** in any output — lifecycle tracking is the project's tracker (Jira / Linear / Notion), out of scope for the agents.
- **No agent invokes another** — agents suggest consults; orchestration is the caller's `CLAUDE.md` / `AGENTS.md` job.

Preload injects the full skill body into the agent's system prompt at startup (deterministic, paid every invocation). Runtime discovery loads via the `Skill` tool only when the agent decides to invoke it (paid only when used). The choice follows the "always vs sometimes" rule documented in `claude-code-core/skills/claude-code-skill/references/section-guide.md`.

## How the agents stay disciplined

### Single-responsibility scope

Each agent declines work that has no component for its role:

- `software-architect` declines pure code implementation, deep code review, runtime SLO operation, work-ordering / PR sequencing (code-planner's job), and schema-shape decisions inside a chosen engine (data-engineer's job).
- `code-planner` declines product-requirements authoring, architecture decisions, implementation, test-plan authoring, threat modeling, code review, sprint capacity planning, and cross-feature roadmap work — some of those belong to sibling agents (PM/PRD work is upstream; architecture is `software-architect`; testing is `quality-engineer`); others are human functions not encoded as agents (capacity, roadmap).
- `code-reviewer` declines net-new feature authoring, test strategy design, and deep threat modeling (detects obvious OWASP signals and escalates to `security-engineer`).
- `quality-engineer` declines routine unit-test implementation (developer does it once the strategy is set).
- `security-engineer` declines mitigation implementation, runtime SOC operation, foundational cloud-account / IAM provisioning, and line-by-line code review (consumes `code-reviewer` findings or operates on a delimited threat surface).
- `software-developer` declines pure architecture, code review of someone else's PR, organization-level test strategy, security audits with no implementation step.
- `debugger` declines writing the fix (developer's job), auditing the test that revealed the bug (`code-reviewer` / `quality-engineer`), and any work that doesn't have an active defect under investigation. Exits at root cause + minimal reproduction.
- `data-engineer` declines storage-engine choice (architect's NFR-driven decision), executing migrations or queries (developer), test strategy at the application level (QE), and PII / encryption-at-rest design (security-engineer).

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

- **Agent corpora** (6): `code-planner`, `software-architect`, `code-reviewer`, `quality-engineer`, `security-engineer`, `software-developer` — 19–27 cases each (positive / negative / edge).
- **Skill corpora** (12): `adr`, `test-plan`, `development-plan`, `work-splitting`, `bug-analysis`, `threat-model`, `tech-spec`, `debugging-protocol`, `code-audit`, `code-review-checklist`, `git-commit`, `mermaid` — 19–21 cases each.

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
