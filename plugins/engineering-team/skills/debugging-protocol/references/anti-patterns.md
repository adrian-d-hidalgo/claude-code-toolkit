# debugging-protocol — anti-patterns

## §1 — Change-and-pray

**Bad**: change a config, restart, see if the symptom is gone, declare victory.

**Why wrong**: no hypothesis was tested; if the symptom doesn't recur, you have no idea why. The bug could recur tomorrow with no understanding.

**Fix**: state a hypothesis, predict an observation, run a falsifiable test. The discipline is "what would convince me I'm WRONG?", not "what will convince me I'm right?".

## §2 — Multi-hypothesis simultaneous

**Bad**: change three things at once, see if it works.

**Why wrong**: you can't attribute the outcome. Per Zeller 2009, this is the dominant cause of debugging mistakes — false positives, unreproducible fixes, and new bugs hidden by the simultaneous changes.

**Fix**: one hypothesis, one test, one outcome. Move slower; finish sooner with confidence.

## §3 — No falsifiable test

**Bad**: "Let me read the code more carefully" with no specific check you'd run, no specific log/metric/trace you'd inspect.

**Why wrong**: code reading without a target is open-ended; you'll re-read the same code 5 times. No exit condition.

**Fix**: every step states (a) the hypothesis being tested, (b) the specific observation that would refute it.

## §4 — Ignore the observability stack

**Bad**: open the code editor and start grep-ing. Production traces / metrics / logs available but unused.

**Why wrong**: the answer is often visible in seconds via a trace; you're spending 30 minutes finding what observability would surface in 30 seconds.

**Fix**: trace → metric → logs → code. Per Majors 2022 (see `observability-first.md`).

## §5 — Skipping git bisect for regressions

**Bad**: behaviour changed between two known commits; engineer reads code for a day looking for the change.

**Why wrong**: bisect is O(log n) commits, deterministic. Reading is unbounded and error-prone.

**Fix**: when behaviour changed between commits, bisect first. Pair with a reproduce script for automation.

## §6 — Confirmation bias

**Bad**: only running tests that would CONFIRM your favoured hypothesis; not running tests that would REFUTE it.

**Why wrong**: confirmation bias is the strongest cognitive distortion in debugging. You'll find evidence consistent with your hypothesis (always plausible if the hypothesis is reasonable); you'll miss evidence that would have shown a better answer.

**Fix**: explicitly ask "what evidence would prove me WRONG?" before each test. Run those tests too.

## §7 — Stopping at the first plausible cause

**Bad**: find something that "looks suspicious" and call it the root cause.

**Why wrong**: plausibility ≠ correctness. Many production bugs have multiple suspicious-looking candidates; the wrong one absorbs all the attention.

**Fix**: a hypothesis is only "confirmed" when a falsifiable test passes. Run the test.

## §8 — No record of refuted hypotheses

**Bad**: investigation log lists only the eventual root cause; refuted hypotheses are forgotten.

**Why wrong**: the next investigation (of a similar bug) wastes time re-testing the same dead ends. Refuted hypotheses are valuable knowledge.

**Fix**: record refuted hypotheses with the evidence that refuted them. They go into the post-incident bug-analysis output as "contributing factors investigated and excluded".

## §9 — Investigation log without evidence levels

**Bad**: "the API was slow because of GC pressure".

**Why wrong**: was this verified in a profile, inferred from CPU patterns, or assumed? Reader can't audit.

**Fix**: tag every claim with `[Verified]` / `[Inference]` / `[Unverified]` per `../../references/evidence-rule.md`. The investigation log is a primary artefact of the debugging process.

## §10 — Continuing investigation after root cause is found

**Bad**: investigator keeps debugging after the root cause is confirmed, looking for other "issues".

**Why wrong**: scope creep. The investigation has a goal (find this bug's cause); chasing other issues is unrelated work that should be separate tickets.

**Fix**: once root cause is found, **stop the investigation**, hand to `bug-analysis` for RCA + prevention design, and file separate tickets for any other issues observed during the debug.

## §11 — Skipping the minimisation step for input-driven bugs

**Bad**: bug requires a 50 MB input to reproduce; engineer doesn't bother minimising.

**Why wrong**: huge inputs are hard to share, attach, regression-test. Future engineers debugging similar issues have nothing to anchor to.

**Fix**: delta-debug the input down to a minimal reproducer (see `delta-debugging.md`). The minimal reproducer becomes a regression test recommended in the bug-analysis output.

## §12 — Debugging in production without observability

**Bad**: SSH into a production machine; tail logs; restart the service; see if it helps.

**Why wrong**: changes ground state, breaks reproducibility, often masks the issue. Modern observability replaces most need for "go look at the box".

**Fix**: if you must access production directly, do so observationally only (read-only commands). Mutation lives in the controlled deploy pipeline. If observability is insufficient, the prevention plan should include adding it.
