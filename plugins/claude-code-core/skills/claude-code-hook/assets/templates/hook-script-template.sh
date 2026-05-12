#!/usr/bin/env bash
# -e: exit on error. -u: error on unset vars. -o pipefail: surface first pipeline failure.
set -euo pipefail

INPUT=$(cat)

if [[ -z "$INPUT" ]]; then
  exit 0
fi

TOOL_NAME=$(jq -r '.tool_name // empty' <<< "$INPUT")
FILE_PATH=$(jq -r '.tool_input.file_path // empty' <<< "$INPUT")
COMMAND=$(jq -r '.tool_input.command // empty' <<< "$INPUT")

case "$TOOL_NAME" in
  Bash)
    if [[ "$COMMAND" == *"rm -rf /"* ]]; then
      echo "blocked: refusing to run 'rm -rf /'" >&2
      exit 2
    fi
    ;;
  Edit|Write)
    case "$FILE_PATH" in
      *..*|/etc/*|/root/*)
        echo "blocked: path outside workspace: $FILE_PATH" >&2
        exit 2
        ;;
    esac
    ;;
  *)
    ;;
esac

exit 0
