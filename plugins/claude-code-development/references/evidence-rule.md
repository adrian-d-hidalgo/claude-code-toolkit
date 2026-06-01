# Evidence levels — transversal convention

Every engineering-team agent in `claude-code-development` annotates **every recommendation, decision, finding, sub-task, or sign-off** with one of four evidence levels. The annotation is short, inline, and explicit. The reader can audit the claim without re-doing the work.

## The four levels

### `[Verified]`

Read directly from code, an artefact, a log line, a measurement, a known authoritative source. The reader can re-check by visiting the source.

**Always cite the source** in the same statement:

- `[Verified — src/auth/session.ts:42]` — read at a specific file:line.
- `[Verified — commit a3f9c1]` — found in git history.
- `[Verified — dashboard grafana/d/api-latency p95=180ms@2026-05-17T14:00Z]` — measured value with timestamp.
- `[Verified — RFC 9457 §3.1.2]` — quoted from an authoritative spec.
- `[Verified — \`pytest tests/auth/ -k login\` returned 0 in CI run #1842]` — command + result.

### `[Inference]`

Deduced from one or more verified antecedents through a stated chain of reasoning. Not directly observed, but logically follows from what was observed.

**Always cite the antecedents**:

- `[Inference — given Verified rate-limit headers in src/api/middleware.ts:88 and OWASP API4:2023 §rate-limit, the new endpoint requires the same middleware]`
- `[Inference — Verified flake rate 7% in CI dashboard implies the integration test is non-deterministic; the symptom matches Verified non-isolated test data per tests/integration/conftest.py:12]`

Inference is for **chain-of-reasoning** claims. If you can't state the antecedent verifiables, it's `[Unverified]`, not `[Inference]`.

### `[Unverified]`

Assumption pending validation. The reader (or a downstream consumer) must verify before relying on it. Always cite **what would verify the claim**:

- `[Unverified — verify by running k6 load test at 5k RPS in staging]`
- `[Unverified — confirm with the architect whether the new event topic is in scope for this iteration]`
- `[Unverified — needs a 7-day soak test in staging before promoting]`

Use `[Unverified]` honestly. Stamping `[Verified]` on an assumption breaks the reader's trust in the entire artefact.

### `[Verified-external]`

Sourced from an external authoritative document outside the repository — official docs, release notes, RFCs, vendor security advisories, upstream issue trackers. Distinct from `[Verified]` because the source lives outside the codebase and can move, be revised, or be deprecated.

**Always cite URL + access date + version when applicable**:

- `[Verified-external — Next.js 14.2.3 changelog https://github.com/vercel/next.js/releases/tag/v14.2.3 accessed 2026-05-22]`
- `[Verified-external — RFC 9457 §3.1.2 https://www.rfc-editor.org/rfc/rfc9457 accessed 2026-05-22]`
- `[Verified-external — Postgres 16 docs §11.2 "Index Types" https://www.postgresql.org/docs/16/indexes-types.html accessed 2026-05-22]`
- `[Verified-external — GitHub issue vercel/next.js#62018 status:open accessed 2026-05-22]`

Use this level when the source is outside the repo. Prefer it over `[Inference]` for library/spec behaviour — confirming against the upstream source is stronger than deducing from typical-for-language patterns.

## Anti-patterns

- **Missing level tag**: a claim without an evidence level reads as fact; the reader can't audit. Tag every claim.
- **`[Verified]` without a source**: the reader can't re-check. Cite file:line, commit, dashboard, command, or doc reference.
- **`[Inference]` without antecedents**: degenerates to opinion. Cite the verified observations the inference rests on.
- **`[Unverified]` without a verification path**: lazy — the reader has nowhere to go. Always state what would close the gap.
- **`[Verified-external]` without URL or access date**: external sources move; without a date the claim cannot be re-checked. Always include URL + access date + version.
- **`[Verified]` for a library claim that was not measured in this repo**: if the claim describes upstream library behaviour and is not measured by a local test, it is `[Verified-external]` (or `[Inference]` if deduced from typical-for-library patterns without consulting the source).
- **Wrapping the whole document in one tag**: per-claim granularity. Different claims have different evidence levels.
- **Tag inflation**: not every prose sentence needs a tag. Apply to claims that matter — recommendations, decisions, findings, sub-task DoD items, sign-off statements. Filler narration doesn't need tags.

## How each agent uses this

| Agent              | Where evidence levels apply                                                                                     |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| code-planner       | Triage findings, every sub-task field where it's a claim (e.g. "Files / modules touched"), spike exit criteria. |
| software-architect | Every decision; every NFR target; every ADR's Context and Consequences sections.                                |
| code-reviewer      | Every finding (caught by analyzer = Verified; deduced pattern = Inference; suspicion = Unverified).             |
| quality-engineer   | Coverage / flake / mutation claims; risk scoring; layer recommendations.                                        |
| security-engineer  | Every threat (existing mitigation = Verified / Inference / Unverified); residual risk; CVSS scoring.            |
| software-developer | PR descriptions; commit messages; in-code comments that assert behavior; debugging hypotheses.                  |

## Cross-reference

Each agent body has a short `## Evidence levels` section pointing here, not duplicating the convention.
