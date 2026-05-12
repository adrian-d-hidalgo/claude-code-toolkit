#!/usr/bin/env python3
import json
import sys

raw = sys.stdin.read()
if not raw.strip():
    sys.exit(0)

try:
    data = json.loads(raw)
except json.JSONDecodeError as exc:
    print(f"malformed stdin: {exc}", file=sys.stderr)
    sys.exit(0)

tool_name = data.get("tool_name", "")
tool_input = data.get("tool_input", {}) or {}
file_path = tool_input.get("file_path", "")
command = tool_input.get("command", "")

if tool_name == "Bash":
    if "rm -rf /" in command:
        print("blocked: refusing to run 'rm -rf /'", file=sys.stderr)
        sys.exit(2)

elif tool_name in ("Edit", "Write"):
    if ".." in file_path or file_path.startswith(("/etc/", "/root/")):
        print(f"blocked: path outside workspace: {file_path}", file=sys.stderr)
        sys.exit(2)

sys.exit(0)
