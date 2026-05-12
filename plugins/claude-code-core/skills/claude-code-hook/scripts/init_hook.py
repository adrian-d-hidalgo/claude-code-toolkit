#!/usr/bin/env python3
"""
Scaffold a new Claude Code hook: a hooks.json entry plus its companion script.

Usage:
    python3 init_hook.py <hook-name> --event <event> [--matcher <pattern>] [--shell bash|python] [--path <dir>]

Examples:
    # Plugin-level pre-tool-use validator (creates hooks/hooks.json + scripts/validate-bash.sh)
    python3 init_hook.py validate-bash --event PreToolUse --matcher Bash --path /path/to/plugin

    # Project post-edit linter that updates a settings.json hooks block
    python3 init_hook.py run-linter --event PostToolUse --matcher "Edit|Write" \\
        --target settings --path /path/to/project/.claude

Outputs:
    - Plugin mode (default): <path>/hooks/hooks.json + <path>/hooks/scripts/<hook-name>.<ext>
    - Settings mode (--target settings): updates <path>/settings.json hooks key, drops script in <path>/hooks/scripts/

The generated script reads JSON from stdin, demonstrates exit-code semantics
(0 = allow, 2 = block + stderr message), and uses ${CLAUDE_PLUGIN_ROOT} for
plugin portability.
"""

import argparse
import json
import sys
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
EVENTS_REQUIRING_MATCHER = {"PreToolUse", "PostToolUse", "SubagentStart", "SubagentStop"}


BASH_TEMPLATE = """#!/bin/bash
# Hook: {hook_name}
# Event: {event}
# Reads JSON from stdin, exits 0 to allow / exit 2 to block.

set -euo pipefail

INPUT=$(cat)

# Example parse — adjust the jq path to the field this hook inspects.
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Decision logic — replace with real checks.
# Example: block destructive bash commands.
if [[ "$TOOL_NAME" == "Bash" ]] && echo "$COMMAND" | grep -qE '\\brm\\s+-rf\\s+/'; then
  echo "Blocked: destructive command detected." >&2
  exit 2
fi

# Allow by default.
exit 0
"""

PYTHON_TEMPLATE = '''#!/usr/bin/env python3
"""
Hook: {hook_name}
Event: {event}
Reads JSON from stdin, exits 0 to allow / exit 2 to block.
"""

import json
import sys


def main() -> int:
    try:
        data = json.load(sys.stdin)
    except json.JSONDecodeError as exc:
        print(f"hook input was not valid JSON: {{exc}}", file=sys.stderr)
        return 2

    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {{}})

    # Decision logic — replace with real checks.
    # Example: block destructive bash commands.
    if tool_name == "Bash":
        command = tool_input.get("command", "")
        if "rm -rf /" in command:
            print("Blocked: destructive command detected.", file=sys.stderr)
            return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
'''


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Scaffold a new Claude Code hook (hooks.json entry + script).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("hook_name", help="Kebab-case hook name (also used as the script filename).")
    p.add_argument(
        "--event",
        required=True,
        choices=sorted(KNOWN_EVENTS),
        help="Lifecycle event to attach to.",
    )
    p.add_argument(
        "--matcher",
        default=None,
        help="Matcher pattern (required for tool-bound events: PreToolUse, PostToolUse, SubagentStart, SubagentStop).",
    )
    p.add_argument(
        "--shell",
        choices=["bash", "python"],
        default="bash",
        help="Script language to scaffold (default: bash).",
    )
    p.add_argument(
        "--timeout",
        type=int,
        default=5000,
        help="Hook timeout in milliseconds (default: 5000).",
    )
    p.add_argument(
        "--target",
        choices=["plugin", "settings"],
        default="plugin",
        help="Generate plugin-style hooks/hooks.json (default) or update a settings.json file.",
    )
    p.add_argument(
        "--path",
        default=".",
        help="Directory containing (or to contain) the plugin root or .claude/ settings dir.",
    )
    return p.parse_args()


def validate_inputs(args: argparse.Namespace) -> str | None:
    if not args.hook_name.replace("-", "").isalnum() or args.hook_name.lower() != args.hook_name:
        return "hook_name must be kebab-case (lowercase letters, digits, hyphens)."
    if args.event in EVENTS_REQUIRING_MATCHER and not args.matcher:
        return f"event {args.event} requires --matcher (e.g. 'Bash', 'Edit|Write')."
    return None


def write_script(target_dir: Path, hook_name: str, event: str, shell: str) -> Path:
    target_dir.mkdir(parents=True, exist_ok=True)
    ext = "sh" if shell == "bash" else "py"
    script_path = target_dir / f"{hook_name}.{ext}"
    if script_path.exists():
        raise FileExistsError(f"script already exists: {script_path}")
    body = (BASH_TEMPLATE if shell == "bash" else PYTHON_TEMPLATE).format(
        hook_name=hook_name, event=event
    )
    script_path.write_text(body)
    script_path.chmod(0o755)
    return script_path


def build_entry(
    matcher: str | None,
    script_rel: str,
    timeout_ms: int,
) -> dict[str, Any]:
    entry: dict[str, Any] = {}
    if matcher is not None:
        entry["matcher"] = matcher
    entry["hooks"] = [
        {
            "type": "command",
            "command": script_rel,
            "timeout": timeout_ms,
        }
    ]
    return entry


def merge_into_hooks_root(hooks_root: dict[str, Any], event: str, entry: dict[str, Any]) -> None:
    bucket = hooks_root.setdefault(event, [])
    if not isinstance(bucket, list):
        raise ValueError(f"existing hooks.{event} must be an array")
    bucket.append(entry)


def write_plugin_hooks(plugin_root: Path, event: str, entry: dict[str, Any]) -> Path:
    hooks_dir = plugin_root / "hooks"
    hooks_dir.mkdir(parents=True, exist_ok=True)
    hooks_json = hooks_dir / "hooks.json"
    root: dict[str, Any] = {"hooks": {}}
    if hooks_json.exists():
        try:
            existing = json.loads(hooks_json.read_text(encoding="utf-8"))
            if isinstance(existing, dict) and isinstance(existing.get("hooks"), dict):
                root = existing
            elif isinstance(existing, dict):
                root = {"hooks": existing}
        except json.JSONDecodeError as exc:
            raise SystemExit(f"existing hooks.json is invalid JSON: {exc}")
    merge_into_hooks_root(root["hooks"], event, entry)
    hooks_json.write_text(json.dumps(root, indent=2) + "\n")
    return hooks_json


def write_settings_hooks(settings_dir: Path, event: str, entry: dict[str, Any]) -> Path:
    settings_dir.mkdir(parents=True, exist_ok=True)
    settings_json = settings_dir / "settings.json"
    root: dict[str, Any] = {}
    if settings_json.exists():
        try:
            root = json.loads(settings_json.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise SystemExit(f"existing settings.json is invalid JSON: {exc}")
    if "hooks" not in root or not isinstance(root["hooks"], dict):
        root["hooks"] = {}
    merge_into_hooks_root(root["hooks"], event, entry)
    settings_json.write_text(json.dumps(root, indent=2) + "\n")
    return settings_json


def main() -> int:
    args = parse_args()
    err = validate_inputs(args)
    if err:
        print(f"error: {err}", file=sys.stderr)
        return 2

    base = Path(args.path).expanduser().resolve()

    if args.target == "plugin":
        script_dir = base / "hooks" / "scripts"
        script_path = write_script(script_dir, args.hook_name, args.event, args.shell)
        script_rel = "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/" + script_path.name
        entry = build_entry(args.matcher, script_rel, args.timeout)
        manifest = write_plugin_hooks(base, args.event, entry)
        print(f"created: {script_path}")
        print(f"updated: {manifest}")
        print(
            "\nNext steps:\n"
            "1. Replace the placeholder decision logic in the script.\n"
            "2. Do NOT also declare hooks/hooks.json under plugin.json hooks: — it auto-loads.\n"
            "3. Validate: python3 shared/scripts/validate_hooks.py hooks/hooks.json"
        )
        return 0

    # settings mode
    settings_dir = base
    script_dir = settings_dir / "hooks" / "scripts"
    script_path = write_script(script_dir, args.hook_name, args.event, args.shell)
    script_rel = str(script_path.resolve())
    entry = build_entry(args.matcher, script_rel, args.timeout)
    manifest = write_settings_hooks(settings_dir, args.event, entry)
    print(f"created: {script_path}")
    print(f"updated: {manifest}")
    print(
        "\nNext steps:\n"
        "1. Replace the placeholder decision logic in the script.\n"
        "2. Validate: python3 shared/scripts/validate_hooks.py "
        f"{manifest} --settings"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
