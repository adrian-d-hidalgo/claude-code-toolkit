# Tool-surface inventory — transversal convention

Every engineering-team agent in `claude-code-development` inventories the project's available tool surface — linters, type-checkers, test runners, profilers, code-intelligence MCPs (`mcp__codegraph__*`), observability MCPs (`mcp__<vendor>__*`), issue-tracker MCPs, project scripts — **before opining, recommending, or designing**. The inventory tells the reader which signals the agent used; an agent that improvises without surveying what the repo already has produces lower-signal output and frequently fabricates tool names that are not actually present.

This convention is paired with [`code-grounded-analysis.md`](./code-grounded-analysis.md): code-grounded analysis covers *what to read* (file:line, symbol resolution, neighbouring code, ADRs); tool-surface inventory covers *which project-provided tools to run to obtain that signal*.

## The protocol — first contact with the repo

Run these in parallel before forming the first hypothesis / recommendation / design:

1. **Detect the stack from artefacts.** Lock files (`package-lock.json`, `pnpm-lock.yaml`, `poetry.lock`, `uv.lock`, `Cargo.lock`, `go.sum`, `Gemfile.lock`), manifests (`package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, `build.gradle`, `composer.json`, `Gemfile`), tool-version files (`.tool-versions`, `.nvmrc`, `.python-version`, `rust-toolchain.toml`), and CI workflows (`.github/workflows/`, `.gitlab-ci.yml`, `.circleci/`). Never infer the stack from filename extensions alone — a `.js` file in a TypeScript project still needs `tsc`.

2. **Read project conventions.** `CLAUDE.md` and `AGENTS.md` at the repo root (and any nested ones) usually name the canonical entry points: `make test`, `just check`, `npm run lint`, `pnpm test:integration`, `cargo nextest run`. Prefer these over hand-rolled invocations — they encode the project's chosen flags and configurations.

3. **Enumerate session MCPs** by listing `mcp__<server>__*` tool names. Recognise categories by prefix (vendor-agnostic):
   - **Code-intelligence** — `mcp__codegraph__*` is the canonical one. If `.codegraph/` exists, prefer `codegraph_search` / `codegraph_callers` / `codegraph_callees` / `codegraph_impact` / `codegraph_context` over grep for any symbol-level question.
   - **Observability / APM** — error tracking (`mcp__sentry__*`, `mcp__newrelic__*`), APM + multi-source (`mcp__datadog__*`, `mcp__grafana__*`), logs (`mcp__loki__*`, `mcp__cloudwatch_logs__*`), metrics + alarms (`mcp__cloudwatch__*`).
   - **Issue trackers** — `mcp__github__*`, `mcp__atlassian__*` / `mcp__jira__*`, `mcp__linear__*` for correlation with tracked issues, PRs, sprints.
   - **Secrets / config** — `mcp__vault__*` or vendor-specific KMS / secret-store MCPs.

4. **Verify binaries exist** before invoking. `command -v <tool>` or check the project's `package.json` `scripts`, `Makefile`, `justfile`, `Taskfile.yml`. Prefer project scripts over ad-hoc invocations when they exist; fall back to zero-install (`npx`, `uvx`, `pnpm dlx`) only when nothing is set up.

5. **State the inventory** in one short paragraph before forming the first hypothesis / recommendation / design. If a tool is plausibly relevant but presence cannot be confirmed (e.g., the user mentioned "Sentry" but no `mcp__sentry__*` is registered), ask one ≤20-word question — never invent the call.

## Hard rules — anti-fabrication

- **No fabricated MCPs.** If the user mentions a vendor ("check Sentry / Datadog") but no `mcp__<vendor>__*` tool is registered in the session, ask whether to skip that source or pause for the user to connect it — never invent the call.
- **No fabricated commands.** Do not invoke flags or sub-commands the binary does not support; consult `--help`, the binary's documentation, or the project's canonical scripts.
- **Read-only by default for analysis / design MCPs.** When using observability or issue-tracker MCPs during analysis or design, restrict to `get_*`, `search_*`, `query_*`, `list_*`. Do not resolve issues, acknowledge alerts, close incidents, or mutate dashboards — those are *fix* actions that belong to the implementing agent.
- **Confirm presence before assuming.** "The user probably has X" does not justify a call to `mcp__X__*` without verifying it is registered.
- **Stack-agnostic phrasing.** This reference uses categories (code-intelligence, observability, issue-tracker, secret-store) and the `mcp__<vendor>__*` prefix as the recognition pattern. Specific vendor names appear as illustrations, not contracts.
- **Re-inventory across module boundaries.** Within a monorepo, different sub-projects can have different stacks and different available MCPs. Inventorying once at the start and never re-inventorying produces wrong recommendations on the second module.

## How each agent applies this

The protocol is the same across agents; the surface each agent inventories differs by discipline:

| Agent              | Tool families to inventory                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| code-reviewer      | Lint / format / type-check, SAST, dependency scan, secret scan, complexity analyzers. Per-stack matrix lives in the agent body.                                           |
| data-engineer      | Migration tooling for the chosen engine, codegraph (consumers + impact), observability MCPs for freshness / quality signals.                                              |
| debugger           | Test runner, linter, type-checker, debugger config, profiler, structured logs, traces, dashboards, codegraph, observability MCPs. Per-stack diagnostic matrix in the body. |
| quality-engineer   | Test runners per layer (unit / integration / E2E), coverage tools, contract testing (Pact-like), load (k6-like), a11y scanners, observability MCPs for flake correlation. |
| security-engineer  | SAST (e.g. `semgrep`), dep-scan (`trivy`, `osv-scanner`, `pip-audit`), secret-scan (`gitleaks`), observability MCPs for runtime threat signals, codegraph for data-flow tracing. |
| software-architect | codegraph for blast-radius of the decision, observability MCPs to validate NFR targets against real data instead of hypotheses, diagram MCPs when applicable.             |
| software-developer | Project's linter / formatter / type-checker / test runner; prefer canonical scripts (`make`, `just`, package scripts) over ad-hoc invocations. codegraph for safe refactor. |
| code-planner       | codegraph for impact (PR sequencing), issue-tracker MCP for sprint / tracker correlation, escalation to `research-specialist` per `external-research`.                    |

## Anti-patterns

- **Grepping for a symbol when codegraph is available** — codegraph returns kind + location + signature in one call; grep is slower and noisier.
- **Inventing an MCP / vendor that is not registered in the session** — fabrication is the dominant LLM failure mode here; reject it.
- **Calling `mcp__sentry__*` "because the project probably uses Sentry"** without verifying — confirm before assuming.
- **Invoking a binary without `command -v`** when there is non-trivial risk of absence — produces an unhelpful failure and burns a turn.
- **Ignoring the project's scripts (`make test`, `just check`, `npm run lint`) and reinventing the invocation** — duplicates flags and misses project-specific configuration.
- **Mutating via MCP during analysis / design** — resolving issues, acknowledging alerts, editing dashboards is *fix* work, not analysis work.
- **Inferring the stack from filename extensions only** when lock files / manifests / tool-version files are available — the latter are authoritative.
- **Inventorying once at the start and never re-inventorying** when the work crosses modules or contexts — different modules can have different stacks within a monorepo.
- **Treating tool availability as a hard prerequisite** — if codegraph is absent, fall back to grep; if no observability MCP, read local artefacts. Prefer-if-available, not require.

## Cross-reference

- [`evidence-rule.md`](./evidence-rule.md) — claims grounded in MCP / tool output use `[Verified]` with the tool + command + result as the source.
- [`code-grounded-analysis.md`](./code-grounded-analysis.md) — the paired convention covering *what to read* vs *which tools to run*.
- [`risk-scoring.md`](./risk-scoring.md) — findings derived from inventoried tools (SAST hits, flake rates, NFR drift) are scored per the discipline-specific scale.

Each agent body has a short `## Tool-surface inventory` section pointing to this file. Discipline-specific tool matrices (per-stack diagnostic commands, per-stack linters, per-layer test tools) live in each agent's body.
