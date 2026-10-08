# CLAUDE.md Validation Checklist

Human-review pass complementing the automated linter (`scripts/validate_claude_md.py`).

## Structural

- [ ] File length ≤ 200 lines.
- [ ] File size ≤ 25 KB.
- [ ] Word count in 150–800 range (smaller is OK when the file delegates to AGENTS.md / `.handbook/` / sibling docs).
- [ ] `<!-- last-reviewed: YYYY-MM-DD -->` HTML comment at top.
- [ ] Critical rules in the first 20 or last 10 lines.

## Six categories of value (Part B of section-guide)

Every section in the file maps to exactly one of these categories. If a section maps to none, delete it.

- [ ] Operative commands (build/test/lint/format).
- [ ] Non-lintable conventions (naming, architecture invariants).
- [ ] Constraints with alternatives.
- [ ] Active pointers with triggers (no passive "see X").
- [ ] Escalation / stop rules.
- [ ] Workflow rules earned by failure.

## Anti-patterns absent

- [ ] No architectural overviews / "why we chose X" prose.
- [ ] No file-tree maps describing repo layout.
- [ ] No passive pointers ("see X" without trigger condition).
- [ ] No linter-redundant rules.
- [ ] No vague modifiers without measurable criteria.
- [ ] No "rules the model already follows correctly".
- [ ] No README-style content (product description, history, marketing).
- [ ] No negation without paired positive alternative.
- [ ] No duplicate sections (3-gram similarity ≤ 0.7).
- [ ] No first-person voice ("we", "our") in operative sections.

## Scope hygiene

- [ ] Scope chosen deliberately (global / project / directory).
- [ ] No directory file repeats project-level content.
- [ ] No project file repeats global content.
- [ ] No auto-memory duplication.

## Token efficiency

- [ ] `@import` used for any section exceeding ~30 lines.
- [ ] Total bytes across loaded hierarchy < 25 KB.
- [ ] Crude token estimate (`bytes // 4`) < 2,000 tokens.

## Reference health

- [ ] Every command in the file exists in `package.json` / `Makefile` / etc.
- [ ] Every file path referenced exists in the repo.
- [ ] Every `@import` target file exists.
- [ ] Every pointer has a trigger condition ("When X, read Y").

## AGENTS.md alignment (if both files exist)

- [ ] Canonical source designated (one file authoritative; the other is a copy/symlink or clearly delineated supplement).
- [ ] Content does not diverge between files.

## Update discipline

- [ ] Every rule is traceable to a specific observed failure OR is a universal invariant (security/compliance).
- [ ] Rules the agent already follows correctly have been pruned.
- [ ] `last-reviewed` date is within the last 90 days, or stale entries have been audited.

## Voice

- [ ] Imperative voice throughout operative sections.
- [ ] No prose paragraphs in rule sections.
- [ ] Bullets or numbered lists for rules; no narrative.
