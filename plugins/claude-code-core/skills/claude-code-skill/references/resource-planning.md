# Resource Planning Guide

Deciding what goes in scripts/, references/, and assets/.

## Decision Framework

For each functionality example, analyze:

1. Is code repeatedly rewritten? → scripts/
2. Is documentation repeatedly referenced? → references/
3. Is template/asset repeatedly used in output? → assets/

## scripts/ (Executable Code)

### When to Create Scripts

Create script when:
- Same code rewritten for each task
- Deterministic operation needed (not AI generation)
- Complex logic better executed than described
- Token efficiency gained (execute without loading)

### When NOT to Create Scripts

Avoid scripts when:
- Operation varies significantly each time
- AI generation adds value (flexibility needed)
- Simple operation described in 1-2 lines
- Script maintenance cost exceeds benefit

### Script Examples

**Good candidates for scripts/**:

```markdown
# PDF rotation
- Always same algorithm
- Deterministic output
- Complex image processing
→ Create: scripts/rotate_pdf.py

# SQL query generation
- Varies by schema and requirements
- AI adds context understanding
→ Don't create script, use AI generation

# File validation
- Standard validation rules
- Deterministic checks
→ Create: scripts/validate_file.py

# Data analysis interpretation
- Requires contextual understanding
- AI provides insights
→ Don't create script, use AI analysis
```

### Script Structure

**Minimal script template**:

```python
#!/usr/bin/env python3
"""
Script description: What it does

Usage:
    python script.py --arg1 value1 --arg2 value2

Requirements:
    - package1==1.0.0
    - package2==2.0.0

Install:
    pip install -r requirements.txt
"""

import argparse
import sys

def main():
    parser = argparse.ArgumentParser(description="Script description")
    parser.add_argument('--arg1', required=True, help="Argument 1 description")
    parser.add_argument('--arg2', required=True, help="Argument 2 description")

    args = parser.parse_args()

    try:
        # Input validation
        validate_inputs(args)

        # Core logic
        result = process(args.arg1, args.arg2)

        # Output
        print(f"Success: {result}")
        return 0

    except ValueError as e:
        print(f"Validation error: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2

def validate_inputs(args):
    """Validate all inputs before processing"""
    # Validation logic
    pass

def process(arg1, arg2):
    """Core processing logic"""
    # Implementation
    pass

if __name__ == "__main__":
    sys.exit(main())
```

### Script Best Practices

**Must have**:
- Error handling (don't punt to Claude)
- Input validation
- Clear error messages
- Usage documentation
- Dependency documentation

**Avoid**:
- Hardcoded paths (use arguments)
- Assuming packages installed (document requirements)
- "Voodoo constants" (explain magic numbers)
- Shell injection vulnerabilities
- Punting errors to Claude

## references/ (Documentation)

### When to Create References

Create reference file when:
- Information repeatedly looked up
- Extensive documentation needed (>100 lines)
- Domain knowledge required
- Examples collection needed
- API documentation needed

### When NOT to Create References

Avoid references when:
- Information fits in SKILL.md (<50 lines)
- Rarely accessed
- Duplicates SKILL.md content
- External docs better (link instead)

### Reference Examples

**Good candidates for references/**:

```markdown
# Database schema documentation
- Complex relationships
- Referenced for every query
→ Create: references/schema.md

# API endpoint descriptions
- Dozens of endpoints
- Parameters and responses
→ Create: references/api-docs.md

# Code style guide (2 pages)
- Fits in SKILL.md
- Core to every task
→ Don't create reference, include in SKILL.md

# Company NDA template
- Legal document
- Referenced for contracts
→ Create: references/nda-template.md

# Single example
- Fits in SKILL.md
- Only one instance
→ Don't create reference, include in SKILL.md
```

### Reference Organization

**Domain-based**:
```
references/
├── api-endpoints.md       # All API endpoint docs
├── database-schema.md     # Complete schema
├── validation-rules.md    # All validation rules
└── examples.md            # Example collection
```

**Feature-based**:
```
references/
├── rotation-guide.md      # PDF rotation specifics
├── merging-guide.md       # PDF merging specifics
├── extraction-guide.md    # Text extraction specifics
└── common-patterns.md     # Patterns for all features
```

**Complexity-based**:
```
references/
├── quick-reference.md     # Common operations
├── advanced-guide.md      # Complex scenarios
├── troubleshooting.md     # Problem solving
└── api-reference.md       # Complete API docs
```

### Reference Structure

**Minimal reference template**:

```markdown
# Reference Title

Brief description of what this reference covers.

## Section 1

### Subsection 1.1
Content...

### Subsection 1.2
Content...

## Section 2

### Subsection 2.1
Content...

## Quick Reference

Summary table or list for rapid lookup:
| Item | Description |
|------|-------------|
| X    | Details     |
| Y    | Details     |
```

### Reference Best Practices

**Structure**:
- Keep 1 level deep from SKILL.md (not nested)
- Use descriptive names (`validation-rules.md` not `doc1.md`)
- Forward slashes in paths (`references/guide.md`)

**Content**:
- Focus on reference material (not procedures)
- Organized for quick lookup
- Complete but concise
- No duplication with SKILL.md

**Size**:
- For files >10k words, include grep patterns in SKILL.md
- Split very large references into multiple files

## assets/ (Output Resources)

### When to Create Assets

Create asset when:
- Template used in output (not loaded to context)
- Boilerplate code repeatedly copied
- Images/icons needed in output
- Standard document templates required

### When NOT to Create Assets

Avoid assets when:
- Generated from scratch each time (AI adds value)
- Varies significantly per use
- Simple enough to inline in SKILL.md
- External asset better (link instead)

### Asset Examples

**Good candidates for assets/**:

```markdown
# HTML boilerplate template
- Same structure every project
- Copied to start development
→ Create: assets/template.html

# Company logo
- Used in generated reports
→ Create: assets/logo.png

# Tailored implementation
- Varies by requirements
- AI customizes each time
→ Don't create asset, generate fresh

# Frontend project structure
- Standard file organization
- Copied for new projects
→ Create: assets/frontend-template/

# Custom analysis report
- Unique findings each time
- AI generates based on data
→ Don't create asset, generate fresh
```

### Asset Organization

**By type**:
```
assets/
├── templates/
│   ├── html-template.html
│   ├── report-template.md
│   └── config-template.json
├── images/
│   ├── logo.png
│   └── icon.svg
└── boilerplate/
    ├── frontend/
    └── backend/
```

**By feature**:
```
assets/
├── web-app/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── reports/
│   ├── template.md
│   └── logo.png
└── configs/
    └── default-config.json
```

### Asset Best Practices

**Organization**:
- Group related assets together
- Use descriptive names
- Include README if structure complex

**Usage**:
- Assets never loaded to context (unlimited size)
- Referenced in SKILL.md for copying/modification
- Document how to use each asset

## Planning Worksheet

For each skill, complete this worksheet:

### Skill: [Name]

**Functionality examples**:
1. [Example 1]
2. [Example 2]
3. [Example 3]

**Scripts needed** (code repeatedly rewritten):
- [ ] Script 1: [Description] → scripts/[name].py
- [ ] Script 2: [Description] → scripts/[name].sh

**References needed** (docs repeatedly referenced):
- [ ] Reference 1: [Description] → references/[name].md
- [ ] Reference 2: [Description] → references/[name].md

**Assets needed** (templates repeatedly used):
- [ ] Asset 1: [Description] → assets/[name].ext
- [ ] Asset 2: [Description] → assets/[name]/

**Keep in SKILL.md** (core, concise):
- Overview
- Common workflow
- 3-5 key examples
- Essential instructions

## Analysis Examples

### Example 1: PDF Processing Skill

**Functionality**:
1. "Rotate document.pdf 90 degrees"
2. "Merge file1.pdf and file2.pdf"
3. "Extract text from invoice.pdf"

**Analysis**:

**Rotation**:
- Same code each time? Yes → scripts/rotate_pdf.py
- Docs needed? No (simple operation)
- Template needed? No (operates on existing files)

**Merging**:
- Same code each time? Yes → scripts/merge_pdf.py
- Docs needed? Maybe (if complex) → references/merging-guide.md
- Template needed? No

**Extraction**:
- Same code each time? Yes → scripts/extract_text.py
- Docs needed? Yes (multiple extraction methods) → references/extraction-guide.md
- Template needed? No

**Resources**:
- scripts/rotate_pdf.py
- scripts/merge_pdf.py
- scripts/extract_text.py
- scripts/validate_pdf.py (validation for all)
- references/extraction-guide.md (extraction methods)
- references/troubleshooting.md (common issues)

### Example 2: Frontend Web App Builder

**Functionality**:
1. "Build a todo app"
2. "Create dashboard to track metrics"
3. "Build landing page for product"

**Analysis**:

All need boilerplate HTML/React structure:
- Same code each time? Partially (boilerplate yes, logic no)
- Docs needed? Yes (component patterns) → references/component-patterns.md
- Template needed? Yes (boilerplate) → assets/app-template/

**Resources**:
- assets/app-template/ (HTML/React boilerplate)
- references/component-patterns.md (reusable patterns)
- references/styling-guide.md (CSS/Tailwind patterns)

### Example 3: BigQuery Analysis Skill

**Functionality**:
1. "How many users logged in today?"
2. "Show revenue by product category"
3. "Find top 10 customers by spend"

**Analysis**:

All need schema knowledge:
- Same code each time? No (queries vary by question)
- Docs needed? Yes (schema reference) → references/schema.md
- Template needed? Maybe (query templates) → references/query-patterns.md

**Resources**:
- references/schema.md (table schemas and relationships)
- references/query-patterns.md (common query templates)
- references/optimization-guide.md (query optimization tips)

## Quick Decision Tree

```
For each functionality:

Is code repeatedly rewritten exactly the same?
├─ Yes → Create script in scripts/
└─ No → Is documentation repeatedly referenced?
    ├─ Yes → Create reference in references/
    └─ No → Is template repeatedly used in output?
        ├─ Yes → Create asset in assets/
        └─ No → Include in SKILL.md body
```

## Resource Checklist

Before finalizing skill:

- [ ] All scripts have error handling
- [ ] All scripts documented (usage, requirements)
- [ ] References organized logically
- [ ] References 1 level deep (not nested)
- [ ] Asset usage documented in SKILL.md
- [ ] No duplication between SKILL.md and resources
- [ ] Resources referenced in SKILL.md
- [ ] Unused example files deleted
