# CLAUDE.md Optimization Patterns

Trimming an over-grown CLAUDE.md, in priority order. Patterns derived from the empirical evidence: instruction files improve agent performance _only when content is operative_; descriptive content (architecture, file maps, intent) actively hurts performance and inflates cost.

Sources: arxiv:2601.20404 (Jan 2026, +29% runtime reduction with operative content), arxiv:2602.11988 (Feb 2026, +20% cost / ↓ success with descriptive content), alexop.dev (Jan 2026, 56% passive-pointer ignore rate).

---

## 1. Architectural-overview excision (highest-impact)

**Signal**: sections describing how the system works, what choices were made, history, business rationale.

**Action**: delete entirely. If genuinely needed for a specific task, move to `docs/adr/` and add an active pointer:

```markdown
## When modifying the event pipeline

Read `docs/adr/0007-event-sourcing.md` first.
```

**Typical impact**: arxiv:2602.11988 isolates this as the single largest source of degraded performance. Removing it improves both cost AND success rate.

---

## 2. File-tree map excision

**Signal**: sections describing repo layout (`src/api/ contains…`, `src/services/ contains…`).

**Action**: delete. The agent discovers structure as it works. Only keep markers for paths that meaningfully change behavior:

```markdown
- `dist/` — generated; never edit.
- `vendor/` — vendored; treat as binary.
```

**Typical impact**: 10–25% file-size reduction; encourages narrower (more correct) agent exploration.

---

## 3. README-content excision

**Signal**: paragraphs explaining what the project IS or DOES.

**Action**: delete. If the user wants the content preserved, move to `README.md`.

**Typical impact**: 20–50% of file size on first-pass cleanups of mature-but-untrimmed files.

---

## 4. Passive pointer activation

**Signal**: bare pointers ("see `docs/...`" without context).

**Action**: add trigger conditions.

BEFORE:

```markdown
See `docs/db-conventions.md` for our DB style.
```

AFTER:

```markdown
## When writing migrations or schema changes

Read `docs/db-conventions.md` first.
```

**Typical impact**: no token reduction, but the agent now actually reads the doc (~56% → ~95% read rate per alexop.dev).

---

## 5. Linter-redundancy delete

**Signal**: rules that match the project's `biome.json`, `.prettierrc`, `eslint.config.js`, `ruff.toml`, `.rubocop.yml`, etc.

**Action**: delete. Replace with one line:

```markdown
Style enforced by `<linter-config-path>`.
```

**Typical impact**: 10–30% on style-heavy CLAUDE.md files.

---

## 6. Negation → constraint-with-alternative rewrite

**Signal**: lines that say "never", "don't", "avoid" without a paired "instead" or "use X".

**Action**: rewrite as positive directive, or delete if no actionable alternative exists.

**Typical impact**: minor token reduction; major behavior improvement.

---

## 7. Vague-modifier purge

**Signal**: "appropriate", "relevant", "reasonable", "good", "modern", "best practices" without measurable criteria.

**Action**: either make concrete or delete. Test: "Would a competent senior engineer disagree, or need clarification?"

**Typical impact**: small token reduction; large signal-quality gain.

---

## 8. Scope deduplication

**Signal**: project CLAUDE.md repeats content from global `~/.claude/CLAUDE.md`, or directory file repeats project content.

**Action**: keep each rule at the most general applicable scope. Delete from lower scopes.

**Typical impact**: 5–15% reduction; eliminates divergence risk.

---

## 9. Auto-memory deduplication

**Signal**: facts already captured in auto-memory (`~/.claude/projects/<name>/memory/MEMORY.md`).

**Action**: delete from CLAUDE.md. Trust auto-memory.

**Typical impact**: 5–20% over time as auto-memory accumulates.

---

## 10. Always-Apply rebalancing

**Signal**: 10+ universal "always do X" rules.

**Action**: scope as many as possible to "When X" patterns. Keep the always-on slot for security invariants only.

**Typical impact**: agent follows scoped rules better; reduces "average output" failure mode.

---

## 11. Stale reference cleanup

**Signal**: commands or paths that no longer exist.

**Action**: validate periodically with the linter; remove or update stale references.

**Typical impact**: low token reduction; high reliability gain.

---

## 12. `@import` decomposition

**Signal**: any single section > 30 lines.

**Action**: move to a sibling file, import via `@`:

```markdown
## Style

@docs/coding-style.md
```

**Typical impact**: no net token savings (import inlines at load), but **maintainability improves** drastically and in-file scan-ability is restored.

---

## 13. Primacy + recency reordering

**Signal**: critical security/compliance/behavioral rules in the file middle.

**Action**: move to first 20 lines (absolute invariants) or last 10 ("remember when finishing" cues).

**Typical impact**: no token change; ~2× rule-adherence rate per primacy-bias research.

---

## 14. Speculative-rule purge

**Signal**: rules with no traceable origin in an observed failure.

**Action**: delete. Addy Osmani's principle: every rule should be traceable to a specific failure.

**Typical impact**: ongoing pruning discipline keeps the file's signal-to-noise high.

---

## Quantitative target

After optimization:

- Total CLAUDE.md hierarchy (global + project + active directory) loads in < 25 KB at session start.
- Token cost: < 2,000 tokens.
- Six categories of value (commands / conventions / constraints / pointers / escalation / workflow) — every section maps to one.
- Zero descriptive content (architecture, file maps, intent).
- Zero passive pointers (every pointer has a trigger).

A successful trim is typically **30–60% smaller** AND **subjectively easier to scan**.

---

## Optimization workflow

1. **Measure**: `wc -l <file>`, `wc -w <file>`, `len(file) // 4` for crude tokens.
2. **Lint**: run `scripts/validate_claude_md.py` for automated signals.
3. **Excise**: apply patterns 1–4 (highest impact).
4. **Refactor**: apply patterns 5–11.
5. **Decompose**: pattern 12 if any section still > 30 lines.
6. **Reorder**: pattern 13.
7. **Re-lint + re-measure**: target ≥ 30% reduction with no loss of operative content.
