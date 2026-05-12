#!/usr/bin/env python3
"""
Validate a Claude Code plugin manifest (.claude-plugin/plugin.json) and,
when present, the marketplace manifest (.claude-plugin/marketplace.json).

Usage:
    python3 validate_plugin.py <plugin-root>
    python3 validate_plugin.py <plugin-root> --marketplace <marketplace-root>
    python3 validate_plugin.py --help

Exit codes:
    0 - pass (no errors, no warnings).
    1 - warnings only.
    2 - errors present.
"""

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+(?:-[\w.-]+)?(?:\+[\w.-]+)?$")
KEBAB_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
MARKETPLACE_SCHEMA = "https://json.schemastore.org/claude-code-marketplace.json"
PLUGIN_SCHEMA_ALLOWED_KEYS = {
    "$schema",
    "name",
    "version",
    "description",
    "author",
    "homepage",
    "repository",
    "license",
    "keywords",
    "skills",
    "commands",
    "agents",
    "hooks",
    "mcpServers",
    "outputStyles",
    "lspServers",
    "channels",
    "experimental",
    "dependencies",
}
MARKETPLACE_SCHEMA_ALLOWED_KEYS = {
    "$schema",
    "name",
    "description",
    "owner",
    "version",
    "plugins",
}
MARKETPLACE_PLUGIN_ENTRY_ALLOWED_KEYS = {
    "name",
    "description",
    "source",
    "category",
    "tags",
    "strict",
}


@dataclass
class Report:
    target: str
    passes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, msg: str) -> None:
        self.passes.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    def err(self, msg: str) -> None:
        self.errors.append(msg)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Validate plugin.json and marketplace.json for a Claude Code plugin.",
    )
    p.add_argument("plugin_root", help="Path to plugin root (contains .claude-plugin/plugin.json).")
    p.add_argument(
        "--marketplace",
        dest="marketplace_root",
        default=None,
        help="Optional path to a marketplace root (contains .claude-plugin/marketplace.json).",
    )
    p.add_argument("--strict", action="store_true", help="Treat warnings as errors.")
    return p.parse_args()


def load_json(path: Path) -> tuple[Any, str | None]:
    try:
        return json.loads(path.read_text(encoding="utf-8")), None
    except FileNotFoundError:
        return None, f"file not found: {path}"
    except json.JSONDecodeError as e:
        return None, f"invalid JSON at {path}: {e}"


def validate_plugin_json(plugin_root: Path) -> Report:
    rpt = Report(target=str(plugin_root))
    manifest_path = plugin_root / ".claude-plugin" / "plugin.json"
    data, err = load_json(manifest_path)
    if err:
        rpt.err(err)
        return rpt
    rpt.ok(f"loaded {manifest_path}")

    if not isinstance(data, dict):
        rpt.err("plugin.json root must be an object")
        return rpt

    # required: name
    name = data.get("name")
    if not name:
        rpt.err("missing required field: name")
    elif not isinstance(name, str) or not KEBAB_RE.match(name):
        rpt.err(f"name must be kebab-case (lowercase, digits, hyphens): got {name!r}")
    elif len(name) > 64:
        rpt.err(f"name must be ≤64 chars (got {len(name)})")
    else:
        rpt.ok(f"name is valid: {name}")

    # version (optional but strongly recommended)
    version = data.get("version")
    if version is None:
        rpt.warn("version is not set; semver is strongly recommended")
    elif not isinstance(version, str) or not SEMVER_RE.match(version):
        rpt.err(f"version must be semver (MAJOR.MINOR.PATCH[-pre][+build]): got {version!r}")
    else:
        rpt.ok(f"version is valid semver: {version}")

    # description
    description = data.get("description")
    if description is None:
        rpt.warn("description is not set; recommended for marketplace discoverability")
    elif not isinstance(description, str):
        rpt.err("description must be a string")
    elif len(description) > 1024:
        rpt.warn(f"description is long ({len(description)} chars); aim for ≤2 sentences")
    else:
        rpt.ok("description present")

    # author
    author = data.get("author")
    if author is not None and not isinstance(author, dict):
        rpt.err("author must be an object with name (and optional email, url)")
    elif isinstance(author, dict) and "name" not in author:
        rpt.warn("author object should include a name field")

    # repository must be a string URL, not an object
    repo = data.get("repository")
    if repo is not None and not isinstance(repo, str):
        rpt.err("repository must be a string URL (not an object)")

    # hooks/hooks.json auto-load pitfall
    hooks_dir = plugin_root / "hooks"
    auto_hooks = hooks_dir / "hooks.json"
    declared_hooks = data.get("hooks")
    if auto_hooks.exists() and isinstance(declared_hooks, list):
        for entry in declared_hooks:
            if isinstance(entry, str) and entry.replace("\\", "/").endswith("hooks/hooks.json"):
                rpt.err(
                    "hooks/hooks.json is auto-loaded by Claude Code 2.1+; "
                    "remove its explicit declaration in plugin.json to avoid a duplicate-detection error"
                )
                break

    # unknown keys
    for key in data:
        if key not in PLUGIN_SCHEMA_ALLOWED_KEYS:
            rpt.warn(f"unknown plugin.json key: {key!r}")

    # components at plugin root, not under .claude-plugin/
    for component in ("skills", "agents", "commands", "hooks"):
        nested = plugin_root / ".claude-plugin" / component
        if nested.exists():
            rpt.err(
                f"components must live at plugin root, not inside .claude-plugin/{component} "
                f"(found {nested}); move to {plugin_root / component}"
            )

    return rpt


def validate_marketplace_json(
    marketplace_root: Path,
    current_plugin_name: str | None = None,
) -> Report:
    """Validate a marketplace.json. If current_plugin_name is given, also confirm the
    plugin appears as one of the marketplace entries.
    """
    rpt = Report(target=str(marketplace_root))
    manifest_path = marketplace_root / ".claude-plugin" / "marketplace.json"
    data, err = load_json(manifest_path)
    if err:
        rpt.err(err)
        return rpt
    rpt.ok(f"loaded {manifest_path}")

    if not isinstance(data, dict):
        rpt.err("marketplace.json root must be an object")
        return rpt

    # $schema check
    schema = data.get("$schema")
    if schema is None:
        rpt.warn("$schema is not set; recommended for IDE validation")
    elif schema != MARKETPLACE_SCHEMA:
        if "anthropic.com" in schema:
            rpt.err(
                f"$schema points at {schema!r}; the anthropic.com schema URL does not exist. "
                f"Use {MARKETPLACE_SCHEMA}"
            )
        else:
            rpt.warn(f"$schema is non-canonical: {schema!r}; prefer {MARKETPLACE_SCHEMA}")
    else:
        rpt.ok("$schema is canonical")

    # name
    name = data.get("name")
    if not isinstance(name, str) or not name:
        rpt.err("marketplace name is required (kebab-case string)")
    elif not KEBAB_RE.match(name):
        rpt.warn(f"marketplace name should be kebab-case: got {name!r}")
    else:
        rpt.ok(f"marketplace name: {name}")

    # owner
    owner = data.get("owner")
    if not isinstance(owner, dict) or "name" not in owner:
        rpt.err("owner must be an object containing at least 'name'")

    # plugins[]
    plugins = data.get("plugins")
    if not isinstance(plugins, list) or not plugins:
        rpt.err("plugins must be a non-empty array")
    else:
        seen_names: set[str] = set()
        for i, entry in enumerate(plugins):
            prefix = f"plugins[{i}]"
            if not isinstance(entry, dict):
                rpt.err(f"{prefix} must be an object")
                continue
            entry_name = entry.get("name")
            if not isinstance(entry_name, str) or not entry_name:
                rpt.err(f"{prefix}.name is required")
            elif not KEBAB_RE.match(entry_name):
                rpt.err(f"{prefix}.name must be kebab-case: got {entry_name!r}")
            elif entry_name in seen_names:
                rpt.err(f"{prefix}.name duplicates earlier entry: {entry_name!r}")
            else:
                seen_names.add(entry_name)
            for key in entry:
                if key not in MARKETPLACE_PLUGIN_ENTRY_ALLOWED_KEYS:
                    rpt.warn(f"{prefix} unknown key: {key!r}")
            source = entry.get("source")
            if source is None:
                rpt.warn(f"{prefix}.source is not set; recommended")
            elif not isinstance(source, str):
                rpt.err(f"{prefix}.source must be a string")
            else:
                # If source is a relative path, check it resolves inside the marketplace root.
                if source.startswith("./") or source.startswith("../"):
                    target = (marketplace_root / source).resolve()
                    if not target.exists():
                        rpt.err(f"{prefix}.source path does not exist: {target}")

    # unknown top-level keys
    for key in data:
        if key not in MARKETPLACE_SCHEMA_ALLOWED_KEYS:
            rpt.warn(f"unknown marketplace.json key: {key!r}")

    # current plugin must be listed in the marketplace
    if current_plugin_name and isinstance(plugins, list):
        listed = {p.get("name") for p in plugins if isinstance(p, dict)}
        if current_plugin_name not in listed:
            rpt.err(
                f"plugin {current_plugin_name!r} is not listed in marketplace.plugins; "
                f"add an entry or remove the --marketplace argument"
            )
        else:
            rpt.ok(f"plugin {current_plugin_name!r} is listed in marketplace.plugins")

    return rpt


def print_report(rpt: Report) -> None:
    print(f"\n=== {rpt.target} ===")
    for msg in rpt.passes:
        print(f"  ok   {msg}")
    for msg in rpt.warnings:
        print(f"  warn {msg}")
    for msg in rpt.errors:
        print(f"  err  {msg}")


def main() -> int:
    args = parse_args()
    plugin_root = Path(args.plugin_root).resolve()
    if not plugin_root.is_dir():
        print(f"plugin root not found: {plugin_root}", file=sys.stderr)
        return 2

    rpt_plugin = validate_plugin_json(plugin_root)
    print_report(rpt_plugin)

    rpt_marketplace = None
    if args.marketplace_root:
        marketplace_root = Path(args.marketplace_root).resolve()
        if marketplace_root.is_dir():
            rpt_marketplace = validate_marketplace_json(marketplace_root, current_plugin_name=plugin_root.name)
            print_report(rpt_marketplace)
        else:
            print(f"marketplace root not found: {marketplace_root}", file=sys.stderr)
            return 2

    has_errors = bool(rpt_plugin.errors) or (rpt_marketplace and bool(rpt_marketplace.errors))
    has_warnings = bool(rpt_plugin.warnings) or (rpt_marketplace and bool(rpt_marketplace.warnings))
    if has_errors or (args.strict and has_warnings):
        return 2
    if has_warnings:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
