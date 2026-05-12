#!/usr/bin/env python3
"""
Initialize a new skill structure with templates.

Usage:
    python init_skill.py skill-name --path ~/.claude/skills/
    python init_skill.py my-skill --path .claude/skills/

Creates:
    - skill-name/SKILL.md (template with TODOs)
    - skill-name/scripts/ (directory)
    - skill-name/references/ (directory)
    - skill-name/assets/templates/ (directory)
"""

import argparse
import os
import sys
from pathlib import Path


def load_template(template_name):
    """Load template file from assets/templates."""
    script_dir = Path(__file__).parent
    skill_root = script_dir.parent
    template_path = skill_root / "assets" / "templates" / template_name

    if template_path.exists():
        with open(template_path, "r", encoding="utf-8") as f:
            return f.read()
    return None


SKILL_MD_TEMPLATE_HARDCODED = """---
name: {skill_name}
description: >
  TODO: Describe what this skill does, when to use it, and specific triggers.
allowed-tools:
  - Read
  - Write
  - Edit
---

# TODO: Skill Title

TODO: Brief description

## Workflow

1. **Step 1**
   - Action 1
   - Action 2

2. **Step 2**
   - Action 1
   - Action 2

3. **Step 3**
   - Validation
   - Output

## Usage Examples

TODO: Provide 3-5 concrete examples:

**Example 1: Basic operation**
Input: "User request example"
Action: What skill does
Output: Expected result

**Example 2: Complex operation**
Input: "Complex request example"
Action: Detailed workflow
Output: Expected result

## Resources

TODO: Document bundled resources if any:

**Scripts** (scripts/):
- script_name.py - Description

**References** (references/):
- guide.md - Detailed documentation
- examples.md - Additional examples

**Assets** (assets/):
- template.ext - Template description

## Key Points

TODO: List critical information:
- Point 1
- Point 2
- Point 3
"""


README_TEMPLATE = """# {skill_name}

TODO: Brief description of what this skill does.

## Quick Start

TODO: How to use this skill:

1. Trigger phrase example 1
2. Trigger phrase example 2

## Resources

- SKILL.md - Main skill file
- scripts/ - Executable scripts
- references/ - Documentation
- assets/ - Templates and output resources

## Testing

TODO: How to test this skill:

```bash
# Test activation
# Try these phrases:
# - "phrase 1"
# - "phrase 2"
```

## Version

Current: 1.0.0
"""


def create_skill_structure(skill_name, base_path):
    """Create directory structure and template files for new skill."""

    # Validate skill name (kebab-case)
    if not all(c.islower() or c == '-' or c.isdigit() for c in skill_name):
        print(f"Error: Skill name must be kebab-case (lowercase with hyphens): {skill_name}")
        return False

    # Create base directory
    skill_dir = Path(base_path) / skill_name

    if skill_dir.exists():
        print(f"Error: Skill directory already exists: {skill_dir}")
        return False

    try:
        # Create directories
        skill_dir.mkdir(parents=True, exist_ok=False)
        (skill_dir / "scripts").mkdir()
        (skill_dir / "references").mkdir()
        (skill_dir / "assets" / "templates").mkdir(parents=True)

        # Create SKILL.md
        skill_md = skill_dir / "SKILL.md"

        # Try to load base template, fall back to hardcoded
        template_content = load_template("base-skill-template.md")
        if template_content:
            # Replace [skill-name] placeholder with actual name
            template_content = template_content.replace("[skill-name]", skill_name)
            template_content = template_content.replace("[Skill Name]", skill_name.replace("-", " ").title())
            skill_md.write_text(template_content)
            print(f"✅ Using base-skill-template.md")
        else:
            # Fallback to hardcoded template
            skill_md.write_text(SKILL_MD_TEMPLATE_HARDCODED.format(skill_name=skill_name))
            print(f"⚠️  Template not found, using hardcoded template")

        # Create README.md
        readme = skill_dir / "README.md"
        readme.write_text(README_TEMPLATE.format(skill_name=skill_name))

        # Create example script
        example_script = skill_dir / "scripts" / "example.py"
        example_script.write_text("""#!/usr/bin/env python3
\"\"\"
Example script template.

TODO: Replace with actual script.

Usage:
    python example.py --input file.txt

Requirements:
    - None (add dependencies here)
\"\"\"

import argparse
import sys


def main():
    parser = argparse.ArgumentParser(description="Example script")
    parser.add_argument('--input', required=True, help="Input file")

    args = parser.parse_args()

    try:
        # TODO: Implement script logic
        print(f"Processing: {args.input}")
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
""")
        example_script.chmod(0o755)

        # Create example reference
        example_ref = skill_dir / "references" / "example-guide.md"
        example_ref.write_text("""# Example Guide

TODO: Replace with actual reference documentation.

## Section 1

Content here...

## Section 2

Content here...

## Quick Reference

| Item | Description |
|------|-------------|
| X    | Details     |
| Y    | Details     |
""")

        # Create example asset
        example_asset = skill_dir / "assets" / "templates" / "example-template.md"
        example_asset.write_text("""# Example Template

TODO: Replace with actual template.

## Section 1

[TODO: Content]

## Section 2

[TODO: Content]
""")

        print(f"✓ Created skill structure at: {skill_dir}")
        print("\nNext steps:")
        print(f"1. Edit {skill_dir}/SKILL.md")
        print("   - Update description field (activation triggers)")
        print("   - Replace TODO sections with actual content")
        print("   - Remove example files if not needed")
        print("2. Add scripts/, references/, assets/ as needed")
        print("3. Test activation with: claude --debug")
        print("4. Restart Claude Code to load skill")

        return True

    except Exception as e:
        print(f"Error creating skill structure: {e}")
        # Cleanup on failure
        if skill_dir.exists():
            import shutil
            shutil.rmtree(skill_dir)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Initialize new skill structure",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Personal skill
  python init_skill.py my-skill --path ~/.claude/skills/

  # Project skill
  python init_skill.py team-skill --path .claude/skills/

  # Categorized personal skill
  python init_skill.py my-skill --path ~/.claude/skills/category/
"""
    )

    parser.add_argument(
        'skill_name',
        help="Skill name in kebab-case (e.g., pdf-processor)"
    )

    parser.add_argument(
        '--path',
        required=True,
        help="Base path for skill (e.g., ~/.claude/skills/ or .claude/skills/)"
    )

    args = parser.parse_args()

    # Expand user path
    base_path = Path(args.path).expanduser()

    # Validate base path exists
    if not base_path.exists():
        print(f"Error: Base path does not exist: {base_path}")
        print(f"\nCreate it first:")
        print(f"  mkdir -p {base_path}")
        return 1

    # Create skill
    success = create_skill_structure(args.skill_name, base_path)

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
