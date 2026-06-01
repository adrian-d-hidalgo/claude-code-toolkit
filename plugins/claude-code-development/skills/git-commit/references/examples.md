# Examples bank

## Good — long subject + multi-scope + bullets (modern team style)

```
docs(agents,docs): improve agent instructions and reorganize .project/ around real architecture

- Rewrite AGENTS.md with repo-local agent guidance covering rules, debug protocol and Aria boundaries
- Rewrite GUIDELINES.md as backend technical conventions agents must follow
- Reduce CLAUDE.md to a pointer to AGENTS.md so agents land on the rules first
- Add ARCHITECTURE.md describing the backend at a glance
- Add .project/agents/ARCHITECTURE.md verified against the real Aria implementation
- Delete obsolete docs that misled agents
```

Why good: scopes are domains (`agents`, `docs`), multi-scope correct, bullets name artifact + value without enumerating internal sections, no AI attribution, no file counts.

## Good — short prose body

```
fix(auth): prevent session expiry race condition

Two requests at the millisecond expiry boundary both passed the check before either invalidated the token. Introduce a mutex around check + invalidation.
```

Why good: names exact bug + mechanism + fix. No file counts. Works without bullets when the change is one coherent thing.

## Good — subject only

```
chore(deploy): update develop image tag to 632b26c
```

Why good: matches the repo's recurring deploy-bump pattern observed in `git log`. No body needed.

## Good — subject only with technical specificity (one-shot precise change)

```
fix(verify): use describe-task-definition for latest revision
```

Why good: extremely punctual change (one API call swap). The subject can be precise and technical because there is one thing to say. No body needed. Specificity ≠ length — it is allowed when the change really is one technical decision and adding a body would just restate the subject.

## Good — subject-only for a one-line behavior change

```
feat(aria): instrument repairOrphanedToolCalls with structured warn logs
```

Why good: one function, one observable change. The subject is technically specific (function name + what was added) because the change _is_ narrow. A body would just say "added logger.warn calls", restating the diff.

## Good — punctual subject + one-bullet body (multi-action commit)

```
refactor(paid-media,agents): split Person ICP and drop legacy agent_threads

- Split Person ICP into Customer ICP and Employee ICP
- Drop legacy agent_threads and agent_messages tables in Aria now that threads live in Mongo
- Resolve workspaceId from threadId via Mongo in Auth0AuthContextDriver, fixing /resume 500
```

Why good: subject is two genuinely distinct dictionary roots (`paid-media` and `agents`); `aria` is **not** listed as a separate scope even though it was touched, because it lives inside the `agents` domain — the body names it instead. Subject says the two dominant ideas with one short "and"; body says each thing once at the domain level. No layer-restating (no "split in Prisma migration / module / DTO / schema"), no full-stack qualifier. Each bullet is one independent change.

---

## Bad — folder-shaped scope

```
docs(.project): flatten technical/ tree and rewrite operational docs
```

`.project` is a folder. Scope must be a domain. Use `docs(agents,docs):` or similar.

## Bad — granular content inventory

```
docs(agents): rewrite AGENTS.md

- Rewrite AGENTS.md with: trigger table, anti-patterns, debug protocol via Chrome DevTools MCP, scope rules, decision matrix, Aria boundaries, frontend boundaries
- Add GUIDELINES.md covering: TanStack Query for server state, Redux for client state, no fetch outside SDK, Spanish orthography, no console.*, accessibility AA
```

Every bullet dumps the file's table of contents. Reader opens the file for that. Cut to artifact + purpose.

## Bad — wrong verb for flag

```
feat: modified auth.service.ts and updated 3 methods, changed 50 lines
```

Flag was `M` (so not `feat:`), mentions file + line counts, describes mechanics not value.

## Bad — AI attribution

```
fix(api): correct pagination off-by-one

Co-authored-by: Claude <noreply@anthropic.com>
🤖 Generated with Claude Code
```

AI attribution is forbidden. The commit author handles attribution via git config, not via trailers added by this skill.

## Bad — vague + WIP

```
chore: cleanup
WIP: almost done
fix: update stuff
```

All three are placeholders or vague. Reject and rewrite.

## Bad — stuffed subject (5 ideas comma-chained)

```
refactor(aria,agents,langfuse-tracing): rebuild runtime as an agnostic library with minimal chat-message contract, awaiting_resume lifecycle, populated Langfuse traces and a runtime/judge eval suite separate from Aria-domain cases
```

239 chars, ~2.4× the repo's median. Five distinct ideas comma-chained: rebuild-as-library, chat-message contract, awaiting_resume lifecycle, Langfuse traces, eval suite split. Each clause is independently meaningful, which is the diagnostic — they belong in the body. Subject must collapse to one idea (`rebuild runtime as an agnostic library`); the rest goes to bullets.

## Bad — cross-layer restating in body

```
refactor(paid-media): split PersonIcp into CustomerIcp + EmployeeIcp full-stack

- Split person_icps into customer_icps + employee_icps in one Prisma migration with backfill
- Replace person-icp module with customer-icp and employee-icp modules (entities, ports, use cases, repos, controllers, DTOs, exception mappers)
- Replace person_icp_modal surface with customer_icp_modal and employee_icp_modal in Aria
- Update SDK manager from icps to customer-icps and employee-icps
- Split useIcps hook into useCustomerIcps and useEmployeeIcps
```

All five bullets describe one change (`Split Person ICP`) viewed from five different layers (DB / backend module / surface / SDK / hook). The reader opens the diff for layers. Collapse to one bullet: `- Split Person ICP into Customer ICP and Employee ICP`. Also drop "full-stack" from the subject — it is layer-enumeration in disguise.

## Bad — subject enumerates components instead of naming the change

```
feat(crm): add Lead, Account, Contact, Opportunity, Deal, Pipeline and Stage models with sync use-case
```

The subject enumerates 7 entities. The change is one thing: "introduce CRM bounded context". List the entities in the body if at all. Subject names the **value**, not the inventory.

## Bad — nested scopes (parent and children listed side by side)

```
fix(childA,parent,runtime,childB): close <feature> across runtime, ui, persistence and synthesizer
```

In this repo's tree, `childA/` and `childB/` live under `parent/`. The subject lists them next to their own ancestor, so the same domain is named three times. The collapse procedure says:

1. Dictionary: `parent`, `childA`, `childB`, `runtime` are all valid scopes in `git log`.
2. Path hierarchy: `childA` and `childB` share the `parent/` prefix; the diff touched **both** children — so collapse the children into the ancestor.
3. Ceiling: do not climb above `parent` (the dictionary doesn't bless anything higher).
4. Cardinality: with the collapse done, `parent` and `runtime` remain — two scopes, fine.

Right:

```
fix(parent,runtime): close <feature> end-to-end
```

The body names which sub-areas of `parent` (`childA`, `childB`) and which slice of `runtime` changed. Four scopes with two parent/child pairs in the same prefix is pure noise in `git log`.

## Good — pair-programmed commit with human co-author

```
fix(payments): correct decimal handling in invoice totals

Replace floating-point arithmetic with Decimal across the totals
pipeline. Paired with the on-call engineer who reproduced the
rounding regression in the staging report.

Co-authored-by: Jane Doe <jane@example.com>
```

Why good: `Co-authored-by:` names a real human collaborator with a real email. Trailer is in the footer, separated from the body by a blank line. The skill's AI-attribution ban does NOT apply here — pair/mob programming with named humans is legitimate. Never use this trailer form for AI tools.

## Good — commit with DCO sign-off and issue reference

```
feat(auth): add OIDC token rotation on refresh

Token refresh now rotates the OIDC token alongside the access token
to match the spec change from upstream. Existing sessions remain
valid until natural expiry.

Closes #1284
Signed-off-by: Real Person <real@example.com>
```

Why good: the repo's log shows `Signed-off-by:` in >70% of recent commits (DCO-required project), and `Closes #N` is the dominant issue-linkage form. Subject is in the repo's Conventional Commits format; trailers in the order the repo's log uses (issue reference first, then DCO). No AI attribution.

## Good — breaking change detected from diff

```
feat(api)!: remove deprecated /v1/users endpoint

The /v1/users surface has been deprecated since 2025-09. Callers
should migrate to /v2/users which returns the same schema with
proper pagination headers.

BREAKING CHANGE: /v1/users removed. Update clients to /v2/users.
```

Why good: the skill detected the removed route in the diff (a `-router.get("/v1/users", ...)` line plus the corresponding handler deletion), so it added `!` after the scope and the `BREAKING CHANGE:` footer naming what broke and how to migrate. Preamble warned the user; user confirmed; marker stayed.

## Bad — too many scopes (cardinality smell)

```
chore(auth,billing,reporting,onboarding): bump dependencies and align lint config
```

Four genuinely distinct dictionary roots — no parent/child hierarchy to collapse. But the cardinality cap still fires: 4+ scopes is always rewritten. Two valid moves:

- **Dominant**: pick the domain that carries the bulk of the change (e.g. `chore(auth):` if 70% of the touched files are in `auth/`); name the others in the body.
- **Umbrella**: if the dictionary already has a higher-level scope that covers all four (e.g. `chore(deps):` for any cross-cutting dep bump), use it.

Right (umbrella version):

```
chore(deps): bump runtime dependencies and align lint config across surfaces
```

The body lists which domains saw bumps if the reader needs that. Four-scope subjects are a smell; the body is the place for breadth, not the prefix.
