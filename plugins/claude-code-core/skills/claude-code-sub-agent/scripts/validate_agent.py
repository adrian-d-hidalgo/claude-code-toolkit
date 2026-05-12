#!/usr/bin/env python3
"""
Validate Claude Code agent structure, security, and compliance.

Usage:
    python scripts/validate_agent.py /path/to/agent.md
    python scripts/validate_agent.py /path/to/agents/ --all
    python scripts/validate_agent.py --help
"""

import argparse
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False
    print("⚠️  Warning: PyYAML not installed. YAML validation will be limited.", file=sys.stderr)
    print("   Install with: pip install pyyaml", file=sys.stderr)
    print()


class ValidationResult:
    """Store validation results."""

    def __init__(self, category: str):
        self.category = category
        self.passed = []
        self.warnings = []
        self.errors = []

    def add_pass(self, message: str):
        self.passed.append(message)

    def add_warning(self, message: str):
        self.warnings.append(message)

    def add_error(self, message: str):
        self.errors.append(message)

    @property
    def status(self) -> str:
        if self.errors:
            return "❌ FAIL"
        elif self.warnings:
            return "⚠️  WARNINGS"
        else:
            return "✅ PASS"

    @property
    def has_issues(self) -> bool:
        return len(self.errors) > 0 or len(self.warnings) > 0


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Validate Claude Code agent structure and compliance",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate single agent
  python scripts/validate_agent.py .claude/agents/core/research-specialist.md

  # Validate all agents in directory
  python scripts/validate_agent.py .claude/agents/ --all

  # Validate with detailed output
  python scripts/validate_agent.py agent.md --verbose

  # Custom required fields
  python scripts/validate_agent.py agent.md --required-fields name,description,tools

  # Strict mode (warnings as errors)
  python scripts/validate_agent.py agent.md --strict
        """,
    )

    parser.add_argument(
        "path",
        help="Path to agent file or directory",
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Validate all agents in directory (recursive)",
    )

    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Show detailed validation output",
    )

    parser.add_argument(
        "--strict",
        action="store_true",
        help="Treat warnings as errors",
    )

    parser.add_argument(
        "--required-fields",
        default="name,description,tools,model",
        help="Comma-separated list of required frontmatter fields (default: name,description,tools,model)",
    )

    return parser.parse_args()


def extract_frontmatter(content: str) -> Tuple[Dict, str]:
    """Extract YAML frontmatter from markdown content."""
    # Match frontmatter between --- delimiters
    pattern = r"^---\s*\n(.*?)\n---\s*\n(.*)$"
    match = re.match(pattern, content, re.DOTALL)

    if not match:
        return None, content

    frontmatter_str = match.group(1)
    body = match.group(2)

    if HAS_YAML:
        try:
            frontmatter = yaml.safe_load(frontmatter_str)
            return frontmatter, body
        except yaml.YAMLError as e:
            return None, content
    else:
        # Simple YAML parsing without yaml library
        frontmatter = {}
        for line in frontmatter_str.strip().split('\n'):
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip()
                value = value.strip()
                frontmatter[key] = value
        return frontmatter if frontmatter else None, body


def validate_structure(file_path: Path, content: str, required_fields: List[str] = None) -> ValidationResult:
    """Validate agent structure."""
    result = ValidationResult("Structure")

    # Default required fields if not specified
    if required_fields is None:
        required_fields = ["name", "description", "tools", "model"]

    # Check file naming
    if not file_path.name.endswith(".md"):
        result.add_error(f"File must have .md extension: {file_path.name}")
    else:
        result.add_pass("File has .md extension")

    # Check kebab-case naming
    name_without_ext = file_path.stem
    if re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", name_without_ext):
        result.add_pass("File name follows kebab-case convention")
    else:
        result.add_error(f"File name must be kebab-case: {name_without_ext}")

    # Extract and validate frontmatter
    frontmatter, body = extract_frontmatter(content)

    if not frontmatter:
        result.add_error("Missing or invalid YAML frontmatter")
        return result

    result.add_pass("Valid YAML frontmatter present")

    # Check required fields
    for field in required_fields:
        if field in frontmatter:
            result.add_pass(f"Required field present: {field}")
        else:
            result.add_error(f"Missing required field: {field}")

    # Validate description
    if "description" in frontmatter:
        desc = frontmatter["description"]

        # Check for "Use immediately when" phrase
        if "Use immediately when" not in desc and "use immediately when" not in desc:
            result.add_error("Description must include 'Use immediately when' activation clause")

        # Check for examples
        if "<example>" not in desc:
            result.add_error("Description must include activation examples with <example> tags")
        else:
            example_count = desc.count("<example>")
            if example_count < 4:
                result.add_warning(f"Description has {example_count} examples, recommended 4-6")
            elif example_count > 6:
                result.add_warning(f"Description has {example_count} examples, recommended 4-6")
            else:
                result.add_pass(f"Description has {example_count} activation examples")

    # Validate model
    if "model" in frontmatter:
        valid_models = ["sonnet", "opus", "haiku", "inherit"]
        if frontmatter["model"] in valid_models:
            result.add_pass(f"Valid model: {frontmatter['model']}")
        else:
            result.add_error(f"Invalid model: {frontmatter['model']}, must be one of {valid_models}")

    # Check file size
    lines = content.count("\n")
    if lines > 1000:
        result.add_warning(f"Agent file is very long ({lines} lines). Consider simplifying.")
    else:
        result.add_pass(f"File size reasonable ({lines} lines)")

    return result


def validate_security(file_path: Path, content: str) -> ValidationResult:
    """Validate security configuration."""
    result = ValidationResult("Security")

    frontmatter, body = extract_frontmatter(content)

    if not frontmatter or "tools" not in frontmatter:
        result.add_error("Cannot validate security: missing tools field")
        return result

    tools = frontmatter["tools"]

    # Convert to list if string
    if isinstance(tools, str):
        tools = [t.strip() for t in tools.split(",")]

    if not isinstance(tools, list):
        result.add_error("tools must be a list or comma-separated string")
        return result

    # Check for dangerous patterns
    if "Bash" in tools:
        result.add_error("CRITICAL: Unrestricted Bash access detected! Use Bash(command *) instead")

    # Check for WebSearch restriction
    if "WebSearch" in tools:
        # Check if this is research-specialist
        agent_name = frontmatter.get("name", "")
        if "research" not in agent_name.lower():
            result.add_error("CRITICAL: WebSearch should only be granted to research-specialist")

    # Check for Bash restrictions
    bash_tools = [tool for tool in tools if "Bash" in str(tool)]
    if bash_tools:
        for tool in bash_tools:
            if tool == "Bash" or tool == "Bash(*)":
                result.add_error(f"Unrestricted Bash pattern: {tool}")
            else:
                result.add_pass(f"Restricted Bash command: {tool}")

    # Check for write operations
    write_tools = [tool for tool in tools if tool in ["Write", "Edit", "MultiEdit"]]
    if write_tools:
        result.add_pass(f"File modification tools: {', '.join(write_tools)}")

    # Check for read-only pattern
    readonly_tools = {"Read", "Grep", "Glob"}
    if set(tools) <= readonly_tools:
        result.add_pass("Read-only tool configuration detected")

    return result


def validate_activation(file_path: Path, content: str) -> ValidationResult:
    """Validate activation patterns."""
    result = ValidationResult("Activation")

    frontmatter, body = extract_frontmatter(content)

    if not frontmatter or "description" not in frontmatter:
        result.add_error("Cannot validate activation: missing description")
        return result

    desc = frontmatter["description"]

    # Check activation clause
    if "Use immediately when" in desc or "use immediately when" in desc:
        result.add_pass("Activation clause present")
    else:
        result.add_error("Missing 'Use immediately when' activation clause")

    # Check examples structure
    examples = re.findall(r'<example>(.*?)</example>', desc, re.DOTALL)

    for i, example in enumerate(examples, 1):
        has_context = "Context:" in example or "context:" in example
        has_request = "request:" in example
        has_assistant = "assistant:" in example
        has_commentary = "<commentary>" in example

        if all([has_context, has_request, has_assistant, has_commentary]):
            result.add_pass(f"Example {i}: Complete structure")
        else:
            missing = []
            if not has_context: missing.append("Context")
            if not has_request: missing.append("request")
            if not has_assistant: missing.append("assistant")
            if not has_commentary: missing.append("commentary")
            result.add_warning(f"Example {i}: Missing {', '.join(missing)}")

    return result


def validate_independence(file_path: Path, content: str) -> ValidationResult:
    """Validate agent independence."""
    result = ValidationResult("Independence")

    # Check for circular dependencies in content
    agent_references = re.findall(r'(?:delegate to|use|call|invoke)\s+([a-z-]+(?:-agent|-specialist))', content.lower())

    if agent_references:
        unique_refs = set(agent_references)
        if len(unique_refs) > 5:
            result.add_warning(f"High number of agent dependencies: {len(unique_refs)}")
        else:
            result.add_pass(f"Reasonable agent collaboration: {len(unique_refs)} references")
    else:
        result.add_pass("No agent dependencies detected (fully independent)")

    # Check for self-sufficiency indicators
    independence_keywords = ["independent", "autonomous", "self-sufficient"]
    has_independence = any(keyword in content.lower() for keyword in independence_keywords)

    if has_independence:
        result.add_pass("Independence mentioned in documentation")

    return result


def validate_documentation(file_path: Path, content: str) -> ValidationResult:
    """Validate documentation quality."""
    result = ValidationResult("Documentation")

    frontmatter, body = extract_frontmatter(content)

    if not body:
        result.add_error("Agent has no body content")
        return result

    # Check for key sections
    expected_sections = ["competenc", "scope", "standard", "tool", "example"]
    found_sections = []

    for section in expected_sections:
        if section in body.lower():
            found_sections.append(section)

    if len(found_sections) >= 4:
        result.add_pass(f"Good section organization ({len(found_sections)}/5 key sections)")
    else:
        result.add_warning(f"Limited section organization ({len(found_sections)}/5 key sections)")

    # Check for examples in body
    if "example" in body.lower() or "###" in body:
        result.add_pass("Examples or subsections present in body")
    else:
        result.add_warning("No clear examples or subsections in body")

    return result


def validate_agent_file(file_path: Path, verbose: bool = False, required_fields: List[str] = None) -> Dict[str, ValidationResult]:
    """Validate a single agent file."""
    results = {}

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        print(f"❌ Error reading file {file_path}: {e}", file=sys.stderr)
        return results

    # Run all validations
    results["structure"] = validate_structure(file_path, content, required_fields)
    results["security"] = validate_security(file_path, content)
    results["activation"] = validate_activation(file_path, content)
    results["independence"] = validate_independence(file_path, content)
    results["documentation"] = validate_documentation(file_path, content)

    return results


def print_results(file_path: Path, results: Dict[str, ValidationResult], verbose: bool = False):
    """Print validation results."""
    print(f"\n{'=' * 80}")
    print(f"Validating: {file_path}")
    print(f"{'=' * 80}\n")

    for category, result in results.items():
        print(f"{result.status} {result.category} Validation")

        if verbose or result.has_issues:
            if result.errors:
                for error in result.errors:
                    print(f"  ❌ {error}")

            if result.warnings:
                for warning in result.warnings:
                    print(f"  ⚠️  {warning}")

            if verbose and result.passed:
                for passed in result.passed:
                    print(f"  ✅ {passed}")

        print()


def get_overall_status(results: Dict[str, ValidationResult], strict: bool = False) -> str:
    """Determine overall validation status."""
    has_errors = any(r.errors for r in results.values())
    has_warnings = any(r.warnings for r in results.values())

    if has_errors or (strict and has_warnings):
        return "FAIL"
    elif has_warnings:
        return "PASS WITH WARNINGS"
    else:
        return "PASS"


def find_agent_files(directory: Path) -> List[Path]:
    """Find all .md agent files in directory recursively."""
    return list(directory.rglob("*.md"))


def main():
    """Main execution function."""
    args = parse_arguments()

    path = Path(args.path)

    if not path.exists():
        print(f"❌ Error: Path does not exist: {path}", file=sys.stderr)
        sys.exit(1)

    # Determine files to validate
    if path.is_file():
        files = [path]
    elif args.all:
        files = find_agent_files(path)
        if not files:
            print(f"❌ No .md files found in: {path}", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"❌ Error: {path} is a directory. Use --all to validate all agents", file=sys.stderr)
        sys.exit(1)

    print(f"🔍 Validating {len(files)} agent file(s)...\n")

    # Parse required fields
    required_fields = [field.strip() for field in args.required_fields.split(",") if field.strip()]

    # Validate each file
    all_passed = True
    for file_path in files:
        results = validate_agent_file(file_path, args.verbose, required_fields)

        if results:
            print_results(file_path, results, args.verbose)

            status = get_overall_status(results, args.strict)
            if status == "FAIL":
                all_passed = False

    # Print summary
    print(f"\n{'=' * 80}")
    print("VALIDATION SUMMARY")
    print(f"{'=' * 80}\n")

    if all_passed:
        print("✅ All agent files passed validation")
        sys.exit(0)
    else:
        print("❌ Some agent files failed validation")
        sys.exit(1)


if __name__ == "__main__":
    main()
