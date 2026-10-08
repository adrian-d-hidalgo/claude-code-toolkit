#!/usr/bin/env python3
"""
Validate a Claude Code hooks configuration. Accepts:
  - a `hooks/hooks.json` file (auto-loaded plugin hooks),
  - a `settings.json` containing a `hooks` key,
  - or an inline `hooks.json`-shaped JSON file from a project/user/managed location.

Usage:
    python3 validate_hooks.py <path-to-hooks.json>
    python3 validate_hooks.py <path-to-settings.json> --settings
    python3 validate_hooks.py --help

Exit codes:
    0 - pass (no errors, no warnings).
    1 - warnings only.
    2 - errors present.
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


KNOWN_EVENTS = {
    "PreToolUse",
    "PostToolUse",
    "UserPromptSubmit",
    "Stop",
    "SubagentStart",
    "SubagentStop",
    "Notification",
    "SessionStart",
    "SessionEnd",
    "PreCompact",
}
EVENTS_REQUIRING_MATCHER = {
    "PreToolUse",
    "PostToolUse",
    "SubagentStart",
    "SubagentStop",
}
ENTRY_ALLOWED_KEYS = {"matcher", "hooks"}
COMMAND_ALLOWED_KEYS = {"type", "command", "timeout", "shell"}
ALLOWED_SHELLS = {"bash", "powershell"}
DANGEROUS_PATTERNS = [
    (re.compile(r"\bchmod\s+777\b"), "uses `chmod 777` — overly permissive"),
    (re.compile(r"\bcurl\s+[^|]+\|\s*(bash|sh)\b"), "pipes curl output to shell (supply-chain risk)"),
    (re.compile(r"\brm\s+-rf\s+/"), "performs `rm -rf /` (catastrophic)"),
    (re.compile(r"\beval\s+\$\(.*stdin"), "evaluates stdin (remote code execution)"),
]


@dataclass
class Report:
    target: str
    passes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, msg: str) -> None:
        self.passes.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def err(self, msg: str) -> None:
        self.errors.append(msg)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Validate Claude Code hooks configuration.",
    )
    p.add_argument("path", help="Path to hooks.json or settings.json containing a hooks key.")
    p.add_argument(
        "--settings",
        action="store_true",
        help="Treat the input file as a settings.json — read hooks from its 'hooks' key.",
    )
    p.add_argument("--strict", action="store_true", help="Treat warnings as errors.")
    return p.parse_args()


def load_hooks(path: Path, is_settings: bool) -> tuple[dict[str, Any] | None, str | None]:
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return None, f"file not found: {path}"
    except json.JSONDecodeError as e:
        return None, f"invalid JSON at {path}: {e}"

    if is_settings:
        if not isinstance(raw, dict):
            return None, "settings.json root must be an object"
        hooks_root = raw.get("hooks")
        if hooks_root is None:
            return None, "settings.json does not contain a 'hooks' key"
        if not isinstance(hooks_root, dict):
            return None, "settings.json 'hooks' must be an object"
        return hooks_root, None

    # Standalone hooks.json shape: either { "hooks": { ... } } or already { event: [...] }.
    if not isinstance(raw, dict):
        return None, "hooks.json root must be an object"
    if "hooks" in raw and isinstance(raw["hooks"], dict):
        return raw["hooks"], None
    return raw, None


def validate_hook_entry(event: str, idx: int, entry: Any, rpt: Report) -> None:
    prefix = f"{event}[{idx}]"
    if not isinstance(entry, dict):
        rpt.err(f"{prefix} must be an object")
        return

    for key in entry:
        if key not in ENTRY_ALLOWED_KEYS:
            rpt.warn(f"{prefix} unknown key: {key!r}")
        if key in {"description", "comment", "name"}:
            rpt.err(
                f"{prefix}.{key} is not in the hook schema and is silently ignored or rejected; "
                f"document hooks in the surrounding README instead"
            )

    if event in EVENTS_REQUIRING_MATCHER:
        if "matcher" not in entry:
            rpt.err(f"{prefix} requires a 'matcher' field for event {event}")
        elif not isinstance(entry["matcher"], str):
            rpt.err(f"{prefix}.matcher must be a string")
        elif entry["matcher"].strip() in ("", ".*"):
            rpt.warn(
                f"{prefix}.matcher is overbroad ({entry['matcher']!r}); narrow the matcher to reduce surface area"
            )

    inner = entry.get("hooks")
    if not isinstance(inner, list) or not inner:
        rpt.err(f"{prefix}.hooks must be a non-empty array of command entries")
        return

    for j, cmd in enumerate(inner):
        cprefix = f"{prefix}.hooks[{j}]"
        if not isinstance(cmd, dict):
            rpt.err(f"{cprefix} must be an object")
            continue

        for key in cmd:
            if key not in COMMAND_ALLOWED_KEYS:
                rpt.warn(f"{cprefix} unknown key: {key!r}")

        type_ = cmd.get("type")
        if type_ != "command":
            rpt.err(f"{cprefix}.type must be 'command' (got {type_!r})")

        command = cmd.get("command")
        if not isinstance(command, str) or not command.strip():
            rpt.err(f"{cprefix}.command must be a non-empty string")
        else:
            # Portability: prefer ${CLAUDE_PLUGIN_ROOT} over absolute paths.
            if re.search(r"^/(?:Users|home|Volumes)/", command):
                rpt.warn(
                    f"{cprefix}.command contains a hardcoded absolute path; "
                    f"prefer ${{CLAUDE_PLUGIN_ROOT}}/... for portability"
                )
            for pat, msg in DANGEROUS_PATTERNS:
                if pat.search(command):
                    rpt.err(f"{cprefix}.command {msg}")

        timeout = cmd.get("timeout")
        if timeout is not None:
            if not isinstance(timeout, int) or timeout <= 0:
                rpt.err(f"{cprefix}.timeout must be a positive integer (milliseconds)")
            elif timeout > 60000:
                rpt.warn(
                    f"{cprefix}.timeout is {timeout} ms; values >60000 ms block the agent loop noticeably"
                )

        shell = cmd.get("shell")
        if shell is not None and shell not in ALLOWED_SHELLS:
            rpt.err(f"{cprefix}.shell must be one of {sorted(ALLOWED_SHELLS)} (got {shell!r})")


def validate_hooks_root(hooks_root: dict[str, Any]) -> Report:
    rpt = Report(target="hooks")
    if not hooks_root:
        rpt.warn("hooks object is empty")
        return rpt

    for event, entries in hooks_root.items():
        if event not in KNOWN_EVENTS:
            rpt.warn(f"unknown event: {event!r} (allowed: {sorted(KNOWN_EVENTS)})")
        if not isinstance(entries, list):
            rpt.err(f"{event} must be an array of hook entries")
            continue
        for i, entry in enumerate(entries):
            validate_hook_entry(event, i, entry, rpt)

    if not rpt.errors:
        rpt.ok(f"validated {sum(len(v) if isinstance(v, list) else 0 for v in hooks_root.values())} entries")
    return rpt


def print_report(rpt: Report) -> None:
    print(f"\n=== {rpt.target} ===")
    for msg in rpt.passes:
        print(f"  ok   {msg}")
    for msg in rpt.warnings:
        print(f"  warn {msg}")
    for msg in rpt.errors:
        print(f"  err  {msg}")


def main() -> int:
    args = parse_args()
    path = Path(args.path).resolve()

    hooks_root, err = load_hooks(path, args.settings)
    if err:
        print(f"err  {err}", file=sys.stderr)
        return 2

    rpt = validate_hooks_root(hooks_root or {})
    print_report(rpt)

    if rpt.errors or (args.strict and rpt.warnings):
        return 2
    if rpt.warnings:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
