#!/usr/bin/env python3
"""
Initialize new Claude Code agent structure with templates and directory organization.

Usage:
    python scripts/init_agent.py agent-name --path /path/to/agents/
    python scripts/init_agent.py --help
"""

import argparse
import os
import sys
from pathlib import Path
from datetime import datetime


AGENT_TEMPLATE_MAPPING = {
    "base": "agent-template.md",
    "minimal": "minimal-agent-template.md",
}


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Initialize new Claude Code agent structure",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create minimal agent for simple tasks
  python scripts/init_agent.py quick-helper --type minimal

  # Create base agent with full structure
  python scripts/init_agent.py data-analyst --type base

  # Create in specific location with auto-validate
  python scripts/init_agent.py api-specialist --type base --path ~/.claude/agents/ --validate
        """,
    )

    parser.add_argument(
        "agent_name",
        help="Name of the agent (use kebab-case, e.g., 'data-analyst')",
    )

    parser.add_argument(
        "--type",
        choices=["base", "minimal"],
        default="base",
        help="Type of agent template to use (default: base)",
    )

    parser.add_argument(
        "--path",
        default=".claude/agents",
        help="Base path for agents directory (default: .claude/agents)",
    )

    parser.add_argument(
        "--category",
        help="Category subdirectory (e.g., 'core', 'development', 'design')",
    )

    parser.add_argument(
        "--force",
        action="store_true",
        help="Overwrite existing agent file",
    )

    parser.add_argument(
        "--validate",
        action="store_true",
        help="Auto-validate agent after creation",
    )

    return parser.parse_args()


def validate_agent_name(name):
    """Validate agent name follows conventions."""
    if not name:
        return False, "Agent name cannot be empty"

    # Check for kebab-case
    if not all(c.islower() or c == "-" or c.isdigit() for c in name):
        return False, "Agent name must be kebab-case (lowercase with hyphens)"

    if name.startswith("-") or name.endswith("-"):
        return False, "Agent name cannot start or end with hyphen"

    if "--" in name:
        return False, "Agent name cannot have consecutive hyphens"

    return True, ""


def determine_category(specified_category):
    """Determine appropriate category for agent."""
    if specified_category:
        return specified_category

    # Default to core
    return "core"


def get_template_path(agent_type):
    """Get path to template file."""
    script_dir = Path(__file__).parent
    skill_root = script_dir.parent
    template_name = AGENT_TEMPLATE_MAPPING.get(agent_type)

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


def create_agent_file(base_path, category, agent_name, template_content, force=False):
    """Create agent file with template content."""
    # Build full path
    full_path = Path(base_path) / category
    full_path.mkdir(parents=True, exist_ok=True)

    agent_file = full_path / f"{agent_name}.md"

    # Check if file exists
    if agent_file.exists() and not force:
        return False, f"Agent file already exists: {agent_file}\nUse --force to overwrite"

    # Write template content
    try:
        with open(agent_file, "w", encoding="utf-8") as f:
            f.write(template_content)
        return True, str(agent_file)
    except Exception as e:
        return False, f"Error creating agent file: {e}"


def print_next_steps(agent_file, agent_type):
    """Print helpful next steps for user."""
    print("\n✅ Agent initialized successfully!")
    print(f"\n📝 Next steps:\n")
    print(f"1. Edit the agent file: {agent_file}")
    print(f"2. Fill in the [placeholder] sections")
    print(f"3. Add 4-6 activation examples in description")
    print(f"4. Configure allowed-tools for least privilege")
    print(f"5. Define core competencies and scope")
    print(f"6. Test the agent with various scenarios")

    print(f"\n📚 Reference documentation:")
    print(f"   - references/agent-patterns.md")
    print(f"   - references/activation-patterns.md")
    print(f"   - references/tool-security.md")

    print(f"\n🔍 Validate when ready:")
    print(f"   python scripts/validate_agent.py {agent_file}")
    print(f"\n💡 Tip: Next time use --validate flag for auto-validation")


def main():
    """Main execution function."""
    args = parse_arguments()

    # Validate agent name
    valid, error_msg = validate_agent_name(args.agent_name)
    if not valid:
        print(f"❌ Error: {error_msg}", file=sys.stderr)
        sys.exit(1)

    # Determine category
    category = determine_category(args.category)

    print(f"🚀 Initializing {args.type} agent: {args.agent_name}")
    print(f"📁 Location: {args.path}/{category}/")

    # Get template
    template_path = get_template_path(args.type)
    if not template_path:
        print(f"❌ Error: Could not find template for {args.type} agent", file=sys.stderr)
        sys.exit(1)

    print(f"📋 Using template: {template_path.name}")

    # Load template
    template_content = load_template(template_path)
    if not template_content:
        print(f"❌ Error: Could not load template", file=sys.stderr)
        sys.exit(1)

    # Create agent file
    success, result = create_agent_file(
        args.path, category, args.agent_name, template_content, args.force
    )

    if not success:
        print(f"❌ Error: {result}", file=sys.stderr)
        sys.exit(1)

    print(f"✅ Created agent file: {result}")

    # Print next steps
    print_next_steps(result, args.type)

    # Validate if requested
    if args.validate:
        print("\n" + "=" * 80)
        print("🔍 AUTO-VALIDATING AGENT")
        print("=" * 80 + "\n")

        # Try to run validation script
        validate_script = Path(__file__).parent / "validate_agent.py"
        if validate_script.exists():
            import subprocess

            try:
                subprocess.run(
                    ["python3", str(validate_script), result, "--verbose"],
                    check=False,
                )
            except Exception as e:
                print(f"⚠️  Validation failed to run: {e}", file=sys.stderr)
                print(f"   Run manually: python scripts/validate_agent.py {result}")
        else:
            print(f"⚠️  Validation script not found at {validate_script}", file=sys.stderr)
            print(f"   Run manually when available")


if __name__ == "__main__":
    main()
