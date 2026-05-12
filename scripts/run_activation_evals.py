#!/usr/bin/env python3
"""
Run activation evaluations for Claude Code meta-skills and sub-agents.

A corpus declares one target (`kind: "skill"` or `kind: "subagent"`) and a list
of cases. The runner reuses the same routing + judge pipeline for both kinds;
only the activation signal differs:

  kind="skill"     → `Skill(<plugin>:<name>)` tool_use OR
                      Bash/Read/Edit/Write/... touching a path inside the
                      skill's domain (e.g. `.claude/skills/`, `plugin.json`).
  kind="subagent"  → `Agent` tool_use with `subagent_type=<plugin>:<name>`
                     (sub-agents have no inherent domain paths — their job
                     is to author application code anywhere).

Two independent metrics per case:

  1. **Routing accuracy** — did Claude direct the request to the target?
  2. **Outcome quality** — separate `claude --print` invocation acts as judge,
     returns structured rubric (understood_intent, action_appropriate,
     meta_skill_was_correct_route, reasoning).

Modes:
  - Default (offline): validate JSON corpus shape; no claude invocations.
  - --live: invoke `claude --print --output-format stream-json --verbose` per case.
  - --judge: requires --live; calls the LLM judge per case.

Usage:
    python3 run_activation_evals.py --all <plugin-root>                  # all corpora under the plugin
    python3 run_activation_evals.py --skill <skill-root> --live           # a single skill
    python3 run_activation_evals.py --agent <agent-md-path> --live --judge # a single sub-agent
    python3 run_activation_evals.py --all <plugin-root> --live --judge --max-cases 3

Discovery for --all:
    <plugin-root>/skills/*/tests/activation-evals.json         (skill corpora)
    <plugin-root>/tests/*/activation-evals.json                (sub-agent corpora)

Exit codes:
    0 - pass (offline: shape OK; live: routing ≥ pass_threshold AND
        (with --judge) mean outcome ≥ outcome_pass_threshold)
    1 - warnings (routing in [warn,pass) or outcome in [warn,pass))
    2 - errors (routing < warn, outcome < warn, or runner failure)
"""

import argparse
import fnmatch
import json
import re
import statistics
import subprocess
import sys
import time
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any


REQUIRED_CASE_KEYS = {"id", "query", "should_trigger"}
DEFAULT_PASS_THRESHOLD = 0.90
DEFAULT_WARN_THRESHOLD = 0.75
DEFAULT_OUTCOME_PASS = 1.50      # mean of (understood + action_appropriate) per case, scale 0-4
DEFAULT_OUTCOME_WARN = 1.20

# Domain patterns per meta-skill: tool paths/commands that indicate routing to this skill's territory.
DOMAIN_PATTERNS: dict[str, dict[str, list[str]]] = {
    "claude-code-skill": {
        "paths": ["**/skills/**", "**/SKILL.md", "**/skills/*/SKILL.md", "**/skills/*"],
        # Exclude sibling meta-skills: when Claude correctly routes to one of these
        # sibling skills, it touches files under `plugins/*/skills/<sibling>/...`,
        # which the broad `**/skills/**` glob would otherwise mis-attribute as a
        # claude-code-skill domain touch (false positive).
        "exclude_paths": [
            "**/skills/claude-code-sub-agent/**",
            "**/skills/claude-code-slash-command/**",
            "**/skills/claude-code-plugin/**",
            "**/skills/claude-code-hook/**",
            "**/skills/claude-code-claude-md/**",
        ],
        "command_substrings": [
            "init_skill.py", "validate_skill.py", "/skills/",
            "SKILL.md", "claude/skills",
        ],
    },
    "claude-code-sub-agent": {
        "paths": ["**/agents/**", "**/agents/*.md"],
        "command_substrings": ["init_agent.py", "validate_agent.py", "/agents/", "claude/agents"],
    },
    "claude-code-slash-command": {
        "paths": ["**/commands/**", "**/commands/*.md"],
        "command_substrings": ["init_command.py", "validate_command.py", "/commands/", "claude/commands"],
    },
    "claude-code-plugin": {
        "paths": [
            "**/plugin.json", "**/marketplace.json",
            "**/.claude-plugin/**", "**/.claude-plugin/*",
        ],
        "command_substrings": [
            "plugin.json", "marketplace.json", ".claude-plugin",
            "init_plugin.sh", "init_marketplace.sh", "validate_plugin.py",
        ],
    },
    "claude-code-hook": {
        "paths": ["**/hooks/**", "**/hooks/hooks.json"],
        "command_substrings": ["hooks.json", "/hooks/", "init_hook.py", "validate_hooks.py"],
    },
}

# Tool names whose file_path we inspect as STRONG domain signals (they imply real
# engagement with the file, not exploration). Bash and Glob are handled separately
# with verb/narrowness gates below — listing or broad searching is not routing intent.
DOMAIN_INSPECTABLE_TOOLS = {"Read", "Edit", "Write", "MultiEdit", "NotebookEdit"}
# Bash counts as a domain signal only when it mutates/authors files (touch/cp/mv/sed/...).
BASH_AUTHOR_VERBS = re.compile(r"\b(touch|mkdir|cp|mv|rm|cat\s*>|tee|sed\s*-i|chmod)\b", re.I)
# Glob counts only when the pattern is narrow (specific file types like SKILL.md, plugin.json).
GLOB_NARROW = re.compile(r"\*\*?/\*\.(?:md|json|toml|yaml|yml)|SKILL\.md|plugin\.json|marketplace\.json|hooks\.json", re.I)

# Judge prompt template. The judge runs in a fresh, isolated `claude --print` call.
JUDGE_PROMPT_TEMPLATE = """\
You are an evaluator scoring Claude Code's routing decision for one user request.

IMPORTANT CONTEXT — read before scoring:
- This is a HEADLESS test run. The `Skill` tool is auto-denied in this mode, so
  Claude attempting `Skill(name)` is the correct routing decision even though
  the skill could not actually execute. Do NOT penalize Claude for "stalling"
  or "not producing output" after a Skill tool denial — that is a test-harness
  artefact, not a real-use issue.
- Score the DECISION (did Claude pick the right tool / route?), not the final
  artefact (would never have been produced in headless mode anyway).
- Domain-touching tools (`Read`/`Edit`/`Write`/`Bash` on paths inside the
  meta-skill's territory like `.claude/skills/`, `.claude/agents/`, `hooks/`,
  `plugin.json`, etc.) are also acceptable routing for some prompts —
  especially when the user wants direct action on a single file.

USER REQUEST:
{query}

EXPECTED ROUTING (per corpus author):
- The user's request was authored to {expected_str}.

CLAUDE'S TOOL CALLS (in order):
{tool_summary}

CLAUDE'S FINAL TEXT (if any):
{final_text}

Score each rubric. Output JSON only, no preamble.

Schema:
{{
  "understood_intent": <0|1|2>,    // 0=misunderstood, 1=partial, 2=fully understood
  "action_appropriate": <0|1|2>,   // 0=wrong route (e.g. answered from knowledge when action was needed), 1=acceptable route, 2=ideal route (meta-skill invoked OR direct domain-tool edit when single-file task)
  "meta_skill_was_correct_route": <-1|0|1>,  // -1=Claude should have used the meta-skill but did not, 0=either route was acceptable, 1=direct domain-tool approach was preferable
  "reasoning": "<one short sentence>"
}}
"""

# Suppress hook stderr noise (warp plugin etc.) when parsing claude output.
NOISY_STDERR_LINES = (
    "warp-notify",
    "tty",
)


@dataclass
class CaseResult:
    case_id: str
    query: str
    expected: bool
    # Routing
    skill_invoked: bool | None = None
    domain_tool_touches: bool = False
    matched_paths: list[str] = field(default_factory=list)
    tool_sequence: list[dict[str, Any]] = field(default_factory=list)
    final_text: str = ""
    # Outcome (from judge)
    understood_intent: int | None = None
    action_appropriate: int | None = None
    meta_skill_was_correct_route: int | None = None
    judge_reasoning: str = ""
    # Pass/fail
    routing_passed: bool | None = None
    judge_error: str = ""
    reason: str = ""

    @property
    def routing_observed(self) -> bool:
        return bool(self.skill_invoked) or self.domain_tool_touches


@dataclass
class SkillResult:
    skill: str
    kind: str = "skill"  # "skill" or "subagent"
    corpus_path: str = ""
    total: int = 0
    positives: int = 0
    negatives: int = 0
    routing_accuracy: float | None = None
    routing_false_positives: int = 0
    routing_false_negatives: int = 0
    outcome_mean: float | None = None  # mean of (understood + action_appropriate) over runnable judged cases
    outcome_pass_rate: float | None = None  # fraction of cases whose outcome score meets the per-case bar
    delegation_rate: float | None = None    # subagent kind only: fraction of positive cases that delegated
    judge_calls: int = 0
    cases: list[CaseResult] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


# ----------------------------- Args --------------------------------------- #


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Run activation evaluations for Claude Code meta-skills and sub-agents.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    grp = p.add_mutually_exclusive_group(required=True)
    grp.add_argument("--all", dest="plugin_root", help="Plugin root; evaluates every skill AND sub-agent corpus it contains.")
    grp.add_argument("--skill", dest="skill_root", help="Single skill root (directory containing tests/activation-evals.json).")
    grp.add_argument("--agent", dest="agent_path", help="Single sub-agent path (e.g. plugin/agents/foo.md or plugin/tests/foo/).")

    p.add_argument("--live", action="store_true", help="Actually invoke `claude --print` per case.")
    p.add_argument("--judge", action="store_true", help="Run LLM-as-judge after each --live invocation.")
    p.add_argument("--judge-model", default="opus", help="Model alias for the judge (default: opus).")
    p.add_argument(
        "--report-json", dest="report_path", default=None,
        help="Write structured JSON report. If omitted in --live mode, auto-generates "
             ".eval-runs/.eval-<scope>-<UTC-timestamp>.json relative to the current working directory.",
    )
    p.add_argument(
        "--report-dir", dest="report_dir", default=".eval-runs",
        help="Directory for the auto-generated report (default: .eval-runs/, gitignored).",
    )
    p.add_argument("--pass-threshold", type=float, default=DEFAULT_PASS_THRESHOLD)
    p.add_argument("--warn-threshold", type=float, default=DEFAULT_WARN_THRESHOLD)
    p.add_argument("--outcome-pass-threshold", type=float, default=DEFAULT_OUTCOME_PASS)
    p.add_argument("--outcome-warn-threshold", type=float, default=DEFAULT_OUTCOME_WARN)
    p.add_argument("--max-cases", type=int, default=None, help="Cap cases per skill (smoke tests).")
    p.add_argument("--max-turns", type=int, default=3, help="Max turns per case (default 3).")
    p.add_argument("--case-timeout", type=int, default=180, help="Per-case wall-clock timeout in seconds.")
    p.add_argument("--claude-bin", default="claude", help="Path to claude binary.")
    return p.parse_args()


# ----------------------------- Corpus loading ----------------------------- #


def discover_skill_corpora(plugin_root: Path) -> list[Path]:
    """Find tests/activation-evals.json under every skill directory in a plugin."""
    skills_dir = plugin_root / "skills"
    if not skills_dir.is_dir():
        return []
    return sorted(
        s / "tests" / "activation-evals.json"
        for s in skills_dir.iterdir()
        if s.is_dir() and (s / "tests" / "activation-evals.json").is_file()
    )


def discover_subagent_corpora(plugin_root: Path) -> list[Path]:
    """Find tests/<agent-name>/activation-evals.json under a plugin root (sub-agent corpora)."""
    tests_dir = plugin_root / "tests"
    if not tests_dir.is_dir():
        return []
    return sorted(
        a / "activation-evals.json"
        for a in tests_dir.iterdir()
        if a.is_dir() and (a / "activation-evals.json").is_file()
    )


def discover_single_corpus(skill_root: Path) -> Path | None:
    corpus = skill_root / "tests" / "activation-evals.json"
    return corpus if corpus.is_file() else None


def discover_subagent_corpus(agent_path: Path) -> Path | None:
    """Resolve a sub-agent path (either the .md file or a tests/<name>/ dir) to its corpus.

    Accepts:
      - .../agents/<name>.md         → expects sibling tests/<name>/activation-evals.json
      - .../tests/<name>/            → expects activation-evals.json inside
      - .../tests/<name>/activation-evals.json → returned as-is
    """
    if agent_path.is_file() and agent_path.suffix == ".md":
        plugin_root = agent_path.parent.parent  # plugin/agents/foo.md → plugin
        agent_name = agent_path.stem
        candidate = plugin_root / "tests" / agent_name / "activation-evals.json"
        return candidate if candidate.is_file() else None
    if agent_path.is_dir():
        candidate = agent_path / "activation-evals.json"
        return candidate if candidate.is_file() else None
    if agent_path.is_file() and agent_path.name == "activation-evals.json":
        return agent_path
    return None


def load_corpus(corpus_path: Path) -> tuple[dict[str, Any] | None, str | None]:
    """Load and minimally validate a corpus file.

    Supports two shapes:
      - kind="skill" (or omitted; legacy): top-level `skill: <name>`.
      - kind="subagent": top-level `agent: <name>`.
    Either way the corpus is normalised to expose `kind` and `target` keys.
    """
    try:
        raw = json.loads(corpus_path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None, f"corpus not found: {corpus_path}"
    except json.JSONDecodeError as exc:
        return None, f"invalid JSON: {exc}"
    if not isinstance(raw, dict):
        return None, "corpus root must be an object"

    kind = raw.get("kind", "skill")
    if kind == "skill":
        target = raw.get("skill")
        if not target:
            return None, "kind='skill' corpus must declare 'skill' name at top level"
    elif kind == "subagent":
        target = raw.get("agent")
        if not target:
            return None, "kind='subagent' corpus must declare 'agent' name at top level"
    else:
        return None, f"unknown kind: {kind!r} (expected 'skill' or 'subagent')"

    if not isinstance(raw.get("cases"), list) or not raw["cases"]:
        return None, "cases must be a non-empty array"

    raw["kind"] = kind
    raw["target"] = target
    return raw, None


def validate_cases(corpus: dict[str, Any]) -> list[str]:
    warnings: list[str] = []
    seen_ids: set[str] = set()
    positives = negatives = 0
    for i, case in enumerate(corpus["cases"]):
        prefix = f"cases[{i}]"
        if not isinstance(case, dict):
            warnings.append(f"{prefix} is not an object")
            continue
        missing = REQUIRED_CASE_KEYS - set(case)
        if missing:
            warnings.append(f"{prefix} missing keys: {sorted(missing)}")
            continue
        if case["id"] in seen_ids:
            warnings.append(f"{prefix}.id duplicates earlier case: {case['id']}")
        seen_ids.add(case["id"])
        if not isinstance(case["query"], str) or not case["query"].strip():
            warnings.append(f"{prefix}.query must be a non-empty string")
        if not isinstance(case["should_trigger"], bool):
            warnings.append(f"{prefix}.should_trigger must be a boolean")
        if case.get("should_trigger") is True:
            positives += 1
        elif case.get("should_trigger") is False:
            negatives += 1
    if positives < 5:
        warnings.append(f"corpus has only {positives} positive cases; ≥5 recommended")
    if negatives < 5:
        warnings.append(f"corpus has only {negatives} negative cases; ≥5 recommended")
    return warnings


# ----------------------------- Stream parsing ----------------------------- #


def parse_stream(raw: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for line in raw.splitlines():
        line = line.strip()
        if not line or not line.startswith("{"):
            continue
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return events


def _path_matches_domain(value: str, patterns: dict[str, list[str]]) -> str | None:
    """Return the first matching pattern (path-glob OR substring), or None.

    Honors `exclude_paths`: if `value` matches any exclude glob, treat it as
    out-of-domain even when an include glob matches. Used to prevent sibling
    meta-skill paths (e.g. `plugins/*/skills/claude-code-sub-agent/SKILL.md`)
    from being attributed to claude-code-skill via the broad `**/skills/**`
    include pattern.
    """
    for exclude_pat in patterns.get("exclude_paths", []):
        if fnmatch.fnmatch(value, exclude_pat):
            return None
    for glob_pat in patterns.get("paths", []):
        if fnmatch.fnmatch(value, glob_pat):
            return glob_pat
    for sub in patterns.get("command_substrings", []):
        if sub in value:
            return sub
    return None


def extract_signals(target_name: str, kind: str, events: list[dict[str, Any]]) -> dict[str, Any]:
    """Walk the stream-json event sequence and extract routing signals.

    For kind="skill": signal is `Skill(<plugin>:<name>)` tool_use OR a denial
    of that same shape, OR a domain-path tool_use (Bash/Read/Edit/...).

    For kind="subagent": signal is an `Agent` tool_use with
    `subagent_type=<plugin>:<name>`. No domain-path signal (sub-agents
    author application code anywhere; matching on paths would be noisy).
    """
    tool_sequence: list[dict[str, Any]] = []
    skill_invoked = False  # generic "target tool was invoked" flag, kept name for back-compat in JSON
    matched_paths: list[str] = []
    final_text_parts: list[str] = []
    patterns = DOMAIN_PATTERNS.get(target_name, {"paths": [], "command_substrings": []}) if kind == "skill" else {"paths": [], "command_substrings": []}

    for ev in events:
        if ev.get("type") == "assistant":
            content = ev.get("message", {}).get("content", []) or []
            for block in content:
                if not isinstance(block, dict):
                    continue
                btype = block.get("type")
                if btype == "tool_use":
                    name = block.get("name", "")
                    inp = block.get("input") or {}
                    summary = {"tool": name}
                    if isinstance(inp, dict):
                        summary["input"] = {k: v for k, v in inp.items()
                                            if k in ("skill", "subagent_type", "command", "file_path", "path", "pattern", "description")}
                    tool_sequence.append(summary)

                    if kind == "skill" and name == "Skill" and isinstance(inp, dict):
                        target = inp.get("skill", "")
                        if isinstance(target, str) and target.split(":")[-1].lower() == target_name.lower():
                            skill_invoked = True

                    if kind == "subagent" and name in ("Agent", "Task") and isinstance(inp, dict):
                        sub = inp.get("subagent_type") or inp.get("agent_type") or ""
                        if isinstance(sub, str) and sub.split(":")[-1].lower() == target_name.lower():
                            skill_invoked = True

                    # Strong domain signal: Read/Edit/Write/MultiEdit/NotebookEdit on a domain path.
                    if kind == "skill" and name in DOMAIN_INSPECTABLE_TOOLS and isinstance(inp, dict):
                        candidates = []
                        for key in ("file_path", "path"):
                            v = inp.get(key)
                            if isinstance(v, str):
                                candidates.append(v)
                        for cand in candidates:
                            match = _path_matches_domain(cand, patterns)
                            if match:
                                matched_paths.append(f"{name}: {cand[:100]} (matched {match!r})")
                                break

                    # Bash counts only if the command actually authors (touch / cp / mv / sed / etc.).
                    # Plain `ls`, `find`, `cat` are exploration and do not indicate routing.
                    if kind == "skill" and name == "Bash" and isinstance(inp, dict):
                        cmd = inp.get("command", "")
                        if isinstance(cmd, str) and BASH_AUTHOR_VERBS.search(cmd):
                            match = _path_matches_domain(cmd, patterns)
                            if match:
                                matched_paths.append(f"Bash(author): {cmd[:100]} (matched {match!r})")

                    # Glob counts only when the pattern is narrow (specific file types or
                    # specific filenames). Broad enumeration like `**` does not indicate intent.
                    if kind == "skill" and name == "Glob" and isinstance(inp, dict):
                        pat = inp.get("pattern", "")
                        if isinstance(pat, str) and GLOB_NARROW.search(pat):
                            match = _path_matches_domain(pat, patterns)
                            if match:
                                matched_paths.append(f"Glob(narrow): {pat[:100]} (matched {match!r})")

                elif btype == "text":
                    text = block.get("text", "")
                    if isinstance(text, str) and text.strip():
                        final_text_parts.append(text)

        elif ev.get("type") == "result":
            for denial in ev.get("permission_denials", []) or []:
                if not isinstance(denial, dict):
                    continue
                if kind == "skill" and denial.get("tool_name") == "Skill":
                    target = (denial.get("tool_input") or {}).get("skill", "")
                    if isinstance(target, str) and target.split(":")[-1].lower() == target_name.lower():
                        skill_invoked = True
                elif kind == "subagent" and denial.get("tool_name") in ("Agent", "Task"):
                    sub = (denial.get("tool_input") or {}).get("subagent_type", "")
                    if isinstance(sub, str) and sub.split(":")[-1].lower() == target_name.lower():
                        skill_invoked = True

    return {
        "skill_invoked": skill_invoked,
        "domain_tool_touches": bool(matched_paths),
        "matched_paths": matched_paths,
        "tool_sequence": tool_sequence,
        "final_text": "\n".join(final_text_parts).strip(),
    }


# ----------------------------- Live runner -------------------------------- #


def run_claude(query: str, *, claude_bin: str, max_turns: int, timeout: int) -> tuple[str, str | None]:
    """Run claude --print --output-format stream-json --verbose --max-turns N <query>.
    Returns (stdout, error). On error, stdout may be empty.
    """
    cmd = [
        claude_bin,
        "--print",
        "--output-format", "stream-json",
        "--verbose",
        "--max-turns", str(max_turns),
        query,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError:
        return "", f"`{claude_bin}` not found on PATH"
    except subprocess.TimeoutExpired:
        return "", f"timed out after {timeout}s"
    return proc.stdout, None


def run_judge(case_id: str, query: str, expected_str: str, tool_sequence: list[dict[str, Any]],
              final_text: str, *, judge_model: str, claude_bin: str, timeout: int) -> tuple[dict[str, Any] | None, str | None]:
    summary = "\n".join(
        f"- {t['tool']}({json.dumps(t.get('input', {}), separators=(',', ':'))})"
        for t in tool_sequence[:10]
    ) or "(no tools were used)"
    prompt = JUDGE_PROMPT_TEMPLATE.format(
        query=query,
        expected_str=expected_str,
        tool_summary=summary,
        final_text=final_text[:1500] if final_text else "(no final text emitted)",
    )
    cmd = [
        claude_bin,
        "--print",
        "--output-format", "json",
        "--model", judge_model,
        "--max-turns", "1",
        prompt,
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except FileNotFoundError:
        return None, f"`{claude_bin}` not found on PATH"
    except subprocess.TimeoutExpired:
        return None, f"judge timed out after {timeout}s"

    if not proc.stdout.strip():
        return None, "judge produced no stdout"

    try:
        envelope = json.loads(proc.stdout)
    except json.JSONDecodeError as exc:
        return None, f"judge envelope was not JSON: {exc}"

    result_text = envelope.get("result", "")
    if not isinstance(result_text, str):
        return None, "judge envelope had no 'result' string"
    m = re.search(r"\{[\s\S]*?\}", result_text)
    if not m:
        return None, f"judge did not return JSON object; got: {result_text[:200]}"
    try:
        rubric = json.loads(m.group(0))
    except json.JSONDecodeError as exc:
        return None, f"judge JSON inside result was malformed: {exc}"
    return rubric, None


def run_live_case(case: dict[str, Any], target_name: str, kind: str, *,
                  claude_bin: str, max_turns: int, case_timeout: int,
                  judge: bool, judge_model: str) -> CaseResult:
    cr = CaseResult(
        case_id=case["id"],
        query=case["query"],
        expected=case["should_trigger"],
    )
    stdout, err = run_claude(case["query"], claude_bin=claude_bin, max_turns=max_turns, timeout=case_timeout)
    if err:
        cr.reason = err
        return cr

    events = parse_stream(stdout)
    signals = extract_signals(target_name, kind, events)
    cr.skill_invoked = signals["skill_invoked"]
    cr.domain_tool_touches = signals["domain_tool_touches"]
    cr.matched_paths = signals["matched_paths"]
    cr.tool_sequence = signals["tool_sequence"]
    cr.final_text = signals["final_text"]

    observed = cr.routing_observed
    cr.routing_passed = (observed == cr.expected)
    if not cr.routing_passed:
        cr.reason = "false positive" if observed and not cr.expected else "false negative"

    if judge:
        target_label = f"{target_name} {'meta-skill' if kind == 'skill' else 'sub-agent'}"
        expected_str = (
            f"activate the {target_label}"
            if cr.expected
            else f"NOT activate the {target_label} (route to a sibling or to nothing)"
        )
        rubric, jerr = run_judge(
            cr.case_id, cr.query, expected_str, cr.tool_sequence, cr.final_text,
            judge_model=judge_model, claude_bin=claude_bin, timeout=case_timeout,
        )
        if jerr:
            cr.judge_error = jerr
        elif rubric:
            cr.understood_intent = int(rubric.get("understood_intent", 0))
            cr.action_appropriate = int(rubric.get("action_appropriate", 0))
            cr.meta_skill_was_correct_route = int(rubric.get("meta_skill_was_correct_route", 0))
            cr.judge_reasoning = str(rubric.get("reasoning", ""))[:300]

    return cr


def run_skill_corpus(corpus_path: Path, *, live: bool, judge: bool, judge_model: str,
                     claude_bin: str, max_cases: int | None, max_turns: int, case_timeout: int) -> SkillResult:
    corpus, err = load_corpus(corpus_path)
    if err:
        return SkillResult(skill="<unknown>", kind="skill", corpus_path=str(corpus_path), errors=[err])

    target_name = corpus["target"]
    kind = corpus["kind"]
    rpt = SkillResult(skill=target_name, kind=kind, corpus_path=str(corpus_path))
    rpt.warnings.extend(validate_cases(corpus))
    cases = corpus["cases"]
    if max_cases is not None:
        cases = cases[:max_cases]
    rpt.total = len(cases)
    rpt.positives = sum(1 for c in cases if c.get("should_trigger") is True)
    rpt.negatives = sum(1 for c in cases if c.get("should_trigger") is False)

    if not live:
        return rpt

    correct = 0
    outcomes: list[float] = []
    delegated_positives = 0
    positive_count = 0
    outcome_pass_count = 0
    outcome_judged = 0
    for case in cases:
        result = run_live_case(
            case, target_name, kind,
            claude_bin=claude_bin, max_turns=max_turns, case_timeout=case_timeout,
            judge=judge, judge_model=judge_model,
        )
        rpt.cases.append(result)
        if result.routing_passed:
            correct += 1
        elif result.routing_passed is False:
            if result.routing_observed and not result.expected:
                rpt.routing_false_positives += 1
            elif not result.routing_observed and result.expected:
                rpt.routing_false_negatives += 1
        else:
            rpt.errors.append(f"case {result.case_id}: {result.reason}")
        if result.expected:
            positive_count += 1
            if result.skill_invoked:
                delegated_positives += 1
        if judge and result.understood_intent is not None and result.action_appropriate is not None:
            score = result.understood_intent + result.action_appropriate
            outcomes.append(score)
            rpt.judge_calls += 1
            outcome_judged += 1
            # Per-case outcome pass: understood >= 1 and action >= 1 (i.e. acceptable behavior)
            if result.understood_intent >= 1 and result.action_appropriate >= 1:
                outcome_pass_count += 1

    runnable = sum(1 for c in rpt.cases if c.routing_passed is not None)
    rpt.routing_accuracy = correct / runnable if runnable else None
    rpt.outcome_mean = statistics.mean(outcomes) if outcomes else None
    rpt.outcome_pass_rate = outcome_pass_count / outcome_judged if outcome_judged else None
    if kind == "subagent" and positive_count:
        rpt.delegation_rate = delegated_positives / positive_count
    return rpt


# ----------------------------- Rendering ---------------------------------- #


def render_human(reports: list[SkillResult], *, live: bool, judge: bool,
                 pass_threshold: float, warn_threshold: float,
                 outcome_pass: float, outcome_warn: float) -> str:
    out: list[str] = []
    for r in reports:
        out.append(f"\n=== {r.skill} [{r.kind}] ({r.corpus_path}) ===")
        out.append(f"  cases: {r.total}  positives: {r.positives}  negatives: {r.negatives}")
        for w in r.warnings:
            out.append(f"  warn  {w}")
        for e in r.errors:
            out.append(f"  err   {e}")
        if live and r.routing_accuracy is not None:
            routing_label = "routing_accuracy" if r.kind == "skill" else "routing_observed (informational)"
            out.append(
                f"  {routing_label}: {r.routing_accuracy:.2f}  "
                f"fp: {r.routing_false_positives}  fn: {r.routing_false_negatives}"
            )
            if r.kind == "subagent" and r.delegation_rate is not None:
                out.append(
                    f"  delegation_rate (positives that delegated): {r.delegation_rate:.2f} "
                    f"— low is normal in --print mode; Claude often handles small tasks inline"
                )
            if judge and r.outcome_mean is not None:
                primary = "outcome (PASS/FAIL gate for sub-agents)" if r.kind == "subagent" else "outcome"
                out.append(f"  {primary}: {r.outcome_mean:.2f}/4.00 ({r.judge_calls} judged cases)")
                if r.outcome_pass_rate is not None:
                    out.append(f"  outcome_pass_rate (cases with both scores ≥1): {r.outcome_pass_rate:.2f}")
            for c in r.cases:
                tag = "ok" if c.routing_passed else ("--" if c.routing_passed is None else "FAIL")
                obs = "skill" if c.skill_invoked else ("domain" if c.domain_tool_touches else "miss")
                exp = "trig" if c.expected else "miss"
                line = f"    {tag:4} {c.case_id} expected:{exp} observed:{obs}"
                if judge and c.understood_intent is not None:
                    line += (
                        f"  judge: I={c.understood_intent} "
                        f"A={c.action_appropriate} "
                        f"R={c.meta_skill_was_correct_route}"
                    )
                out.append(line)
                out.append(f"         q: {c.query}")
                if c.matched_paths:
                    out.append(f"         path-matches: {c.matched_paths[0]}")
                if c.judge_reasoning:
                    out.append(f"         judge: {c.judge_reasoning}")
                if c.reason:
                    out.append(f"         reason: {c.reason}")
                if c.judge_error:
                    out.append(f"         judge_error: {c.judge_error}")
    if live:
        accs = [r.routing_accuracy for r in reports if r.routing_accuracy is not None]
        if accs:
            out.append("")
            out.append(f"=== Summary across {len(accs)} skill(s) ===")
            mean_acc = statistics.mean(accs)
            stdev_acc = statistics.pstdev(accs) if len(accs) > 1 else 0.0
            out.append(f"  routing mean: {mean_acc:.2f}  stdev: {stdev_acc:.2f}  pass≥{pass_threshold:.2f}  warn≥{warn_threshold:.2f}")
            if judge:
                outs = [r.outcome_mean for r in reports if r.outcome_mean is not None]
                if outs:
                    out.append(f"  outcome mean: {statistics.mean(outs):.2f}/4.00  pass≥{outcome_pass:.2f}  warn≥{outcome_warn:.2f}")
    return "\n".join(out)


def overall_exit_code(reports: list[SkillResult], *, live: bool, judge: bool,
                      pass_threshold: float, warn_threshold: float,
                      outcome_pass: float, outcome_warn: float) -> int:
    """Skills are gated by routing accuracy. Sub-agents are gated by outcome
    quality (judge), because their routing is rationally conservative —
    Claude often handles small coding tasks inline rather than delegating.
    """
    if not reports:
        return 2
    if any(r.errors for r in reports):
        return 2
    if not live:
        return 1 if any(r.warnings for r in reports) else 0

    skill_reports = [r for r in reports if r.kind == "skill"]
    subagent_reports = [r for r in reports if r.kind == "subagent"]

    worst_routing = None
    if skill_reports:
        worst_routing = min((r.routing_accuracy for r in skill_reports if r.routing_accuracy is not None), default=None)
        if worst_routing is None or worst_routing < warn_threshold:
            return 2

    worst_outcome = None
    has_outcome_data = judge and any(r.outcome_mean is not None for r in reports)
    if has_outcome_data:
        worst_outcome = min(r.outcome_mean for r in reports if r.outcome_mean is not None)
        if worst_outcome < outcome_warn:
            return 2

    # Sub-agents require judge data to be gated. Without --judge, only treat as info.
    if subagent_reports and not judge:
        return 1  # informational pass; user should re-run with --judge to gate

    if has_outcome_data and worst_outcome < outcome_pass:
        return 1
    if worst_routing is not None and worst_routing < pass_threshold:
        return 1
    return 0


# ----------------------------- Main --------------------------------------- #


def _auto_report_path(args: argparse.Namespace) -> Path:
    """Resolve a self-describing report path from the invocation scope."""
    if args.plugin_root:
        scope = f"plugin-{Path(args.plugin_root).resolve().name}"
    elif args.skill_root:
        scope = f"skill-{Path(args.skill_root).resolve().name}"
    else:
        agent_path = Path(args.agent_path).resolve()
        scope = f"agent-{agent_path.stem if agent_path.suffix == '.md' else agent_path.name}"
    timestamp = time.strftime("%Y%m%dT%H%M%S", time.gmtime())  # UTC for stable sort across machines
    filename = f".eval-{scope}-{timestamp}.json"
    return Path(args.report_dir) / filename


def main() -> int:
    args = parse_args()
    if args.judge and not args.live:
        print("--judge requires --live", file=sys.stderr)
        return 2

    # Auto-generate a self-describing report path for live runs if user didn't pick one.
    if args.live and not args.report_path:
        auto_path = _auto_report_path(args)
        auto_path.parent.mkdir(parents=True, exist_ok=True)
        args.report_path = str(auto_path)
        print(f"(auto-report: {auto_path})", file=sys.stderr)

    corpora: list[Path] = []
    if args.plugin_root:
        plugin_root = Path(args.plugin_root).expanduser().resolve()
        corpora = discover_skill_corpora(plugin_root) + discover_subagent_corpora(plugin_root)
        if not corpora:
            print(
                f"no activation-evals.json under {plugin_root}/skills/* or {plugin_root}/tests/*",
                file=sys.stderr,
            )
            return 2
    elif args.skill_root:
        skill_root = Path(args.skill_root).expanduser().resolve()
        corpus = discover_single_corpus(skill_root)
        if corpus is None:
            print(f"no tests/activation-evals.json in {skill_root}", file=sys.stderr)
            return 2
        corpora = [corpus]
    else:
        agent_path = Path(args.agent_path).expanduser().resolve()
        corpus = discover_subagent_corpus(agent_path)
        if corpus is None:
            print(
                f"no activation-evals.json found near {agent_path} "
                f"(expected sibling tests/<name>/activation-evals.json)",
                file=sys.stderr,
            )
            return 2
        corpora = [corpus]

    start = time.time()
    reports: list[SkillResult] = []
    for corpus_path in corpora:
        reports.append(
            run_skill_corpus(
                corpus_path,
                live=args.live, judge=args.judge, judge_model=args.judge_model,
                claude_bin=args.claude_bin, max_cases=args.max_cases,
                max_turns=args.max_turns, case_timeout=args.case_timeout,
            )
        )
    elapsed = time.time() - start

    print(render_human(
        reports, live=args.live, judge=args.judge,
        pass_threshold=args.pass_threshold, warn_threshold=args.warn_threshold,
        outcome_pass=args.outcome_pass_threshold, outcome_warn=args.outcome_warn_threshold,
    ))
    print(f"\n(elapsed: {elapsed:.1f}s)")

    if args.report_path:
        Path(args.report_path).write_text(
            json.dumps(
                {
                    "live": args.live,
                    "judge": args.judge,
                    "judge_model": args.judge_model if args.judge else None,
                    "thresholds": {
                        "routing_pass": args.pass_threshold,
                        "routing_warn": args.warn_threshold,
                        "outcome_pass": args.outcome_pass_threshold,
                        "outcome_warn": args.outcome_warn_threshold,
                    },
                    "reports": [asdict(r) for r in reports],
                },
                indent=2,
            ),
            encoding="utf-8",
        )

    return overall_exit_code(
        reports, live=args.live, judge=args.judge,
        pass_threshold=args.pass_threshold, warn_threshold=args.warn_threshold,
        outcome_pass=args.outcome_pass_threshold, outcome_warn=args.outcome_warn_threshold,
    )


if __name__ == "__main__":
    sys.exit(main())
