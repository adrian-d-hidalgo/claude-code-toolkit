#!/usr/bin/env python3
"""
Validate Claude Code slash command structure and compliance.

Source of truth for the rules enforced here:
  plugins/claude-code-core/skills/claude-code-slash-command/references/section-guide.md
  plugins/claude-code-core/skills/claude-code-slash-command/references/anti-patterns.md

Usage:
    python3 validate_command.py /path/to/command.md
    python3 validate_command.py /path/to/commands/ --all
    python3 validate_command.py --help
"""

import argparse
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


class ValidationResult:
    """Store validation results for one category."""

    def __init__(self, category: str):
        self.category = category
        self.passed: List[str] = []
        self.warnings: List[str] = []
        self.errors: List[str] = []

    def add_pass(self, message: str) -> None:
        self.passed.append(message)

    def add_warning(self, message: str) -> None:
        self.warnings.append(message)

    def add_error(self, message: str) -> None:
        self.errors.append(message)

    @property
    def status(self) -> str:
        if self.errors:
            return "❌ FAIL"
        if self.warnings:
            return "⚠️  WARNINGS"
        return "✅ PASS"

    @property
    def has_issues(self) -> bool:
        return bool(self.errors or self.warnings)


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Validate Claude Code slash command structure and compliance",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python3 validate_command.py .claude/commands/spec.md
  python3 validate_command.py .claude/commands/ --all
  python3 validate_command.py command.md --verbose
  python3 validate_command.py command.md --strict
  python3 validate_command.py command.md --required-fields description,allowed-tools
        """,
    )
    parser.add_argument("path", help="Path to command file or directory")
    parser.add_argument("--all", action="store_true", help="Validate all .md files recursively")
    parser.add_argument("--verbose", action="store_true", help="Show passed checks too")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as errors")
    parser.add_argument(
        "--required-fields",
        default="description",
        help="Comma-separated list of required frontmatter fields (default: description). "
             "All other fields are optional per section-guide.md.",
    )
    return parser.parse_args()


def extract_frontmatter(content: str) -> Tuple[Optional[Dict], str]:
    """Extract YAML frontmatter from markdown content."""
    pattern = r"^---\s*\n(.*?)\n---\s*\n(.*)$"
    match = re.match(pattern, content, re.DOTALL)
    if not match:
        return None, content

    frontmatter_str = match.group(1)
    body = match.group(2)

    if HAS_YAML:
        try:
            parsed = yaml.safe_load(frontmatter_str)
            if isinstance(parsed, dict):
                return parsed, body
            return None, content
        except yaml.YAMLError:
            return None, content

    # Fallback: minimal parser, only handles scalar key: value.
    frontmatter: Dict = {}
    for line in frontmatter_str.strip().split("\n"):
        if ":" in line and not line.startswith(" "):
            key, value = line.split(":", 1)
            frontmatter[key.strip()] = value.strip()
    return frontmatter if frontmatter else None, body


def _normalize_allowed_tools(raw) -> Optional[List[str]]:
    """`allowed-tools` accepts both list and comma-separated string forms.
    Return a normalized list or None when the shape is unrecognized."""
    if raw is None:
        return None
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    if isinstance(raw, str):
        return [item.strip() for item in raw.split(",") if item.strip()]
    return None


def validate_structure(file_path: Path, content: str, required_fields: List[str]) -> ValidationResult:
    """Structure + frontmatter checks. Rules trace to section-guide.md Part A."""
    result = ValidationResult("Structure")

    if not file_path.name.endswith(".md"):
        result.add_error(f"File must have .md extension: {file_path.name}")
    else:
        result.add_pass("File has .md extension")

    name_without_ext = file_path.stem
    if re.match(r"^[a-z0-9]+(-[a-z0-9]+)*$", name_without_ext):
        result.add_pass("File name follows kebab-case convention")
    else:
        result.add_error(f"File name must be kebab-case: {name_without_ext}")

    frontmatter, body = extract_frontmatter(content)
    if not frontmatter:
        result.add_error("Missing or invalid YAML frontmatter")
        return result
    result.add_pass("Valid YAML frontmatter present")

    for field in required_fields:
        if field in frontmatter:
            result.add_pass(f"Required field present: {field}")
        else:
            result.add_error(f"Missing required field: {field}")

    if "description" in frontmatter and isinstance(frontmatter["description"], str):
        desc = frontmatter["description"].strip()
        word_count = len(desc.split())
        if word_count > 20:
            result.add_warning(
                f"Description too long ({word_count} words; section-guide §description recommends <20)"
            )
        if word_count == 0:
            result.add_error("Description is empty")
        trigger_patterns = re.compile(r"\b(use when|fire when|trigger|invoke when)\b", re.IGNORECASE)
        if trigger_patterns.search(desc):
            result.add_warning(
                "Description reads like a routing trigger; the slash IS the trigger (anti-patterns.md)"
            )

    if "model" in frontmatter:
        valid_models = ["sonnet", "opus", "haiku", "inherit"]
        model = frontmatter["model"]
        if isinstance(model, str) and (model in valid_models or "-" in model):
            result.add_pass(f"Valid model: {model}")
        else:
            result.add_error(
                f"Invalid model: {model}. Use one of {valid_models} or a full model id."
            )

    if "argument-hint" in frontmatter and isinstance(frontmatter["argument-hint"], str):
        hint = frontmatter["argument-hint"].strip()
        if hint and not (hint.startswith("[") or hint.startswith("<")):
            result.add_warning(
                f"argument-hint should use [bracketed] or <angle> placeholders; got: {hint!r}"
            )

    lines = content.count("\n")
    if lines > 400:
        result.add_warning(
            f"Command body is long ({lines} lines); consider migrating to a skill with references/ "
            "(see command-vs-skill.md)"
        )
    else:
        result.add_pass(f"File size reasonable ({lines} lines)")

    if body:
        headers = re.findall(r"^(#{2,}) (.+)$", body, re.MULTILINE)
        if headers:
            result.add_pass(f"Found {len(headers)} section headers")
        else:
            result.add_warning("No section headers in command body")

    return result


def validate_security(file_path: Path, content: str) -> ValidationResult:
    """Security checks. Rules trace to anti-patterns.md (Untrusted argument, Over-broad allowed-tools)."""
    result = ValidationResult("Security")

    frontmatter, body = extract_frontmatter(content)
    if not frontmatter:
        result.add_warning("Cannot validate security: no frontmatter")
        return result

    if "allowed-tools" not in frontmatter:
        result.add_warning(
            "No allowed-tools declared; command will prompt the user for every tool use"
        )
        return result

    tools = _normalize_allowed_tools(frontmatter["allowed-tools"])
    if tools is None:
        result.add_error("allowed-tools must be a list or comma-separated string")
        return result

    # Unrestricted Bash: literal 'Bash' OR 'Bash(*)'.
    if "Bash" in tools:
        result.add_error("Unrestricted Bash access — replace with Bash(<command> *) patterns")
    for tool in tools:
        if tool == "Bash(*)":
            result.add_error(f"Unrestricted Bash pattern: {tool}")
        elif tool.startswith("Bash("):
            result.add_pass(f"Restricted Bash tool: {tool}")

    write_tools = [t for t in tools if t in {"Write", "Edit", "MultiEdit"}]
    if write_tools:
        result.add_pass(f"File-modification tools present: {', '.join(write_tools)}")

    if set(tools) <= {"Read", "Grep", "Glob"}:
        result.add_pass("Read-only tool configuration")

    if body:
        # Shell injection vector: !`...$ARGUMENTS...` per section-guide §F.2.
        injection_pattern = re.compile(r"!`[^`]*\$ARGUMENTS[^`]*`")
        if injection_pattern.search(body):
            result.add_warning(
                "Body uses $ARGUMENTS inside a `!` shell injection — "
                "validate or quote per section-guide §F.2"
            )

    return result


def validate_substitutions(file_path: Path, content: str) -> ValidationResult:
    """Body substitution sanity. Rules trace to section-guide.md Part B + anti-patterns 'Orphan $N'."""
    result = ValidationResult("Substitutions")

    frontmatter, body = extract_frontmatter(content)
    if not body:
        result.add_warning("No body to inspect")
        return result

    has_dollar_n = bool(re.search(r"\$\d+", body))
    if has_dollar_n:
        result.add_warning(
            "Body uses $0/$1/... — per section-guide.md, $N is documented but currently not "
            "implemented (issue #16163). Parse $ARGUMENTS or declare named arguments."
        )

    if "$ARGUMENTS" in body:
        result.add_pass("Uses $ARGUMENTS substitution")
        if frontmatter and "argument-hint" not in frontmatter:
            result.add_warning(
                "Body uses $ARGUMENTS but frontmatter has no argument-hint"
            )

    # Named substitutions: requires `arguments:` frontmatter list.
    named_subs = set(re.findall(r"\$([a-z_][a-z0-9_]*)", body))
    named_subs.discard("ARGUMENTS")
    if named_subs and frontmatter and "arguments" not in frontmatter:
        result.add_warning(
            f"Body references named substitutions ({sorted(named_subs)[:3]}) but no `arguments:` "
            "list declared in frontmatter"
        )

    return result


def validate_paths(file_path: Path, content: str) -> ValidationResult:
    """Hardcoded absolute paths leak across users / installs."""
    result = ValidationResult("Paths")

    _, body = extract_frontmatter(content)
    if not body:
        result.add_pass("No body to inspect")
        return result

    absolute_paths = re.findall(r"(?<![\$\w/])/(?:Users|home)/[^\s`'\"]+", body)
    # Filter out paths inside markdown link targets that point to repo files.
    suspect = [p for p in absolute_paths if "/.claude" in p or "/plugins/" in p]
    if suspect:
        sample = ", ".join(suspect[:3])
        result.add_warning(
            f"Hardcoded absolute paths detected (e.g. {sample}). "
            "Use ${CLAUDE_SKILL_DIR} or ${CLAUDE_PLUGIN_ROOT} per anti-patterns.md."
        )
    else:
        result.add_pass("No suspicious absolute paths")

    return result


def validate_command_file(file_path: Path, verbose: bool, required_fields: List[str]) -> Dict[str, ValidationResult]:
    """Run all validators against one command file."""
    results: Dict[str, ValidationResult] = {}
    try:
        with open(file_path, "r", encoding="utf-8") as fh:
            content = fh.read()
    except OSError as err:
        print(f"❌ Error reading {file_path}: {err}", file=sys.stderr)
        return results

    results["structure"] = validate_structure(file_path, content, required_fields)
    results["security"] = validate_security(file_path, content)
    results["substitutions"] = validate_substitutions(file_path, content)
    results["paths"] = validate_paths(file_path, content)
    return results


def print_results(file_path: Path, results: Dict[str, ValidationResult], verbose: bool) -> None:
    print(f"\n{'=' * 80}")
    print(f"Validating: {file_path}")
    print(f"{'=' * 80}\n")

    for result in results.values():
        print(f"{result.status} {result.category}")
        if verbose or result.has_issues:
            for error in result.errors:
                print(f"  ❌ {error}")
            for warning in result.warnings:
                print(f"  ⚠️  {warning}")
            if verbose:
                for passed in result.passed:
                    print(f"  ✅ {passed}")
        print()


def overall_status(results: Dict[str, ValidationResult], strict: bool) -> str:
    has_errors = any(r.errors for r in results.values())
    has_warnings = any(r.warnings for r in results.values())
    if has_errors or (strict and has_warnings):
        return "FAIL"
    if has_warnings:
        return "PASS WITH WARNINGS"
    return "PASS"


def find_command_files(directory: Path) -> List[Path]:
    return sorted(directory.rglob("*.md"))


def main() -> None:
    args = parse_arguments()
    path = Path(args.path)
    if not path.exists():
        print(f"❌ Path does not exist: {path}", file=sys.stderr)
        sys.exit(1)

    if path.is_file():
        files = [path]
    elif args.all:
        files = find_command_files(path)
        if not files:
            print(f"❌ No .md files found in: {path}", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"❌ {path} is a directory; pass --all to scan recursively", file=sys.stderr)
        sys.exit(1)

    required_fields = [f.strip() for f in args.required_fields.split(",") if f.strip()]

    print(f"🔍 Validating {len(files)} command file(s)...\n")

    all_passed = True
    for file_path in files:
        results = validate_command_file(file_path, args.verbose, required_fields)
        if not results:
            all_passed = False
            continue
        print_results(file_path, results, args.verbose)
        if overall_status(results, args.strict) == "FAIL":
            all_passed = False

    print(f"\n{'=' * 80}")
    print("VALIDATION SUMMARY")
    print(f"{'=' * 80}\n")
    if all_passed:
        print("✅ All command files passed validation")
        sys.exit(0)
    print("❌ Some command files failed validation")
    sys.exit(1)


if __name__ == "__main__":
    main()
