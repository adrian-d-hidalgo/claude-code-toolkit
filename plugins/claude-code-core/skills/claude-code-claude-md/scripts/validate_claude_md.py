#!/usr/bin/env python3
"""
Lint a CLAUDE.md (or AGENTS.md) file against the conventions documented in
`references/section-guide.md`.

Usage:
    python3 validate_claude_md.py <path>
    python3 validate_claude_md.py <path> --strict
    python3 validate_claude_md.py --help

Exit codes:
    0 - pass (no errors, no warnings).
    1 - warnings only.
    2 - errors present (or --strict + any warnings).

Checks (severity-tagged per section-guide Part C + empirical literature):

ERRORS (block):
- README-like headings (About / Features / License / Installation / etc.).
- @import target does not exist.
- File exceeds 25 KB hard cap (silent truncation at session start).
- File exceeds 250 lines (well past the 200-line cap).

WARNINGS (advisory):
- Line count >200 (silent-truncation threshold).
- Word count outside 150–800 sweet spot (skipped for very small files; brevity-by-delegation excused).
- Architectural overview ("we chose X because…") — single most harmful per arxiv:2602.11988.
- File-tree map ("`src/X/` contains…") — "context file landmines" per Augment Code.
- Passive pointer ("see `docs/...`" without trigger) — 56% ignored per alexop.dev.
- Linter-redundant rules (indent, quotes, semicolons).
- Negation without positive alternative.
- Vague modifiers ("appropriate", "modern", "relevant").
- First-person voice (we/our/I) in operative sections.
- Marketing language.
- Long sections (>200 consecutive words = likely narrative).
- Stale path references (backtick-quoted paths that don't resolve).
- Missing `<!-- last-reviewed: YYYY-MM-DD -->` HTML comment at top.
- Always-Apply overloading (excessive top-level imperatives).
"""

import argparse
import re
import sys
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path


MAX_LINES_WARN = 200
MAX_LINES_ERR = 250
MAX_BYTES = 25 * 1024
MIN_WORDS = 150  # dense rule-only files often run 150–250; the 300 figure in Anthropic guidance assumes prose, not bullets/tables
MAX_WORDS = 800
LONG_SECTION_WORDS = 200
LAST_REVIEWED_MAX_AGE_DAYS = 90

LINTER_REDUNDANT_PATTERNS = [
    (re.compile(r"\b(2|4|tab)\s*-?\s*space[s]? indent", re.I), "indentation rule (formatter)"),
    (re.compile(r"\b(single|double)\s+quotes?\b", re.I), "quote style (formatter)"),
    (re.compile(r"\btrailing comma", re.I), "trailing comma (formatter)"),
    (re.compile(r"\bsemicolon[s]?\b", re.I), "semicolon rule (formatter)"),
    (re.compile(r"\bmax(imum)?\s+line\s+length", re.I), "max line length (formatter)"),
    (re.compile(r"\beslint\s*-\s*?", re.I), "ESLint rule (linter)"),
    (re.compile(r"\bprettier\b", re.I), "Prettier rule (formatter)"),
    (re.compile(r"\bbiome\b(?!\.json)", re.I), "Biome rule (formatter/linter)"),
]

README_HEADING_PATTERNS = [
    re.compile(r"^#+\s*(about|about this|introduction|overview|the project|why .* exists|features?)\b", re.I | re.M),
    re.compile(r"^#+\s*(license|contributing|changelog|history|acknowledg)", re.I | re.M),
    re.compile(r"^#+\s*(installation|getting started|usage|getting up and running)\b", re.I | re.M),
    re.compile(r"^#+\s*(api reference|module reference)\b", re.I | re.M),
    # Project-identity sections describing what the project IS (README content).
    re.compile(r"^#+\s*(project (overview|context|identity|description)|what (this|it) is)\b", re.I | re.M),
    re.compile(r"^#+\s*(documentation hierarchy|repository context)\b", re.I | re.M),
]

ARCHITECTURE_RATIONALE_PATTERNS = [
    re.compile(r"\b(we chose|we picked|we decided|the reason we|chosen for|opted for)\b", re.I),
    re.compile(r"\b(our (system|architecture|stack|approach|design))\b", re.I),
    re.compile(r"\b(event sourcing|microservices|cqrs).*because", re.I | re.DOTALL),
]

# File-tree maps come in two shapes:
#   (a) bullet list: "- `path/dir/` contains X"
#   (b) fenced code block with ≥3 lines like "  src/" / "  app/  -> X" — ASCII tree
FILE_TREE_MAP_BULLET = re.compile(r"^[-*]\s+`[\w./\-]+/`\s+(contains?|holds?|has|—|-)\s+\S+", re.M)
FENCED_BLOCK = re.compile(r"```[a-z]*\n(.*?)```", re.DOTALL)
# Inside a code block, a tree-style line: indented path with optional comment.
TREE_LINE_IN_BLOCK = re.compile(
    r"^[\s│├└─]*[\w@\-]+(?:[/\\]|\.[a-z]+)\S*(?:\s+[─-]>|\s+←|\s+#|\s+\(.+\)|$)",
    re.M,
)

MARKETING_PATTERNS = [
    re.compile(r"\b(empower|delight|seamless|cutting[- ]edge|enterprise[- ]grade|world[- ]class|best[- ]in[- ]class|next[- ]generation|robust|powerful|scalable solution)\b", re.I),
]

VAGUE_MODIFIERS = [
    re.compile(r"\b(appropriate|relevant|reasonable|good|proper|modern|recent|standard|best[- ]practice)\b\s+(\w+)", re.I),
]

FIRST_PERSON_OPERATIVE = [
    re.compile(r"\b(we|our|us)\b", re.I),
    re.compile(r"\bI\b"),
]

NEGATION_LEAD = re.compile(r"^\s*[-*\d.]*\s*(never|don't|do not|avoid|no)\b", re.I)
POSITIVE_ALTERNATIVE_TOKENS = re.compile(
    r"\b(instead|use|prefer|always|do|via|store|run|put|write|read|emit|return|"
    r"call|invoke|split|regenerate|only|via env|require|set|append|fail|raise|throw)\b",
    re.I,
)

PATH_LIKE = re.compile(r"`([\w./\-]+\.(?:md|json|toml|yaml|yml|py|ts|tsx|js|jsx|sh|env|hcl|rb|go|rs|java|kt))`")
IMPORT_LINE = re.compile(r"@([\w./\-]+\.md)\b")

# Passive pointer: line referencing a doc path without a "when X" trigger nearby.
PASSIVE_POINTER = re.compile(
    r"^\s*[-*]?\s*(?:see|reference[d]?|check|view)\s+`?([\w./\-]+\.(?:md|adoc))`?",
    re.I | re.M,
)
TRIGGER_LEAD = re.compile(r"^\s*#+\s*(when|before|after|if|on)\b", re.I | re.M)

# Last-reviewed comment
LAST_REVIEWED = re.compile(r"<!--\s*last[- ]reviewed:\s*(\d{4}-\d{2}-\d{2})\s*-->", re.I)


@dataclass
class Report:
    target: str
    passes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, m: str) -> None:
        self.passes.append(m)

    def warn(self, m: str) -> None:
        self.warnings.append(m)

    def err(self, m: str) -> None:
        self.errors.append(m)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Lint a CLAUDE.md or AGENTS.md file.")
    p.add_argument("path", help="Path to the CLAUDE.md or AGENTS.md file.")
    p.add_argument("--strict", action="store_true", help="Treat warnings as errors.")
    p.add_argument("--repo-root", default=None,
                   help="Repository root for path-existence checks (default: file's directory).")
    return p.parse_args()


def split_sections(content: str) -> list[tuple[str, str]]:
    parts: list[tuple[str, str]] = []
    current_heading = "(prefix)"
    current_body: list[str] = []
    for line in content.splitlines():
        m = re.match(r"^(#{1,3})\s+(.*?)\s*$", line)
        if m:
            parts.append((current_heading, "\n".join(current_body).strip()))
            current_heading = line.strip()
            current_body = []
        else:
            current_body.append(line)
    parts.append((current_heading, "\n".join(current_body).strip()))
    return [(h, b) for h, b in parts if h or b]


def strip_html_comments(content: str) -> str:
    return re.sub(r"<!--.*?-->", "", content, flags=re.DOTALL)


def path_resolves(ref: str, file_path: Path, repo_root: Path) -> bool:
    """Check if a referenced path resolves in either the file's plugin scope or the repo root."""
    if ref.startswith("/") or ref.startswith("~") or ref.startswith("http"):
        return True  # absolute / external — don't validate
    candidates = [
        repo_root / ref,
        file_path.parent / ref,
    ]
    # If file is inside a plugin, also try plugin-root-relative.
    parts = file_path.parts
    if "plugins" in parts:
        idx = parts.index("plugins")
        if idx + 1 < len(parts):
            plugin_root = Path(*parts[: idx + 2])
            candidates.append(plugin_root / ref)
    # Also try the immediate child plugins/* subdirs if path looks plugin-internal.
    for plugin_dir in (repo_root / "plugins").glob("*") if (repo_root / "plugins").is_dir() else []:
        candidates.append(plugin_dir / ref)
    return any(c.exists() for c in candidates)


def validate(content_raw: str, file_path: Path, repo_root: Path) -> Report:
    rpt = Report(target=str(file_path))
    content = strip_html_comments(content_raw)

    lines = content.splitlines()
    line_count = len(lines)
    byte_count = len(content_raw.encode("utf-8"))
    word_count = len(re.findall(r"\b\w+\b", content))

    # Last-reviewed
    m = LAST_REVIEWED.search(content_raw)
    if m:
        try:
            reviewed = date.fromisoformat(m.group(1))
            age = (date.today() - reviewed).days
            if age > LAST_REVIEWED_MAX_AGE_DAYS:
                rpt.warn(f"`last-reviewed: {m.group(1)}` is {age} days old; consider re-auditing the file")
            else:
                rpt.ok(f"`last-reviewed: {m.group(1)}` is fresh ({age} days)")
        except ValueError:
            rpt.warn(f"`last-reviewed` value is not ISO date (YYYY-MM-DD): {m.group(1)!r}")
    else:
        rpt.warn(
            "missing `<!-- last-reviewed: YYYY-MM-DD -->` HTML comment at the top of the file; "
            "enables drift detection at zero token cost"
        )

    # Structural
    if line_count > MAX_LINES_ERR:
        rpt.err(f"file is {line_count} lines; content past line {MAX_LINES_WARN} is silently truncated at session start")
    elif line_count > MAX_LINES_WARN:
        rpt.warn(f"file is {line_count} lines; the {MAX_LINES_WARN}-line cap is the silent-truncation threshold")
    else:
        rpt.ok(f"line count OK ({line_count})")

    if byte_count > MAX_BYTES:
        rpt.err(f"file is {byte_count} bytes; {MAX_BYTES}-byte cap truncates content")
    else:
        rpt.ok(f"size OK ({byte_count} bytes)")

    # Brevity by delegation is fine: a CLAUDE.md that forwards to AGENTS.md, .handbook/, or
    # a sibling doc isn't "thin", it's correctly minimal. Only warn when a short file lacks
    # any active pointer to richer instructions.
    delegates = bool(
        re.search(r"\bAGENTS\.md\b", content)
        or re.search(r"\.handbook/", content)
        or IMPORT_LINE.search(content)
        or re.search(r"`[\w./\-]+\.md`", content)
    )
    if word_count < MIN_WORDS and word_count > 50 and not delegates:
        rpt.warn(f"word count {word_count} is below the {MIN_WORDS} sweet-spot floor; may be too thin to guide behavior")
    elif word_count > MAX_WORDS:
        rpt.warn(f"word count {word_count} exceeds {MAX_WORDS}; rule-following quality degrades past this range")
    elif word_count >= MIN_WORDS:
        rpt.ok(f"word count in sweet spot ({word_count})")

    # README-style headings → error
    readme_hits = []
    for pat in README_HEADING_PATTERNS:
        for m in pat.finditer(content):
            readme_hits.append(m.group(0).strip())
    if readme_hits:
        rpt.err(
            f"README-style heading(s) detected ({readme_hits[:3]!r}{'…' if len(readme_hits) > 3 else ''}); "
            f"move that content to README.md"
        )

    # Architectural overview → ERROR at ≥2 hits (empirically the highest-cost anti-pattern per arxiv:2602.11988).
    arch_hits = sum(1 for pat in ARCHITECTURE_RATIONALE_PATTERNS for _ in pat.finditer(content))
    if arch_hits >= 2:
        rpt.err(
            f"{arch_hits} architectural-overview phrases detected; per arxiv:2602.11988 this is the "
            f"single largest source of degraded agent performance — move to docs/adr/ and replace with an active pointer"
        )

    # File-tree map → ERROR. Two detection shapes:
    #   (a) bullet form: "- `dir/` contains X" (≥2 lines)
    #   (b) fenced code block with ≥3 tree-style lines (path / arrow / description)
    file_tree_hit = False
    if len(FILE_TREE_MAP_BULLET.findall(content)) >= 2:
        file_tree_hit = True
        rpt.err(
            "file-tree map detected (bullet list describing what directories contain); "
            "the agent rediscovers structure as it works — file maps inflate cost and go stale ('context file landmines')"
        )
    if not file_tree_hit:
        for fence_match in FENCED_BLOCK.finditer(content):
            block = fence_match.group(1)
            # Only inspect blocks that look like file-tree (not shell commands).
            if "├" in block or "└" in block or block.strip().count("\n") >= 3:
                tree_lines = TREE_LINE_IN_BLOCK.findall(block)
                if len(tree_lines) >= 3 and not re.search(r"^(pnpm|npm|yarn|python|bash|make|claude|git|cargo|rustc|go)\s", block, re.M):
                    rpt.err(
                        "file-tree map detected inside a fenced code block (ASCII tree of paths); "
                        "the agent rediscovers structure as it works — delete and let exploration discover it"
                    )
                    break

    # Linter-redundant rules — match only against prose (strip fenced blocks + inline code).
    # Without stripping, hits like `# eslint --fix` (a command annotation) or
    # `prettier src/**/*.{ts,html}` (a command argument) trigger false positives.
    prose_only = FENCED_BLOCK.sub("", content)
    prose_only = re.sub(r"`[^`]+`", "", prose_only)
    # Also drop sentences whose explicit purpose is to disclaim restating linter rules.
    prose_only = re.sub(r"(?im)^.*don'?t restate.*$", "", prose_only)
    distinct_redundant = {label for pat, label in LINTER_REDUNDANT_PATTERNS if pat.search(prose_only)}
    if len(distinct_redundant) >= 3:
        rpt.err(
            f"linter/formatter-redundant rules across {len(distinct_redundant)} categories: {sorted(distinct_redundant)[:5]}; "
            f"delete and rely on the project's linter/formatter as the source of truth"
        )

    # Passive pointers → warning. A pointer is "passive" if the section heading
    # above it doesn't lead with a trigger word (When/Before/After/If/On).
    section_starts = [(m.start(), m.group(0)) for m in re.finditer(r"^#+\s+.*$", content, re.M)]
    for m in PASSIVE_POINTER.finditer(content):
        pos = m.start()
        # Find the nearest section heading before this match.
        prior = [(start, head) for start, head in section_starts if start < pos]
        if not prior:
            rpt.warn(
                f"passive pointer to {m.group(1)!r}; per alexop.dev ~56% ignore rate without trigger. "
                f"Add a `## When X` heading above with the trigger condition."
            )
            continue
        nearest_heading = prior[-1][1]
        if not TRIGGER_LEAD.match(nearest_heading):
            rpt.warn(
                f"passive pointer to {m.group(1)!r} under heading {nearest_heading.strip()!r}; "
                f"prefer a heading like `## When [trigger]` so the agent knows when to read"
            )

    # Linter-redundant rules — warn for 1–2 distinct categories (the ≥3 case errored above).
    if 0 < len(distinct_redundant) < 3:
        rpt.warn(
            f"linter/formatter-redundant rule(s): {sorted(distinct_redundant)}; "
            f"delete and rely on the project's linter as the source of truth"
        )

    # Negation without positive alternative — line-by-line, leading-negation only.
    # Skip security-context absolute prohibitions (secrets, credentials, destructive ops):
    # those are universal invariants without a meaningful alternative.
    SECURITY_CONTEXT = re.compile(
        r"\b(secret[s]?|credential[s]?|api[\s_-]?key[s]?|password[s]?|token[s]?|\.env|"
        r"force[\s-]push|--no-verify|--force|reset --hard|rm -rf|sudo|eval|chmod 777|"
        r"private[\s_-]?key[s]?|amend|published commit)\b",
        re.I,
    )
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if not stripped or stripped.lstrip().startswith("#"):
            continue
        if not NEGATION_LEAD.match(stripped):
            continue
        bullet_stripped = re.sub(r"^[-*]\s+|\d+\.\s+", "", stripped)
        if POSITIVE_ALTERNATIVE_TOKENS.search(bullet_stripped):
            continue
        if SECURITY_CONTEXT.search(bullet_stripped):
            continue
        look_ahead = lines[i] if i < len(lines) else ""
        if POSITIVE_ALTERNATIVE_TOKENS.search(look_ahead):
            continue
        rpt.warn(f"line {i}: prohibition without positive alternative — \"{bullet_stripped[:80]}\"")

    # Marketing language
    marketing_hits = []
    for pat in MARKETING_PATTERNS:
        for m in pat.finditer(content):
            marketing_hits.append(m.group(0))
    if marketing_hits:
        rpt.warn(
            f"marketing language detected ({marketing_hits[:3]}); "
            f"CLAUDE.md is for behavioral configuration, not promotion"
        )

    # Vague modifiers
    vague_hits: list[str] = []
    for pat in VAGUE_MODIFIERS:
        for m in pat.finditer(content):
            phrase = m.group(0)
            if not phrase.lower().startswith(("appropriate sized", "appropriate amount")):
                vague_hits.append(phrase)
    if len(vague_hits) >= 2:
        rpt.warn(
            f"vague modifier(s) without measurable criteria: {vague_hits[:5]!r}; "
            f"either make concrete or delete the line"
        )

    # First-person voice in operative sections
    first_person_hits = 0
    for line in lines:
        if line.lstrip().startswith("#"):
            continue
        for pat in FIRST_PERSON_OPERATIVE:
            if pat.search(line):
                first_person_hits += 1
                break
    if first_person_hits >= 3:
        rpt.warn(
            f"first-person voice in {first_person_hits} lines (\"we\", \"our\", \"I\"); "
            f"prefer imperative or third-person"
        )

    # Long sections
    for heading, body in split_sections(content):
        body_words = len(re.findall(r"\b\w+\b", body))
        if body_words > LONG_SECTION_WORDS:
            rpt.warn(
                f"section {heading!r} is {body_words} words; sections >{LONG_SECTION_WORDS} often signal narrative — "
                f"split into bullets, move to an `@import`-referenced file, or rewrite as an active pointer"
            )

    # @import target existence
    for m in IMPORT_LINE.finditer(content):
        target = m.group(1)
        if not path_resolves(target, file_path, repo_root):
            rpt.err(f"@import target does not exist: {target}")
        else:
            rpt.ok(f"@import OK: {target}")

    # Backtick path references (stale-detection)
    NAMING_EXAMPLE_NEAR = re.compile(
        r"(e\.?g\.?|for example|such as|like|naming|convention|PascalCase|camelCase|"
        r"snake_case|kebab[-_]?case|SCREAMING_SNAKE)",
        re.I,
    )
    for m in PATH_LIKE.finditer(content):
        ref = m.group(1)
        if ref.startswith("/") or ref.startswith("~"):
            continue
        window = content[max(0, m.start() - 60): m.end() + 20]
        if "TODO" in window:
            continue
        # Skip if the surrounding context flags this as a naming-style example
        # (e.g. "PascalCase (e.g. `GameScene.ts`)", a `kebab-case.ts` cell in a
        # naming-conventions table). These aren't path references — they teach a pattern.
        if NAMING_EXAMPLE_NEAR.search(window):
            continue
        if not path_resolves(ref, file_path, repo_root):
            rpt.warn(f"referenced path may be stale: `{ref}` (not found in repo)")

    return rpt


def print_report(rpt: Report) -> None:
    print(f"\n=== {rpt.target} ===")
    for m in rpt.passes:
        print(f"  ok   {m}")
    for m in rpt.warnings:
        print(f"  warn {m}")
    for m in rpt.errors:
        print(f"  err  {m}")


def main() -> int:
    args = parse_args()
    path = Path(args.path).expanduser().resolve()
    if not path.is_file():
        print(f"file not found: {path}", file=sys.stderr)
        return 2
    repo_root = Path(args.repo_root).expanduser().resolve() if args.repo_root else path.parent

    content = path.read_text(encoding="utf-8")
    rpt = validate(content, path, repo_root)
    print_report(rpt)

    if rpt.errors or (args.strict and rpt.warnings):
        return 2
    if rpt.warnings:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
