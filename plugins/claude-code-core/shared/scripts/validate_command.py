#!/usr/bin/env python3
"""
Validate Claude Code command structure, security, and compliance.

Usage:
    python scripts/validate_command.py /path/to/command.md
    python scripts/validate_command.py /path/to/commands/ --all
    python scripts/validate_command.py --help
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
        description="Validate Claude Code command structure and compliance",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Validate single command
  python scripts/validate_command.py .claude/commands/development/setup-testing.md

  # Validate all commands in directory
  python scripts/validate_command.py .claude/commands/ --all

  # Validate with detailed output
  python scripts/validate_command.py command.md --verbose

  # Custom required fields (for older commands)
  python scripts/validate_command.py command.md --required-fields description,allowed-tools

  # Strict mode (warnings as errors)
  python scripts/validate_command.py command.md --strict
        """,
    )

    parser.add_argument(
        "path",
        help="Path to command file or directory",
    )

    parser.add_argument(
        "--all",
        action="store_true",
        help="Validate all commands in directory (recursive)",
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
        default="description,allowed-tools,argument-hint,model",
        help="Comma-separated list of required frontmatter fields (default: description,allowed-tools,argument-hint,model)",
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
                # Handle lists
                if value.startswith('[') and value.endswith(']'):
                    frontmatter[key] = [v.strip() for v in value[1:-1].split(',')]
                # Handle multi-line strings
                elif value.startswith('>'):
                    continue  # Skip for simple parser
                else:
                    frontmatter[key] = value
        return frontmatter if frontmatter else None, body


def validate_structure(file_path: Path, content: str, required_fields: List[str] = None) -> ValidationResult:
    """Validate command structure."""
    result = ValidationResult("Structure")

    # Default required fields if not specified
    if required_fields is None:
        required_fields = ["description", "allowed-tools", "argument-hint", "model"]

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
        if len(desc) > 200:
            result.add_warning(f"Description too long ({len(desc)} chars, max 200)")
        if len(desc) < 20:
            result.add_warning(f"Description too short ({len(desc)} chars, min 20)")

    # Validate model
    if "model" in frontmatter:
        valid_models = ["sonnet", "opus", "haiku"]
        if frontmatter["model"] in valid_models:
            result.add_pass(f"Valid model: {frontmatter['model']}")
        else:
            result.add_error(f"Invalid model: {frontmatter['model']}, must be one of {valid_models}")

    # Check file size
    lines = content.count("\n")
    if lines > 1000:
        result.add_warning(f"Command file is very long ({lines} lines). Consider moving content to references/")
    else:
        result.add_pass(f"File size reasonable ({lines} lines)")

    # Check markdown structure
    if body:
        headers = re.findall(r"^(#{2,}) (.+)$", body, re.MULTILINE)
        if headers:
            result.add_pass(f"Found {len(headers)} section headers")
        else:
            result.add_warning("No section headers found in command body")

    return result


def validate_security(file_path: Path, content: str) -> ValidationResult:
    """Validate security configuration."""
    result = ValidationResult("Security")

    frontmatter, body = extract_frontmatter(content)

    if not frontmatter or "allowed-tools" not in frontmatter:
        result.add_error("Cannot validate security: missing allowed-tools")
        return result

    allowed_tools = frontmatter["allowed-tools"]

    # Check if allowed-tools is a list
    if not isinstance(allowed_tools, list):
        result.add_error("allowed-tools must be a list")
        return result

    # Check for dangerous patterns
    if "Bash" in allowed_tools:
        result.add_error("CRITICAL: Unrestricted Bash access detected! Use Bash(command *) instead")

    # Check for Bash restrictions
    bash_tools = [tool for tool in allowed_tools if tool.startswith("Bash(")]
    if bash_tools:
        for tool in bash_tools:
            if tool == "Bash(*)":
                result.add_error(f"Unrestricted Bash pattern: {tool}")
            else:
                result.add_pass(f"Restricted Bash command: {tool}")
    elif any("Bash" in str(tool) for tool in allowed_tools):
        result.add_warning("Bash tool may not be properly restricted")

    # Check for write operations
    write_tools = [tool for tool in allowed_tools if tool in ["Write", "Edit", "MultiEdit"]]
    if write_tools:
        result.add_pass(f"File modification tools: {', '.join(write_tools)}")

        # Check if context detection is present when Write is used
        if "Write" in write_tools and "Context Detection Implementation" not in body:
            result.add_warning("Write tool present but no Context Detection Implementation section found")

    # Check for read-only pattern
    readonly_tools = {"Read", "Grep", "Glob"}
    if set(allowed_tools) <= readonly_tools:
        result.add_pass("Read-only tool configuration detected")

    # Validate input validation presence
    validation_keywords = ["validate", "validation", "check", "verify", "sanitize"]
    has_validation = any(keyword in body.lower() for keyword in validation_keywords)

    if has_validation:
        result.add_pass("Input validation keywords found in command")
    else:
        result.add_warning("No explicit input validation found in command")

    return result


def validate_context_detection(file_path: Path, content: str) -> ValidationResult:
    """Validate context detection implementation."""
    result = ValidationResult("Context Detection")

    frontmatter, body = extract_frontmatter(content)

    # Only validate if command has Write capability
    if not frontmatter or "allowed-tools" not in frontmatter:
        result.add_pass("N/A - No frontmatter")
        return result

    allowed_tools = frontmatter.get("allowed-tools", [])
    has_write = "Write" in allowed_tools or any("write" in str(tool).lower() for tool in allowed_tools)

    if not has_write:
        result.add_pass("N/A - Command doesn't create files")
        return result

    # Check for context detection section
    if "Context Detection Implementation" in body:
        result.add_pass("Context Detection Implementation section present")
    else:
        result.add_error("Missing Context Detection Implementation section (required for commands that create files)")
        return result

    # Check for required context detection elements
    required_patterns = [
        (r"Glob\([\"'].*\.claude", "Glob check for .claude/ directory"),
        (r"mkdir|directory structure", "Directory structure creation"),
        (r"[Nn]ever create files in root", "Root directory protection"),
        (r"feedback|Provide.*location", "User feedback about file location"),
    ]

    for pattern, description in required_patterns:
        if re.search(pattern, body, re.IGNORECASE):
            result.add_pass(f"Found: {description}")
        else:
            result.add_warning(f"Missing: {description}")

    return result


def validate_independence(file_path: Path, content: str) -> ValidationResult:
    """Validate command independence."""
    result = ValidationResult("Independence")

    # Check for circular dependencies
    command_calls = re.findall(r"/([a-z-]+)", content)
    if command_calls:
        result.add_warning(f"Command calls other commands: {', '.join(set(command_calls)[:5])}")
    else:
        result.add_pass("No external command dependencies detected")

    # Check for error handling
    error_keywords = ["error", "fail", "rollback", "recovery", "fallback"]
    has_error_handling = any(keyword in content.lower() for keyword in error_keywords)

    if has_error_handling:
        result.add_pass("Error handling keywords found")
    else:
        result.add_warning("No explicit error handling found")

    # Check for graceful degradation
    if "graceful" in content.lower() or "fallback" in content.lower():
        result.add_pass("Graceful degradation mentioned")

    return result


def validate_documentation(file_path: Path, content: str) -> ValidationResult:
    """Validate documentation quality."""
    result = ValidationResult("Documentation")

    frontmatter, body = extract_frontmatter(content)

    if not body:
        result.add_error("Command has no body content")
        return result

    # Check for examples
    if "example" in body.lower():
        result.add_pass("Usage examples present")
    else:
        result.add_warning("No usage examples found")

    # Check for parameter documentation
    if "parameter" in body.lower() or "argument" in body.lower():
        result.add_pass("Parameter documentation present")
    else:
        result.add_warning("No parameter documentation found")

    # Check for clear sections
    common_sections = ["prerequisite", "implementation", "validation", "error"]
    found_sections = [s for s in common_sections if s in body.lower()]

    if len(found_sections) >= 3:
        result.add_pass(f"Good section organization ({len(found_sections)} common sections)")
    else:
        result.add_warning("Limited section organization")

    return result


def validate_command_file(file_path: Path, verbose: bool = False, required_fields: List[str] = None) -> Dict[str, ValidationResult]:
    """Validate a single command file."""
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
    results["context"] = validate_context_detection(file_path, content)
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


def find_command_files(directory: Path) -> List[Path]:
    """Find all .md command files in directory recursively."""
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
        files = find_command_files(path)
        if not files:
            print(f"❌ No .md files found in: {path}", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"❌ Error: {path} is a directory. Use --all to validate all commands", file=sys.stderr)
        sys.exit(1)

    print(f"🔍 Validating {len(files)} command file(s)...\n")

    # Parse required fields
    required_fields = [field.strip() for field in args.required_fields.split(",") if field.strip()]

    # Validate each file
    all_passed = True
    for file_path in files:
        results = validate_command_file(file_path, args.verbose, required_fields)

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
        print("✅ All command files passed validation")
        sys.exit(0)
    else:
        print("❌ Some command files failed validation")
        sys.exit(1)


if __name__ == "__main__":
    main()
