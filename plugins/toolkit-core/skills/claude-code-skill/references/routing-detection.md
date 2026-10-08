# Routing detection: how the eval runner decides "this skill fired"

The repo-level `run_activation_evals.py` runner measures **routing accuracy** — did Claude route to the target skill for each query? It detects "fired" via **two independent signals, OR'd together**:

```text
routed_to_skill = skill_invoked  OR  domain_tool_touches
```

If your skill is missing from `DOMAIN_PATTERNS`, only `skill_invoked` (an explicit `Skill(<name>)` tool_use) counts. For skills that *do work by editing files*, that misses the routing signal entirely and the live eval score will look artificially low.

## Signal 1 — `skill_invoked`

True when Claude emits a `Skill(<name>)` tool_use, or invokes the matching `SlashCommand`/`Task` runner. Always counted. Output-only skills (skills that produce text, never write files) rely on this signal alone.

## Signal 2 — `domain_tool_touches`

True when Claude's tool calls (Read, Edit, Write, Bash, Glob) touch paths or commands declared in `DOMAIN_PATTERNS[<target>]` inside `scripts/run_activation_evals.py`. Schema:

```python
DOMAIN_PATTERNS: dict[str, dict[str, list[str]]] = {
    "<your-skill-name>": {
        "paths": [
            # globs that match files this skill is authoritative over
            "**/<domain>/**",
            "**/<canonical-file>.md",
        ],
        "command_substrings": [
            # substrings the runner greps inside any Bash command argv
            "<your-scaffolder>.py",
            "<your-validator>.py",
            "/<domain>/",
        ],
        "exclude_paths": [
            # globs that look like a match but belong to a SIBLING meta-skill
            "**/skills/claude-code-sub-agent/**",
            "**/skills/claude-code-slash-command/**",
        ],
    },
}
```

The runner walks every tool_use in the trace, evaluates each candidate path against `exclude_paths` first (return None on hit), then against `paths`, then scans command args for `command_substrings`. The first hit flips `domain_tool_touches = True` and records the match in `matched_paths` for the eval report.

## Decision: do I need an entry?

Walk this tree when authoring a new skill:

1. **Does the skill edit, write, or read files in a specific domain** (a particular extension, directory tree, or file pattern)?
   - **Yes →** register an entry. Otherwise the live eval will under-count routing.
   - **No (skill is pure output, e.g. produces text in chat) →** *do not* register. The runner has a comment confirming this case: skills that "author application code anywhere" would be too noisy to match on paths.
2. **Does the skill execute shell commands whose argv contains a unique substring** (your scaffolder filename, your validator filename, a domain-specific path fragment)?
   - **Yes →** add it to `command_substrings`. Use full filename plus 1–2 path fragments. Keep the list short and unambiguous.
3. **Are there sibling meta-skills whose SKILL.md or assets live under a parent glob you'd otherwise match** (e.g. `**/skills/**` would match every sibling under `plugins/<plugin>/skills/`)?
   - **Yes →** add their directories to `exclude_paths`. See `anti-patterns.md` § "Eval domain-pattern that captures sibling meta-skills" for the empirical anchor: May 2026, claude-code-skill scored 0.632 vs real 0.789 because three sibling-SKILL.md reads were attributed to it.

## Examples

### Should register: a meta-skill

```python
"claude-code-hook": {
    "paths": ["**/hooks/**", "**/hooks/hooks.json"],
    "command_substrings": ["hooks.json", "/hooks/", "init_hook.py", "validate_hooks.py"],
}
```

Hooks live in a specific directory and the skill's scaffolder/validator names are stable, so both signals are unambiguous.

### Should NOT register: a sub-agent like software-developer

```text
# Deliberately absent from DOMAIN_PATTERNS.
# The sub-agent edits application code in src/, app/, lib/, components/, services/ —
# every codebase looks different. Path-matching would produce too many false positives
# on ordinary coding work. The Task(software-developer) tool_use is the only honest signal.
```

### Should NOT register: an output-only skill like git-commit

```text
# git-commit produces a commit-message string and does not write files.
# Its only routing signal is Skill(git-commit). No DOMAIN_PATTERNS entry is needed
# or wanted — it would never hit anyway.
```

## When you change a skill's domain

If you rename a scaffolder, move a directory, or change a canonical file extension, **update `DOMAIN_PATTERNS` in the same PR**. The runner reads `DOMAIN_PATTERNS` directly from `scripts/run_activation_evals.py`; there is no separate config to drift.

## Verifying

Run live evals with `--judge` and look at `matched_paths` in the report. If a positive case routed correctly but `matched_paths` is empty, your skill is firing via `skill_invoked` alone — fine for output-only skills, suspicious for domain-editing ones.

```bash
python3 scripts/run_activation_evals.py \
  --skill plugins/<plugin>/skills/<your-skill> --live --judge
```

Report path: `.eval-runs/.eval-skill-<UTC-timestamp>.json`.
