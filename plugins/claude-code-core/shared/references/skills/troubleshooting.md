# Troubleshooting Common Issues

Solutions for frequent skill development problems.

## Activation Issues

### Skill Not Activating

**Symptoms**: Skill never triggers despite matching use case

**Solutions**:

1. **Check file paths**
   ```bash
   # Personal skills
   ls -la ~/.claude/skills/category/skill-name/SKILL.md

   # Project skills
   ls -la .claude/skills/skill-name/SKILL.md
   ```
   Verify SKILL.md exists at correct location

2. **Verify description specificity**
   ```yaml
   # Too vague (won't activate reliably)
   description: Helps with files

   # Specific (activates correctly)
   description: >
     Processes PDF files including rotation, merging, and extraction.
     Use when working with PDFs or document processing tasks.
   ```

3. **Add explicit keywords**
   Include specific technologies, file types, operations in description

4. **Restart Claude Code**
   ```bash
   # Skills load on startup
   # After changes, restart Claude Code
   ```

5. **Use debug mode**
   ```bash
   claude --debug
   # Shows which skills considered and why
   ```

### False Positives (Activating When Shouldn't)

**Symptoms**: Skill triggers for unrelated requests

**Solutions**:

1. **Make description more domain-specific**
   ```yaml
   # Too broad
   description: Works with data files

   # More specific
   description: >
     Analyzes Excel spreadsheets (.xlsx) for data analysis, pivot tables,
     and chart generation. Use when working with Excel files specifically.
   ```

2. **Remove generic keywords**
   Avoid: help, assist, support, data, files (alone)
   Use: specific technologies, file types, operations

3. **Test negative triggers**
   Create list of phrases that SHOULD NOT activate skill
   Iterate description until false positives eliminated

## YAML Errors

### Parsing Failures

**Symptoms**: Skill not loading, YAML syntax errors

**Solutions**:

1. **No tabs allowed**
   ```yaml
   # Bad (uses tab)
   name:→skill-name

   # Good (uses spaces)
   name: skill-name
   ```

2. **Verify delimiters**
   ```yaml
   ---
   name: skill-identifier
   description: Skill description here
   ---

   # Markdown content starts here
   ```
   Must have `---` at start and end of frontmatter

3. **Check indentation**
   ```yaml
   # Bad
   description: >
   Skill description
   here

   # Good
   description: >
     Skill description
     here
   ```
   Continuation lines indented consistently

4. **Validate multiline syntax**
   ```yaml
   # Use > for folded text (line breaks become spaces)
   description: >
     Line 1
     Line 2

   # Use | for literal text (preserves line breaks)
   notes: |
     Line 1
     Line 2
   ```

### Invalid Field Names

**Symptoms**: Custom fields ignored or cause errors

**Solution**: Only use official fields
```yaml
# Valid fields only
---
name: skill-identifier
description: Skill description
allowed-tools:
  - Read
  - Write
---

# Invalid (custom fields ignored)
---
version: 1.0.0          # Not official field
author: Name            # Not official field
keywords:               # Not official field
  - keyword
---
```

## File Structure Issues

### Deep Nesting Errors

**Symptoms**: References not loading completely

**Problem**: Files nested >1 level deep

**Solution**:
```
# Bad
skill-name/
└── references/
    └── deep/
        └── nested/
            └── guide.md  # Won't load completely

# Good
skill-name/
└── references/
    └── guide.md          # Loads completely
```

Keep all references 1 level deep from SKILL.md

### File Not Found

**Symptoms**: Referenced files can't be loaded

**Solutions**:

1. **Use forward slashes**
   ```markdown
   # Bad
   See references\guide.md

   # Good
   See references/guide.md
   ```

2. **Verify relative paths**
   ```markdown
   # From SKILL.md
   references/guide.md           # Correct
   ./references/guide.md         # Also works
   ../other/file.md              # Wrong (outside skill dir)
   ```

3. **Use descriptive names**
   ```
   # Bad
   references/doc1.md
   references/doc2.md

   # Good
   references/validation-rules.md
   references/api-examples.md
   ```

## Script Execution Issues

### Scripts Not Running

**Symptoms**: Scripts referenced but not executing

**Solutions**:

1. **Verify execute permissions**
   ```bash
   chmod +x scripts/helper.py
   ```

2. **Include shebang**
   ```python
   #!/usr/bin/env python3
   # Rest of script
   ```

3. **Document dependencies**
   ```python
   """
   Dependencies:
   - PyPDF2==3.0.0
   - requests==2.31.0

   Install: pip install -r requirements.txt
   """
   ```

4. **Handle errors in script**
   ```python
   # Don't punt errors to Claude
   try:
       result = process_file(filename)
   except FileNotFoundError:
       print(f"Error: File {filename} not found")
       sys.exit(1)
   except Exception as e:
       print(f"Error: {str(e)}")
       sys.exit(1)
   ```

### Environment Issues

**Symptoms**: Scripts fail due to missing packages

**Solutions**:

1. **Never assume pre-installed packages**
   ```markdown
   ## Requirements

   Install dependencies:
   \`\`\`bash
   pip install PyPDF2 requests
   \`\`\`
   ```

2. **Use virtual environments**
   ```markdown
   ## Setup

   \`\`\`bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   \`\`\`
   ```

3. **Document system requirements**
   ```markdown
   ## System Requirements

   - Python 3.8+
   - Ghostscript (for PDF processing)
   - ImageMagick (for image conversion)
   ```

## Performance Issues

### High Token Usage

**Symptoms**: Skill uses more tokens than expected

**Solutions**:

1. **Move content to references/**
   ```markdown
   # In SKILL.md (keep brief)
   See references/detailed-guide.md for complete information

   # In references/detailed-guide.md (extensive content)
   [Detailed information here...]
   ```

2. **Use progressive disclosure**
   ```markdown
   # Summary in SKILL.md
   Brief overview here. For details, see references/details.md
   ```

3. **Remove unnecessary words**
   ```markdown
   # Before (verbose)
   I would like to help you understand that you should carefully
   consider the following important steps...

   # After (concise)
   Follow these steps:
   ```

### Slow Activation

**Symptoms**: Skill takes long to trigger

**Solutions**:

1. **Keep SKILL.md <500 lines**
   Move extensive content to references/

2. **Optimize description**
   Remove unnecessary text from description field

3. **Cache efficiently**
   Keep frequently-used templates in SKILL.md
   Store rarely-used content in references/

## Tool Usage Issues

### Wrong Tools Called

**Symptoms**: Skill calls incorrect tools

**Solutions**:

1. **Clarify instructions**
   ```markdown
   # Vague
   Process the file

   # Specific
   Execute scripts/process.py with file path as argument
   ```

2. **Provide examples**
   ```markdown
   ## Usage

   Example 1:
   Input: "Rotate document.pdf 90 degrees"
   Action: Execute scripts/rotate_pdf.py --file document.pdf --angle 90
   ```

3. **Use conditional workflows**
   ```markdown
   If task is rotation:
     → Use scripts/rotate_pdf.py
   Else if task is merging:
     → Use scripts/merge_pdf.py
   ```

### Restricted Tool Access Issues

**Symptoms**: Skill blocked by allowed-tools restrictions

**Solutions**:

1. **Verify allowed-tools match needs**
   ```yaml
   # If skill needs to execute scripts
   allowed-tools:
     - Read
     - Write
     - Bash  # Required for script execution
   ```

2. **Balance security and functionality**
   ```yaml
   # Read-only when possible
   allowed-tools:
     - Read
     - Grep
     - Glob

   # Add tools only as needed
   ```

## Coordination Issues

### Multi-Skill Conflicts

**Symptoms**: Multiple skills activate for same request

**Solutions**:

1. **Make descriptions mutually exclusive**
   ```yaml
   # Skill 1
   description: Processes PDF files specifically (rotation, merging)

   # Skill 2
   description: Processes Excel spreadsheets specifically (.xlsx files)
   ```

2. **Define clear boundaries**
   Document what each skill handles and doesn't handle

3. **Test for overlaps**
   Create test cases that could match multiple skills
   Iterate descriptions to eliminate conflicts

### Delegation Failures

**Symptoms**: Skill can't delegate to other skills

**Solutions**:

1. **Document delegation protocol**
   ```markdown
   When current information needed:
   - Delegate to research-specialist
   - Pass context: [what information needed]
   - Apply findings to implementation
   ```

2. **Test multi-skill scenarios**
   Verify delegation works in practice

## Common Error Messages

### "Skill not found"

**Cause**: File path incorrect or skill not in expected location

**Fix**:
```bash
# Verify location
ls ~/.claude/skills/category/skill-name/SKILL.md
ls .claude/skills/skill-name/SKILL.md

# Restart Claude Code after adding skill
```

### "YAML parse error"

**Cause**: Invalid YAML syntax

**Fix**:
- Check for tabs (use spaces)
- Verify `---` delimiters
- Validate indentation
- Test multiline syntax

### "Resource not found"

**Cause**: Referenced file doesn't exist or path incorrect

**Fix**:
```markdown
# Use forward slashes
references/guide.md

# Verify file exists
ls skill-name/references/guide.md
```

### "Permission denied"

**Cause**: Script not executable

**Fix**:
```bash
chmod +x scripts/helper.py
```

## Debug Workflow

Systematic approach to troubleshooting:

```
1. Reproduce issue consistently
2. Run with `claude --debug` to see internal decisions
3. Check logs for error messages
4. Verify file structure and paths
5. Test YAML parsing (paste frontmatter into YAML validator)
6. Simplify skill to minimal version that works
7. Incrementally add complexity back
8. Identify what change causes failure
9. Fix root cause
10. Test fix thoroughly
11. Document issue and solution for future reference
```

## Getting Help

If issue persists:

1. **Document the problem**
   - What you're trying to do
   - What's happening instead
   - Steps to reproduce
   - Error messages (if any)
   - SKILL.md content (sanitized)

2. **Check official documentation**
   - https://docs.claude.com/en/docs/claude-code/skills
   - https://docs.claude.com/en/docs/agents-and-tools/agent-skills/best-practices

3. **Test with minimal example**
   Create simplest possible skill that reproduces issue

4. **Review similar skills**
   Check how other skills handle similar requirements
