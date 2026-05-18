# bug-analysis — anti-patterns

Patterns the skill rejects (or flags) when producing or reviewing a bug analysis.

## §1 — Fix without RCA

**Bad**: "We patched it by adding a try/catch — closing the ticket."

**Why wrong**: the patch may suppress the symptom while the root cause remains; the same class of bug will recur elsewhere. Without RCA, prevention is impossible.

**Fix**: every non-trivial bug gets a 5-Whys descent BEFORE the patch is considered final. Trivial bugs (typos, off-by-one in dead code) are exempt with explicit rationale.

## §2 — Blame culture in the analysis

**Bad**: "Root cause: Engineer X merged the PR without running tests locally."

**Why wrong**: people aren't root causes. Per Allspaw 2012 + Sidney Dekker — the same person on a different day with different context would make a different decision. The root cause is whatever **system** allowed that decision to land in production.

**Fix**: rewrite as "The code-review process didn't surface X because [systemic reason]; CI didn't catch X because [systemic reason]."

## §3 — Single-cause assumption

**Bad**: "Root cause: bug in the connection pool."

**Why wrong**: most non-trivial bugs require **multiple converging conditions** to manifest. Stopping at one cause misses contributing factors → prevention plan addresses only one of N gaps → recurrence likely.

**Fix**: pair 5-Whys (depth) with Ishikawa (breadth). Or use FTA if the failure required multiple necessary conditions simultaneously.

## §4 — RCA stopped at the first human in the chain

**Bad**: "Why did the leak happen? → Engineer forgot to release the connection. **STOP**."

**Why wrong**: stops the analysis at a person; misses the systemic enabler. Every system that relies on humans noticing every detail will fail eventually — that's the actual root cause.

**Fix**: keep asking why until you reach a systemic factor: "Why did the code allow the forget to land? → No connection-lifecycle check in CR / lint / test. Why? → Checklist gap. Why? → No process to keep the checklist current."

## §5 — Containment confused with fix

**Bad**: "Fix: flipped flag `checkout-v2` to OFF."

**Why wrong**: that's containment. The fix is the underlying code change that makes flipping the flag back ON safe.

**Fix**: separate the three response paths explicitly. Containment ≠ Fix ≠ Prevention.

## §6 — No prevention path

**Bad**: analysis ends at "fix proposal"; no prevention.

**Why wrong**: without prevention, the same class of bug ships again. The whole point of RCA is to inform prevention.

**Fix**: always propose at least one prevention action — test, lint, runtime check, alert, runbook, training, architecture change. Even if it's "add this exact regression test to the suite", that counts.

## §7 — Status field in the output

**Bad**: including `Status: Draft / Final / Approved` as a typed field in the analysis content.

**Why wrong**: lifecycle tracking is the project's tracker / postmortem-doc convention. The analysis content is a deliverable, not a state machine.

**Fix**: drop the `Status:` field. The org's postmortem template wraps the analysis content with whatever lifecycle metadata it uses.

## §8 — Missing evidence levels

**Bad**: "The pool was exhausted at 14:00." (no tag)

**Why wrong**: the reader can't audit. Was this verified in logs, inferred from symptoms, or assumed?

**Fix**: tag with `[Verified — auth-service logs, 2026-05-12T14:00:23Z]` per `../../references/evidence-rule.md`. Every factual claim gets a level.

## §9 — Speculation presented as fact

**Bad**: "Root cause: a race condition between request handlers."

**Why wrong**: claimed as if verified, but without reproduction or instrumentation evidence it's `[Inference]` at best, often `[Unverified]`.

**Fix**: state your evidence level. "Root cause: [Inference — race condition between request handlers, supported by Verified concurrent log entries at sub-millisecond gaps in `auth.log:12345`; not yet reproduced]."

## §10 — Postmortem becomes a CYA document

**Bad**: tone designed to assign or deflect responsibility. Vague active voice that hides what specifically happened.

**Why wrong**: defeats the entire purpose. The system doesn't get better; the org gets more cautious about admitting incidents.

**Fix**: blameless tone (per `blameless-postmortem.md`) + concrete actions + measurable success criteria for each action.

## §11 — All-or-nothing severity

**Bad**: marking every bug as "P1 — critical" to ensure attention.

**Why wrong**: severity inflation erodes the signal. Real P0/P1 incidents get lost in noise; on-call fatigue grows.

**Fix**: use the org's severity matrix honestly. If you don't have one, propose one. Common shape:

- **P0**: full outage / data loss / security breach. Page on-call immediately.
- **P1**: significant feature broken / SLA threatened. Same-business-day.
- **P2**: degraded functionality / workaround exists. Next-sprint.
- **P3**: minor / cosmetic. Backlog.

## §12 — Treating the analysis as the deliverable

**Bad**: producing a beautiful RCA → archiving it → moving on.

**Why wrong**: the deliverable is the **prevention plan executed**, not the document. Without follow-through on action items, the analysis is theatre.

**Fix**: every action item is tracked in the org's tracker, owned, dated, and reviewed at the next postmortem cadence. Per `blameless-postmortem.md`.

## §13 — Output that names files / paths the org doesn't use

**Bad**: the analysis cites `src/auth/session.ts:42` when the repo doesn't have that path.

**Why wrong**: fiction. Per `../../references/evidence-rule.md`, file references should be `[Verified]` — they exist or they don't.

**Fix**: read the actual code (`Read`, `Grep`, `Glob`) before citing paths. If the path doesn't exist anymore (file moved / renamed), follow the rename via `git log --follow` and cite the current path.
