#!/usr/bin/env python3
"""
Initialize a new Claude Code slash command from a template.

Source of truth for the rules and templates used here:
  plugins/claude-code-core/skills/claude-code-slash-command/SKILL.md
  plugins/claude-code-core/skills/claude-code-slash-command/references/section-guide.md
  plugins/claude-code-core/skills/claude-code-slash-command/assets/templates/

Usage:
    python3 init_command.py command-name [--type base|minimal|action|research]
                                         [--path .claude/commands]
                                         [--subdir <subdir>]
                                         [--force] [--validate]
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path


TEMPLATE_MAPPING = {
    "base": "command-template.md",
    "minimal": "minimal-template.md",
    "action": "action-command-template.md",      # legacy; kept for back-compat
    "research": "research-command-template.md",  # legacy; kept for back-compat
}

# Resolved at runtime — points to the shared validator under the plugin root.
DEFAULT_VALIDATOR = Path(__file__).resolve().parents[3] / "shared" / "scripts" / "validate_command.py"


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Initialize a new Claude Code slash command from a template.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 init_command.py my-command
  python3 init_command.py my-command --type minimal --path ~/.claude/commands
  python3 init_command.py my-command --subdir git    # → .claude/commands/git/my-command.md
  python3 init_command.py my-command --validate
        """,
    )
    parser.add_argument(
        "command_name",
        help="Command name in kebab-case (e.g. 'setup-testing')",
    )
    parser.add_argument(
        "--type",
        choices=sorted(TEMPLATE_MAPPING.keys()),
        default="base",
        help="Template variant (default: base). 'action'/'research' are legacy.",
    )
    parser.add_argument(
        "--path",
        default=".claude/commands",
        help="Commands directory (default: .claude/commands)",
    )
    parser.add_argument(
        "--subdir",
        default="",
        help="Optional namespace subdirectory inside the commands dir (creates /<subdir>:<name> "
             "per section-guide §F.4.1). Default: flat layout.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite if the target file already exists",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        help="Run the shared validator on the new file once created",
    )
    return parser.parse_args()


def validate_command_name(name: str) -> tuple[bool, str]:
    """Kebab-case, ≤64 chars (section-guide §name)."""
    if not name:
        return False, "Command name cannot be empty"
    if len(name) > 64:
        return False, "Command name must be ≤64 characters"
    if not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", name):
        return False, "Command name must be kebab-case (lowercase letters, digits, hyphens)"
    return True, ""


def template_path(command_type: str) -> Path | None:
    template_name = TEMPLATE_MAPPING.get(command_type)
    if not template_name:
        return None
    skill_root = Path(__file__).resolve().parent.parent
    candidate = skill_root / "assets" / "templates" / template_name
    return candidate if candidate.exists() else None


def read_template(path: Path) -> str | None:
    try:
        return path.read_text(encoding="utf-8")
    except OSError as err:
        print(f"❌ Could not read template {path}: {err}", file=sys.stderr)
        return None


def create_command_file(base_path: str, subdir: str, command_name: str,
                        template_content: str, force: bool) -> tuple[bool, str]:
    target_dir = Path(base_path) / subdir if subdir else Path(base_path)
    try:
        target_dir.mkdir(parents=True, exist_ok=True)
    except OSError as err:
        return False, f"Cannot create directory {target_dir}: {err}"

    target_file = target_dir / f"{command_name}.md"
    if target_file.exists() and not force:
        return False, f"Already exists: {target_file} (use --force to overwrite)"

    try:
        target_file.write_text(template_content, encoding="utf-8")
    except OSError as err:
        return False, f"Cannot write {target_file}: {err}"
    return True, str(target_file)


def print_next_steps(command_file: str, subdir: str, command_name: str) -> None:
    invocation = f"/{subdir}:{command_name}" if subdir else f"/{command_name}"
    print("\n✅ Command initialized.")
    print(f"\n📝 Next steps:")
    print(f"  1. Edit: {command_file}")
    print(f"  2. Replace placeholders in the body and tighten the frontmatter")
    print(f"     (description <20 words, allowed-tools least-privilege).")
    print(f"  3. Decide command-vs-skill — see references/command-vs-skill.md.")
    print(f"  4. Validate: python3 {DEFAULT_VALIDATOR} {command_file}")
    print(f"\n  Invocation: {invocation}")


def run_validator(command_file: str) -> int:
    if not DEFAULT_VALIDATOR.exists():
        print(f"⚠️  Validator not found at {DEFAULT_VALIDATOR}", file=sys.stderr)
        return 0
    print("\n" + "=" * 80)
    print("🔍 Running validator")
    print("=" * 80 + "\n")
    try:
        return subprocess.run(
            ["python3", str(DEFAULT_VALIDATOR), command_file, "--verbose"],
            check=False,
        ).returncode
    except OSError as err:
        print(f"⚠️  Validator failed to run: {err}", file=sys.stderr)
        return 1


def main() -> None:
    args = parse_arguments()

    valid, error_msg = validate_command_name(args.command_name)
    if not valid:
        print(f"❌ {error_msg}", file=sys.stderr)
        sys.exit(1)

    if args.subdir and not re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", args.subdir):
        print("❌ --subdir must be kebab-case (single segment)", file=sys.stderr)
        sys.exit(1)

    template = template_path(args.type)
    if not template:
        print(f"❌ Template for type '{args.type}' not found", file=sys.stderr)
        sys.exit(1)

    template_content = read_template(template)
    if template_content is None:
        sys.exit(1)

    target_display = f"{args.path}/{args.subdir}/" if args.subdir else f"{args.path}/"
    print(f"🚀 Initializing '{args.command_name}' (type: {args.type})")
    print(f"📁 Location: {target_display}")
    print(f"📋 Template: {template.name}")

    ok, result = create_command_file(args.path, args.subdir, args.command_name,
                                     template_content, args.force)
    if not ok:
        print(f"❌ {result}", file=sys.stderr)
        sys.exit(1)
    print(f"✅ Created: {result}")

    print_next_steps(result, args.subdir, args.command_name)

    if args.validate:
        exit_code = run_validator(result)
        if exit_code != 0:
            sys.exit(exit_code)


if __name__ == "__main__":
    main()
