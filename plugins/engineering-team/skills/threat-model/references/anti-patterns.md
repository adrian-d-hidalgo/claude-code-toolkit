# threat-model — anti-patterns

## §1 — Boil-the-ocean threat model

**Bad**: 6 STRIDE letters × 40 components × 8 trust boundaries = thousands of cells, most of them N/A.

**Why wrong**: ceremony, not insight. Reader's attention is finite; padding with N/As hides the real findings.

**Fix**: scope tightly. Threat-model the change in front of you, or the surface that matters now. State explicitly what's OUT of scope. Use STRIDE-per-Element for components in scope only.

## §2 — No residual-risk statement

**Bad**: "Threat: spoofed token. Mitigation: JWT validation. ✓"

**Why wrong**: doesn't state what risk REMAINS after the mitigation. JWT validation could be misconfigured; the signing key could leak; the algorithm could be downgraded ("alg: none" attack).

**Fix**: every threat gets a residual-risk statement: Low / Medium / High / Critical. If Low, say why. If higher, propose additional mitigation.

## §3 — Trust boundaries missing

**Bad**: threat model lists components but doesn't show where authority changes.

**Why wrong**: threats hang in the air. Why is "Tampering" a concern in component X but not in component Y? Without boundaries, the reader can't reason.

**Fix**: enumerate trust boundaries explicitly (per `trust-boundaries.md`); reference them in threats ("at TB-3, the application → DB boundary, SQLi is the primary tampering vector").

## §4 — Quantitative DREAD scoring

**Bad**: "DREAD score: 7 + 8 + 6 + 9 + 4 = 34/50, severity HIGH."

**Why wrong**: scores are non-comparable across raters / sessions. Microsoft deprecated quantitative DREAD for this reason. Summed scores hide risk-relevant structure.

**Fix**: use DREAD as qualitative descriptors. For quantitative scoring, use CVSS 3.1 vectors.

## §5 — Mitigation proposed without owner / effort

**Bad**: "Mitigation: add additional input validation."

**Why wrong**: who owns it? How big is the work? Vague mitigations don't get done.

**Fix**: cite the affected file / function. Estimate effort (S / M / L). Suggest owner (but never invoke — orchestration is the caller's job).

## §6 — Threat model without code-grounded reading

**Bad**: produces a threat model citing components and mitigations that don't exist in the actual codebase.

**Why wrong**: fictional. Per `../../references/evidence-rule.md`, every claim about existing mitigations must be `[Verified]` — read in code/config — or honestly tagged `[Unverified]`.

**Fix**: read the actual code before claiming a mitigation exists. Use `Read`, `Grep`, `Glob` to find auth middleware, rate-limit config, redaction logic. If a mitigation is **proposed** rather than existing, label it as "proposed mitigation" — not "current mitigation".

## §7 — Skipping STRIDE letters silently

**Bad**: applying S, T, I but omitting R, D, E without explanation.

**Why wrong**: reader assumes the analyst forgot or got lazy. Silent skips reduce trust in the whole model.

**Fix**: every letter is addressed per component — either with a threat OR with explicit N/A + rationale ("R: N/A — component is stateless, nothing to repudiate; the calling layer owns audit").

## §8 — Tone alarmism

**Bad**: "CRITICAL RISK — system could be COMPLETELY COMPROMISED if attacker [implausible scenario] happens."

**Why wrong**: erodes the model's credibility. Severity inflation makes real findings invisible.

**Fix**: technical, risk-based tone. Likelihood × impact ratings honest. If something is high-severity, the rating speaks; don't shout.

## §9 — Including the model's own lifecycle field

**Bad**: `**Status**: Draft / In review / Approved` inside the threat-model content.

**Why wrong**: lifecycle is the project's tracker. The model is a deliverable.

**Fix**: drop the field. The org wraps the model with whatever review-lifecycle metadata it uses.

## §10 — Mitigation depending on "humans being careful"

**Bad**: "Mitigation: developers must remember to call `escape()` on all user input before logging."

**Why wrong**: humans forget. Mitigations relying on perpetual human vigilance fail at scale.

**Fix**: propose **systemic** mitigations: redaction middleware, lint rule, runtime guard, schema validation at the boundary. Tag the "developer must remember" version as `Insufficient — proposes systemic alternative below`.

## §11 — Mixing methodologies without stating which

**Bad**: output has some STRIDE-like rows + some PASTA-stage-3 content + some attack-tree fragments, with no labelling.

**Why wrong**: reader can't audit. Each methodology has different scope and rigour.

**Fix**: state methodology at the top of the output. If combining (STRIDE inside PASTA Stage 4), say so.

## §12 — Threat without an attacker

**Bad**: "Threat: data could leak from the database."

**Why wrong**: passive voice hides the threat actor and attack vector. "Data leaks" by itself isn't a threat — by what mechanism, by whom?

**Fix**: state attacker + method + target. "Threat: an authenticated user with admin role exfiltrates the full PII table via the unrestricted `/admin/export` endpoint."

## §13 — One-time threat model, never revisited

**Bad**: threat model produced before launch, archived, never updated as the system evolves.

**Why wrong**: threats change with each new surface, integration, or scope expansion. A 2-year-old model is fiction.

**Fix**: cadence of review (per release / per major feature) is the org's responsibility — but the model output should include a "Trigger conditions for re-review" suggestion (new external surface added, new data class onboarded, new tenant model, etc.).
