# Source priority for external research

Sources are not interchangeable. The same question answered by an official spec and a forum thread carries different weight. This reference establishes the priority order so the agent can pick the strongest available source first and surface honest confidence when only weaker sources are available.

## Priority order (highest → lowest)

| # | Source type | Use for | Why authoritative |
|---|---|---|---|
| 1 | **Official spec / RFC / standard** (IETF, W3C, ECMA, ISO, vendor protocol docs) | Protocol behaviour, syntax, semantics, conformance | Normative; the spec defines the behaviour |
| 2 | **Official product documentation** (vendor docs site for the version in use) | API surface, configuration, supported behaviour | Authored by the maintainers; versioned |
| 3 | **Release notes / changelog** (project's tagged release page) | Behaviour changes, fixed bugs, deprecations | Maintainer-authored; tied to a specific version |
| 4 | **Official upstream issue tracker** (GitHub Issues, GitLab Issues, vendor bug DB) | Known issues, reproductions, workarounds | First-party; status reflects current reality |
| 5 | **Maintainer-authored blog post or talk** (project blog, conference talk by core maintainer) | Design rationale, roadmap, non-obvious behaviour | Authoritative voice; less formal than docs |
| 6 | **Authoritative books / papers** (DDIA, Kimball, Fowler, peer-reviewed papers) | Patterns, trade-offs, architectural reasoning | Carefully edited; long shelf life; widely cited |
| 7 | **Reputable comparative analyses** (engineering blogs at known orgs, well-cited Medium/Substack) | Trade-off comparisons, real-world experience reports | Practitioner perspective; may be biased |
| 8 | **Q&A forums** (Stack Overflow, Reddit, Discord archives) | Last-resort signal; community workarounds | High noise, high outdated rate; corroboration required |
| 9 | **LLM-generated summaries** (other model outputs reused as "sources") | Never — cite the underlying source instead | Not a source; a paraphrase that may hallucinate |

## How to apply

- Prefer the highest-priority source that answers the question. If RFC 9457 answers the protocol question, do not cite a Stack Overflow thread about it.
- When the highest-available source is rank 7+, surface that explicitly: "single non-authoritative source; corroboration recommended."
- For "is X a known issue?", rank 4 (issue tracker) is usually the authoritative answer — even above the docs, because issues capture current reality.
- For version-specific behaviour, rank 3 (changelog) is often the most direct source.
- For "what does best practice say?", rank 6 (books / papers) typically beats rank 7 (blogs) because of editorial rigour and durability.

## Triangulation

Behavioural claims about libraries / frameworks benefit from triangulation: same claim corroborated by two independent sources (e.g., changelog + upstream issue + reproduction in code). Direct quotes from a single rank-1 / rank-2 source do not need triangulation — they are direct evidence, not interpretation.

## Citation format reminders

Always include:

- URL (full, deep-linked to the section / version when possible).
- Access date (`accessed YYYY-MM-DD`) — external sources move; the date pins what was visible at the time.
- Version when applicable (`version 14.2.3` or `RFC 9457 §3.1.2`).

See `../../references/evidence-rule.md` (plugin-root) for `[Verified-external]` format and worked examples.

## Anti-patterns specific to source selection

- **Citing a blog post when the official docs would answer** — laziness; readers downgrade trust in everything else in the report.
- **Citing Stack Overflow without checking when it was answered** — many answers describe behaviour from years-old library versions.
- **Citing a wiki page maintained by the community as official** — community wikis often lag the actual docs; check provenance.
- **Treating a high-vote answer as authoritative** — votes correlate with engagement, not with correctness.
- **Citing a YouTube video as a primary source** — videos are hard to verify and date; cite the underlying repo / docs the video references.
- **Citing translated docs as a primary source** — translations lag and may diverge; cite the original-language source and note the translation if relevant.
