# Comprehensive Best Practices for Claude Code Skills

## Core Philosophy

**Skills define PROCESSES, not deployments**. A skill should focus on:
- ✅ What to do and how to do it
- ✅ Clear instructions for the agent
- ✅ Helpers (references, templates, scripts) to execute efficiently
- ❌ NOT how users install or deploy the skill
- ❌ NOT mentions of "restart Claude Code" or "deployment"
- ❌ NOT instructions about plugin installation

## File Paths and Portability

### Use ${CLAUDE_PLUGIN_ROOT} for Plugin Resources

When referencing scripts, templates, or resources within the plugin:

**Correct**:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/validate_skill.py /path/to/skill/
```

**Incorrect**:
```bash
python scripts/validate_skill.py /path/to/skill/
python /absolute/path/to/scripts/validate_skill.py /path/to/skill/
```

### When to Use ${CLAUDE_PLUGIN_ROOT}

Use for:
- Plugin scripts: `${CLAUDE_PLUGIN_ROOT}/scripts/init_skill.py`
- Plugin templates: `${CLAUDE_PLUGIN_ROOT}/assets/templates/`
- Plugin configs: `${CLAUDE_PLUGIN_ROOT}/config/settings.json`
- MCP servers bundled in plugin: `${CLAUDE_PLUGIN_ROOT}/servers/db-tools`

DON'T use for:
- User's workspace files (use relative paths or tool parameters)
- System commands (npm, git, python3, etc.)
- External tools

### Script Commands

**Always use python3** (not python):
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/validate_skill.py
```

**For bash scripts**:
```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/init_plugin.sh plugin-name
```

## Skill Structure Best Practices

### File Organization

**Optimal structure**:
```
skill-name/
├── SKILL.md                    # Main skill (keep <500 lines)
├── scripts/                    # Automation scripts (optional)
│   ├── init_*.py
│   └── validate_*.py
├── references/                 # Deep-dive docs (1 level only!)
│   ├── pattern-guide.md
│   ├── security-checklist.md
│   └── troubleshooting.md      # NOT references/deep/nested.md
├── assets/
│   └── templates/              # Reusable templates
│       ├── template1.md
│       └── template2.json
└── tests/                      # Test scenarios (optional)
    └── activation-tests.md
```

### References Depth Limit

**CRITICAL**: References must be exactly 1 level deep

**Correct**:
- `references/activation-patterns.md` ✅
- `references/security-checklist.md` ✅

**Incorrect**:
- `references/workflows/individual-plugin.md` ❌ (2 levels)
- `references/deep/nested/file.md` ❌ (3 levels)

**Why**: Skills use progressive disclosure. Claude reads entire reference files when loaded. Deeply nested files break the loading mechanism.

**Solution**: Flatten nested directories:
```bash
# Move nested files to references root
mv references/workflows/*.md references/
rmdir references/workflows
```

### SKILL.md Length

**Target**: <500 lines (RECOMMENDED)
**Hard limit**: Skills can be longer, but should be optimized

**Optimization strategies**:
1. Move detailed workflows to `references/`
2. Move sub-procedures to separate reference files
3. Use progressive disclosure (load references only when needed)
4. Remove redundant explanations
5. Use concise writing (remove 30%+ unnecessary words)

**Example refactoring**:
```markdown
<!-- BEFORE: 150 lines in SKILL.md -->
### Sub-Workflow 2A: Detailed Process
1. Step one with lots of explanation...
2. Step two with examples...
[...100 more lines...]

<!-- AFTER: 10 lines in SKILL.md + reference -->
### Sub-Workflow 2A: Detailed Process

**Load references/subprocess-2a.md** for complete implementation

**Quick summary**:
- Step one: Do X
- Step two: Do Y
```

## Allowed-Tools Best Practices

### Use Specific Commands

**DON'T use generic Bash**:
```yaml
allowed-tools:
  - Bash  # ❌ Too permissive
```

**DO use specific patterns**:
```yaml
allowed-tools:
  - Bash(python3 *)  # ✅ Specific to python3
  - Bash(npm *)      # ✅ Specific to npm
  - Bash(git *)      # ✅ Specific to git
```

### Python Command Standards

Use `python3`, not `python`:
```yaml
allowed-tools:
  - Bash(python3 *)  # ✅ Correct
  - Bash(python *)   # ❌ Ambiguous (python2 vs python3)
```

## Deployment References - What to Remove

### Remove These Phrases

Skills should NOT mention:
- ❌ "Restart Claude Code to activate"
- ❌ "Deploy the skill"
- ❌ "Install the skill"
- ❌ "Skill is now ready for deployment"
- ❌ "Test installation"
- ❌ "Before deployment"

### Replace With Process-Focused Language

**Instead of deployment language**, use completion language:
- ✅ "Skill is now ready for use"
- ✅ "Validation complete"
- ✅ "Process complete"
- ✅ "Ready for validation"

### Final Steps Should Focus on Quality

**BEFORE** (deployment-focused):
```markdown
### Step 9: Deploy Skill

1. Validate structure
2. Test installation
3. Deploy to .claude/skills/
4. Restart Claude Code to activate
```

**AFTER** (process-focused):
```markdown
### Step 9: Validate Completeness

Execute validation:
```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/validate_skill.py ~/.claude/skills/skill-name/
```

If errors: Fix reported issues → Re-run validation → Repeat until passing

Skill is now ready for use.
```

## Script Organization

### Shared Scripts Pattern

For plugins with multiple skills, consolidate common scripts:

**Structure**:
```
plugin-root/
├── scripts/                      # Shared validation scripts
│   ├── validate_skill.py
│   ├── validate_agent.py
│   ├── validate_command.py
│   └── validate_output_style.py
└── skills/
    ├── skill-manager/
    │   ├── SKILL.md
    │   └── scripts/              # Skill-specific scripts only
    │       └── init_skill.py
    ├── claude-code-sub-agent/
    │   └── scripts/
    │       └── init_agent.py
    └── command-manager/
        └── scripts/
            └── init_command.py
```

**Benefits**:
- Reduces duplication
- Single source of truth for validation logic
- Easier maintenance
- Consistent behavior across skills

### Referencing Shared Scripts

From any skill:
```bash
# Validation scripts (shared)
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/validate_skill.py /path/

# Initialization scripts (skill-specific)
python3 plugins/claude-code-core/skills/skill-manager/scripts/init_skill.py name
```

## Activation Description Best Practices

### Focus on ACTIVATION, Not Implementation

**Bad** (implementation-focused):
```yaml
description: >
  Manages skill lifecycle with SKILL.md files, YAML frontmatter, and
  reference documentation. Uses validation scripts to ensure compliance.
```

**Good** (activation-focused):
```yaml
description: >
  Creates, improves, validates, and audits Claude Code skills for standards
  compliance. Use when creating skills, analyzing quality, validating
  compliance, or working with .claude/skills/* directories.
```

### Include Key Triggers

Activation descriptions should list:
1. **Action triggers**: creating, improving, validating, analyzing
2. **Context triggers**: working with X, when using Y
3. **Path triggers**: .claude/skills/*, specific directories
4. **Differentiation**: what it does NOT handle

## Resource Planning

### When to Create Each Resource Type

**Scripts** (`scripts/`):
- Code that's repeatedly rewritten
- Automation that executes
- Validation logic
- Initialization helpers

**References** (`references/`):
- Documentation repeatedly referenced
- Deep-dive explanations
- Workflow details
- Troubleshooting guides

**Templates** (`assets/templates/`):
- Output structure definitions
- File templates for creation
- Reusable configuration patterns

## Progressive Disclosure

### Load Only What's Needed

**Principle**: Don't load all references upfront. Load targeted resources based on task.

**Example structure**:
```markdown
## Workflow B: Skill Improvement

**First: Diagnose current state**

Run validation to identify issues.

**Issue Prioritization Matrix**

| Issue Type | Load Resource |
|-----------|--------------|
| Activation fails | activation-examples.md |
| Security gaps | security-checklist.md |
| High token usage | optimization-patterns.md |

### Activation Issues

Solutions:
1. Review description
2. Add keywords
3. Test scenarios

Load when debugging: references/activation-examples.md
```

**Benefits**:
- Reduces token usage
- Faster responses
- Loads only relevant context

## Validation and Quality

### Validation Should Be Automated

Every skill type should have:
1. Automated validation script
2. Clear validation checklist
3. Error messages with fixes

**Example**:
```python
# validate_skill.py
def validate_references_depth(content, skill_path):
    deep_refs = re.findall(r'references/[a-z-]+/[a-z-]+\.md', content)
    if deep_refs:
        return Error(f"References nested too deep: {deep_refs}")
    return Success()
```

### Quality Metrics

Track:
- Line count (<500 recommended)
- Reference depth (1 level max)
- Token efficiency (40-50% reduction target)
- Activation effectiveness

## Common Pitfalls to Avoid

### 1. Nested References

**Problem**: `references/workflows/details.md`
**Solution**: Flatten to `references/workflow-details.md`

### 2. Generic Tool Permissions

**Problem**: `allowed-tools: [Bash]`
**Solution**: `allowed-tools: [Bash(python3 *), Bash(npm *)]`

### 3. Deployment Language

**Problem**: "Deploy skill and restart Claude Code"
**Solution**: "Skill is now ready for use"

### 4. Hardcoded Paths

**Problem**: `/Users/me/plugin/scripts/validate.py`
**Solution**: `${CLAUDE_PLUGIN_ROOT}/scripts/validate.py`

### 5. Using `python` instead of `python3`

**Problem**: `python scripts/validate.py`
**Solution**: `python3 ${CLAUDE_PLUGIN_ROOT}/scripts/validate.py`

### 6. Bloated SKILL.md Files

**Problem**: 800-line SKILL.md with all details
**Solution**: <500 line SKILL.md + targeted references

## Testing Best Practices

### Activation Testing

Test that skill activates correctly:
- Positive triggers (should activate)
- Negative triggers (should NOT activate)
- Edge cases
- Similar skill differentiation

### Resource Loading

Verify:
- All referenced files exist
- References are 1 level deep
- Progressive disclosure works
- No circular dependencies

### Script Testing

Validate:
- Scripts execute correctly
- Error handling works
- Help text is clear
- Exit codes are correct

## Documentation Standards

### Third Person Voice

**Incorrect**: "I validate skills" or "You should validate"
**Correct**: "Validates skills" or "Agent validates"

### Concise Writing

Remove unnecessary words:
- "In order to" → "To"
- "It is important to note that" → "Note:"
- "The process of validating" → "Validating"

Target 30%+ reduction in word count while preserving meaning.

### Clear Section Organization

Use consistent hierarchy:
```markdown
## Major Section

### Subsection

**Bold for emphasis**:
- Bullet points for lists

```code blocks for examples```

**Load references/file.md** when needing deep-dive details
```

## Summary Checklist

Before finalizing any skill:

- [ ] SKILL.md is <500 lines
- [ ] All references are exactly 1 level deep (no `references/deep/file.md`)
- [ ] Uses `${CLAUDE_PLUGIN_ROOT}` for plugin resources
- [ ] Uses `python3` not `python`
- [ ] Allowed-tools are specific, not generic Bash
- [ ] NO deployment language ("restart", "install", "deploy")
- [ ] Activation description focuses on triggers, not implementation
- [ ] Scripts are in appropriate location (shared vs skill-specific)
- [ ] All referenced files exist
- [ ] Validation scripts run successfully
- [ ] Uses progressive disclosure (targeted resource loading)
- [ ] Third-person voice in descriptions
- [ ] Concise writing (30%+ reduction applied)
