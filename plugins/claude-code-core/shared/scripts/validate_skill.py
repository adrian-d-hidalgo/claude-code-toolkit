#!/usr/bin/env python3
"""
Validate skill structure and content against official best practices.

Usage:
    python validate_skill.py /path/to/skill-name/
    python validate_skill.py ~/.claude/skills/my-skill/

Validates:
    - YAML syntax and required fields
    - Field length limits (name <64, description <1024)
    - SKILL.md line count (<500 recommended)
    - Referenced files exist
    - No tabs in YAML
    - References 1 level deep
    - Forward slashes in paths
    - Allowed-tools validity
    - Third person in description
"""

import argparse
import re
import sys
from pathlib import Path
from typing import List, Tuple

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


# Official allowed-tools list (common tools)
VALID_TOOLS = [
    'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash',
    'WebSearch', 'WebFetch', 'Task', 'TodoWrite',
    'NotebookEdit', 'MultiEdit', 'AskUserQuestion',
    'SlashCommand', 'Skill', 'BashOutput', 'KillShell'
]

# Permission patterns may wrap a base tool with a glob, e.g. `Bash(git status:*)`,
# `Read(./src/*)`, or `mcp__server__tool(...)`. The base name is what matters for
# validity; the parenthesised pattern is matched at runtime by the harness.
MCP_TOOL_PATTERN = re.compile(r'^mcp__[a-zA-Z0-9_-]+__[a-zA-Z0-9_-]+$')


def _base_tool_name(tool_str: str) -> str:
    """Strip any `(...)` permission pattern, returning the base tool identifier."""
    paren = tool_str.find('(')
    return tool_str[:paren].strip() if paren != -1 else tool_str.strip()


def _is_valid_tool(tool_str: str) -> bool:
    base = _base_tool_name(tool_str)
    return base in VALID_TOOLS or bool(MCP_TOOL_PATTERN.match(base))


_TOP_KEY_RE = re.compile(r'^[A-Za-z][\w-]*:')


def _parse_frontmatter_fallback(yaml_content: str):
    """Minimal YAML scanner used when PyYAML is not installed.

    Handles the three fields we care about (name, description, allowed-tools)
    and correctly folds `description: >` block scalars by joining indented
    continuation lines with spaces — which is what the YAML spec mandates and
    what a regex `^description: (.+)$` cannot do on its own.
    """
    name = None
    desc = None
    tools = None

    lines = yaml_content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('name:'):
            name = line.split(':', 1)[1].strip() or None
            i += 1
            continue
        if line.startswith('description:'):
            head = line.split(':', 1)[1].strip()
            folded = head.lstrip('>|').strip()
            parts = [folded] if folded else []
            i += 1
            while i < len(lines):
                nxt = lines[i]
                if nxt and not nxt.startswith((' ', '\t')) and _TOP_KEY_RE.match(nxt):
                    break
                parts.append(nxt.strip())
                i += 1
            desc = ' '.join(p for p in parts if p)
            continue
        if line.startswith('allowed-tools:'):
            inline = line.split(':', 1)[1].strip()
            collected = []
            if inline and not inline.startswith('>') and not inline.startswith('|'):
                collected.extend(t.strip() for t in inline.strip('[]').split(',') if t.strip())
            i += 1
            while i < len(lines):
                nxt = lines[i]
                stripped = nxt.lstrip()
                if not nxt.startswith((' ', '\t')) and stripped and _TOP_KEY_RE.match(stripped):
                    break
                if stripped.startswith('- '):
                    collected.append(stripped[2:].strip())
                elif not stripped:
                    pass
                i += 1
            tools = collected or None
            continue
        i += 1

    return name, desc, tools

# First/second person indicators (should use third person)
PERSON_INDICATORS = [
    r'\bI\s+',
    r'\byou\s+',
    r'\byour\s+',
    r'\bwe\s+',
    r'\bour\s+',
    r"I'm\s+",
    r"you're\s+",
    r"we're\s+"
]


class SkillValidator:
    def __init__(self, skill_path: Path):
        self.skill_path = skill_path
        self.skill_md_path = skill_path / "SKILL.md"
        self.errors = []
        self.warnings = []
        self.info = []

    def error(self, msg: str):
        """Add error (critical issue)"""
        self.errors.append(f"✗ ERROR: {msg}")

    def warning(self, msg: str):
        """Add warning (should fix)"""
        self.warnings.append(f"⚠ WARNING: {msg}")

    def success(self, msg: str):
        """Add success message"""
        self.info.append(f"✓ {msg}")

    def validate(self) -> bool:
        """Run all validations. Returns True if no errors."""
        print(f"\nValidating skill: {self.skill_path.name}\n")

        # Check SKILL.md exists
        if not self.skill_md_path.exists():
            self.error(f"SKILL.md not found at {self.skill_md_path}")
            return False

        # Read file
        content = self.skill_md_path.read_text()

        # Run validations
        self._validate_yaml(content)
        self._validate_line_count(content)
        self._validate_references(content)
        self._validate_paths(content)

        # Print results
        self._print_results()

        return len(self.errors) == 0

    def _validate_yaml(self, content: str):
        """Validate YAML frontmatter"""
        # Extract frontmatter
        match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
        if not match:
            self.error("YAML frontmatter not found or malformed (must start with --- and end with ---)")
            return

        yaml_content = match.group(1)

        # Check for tabs
        if '\t' in yaml_content:
            lines_with_tabs = [i+1 for i, line in enumerate(yaml_content.split('\n')) if '\t' in line]
            self.error(f"Tabs found in YAML (use spaces). Lines: {lines_with_tabs}")

        # Parse with PyYAML when available — this is the only correct way to
        # measure folded scalars (`description: >`) and block lists, because the
        # YAML spec folds newlines into spaces and joins continuation lines.
        parsed = None
        if HAS_YAML:
            try:
                parsed = yaml.safe_load(yaml_content) or {}
            except yaml.YAMLError as exc:
                self.error(f"YAML parse error: {exc}")
                parsed = None

        if parsed is not None:
            name = parsed.get("name")
            desc = parsed.get("description")
            tools = parsed.get("allowed-tools")
        else:
            # Fallback when PyYAML is unavailable. We still need to fold the
            # `description: >` block scalar, so we scan line-by-line and gather
            # indented continuation lines until the next top-level key.
            name, desc, tools = _parse_frontmatter_fallback(yaml_content)

        # Validate name (required)
        if not name:
            self.error("'name' field missing in YAML frontmatter")
        else:
            name = str(name).strip()
            if len(name) > 64:
                self.error(f"Name too long: {len(name)}/64 chars")
            else:
                self.success(f"Name length: {len(name)}/64 chars")

            # Check kebab-case
            if not re.match(r'^[a-z0-9]+(-[a-z0-9]+)*$', name):
                self.warning(f"Name should be kebab-case: {name}")

        # Validate description (required)
        if not desc:
            self.error("'description' field missing in YAML frontmatter")
        else:
            # Collapse internal whitespace so the length count reflects what
            # users actually see (folded scalars already join lines with spaces;
            # this also normalises any stray runs of whitespace).
            desc = ' '.join(str(desc).split())
            if len(desc) > 1024:
                self.error(f"Description too long: {len(desc)}/1024 chars")
            else:
                self.success(f"Description length: {len(desc)}/1024 chars")

            # Check for first/second person
            desc_lower = desc.lower()
            desc_for_check = re.sub(r'"[^"]*"', '', desc_lower)
            desc_for_check = re.sub(r'`[^`]*`', '', desc_for_check)
            for pattern in PERSON_INDICATORS:
                if re.search(pattern, desc_for_check):
                    self.warning(f"Description should use third person (found '{pattern.strip()}' pattern)")
                    break
            else:
                self.success("Description uses third person")

        # Validate allowed-tools (optional but if present, must be valid)
        if tools:
            if not isinstance(tools, list):
                self.warning(f"allowed-tools should be a YAML list, got {type(tools).__name__}")
                tools = []
            invalid_tools = [t for t in tools if not _is_valid_tool(str(t))]
            if invalid_tools:
                self.warning(f"Potentially invalid tools: {invalid_tools}")
            else:
                self.success(f"Allowed-tools valid: {len(tools)} tools")

    def _validate_line_count(self, content: str):
        """Validate SKILL.md line count"""
        lines = content.split('\n')
        line_count = len(lines)

        if line_count > 500:
            self.warning(f"SKILL.md too long: {line_count}/500 lines (recommended)")
        else:
            self.success(f"SKILL.md length: {line_count}/500 lines")

    def _validate_references(self, content: str):
        """Validate referenced files exist"""
        ref_patterns = [
            r'(references/[a-z-]+\.md)',
            r'(scripts/[a-z_]+\.py)',
            r'(assets/templates/[a-zA-Z0-9_.-]+\.(?:md|json|sh|py))',
        ]

        skip_prefix_re = re.compile(
            r'(\$\{[A-Z_]+\}/(shared/)?|the repo-level |repo-root |the toolkit\'s )$'
        )

        all_refs = []
        for pattern in ref_patterns:
            for match in re.finditer(pattern, content):
                if skip_prefix_re.search(content[:match.start()]):
                    continue
                all_refs.append(match.group(1))

        if not all_refs:
            self.info.append("ℹ No file references found")
            return

        missing = []
        for ref in set(all_refs):
            ref_path = self.skill_path / ref
            if not ref_path.exists():
                missing.append(str(ref_path.relative_to(self.skill_path)))

        if missing:
            self.error(f"Referenced files not found: {missing}")
        else:
            self.success(f"All {len(set(all_refs))} referenced files exist")

        # Check references are 1 level deep (match actual file paths only)
        # Exclude shared resources (${CLAUDE_PLUGIN_ROOT}/shared/references/...)
        # Only check local references (references/something/something.md)
        deep_refs = re.findall(r'(?<!\$\{CLAUDE_PLUGIN_ROOT\}/shared/)references/[a-z-]+/[a-z-]+\.md', content)
        if deep_refs:
            self.error(f"Local references nested too deep (max 1 level): {deep_refs}")
        else:
            self.success("Local references are 1 level deep (shared resources excluded)")

    def _validate_paths(self, content: str):
        """Validate path conventions"""
        # Check for Windows-style paths (backslashes)
        backslash_paths = re.findall(r'[a-z]+\\[a-z]+', content)
        if backslash_paths:
            self.error(f"Windows-style paths found (use forward slashes): {backslash_paths[:3]}")
        else:
            self.success("Paths use forward slashes")

    def _print_results(self):
        """Print validation results"""
        # Print all messages
        for msg in self.info:
            print(msg)

        if self.warnings:
            print()
            for msg in self.warnings:
                print(msg)

        if self.errors:
            print()
            for msg in self.errors:
                print(msg)

        # Summary
        print(f"\n{'='*60}")
        if self.errors:
            print(f"❌ VALIDATION FAILED: {len(self.errors)} error(s), {len(self.warnings)} warning(s)")
            print("\nFix errors before deployment.")
        elif self.warnings:
            print(f"⚠️  VALIDATION PASSED WITH WARNINGS: {len(self.warnings)} warning(s)")
            print("\nConsider fixing warnings for best practices compliance.")
        else:
            print("✅ VALIDATION PASSED: No errors or warnings")
        print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(
        description="Validate skill structure and content",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python validate_skill.py ~/.claude/skills/my-skill/
  python validate_skill.py .claude/skills/team-skill/

Validation checks:
  - YAML syntax and required fields
  - Field length limits (name <64, description <1024)
  - SKILL.md line count (<500 recommended)
  - Referenced files exist
  - No tabs in YAML
  - References 1 level deep
  - Forward slashes in paths
  - Third person in description
"""
    )

    parser.add_argument(
        'skill_path',
        help="Path to skill directory"
    )

    args = parser.parse_args()

    # Expand and validate path
    skill_path = Path(args.skill_path).expanduser().resolve()

    if not skill_path.exists():
        print(f"Error: Path does not exist: {skill_path}")
        return 1

    if not skill_path.is_dir():
        print(f"Error: Path is not a directory: {skill_path}")
        return 1

    # Validate
    validator = SkillValidator(skill_path)
    success = validator.validate()

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
