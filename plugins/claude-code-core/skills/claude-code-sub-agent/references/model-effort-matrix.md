# Model + effort decision matrix

Two frontmatter fields control how much intelligence a sub-agent brings to bear: `model:` (which model runs) and `effort:` (how much reasoning budget that model spends per turn). They are **independent axes** but their valid combinations depend on the model. Picking them well saves cost and latency without losing quality; picking them blindly either wastes budget or under-powers reasoning-heavy work.

Use this matrix when authoring or refactoring a sub-agent.

**Authoring convention**: this doc uses the model **aliases** (`opus`, `sonnet`, `haiku`) throughout because that is the form sub-agents should be pinned to — aliases auto-resolve to the latest version of that family, so agents stay current as new versions ship. Pin a full version ID (`claude-opus-4-7`) only when you have an explicit reason to freeze that version.

## What the fields control

| Field | Type | Effect |
| ----- | ---- | ------ |
| `model:` | `opus` / `sonnet` / `haiku` / full version ID / `inherit` / omitted | Which model serves the agent's turns. Frontmatter overrides session model. |
| `effort:` | `low` / `medium` / `high` / `xhigh` / `max` | Adaptive reasoning depth. Frontmatter overrides session effort. Available levels depend on the model. |

Frontmatter precedence over session is confirmed in official docs ([code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents.md#supported-frontmatter-fields)). A user on Claude Max running a session at default effort still gets the agent's pinned `effort:` for that agent's turns.

## Compatibility — which effort levels exist per model

Critical constraint: **effort level availability depends on the model**. Setting an unsupported level fails.

| Model alias  | Supported effort levels                          | Notes |
| ------------ | ------------------------------------------------ | ----- |
| `opus`       | `low`, `medium`, `high`, `xhigh`, `max`          | `xhigh` was added with Opus 4.7. If you pin an older full version ID (e.g. `claude-opus-4-6`), `xhigh` is unavailable on that pin. |
| `sonnet`     | `low`, `medium`, `high`, `max`                   | No `xhigh` on any Sonnet version to date. |
| `haiku`      | (not configurable)                               | No adaptive thinking. Omit `effort:` for Haiku agents. |

Source: [code.claude.com/docs/en/model-config](https://code.claude.com/docs/en/model-config.md#adjust-effort-level).

**Key implication**: if you want `xhigh` (Anthropic's recommended default for Opus), you must pin `model: opus` explicitly. Pairing `effort: xhigh` with `model: inherit` is unsafe — it will fail on a session running Sonnet.

## Official guidance per effort level (verbatim from docs)

From [code.claude.com/docs/en/model-config](https://code.claude.com/docs/en/model-config.md):

| Level    | When to use it (Anthropic docs)                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `low`    | Short, scoped, latency-sensitive tasks that are not intelligence-sensitive.                                                              |
| `medium` | Cost-sensitive work that can trade off some intelligence.                                                                                |
| `high`   | Minimum for intelligence-sensitive work, or to reduce token spend relative to `xhigh`.                                                   |
| `xhigh`  | Best results for most coding and agentic tasks. **Recommended default on Opus.**                                                          |
| `max`    | Can improve performance on demanding tasks but **may show diminishing returns and is prone to overthinking. Test before adopting broadly.** |

**The `max` warning is the key signal**: Anthropic explicitly tells users not to default to `max`. Use it only when your own evals show measurable headroom past `xhigh`.

## Cognitive-load rubric for picking the right tier

Classify the agent into one of four cognitive-load tiers based on what it actually does:

| Tier | Cognitive load | Examples (role pattern) | `model:` | `effort:` |
| ---- | -------------- | ----------------------- | -------- | --------- |
| **A — Strategic** | Decisions that live years, hard to reverse. Trade-offs across multiple non-functional dimensions. | Architect, code-planner, principal-engineer. Picks data stores, designs ADRs, sequences PRs, sets NFRs. | `opus` | `xhigh` |
| **B — Heavy analysis** | Deep analysis bounded by a framework (STRIDE, Kimball, ISO 25010). Multi-step reasoning with a rubric. | Security-engineer, data-engineer, performance-engineer. | `opus` | `xhigh` |
| **C — Intelligence-sensitive execution** | Code writing, refactor, structured review, debugging. Applies a framework of judgment (engineering rules, severity rubrics, test pyramid, hypothesis-driven). | Software-developer, code-reviewer, quality-engineer, debugger. | `sonnet` | `high` |
| **D — Mechanical** | Truly mechanical work that doesn't trade off intelligence: regex transformers, syntax converters, formatters, simple linters. | (No agents in this toolkit currently fit.) Example pattern: a "convert TS to JS" agent. | `sonnet` or `haiku` | `medium` (or omit for Haiku) |

### Why these defaults

- **Tier A — `opus` + `xhigh`**: docs recommend `xhigh` as Opus's default for "coding and agentic tasks." `max` was considered but Anthropic's own warning ("prone to overthinking, test before adopting") plus benchmark evidence of diminishing returns past `xhigh` argue against making it a toolkit default. Reserve `max` for one-shot strategic decisions where the user explicitly opts in.
- **Tier B — `opus` + `xhigh`**: same rationale. The analytical framework constrains the search space, but the reasoning is still genuinely complex enough that Opus's capacity pays off.
- **Tier C — `sonnet` + `high`**: docs describe `high` as "**minimum for intelligence-sensitive work**, or to reduce token spend relative to `xhigh`." Sonnet has no `xhigh`. Code writing, refactoring, debugging, and structured review are all intelligence-sensitive even when the system prompt encodes rules — applying a framework requires judgment, not pattern-matching. Demoting any of these to `medium` trades off intelligence the docs explicitly warn against trading off.
- **Tier D — `sonnet` + `medium` (or `haiku`, no effort)**: docs describe `medium` as "cost-sensitive work that can trade off some intelligence." This tier is for work that is genuinely **not** intelligence-sensitive: regex transformations, syntax conversion, formatting. The line: if a senior developer would do the task mechanically without thinking, the agent can run at `medium`. If they'd need to think — even for ten seconds — the agent belongs in tier C.

### When to escalate above the default

You can promote a tier-C agent to `model: opus` (still `effort: high`) when:

- The judge consistently rates outputs as missing nuance Sonnet wasn't catching.
- The agent's output-quality ratio drops below your tolerance.

You can promote `effort:` to `max` (any tier) when:

- Your own evals show measurable improvement past `xhigh` / `high` on your specific task corpus.
- The task is one-shot and high-stakes (e.g. a one-time migration design, not a hundred-times-a-day refactor).
- You accept the latency hit (`max` is meaningfully slower).

### When to demote below the default

Demote tier D to `model: haiku` (and omit `effort:`) when:

- The agent does pure pattern application with no reasoning at all (regex-driven formatters, syntax converters, simple linters).
- Latency matters more than nuance.

## Full grid — hints per cell

The tier rubric covers the 4 recommended combinations. For completeness, here is what each individual model × effort cell is good for, using the aliases. Use this when an agent doesn't fit cleanly into a tier or when tuning an outlier.

### `opus`

| Effort | Use this combination when… |
| ------ | -------------------------- |
| `low` | You want Opus's quality on a small, scoped, one-shot question and you want it fast. Rare — most Opus invocations justify higher effort. Example: a single-shot "is this design pattern sound?" sanity check. |
| `medium` | You want Opus's reasoning ceiling but the task is cost-sensitive and can trade off some depth. Example: a high-volume agent that needs Opus's nuance but runs many times per day. |
| `high` | Opus on a token budget. Intelligence-sensitive work where `xhigh` would be ideal but cost discipline matters. Example: tier-A agent that runs frequently and you want to throttle spend. |
| `xhigh` | **Recommended default for Opus.** Best general-purpose for coding, agentic work, planning, architecture, threat modelling, data modelling. The sweet spot — better than `high`, no overthinking risk of `max`. |
| `max` | **Reserve for opt-in, one-shot, high-stakes use.** Hardest reasoning problems (ARC-style composition, novel architectural trade-offs with many constraints). Test first with evals; Anthropic warns about overthinking and diminishing returns. Never default an agent here. |

### `sonnet`

| Effort | Use this combination when… |
| ------ | -------------------------- |
| `low` | High-volume, low-stakes pattern application: classification, routing, simple extraction, ticket triage, dependency-scan summarisation. Latency matters more than depth. |
| `medium` | Cost-sensitive work that can trade off some intelligence. **Truly mechanical agents only** — formatters, syntax converters, regex transformers. Avoid for any agent that has to apply a rubric of engineering judgment (those belong on `high`). |
| `high` | **Default for Sonnet on intelligence-sensitive work.** Code writing, refactoring, structured review, debugging, test design. The community pattern "plan-Opus, execute-Sonnet" usually puts the executor here. |
| `max` | Last-resort budget for Sonnet on a hard problem. Rare — if the work is hard enough to need `max`, it usually deserves Opus. Use when Opus is unavailable (e.g. user on a tier without Opus access) but the task is genuinely demanding. |

### `haiku`

| Effort | Use this combination when… |
| ------ | -------------------------- |
| (n/a) | Haiku does not support adaptive thinking — `effort` is not configurable; omit the field. Use Haiku for ultra-high-volume, latency-critical, low-stakes work: log-line classification, simple regex routing, status checks, format conversions where quality is uniform across the input space. If the task has any judgment surface, do not use Haiku. |

## Quick "what cell am I in?" heuristics

When sizing a new agent:

- **Will the agent make a decision that lives more than 6 months in production?** → Tier A (`opus` + `xhigh`).
- **Does the agent run a recognised analytical framework (STRIDE, ISO 25010, Kimball)?** → Tier B (`opus` + `xhigh`).
- **Does the agent write, modify, refactor, review, debug code or tests?** → Tier C (`sonnet` + `high`). **Code is intelligence-sensitive.**
- **Could a senior engineer do this task mechanically while half-watching TV?** → Tier D (`sonnet` + `medium`, or `haiku`).
- **Does the agent only classify, route, or extract structured fields?** → `haiku` (no effort).

If the agent straddles two tiers, **promote, don't demote** — Anthropic's docs frame `high` as the *minimum* for intelligence-sensitive work; demoting below that trades off quality the docs explicitly warn against trading off.

## Decision tree

When authoring a new sub-agent:

```
1. What does this agent fundamentally do?
   a. Make strategic decisions / design systems → Tier A → opus + xhigh
   b. Apply a deep analytical framework → Tier B → opus + xhigh
   c. Write / refactor / review / debug code with judgment → Tier C → sonnet + high
   d. Apply purely mechanical transformations → Tier D → sonnet + medium
   e. Pure pattern application, no reasoning → outside the matrix → haiku, no effort

2. Are you on a free / Pro tier without Opus access?
   → Demote tier A/B to sonnet + high. You lose ceiling but stay portable.

3. Does the agent run dozens of times per day?
   → Default is right. Do not escalate to max.

4. Is this a one-shot, high-stakes decision?
   → Consider effort: max for that invocation. Verify via eval first.
```

## Cost and latency (community estimates, not Anthropic-published)

Token cost multipliers relative to `medium` on the same model (community synthesis, treat as rough order of magnitude):

| Level    | Approx. output token multiplier |
| -------- | ------------------------------- |
| `low`    | ~0.4–0.6×                       |
| `medium` | 1.0× (baseline)                 |
| `high`   | ~1.4–1.8×                       |
| `xhigh`  | ~1.8–2.5×                       |
| `max`    | ~2.5–4.0×                       |

Latency: `max` is roughly 2–4× slower than `low` on the same task. Anthropic does not publish official latency numbers.

## What NOT to do

- **Do not** default any agent to `effort: max`. The docs explicitly warn against it.
- **Do not** pair `effort: xhigh` with `model: inherit` or `model: sonnet` — `xhigh` is Opus-only and will fail on a Sonnet session.
- **Do not** pin a strategic agent to `sonnet` to save cost when the user is on Max. The user already paid for Opus access; let the alias give it to them.
- **Do not** use a full version ID (`claude-opus-4-7`, `claude-sonnet-4-6`) unless you have a specific reason to freeze the version. Use the alias (`opus`, `sonnet`) so the agent auto-uses the latest version when a new one ships.

## Sources

- [Effort - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/effort)
- [Adaptive thinking - Claude API Docs](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
- [Model configuration - Claude Code Docs](https://code.claude.com/docs/en/model-config)
- [Create custom subagents - Claude Code Docs](https://code.claude.com/docs/en/sub-agents)
- [Threads post - Boris Cherny (Anthropic) on xhigh as new default](https://www.threads.com/@boris_cherny/post/DXMqkQfFBKQ/in-claude-code-the-default-effort-is-now-xhigh-a-new-level-between-high-and-max)
