#!/usr/bin/env python3
"""
Initialize new Claude Code command structure with templates and directory organization.

Usage:
    python scripts/init_command.py command-name --type [action|research] --path /path/to/commands/
    python scripts/init_command.py --help
"""

import argparse
import os
import sys
from pathlib import Path
from datetime import datetime


COMMAND_TEMPLATE_MAPPING = {
    "base": "command-template.md",
    "action": "action-command-template.md",
    "research": "research-command-template.md",
    "minimal": "minimal-template.md",
}


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Initialize new Claude Code command structure",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create base command (recommended)
  python scripts/init_command.py my-command --type base

  # Create minimal command for simple tasks
  python scripts/init_command.py quick-check --type minimal

  # Create with specific location and auto-validate
  python scripts/init_command.py my-command --type base --path ~/.claude/commands/ --validate

  # Create with category
  python scripts/init_command.py my-command --type base --category development --validate
        """,
    )

    parser.add_argument(
        "command_name",
        help="Name of the command (use kebab-case, e.g., 'setup-testing')",
    )

    parser.add_argument(
        "--type",
        choices=["base", "action", "research", "minimal"],
        default="base",
        help="Type of command to create (base=generic, minimal=simple, action/research=legacy)",
    )

    parser.add_argument(
        "--path",
        default=".claude/commands",
        help="Base path for commands directory (default: .claude/commands)",
    )

    parser.add_argument(
        "--category",
        help="Category subdirectory (e.g., 'development/angular' or 'research/development')",
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing command file",
    )

    parser.add_argument(
        "--validate",
        action="store_true",
        help="Auto-validate command after creation",
    )

    return parser.parse_args()


def validate_command_name(name):
    """Validate command name follows conventions."""
    if not name:
        return False, "Command name cannot be empty"

    # Check for kebab-case
    if not all(c.islower() or c == "-" or c.isdigit() for c in name):
        return False, "Command name must be kebab-case (lowercase with hyphens)"

    if name.startswith("-") or name.endswith("-"):
        return False, "Command name cannot start or end with hyphen"

    if "--" in name:
        return False, "Command name cannot have consecutive hyphens"

    return True, ""


def determine_category(command_type, specified_category):
    """Determine appropriate category for command."""
    if specified_category:
        return specified_category

    # Default categories
    if command_type == "action":
        return "development"
    elif command_type == "research":
        return "research/development"
    elif command_type == "minimal":
        return "core"

    return "development"


def get_template_path(command_type):
    """Get path to template file."""
    script_dir = Path(__file__).parent
    skill_root = script_dir.parent
    template_name = COMMAND_TEMPLATE_MAPPING.get(command_type)

    if not template_name:
        return None

    template_path = skill_root / "assets" / "templates" / template_name
    return template_path if template_path.exists() else None


def load_template(template_path):
    """Load template content from file."""
    try:
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"Error loading template: {e}", file=sys.stderr)
        return None


def create_command_file(base_path, category, command_name, template_content, force=False):
    """Create command file with template content."""
    # Build full path
    full_path = Path(base_path) / category
    full_path.mkdir(parents=True, exist_ok=True)

    command_file = full_path / f"{command_name}.md"

    # Check if file exists
    if command_file.exists() and not force:
        return False, f"Command file already exists: {command_file}\nUse --force to overwrite"

    # Write template content
    try:
        with open(command_file, "w", encoding="utf-8") as f:
            f.write(template_content)
        return True, str(command_file)
    except Exception as e:
        return False, f"Error creating command file: {e}"


def create_readme(base_path, category, command_name, command_type):
    """Create README with command information."""
    readme_path = Path(base_path) / category / "README.md"

    readme_content = f"""# {category.replace('/', ' - ').title()} Commands

Commands for {category} operations.

## Available Commands

### {command_name}

**Type**: {command_type}

**Created**: {datetime.now().strftime('%Y-%m-%d')}

**Description**: [Add description here]

**Usage**:
```bash
/{command_name} [arguments]
```

## Adding More Commands

To add more commands to this category, use:

```bash
python scripts/init_command.py <command-name> --type {command_type} --category {category}
```
"""

    # Only create if doesn't exist
    if not readme_path.exists():
        try:
            with open(readme_path, "w", encoding="utf-8") as f:
                f.write(readme_content)
            return True, str(readme_path)
        except Exception as e:
            return False, f"Error creating README: {e}"

    return True, None


def print_next_steps(command_file, command_type):
    """Print helpful next steps for user."""
    print("\n✅ Command initialized successfully!")
    print(f"\n📝 Next steps:\n")
    print(f"1. Edit the command file: {command_file}")
    print(f"2. Fill in the TODO sections marked with [brackets]")
    print(f"3. Configure allowed-tools for least privilege")

    if command_type == "action":
        print(f"4. Implement context detection if command creates files")
        print(f"5. Add error recovery and validation sections")
        print(f"6. Test the command with various inputs")
    else:
        print(f"4. Define domain-specific credibility criteria")
        print(f"5. Implement progressive search strategy")
        print(f"6. Add reincidence protocol handling")

    print(f"\n📚 Reference documentation:")
    print(f"   - references/command-patterns.md")
    print(f"   - references/security-patterns.md")
    print(f"   - references/context-detection.md")

    print(f"\n🔍 Validate when ready:")
    print(f"   python scripts/validate_command.py {command_file}")
    print(f"\n💡 Tip: Next time use --validate flag for auto-validation:")


def main():
    """Main execution function."""
    args = parse_arguments()

    # Validate command name
    valid, error_msg = validate_command_name(args.command_name)
    if not valid:
        print(f"❌ Error: {error_msg}", file=sys.stderr)
        sys.exit(1)

    # Determine category
    category = determine_category(args.type, args.category)

    print(f"🚀 Initializing {args.type} command: {args.command_name}")
    print(f"📁 Location: {args.path}/{category}/")

    # Get template
    template_path = get_template_path(args.type)
    if not template_path:
        print(f"❌ Error: Could not find template for {args.type} command", file=sys.stderr)
        sys.exit(1)

    print(f"📋 Using template: {template_path.name}")

    # Load template
    template_content = load_template(template_path)
    if not template_content:
        print(f"❌ Error: Could not load template", file=sys.stderr)
        sys.exit(1)

    # Create command file
    success, result = create_command_file(
        args.path, category, args.command_name, template_content, args.force
    )

    if not success:
        print(f"❌ Error: {result}", file=sys.stderr)
        sys.exit(1)

    print(f"✅ Created command file: {result}")

    # Create README
    readme_success, readme_path = create_readme(args.path, category, args.command_name, args.type)
    if readme_success and readme_path:
        print(f"✅ Created README: {readme_path}")

    # Print next steps
    print_next_steps(result, args.type)

    # Validate if requested
    if args.validate:
        print("\n" + "=" * 80)
        print("🔍 AUTO-VALIDATING COMMAND")
        print("=" * 80 + "\n")

        # Try to run validation script
        validate_script = Path(__file__).parent / "validate_command.py"
        if validate_script.exists():
            import subprocess

            try:
                subprocess.run(
                    ["python3", str(validate_script), result, "--verbose"],
                    check=False,
                )
            except Exception as e:
                print(f"⚠️  Validation failed to run: {e}", file=sys.stderr)
                print(f"   Run manually: python scripts/validate_command.py {result}")
        else:
            print(f"⚠️  Validation script not found at {validate_script}", file=sys.stderr)
            print(f"   Run manually when available")


if __name__ == "__main__":
    main()
