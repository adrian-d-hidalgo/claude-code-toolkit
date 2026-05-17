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
refactor(paid-media,aria,agents): split Person ICP and drop legacy agent_threads

- Split Person ICP into Customer ICP and Employee ICP
- Drop legacy agent_threads and agent_messages tables now that threads live in Mongo
- Resolve workspaceId from threadId via Mongo in Auth0AuthContextDriver, fixing /resume 500
```

Why good: subject names the two dominant ideas with one short "and"; body says each thing once at the domain level. No layer-restating (no "split in Prisma migration / module / DTO / schema"), no full-stack qualifier. Each bullet is one independent change.

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
