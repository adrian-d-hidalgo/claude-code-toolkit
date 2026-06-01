# Explicit blacklist — must reject and rewrite

## Forbidden vague subjects

- `Update <X>` alone — missing object + reason.
- `Fix <X>` alone — missing what broke.
- `Change`, `Modify`, `Adjust`, `Improve`, `Tweak` as primary verb without specific object.
- `WIP`, `wip`, `temp`, `tmp`, `checkpoint`.
- `Minor changes`, `Small fix`, `Misc`, `Various fixes`.
- `Cleaning up`, `Cleanup` without specific object.

## Forbidden body anti-patterns

- **File or line counts**: "modified 4 files", "added 50 lines", "±200 LOC".
- **Restating the diff**: "Changed X from A to B" when the diff already shows it.
- **HOW without WHY**: "Replaced forEach with map" without reason or effect.
- **Meta-commentary**: "This PR addresses feedback from code review", "Per discussion in Slack".
- **Mechanical bullets**: "Modified 45 lines in auth.service.ts", "Updated session handling code".
- **Path-shaped scopes**: `(.project)`, `(src)`, `(node_modules)`.
- **Nested scopes (parent + its children in the same prefix)**: `(child,parent)` or `(childA,parent,childB)` when the diff shows those children live inside the parent's directory. Collapse to the highest dictionary-blessed ancestor; mention the sub-areas in the body. Do **not** climb past whatever the `git log` dictionary has actually used as a scope — that ceiling is what prevents collapse from terminating at the repo root.
- **Cardinality overflow (4+ scopes)**: a 4-scope prefix almost always means either un-collapsed hierarchy (apply parent/child collapse) or a commit too wide to label crisply (pick the dominant scope or a dictionary-blessed umbrella; the body covers the rest). At 3 scopes the skill must offer one of its three proposals as a 2-scope alternative so the user sees the smell.
- **AI attribution**: `Co-authored-by: Claude`, `Co-authored-by: GPT-*`, `Co-authored-by: Copilot`, `Generated with Claude Code`, `🤖`, `Generated-by:`. **Never** add these — hard rule, even when explicitly asked. Full rationale in `references/non-goals.md` (license/legal clarity, repo author choice, trailer hygiene, user preference).
  - **Human** `Co-authored-by: Real Person <email>` for genuine pair/mob programming **is** allowed and encouraged when the user names a collaborator — the ban above is specific to AI tools. See `references/trailers.md`.

## Forbidden granular content inventories (critical)

When a bullet describes a **doc, config, or guideline**, name **what the artifact is and the value it provides** — not the table of contents.

The reader can open the file. The commit message must not duplicate it.

Wrong — enumerates internal sections:

```
- Add GUIDELINES.md as infrastructure technical conventions agents must follow (Terraform workspaces named {project}-{environment}, state backend, module layout, naming, tagging, secrets handling)
- Rewrite GUIDELINES.md as backend technical conventions agents must follow (hexagonal one-way imports, UUIDv7, exceptions, tenancy, OpenTelemetry)
- Rewrite AGENTS.md with repo-local agent guidance: trigger table, anti-patterns, debug protocol, decision rules, Aria boundaries
```

Right — names artifact + purpose, lets the file speak for itself:

```
- Add GUIDELINES.md as infrastructure technical conventions agents must follow
- Rewrite GUIDELINES.md as backend technical conventions agents must follow
- Rewrite AGENTS.md with repo-local agent guidance covering rules, debug protocol and Aria boundaries
```

**Heuristic**: if a bullet contains a parenthetical list of 3+ items, OR a colon followed by a comma-separated list of internal sections, it is almost certainly violating this rule. Cut it down.

A short qualifier is OK ("covering rules, debug protocol and X boundaries") if it points at the **shape** of the doc — not its full ToC.

## Forbidden cross-layer restating (critical)

When ONE change cuts across layers (DB + backend module + frontend module + surface + DTO + schema + hook + SDK + mapper + repo), it is still ONE bullet. Naming the same change three times — once at the DB layer, once at the module layer, once at the API/surface layer — is the same anti-pattern as a granular content inventory: the diff already shows which layers were touched.

Wrong — same change told three times from three layers:

```
- Split person_icps into customer_icps + employee_icps in one Prisma migration with backfill, distribute campaign_groups.person_icp_id into customer_icp_id + employee_icp_id with XOR CHECK
- Replace person-icp module with customer-icp and employee-icp modules (entities, ports, use cases, repos, controllers, DTOs, exception mappers)
- Replace person_icp_modal surface with customer_icp_modal and employee_icp_modal in Aria
```

Right — one bullet, named at the domain level:

```
- Split Person ICP into Customer ICP and Employee ICP
```

**Heuristic**: if two adjacent bullets share the same subject noun and only differ in _where_ the change lives (migration / module / surface / controller / DTO / schema / hook / SDK / mapper / repo / entity / port), collapse them into one bullet that names the change at the domain level. The diff is the source of truth for which layers were touched — the message names the _change_, not its layers.

Do not append "across DB, backend module and surface", "full-stack", "end-to-end", or "in one Prisma migration plus controller plus DTO" either — those phrases are layer-enumeration in disguise. The domain-level name (`Split Person ICP into Customer ICP and Employee ICP`) is enough; the reader opens the diff to see which layers shipped.

A second bullet is justified only when there are two **independent** changes that happened to ship together (e.g. "drop legacy agent_threads tables" is independent of "split Person ICP", so it gets its own bullet). Different layers of the same change are not independent.

## Forbidden wrong-verb errors

- `add` when flag is `M` (modified).
- `update` when flag is `R` (renamed) — should be `rename` or `move`.
- `add` when there is `D` old path + `A` new path with high similarity (it is a move).
- `refactor:` when the diff includes behavior change (it is `fix:` or `feat:`).
- `feat:` when only modifying existing code with no new export/route/UI.
