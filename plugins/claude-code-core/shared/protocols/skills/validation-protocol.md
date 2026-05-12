# Skill Validation Protocol

## Purpose

Systematic validation process for skill quality assurance. Ensures skills meet minimum standards for structure, security, testing, and functionality.

## When to Use

- **After creating new skill** (claude-code-skill Step 9)
- **Before deploying to production** (claude-code-skill final check)
- **After major refactoring** (claude-code-skill)
- **During skill improvement** (claude-code-skill diagnosis)

## Process

### Step 1: Technical Validation

Execute structural and syntax validation:

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_skill.py [skill-path]
```

**Validates**:

- YAML frontmatter syntax and required fields
- Field length limits (name <64 chars, description <1024 chars)
- SKILL.md line count (<500 lines recommended)
- Referenced files exist
- No tabs in YAML
- References are 1 level deep maximum
- Forward slashes in paths
- Allowed-tools validity
- Third-person voice in description

**If errors occur**:

1. Load `${CLAUDE_PLUGIN_ROOT}/shared/references/skills/troubleshooting.md`
2. Fix reported issues
3. Re-run validation
4. Repeat until passing

### Step 2: Security Check

Load security checklist:

```
${CLAUDE_PLUGIN_ROOT}/shared/references/skills/security-checklist.md
```

**Verify**:

- [ ] `allowed-tools` follows least privilege principle
- [ ] No unnecessary tools granted
- [ ] Input validation present for user-provided data
- [ ] No credential exposure in examples or content
- [ ] File operations restricted to appropriate directories
- [ ] No command injection vulnerabilities in scripts
- [ ] Sensitive operations require confirmation

**Common issues**:

- Granting `Bash(*)` without restrictions
- Missing input sanitization in scripts
- Hardcoded credentials in examples
- Unrestricted file write permissions

### Step 3: Testing Check

Load testing guide:

```
${CLAUDE_PLUGIN_ROOT}/shared/references/skills/testing-guide.md
```

**Verify**:

- [ ] 5+ positive activation tests (should trigger)
- [ ] 5+ negative activation tests (should NOT trigger)
- [ ] 3+ edge case tests
- [ ] Core workflow end-to-end test
- [ ] Tests cover all major skill features

**Test types**:

- **Activation tests**: Verify skill triggers on correct keywords/contexts
- **Functionality tests**: Verify skill performs intended operations
- **Boundary tests**: Verify skill handles edge cases properly
- **Negative tests**: Verify skill doesn't activate on unrelated requests

### Step 4: Activation Quality Check

**Verify description effectiveness**:

- [ ] Starts with action verbs (not "Manages", "Handles" alone)
- [ ] Lists specific triggers (not generic "working with files")
- [ ] NO internal components mentioned (SKILL.md, YAML, config files)
- [ ] NO process details (how it executes/loads/processes)
- [ ] Includes clear differentiation from similar skills
- [ ] Uses "Use when [triggers]" OR "REQUIRED when [triggers]" pattern
- [ ] Follows formula: [What it does] + [When to use] + [Specific triggers]
- [ ] Length within 200-500 chars (sweet spot for clarity)

**Reference**:

```
${CLAUDE_PLUGIN_ROOT}/shared/references/skills/activation-examples.md
```

### Step 5: Best Practices Review

Load comprehensive best practices:

```
${CLAUDE_PLUGIN_ROOT}/shared/references/skills/best-practices-comprehensive.md
```

**Quick checklist**:

- [ ] Single capability focus (one skill per distinct capability)
- [ ] Progressive disclosure (load references only when needed)
- [ ] Concise writing (remove 30%+ unnecessary words)
- [ ] Token efficiency (<500 lines in SKILL.md)
- [ ] Third-person descriptions ("Processes files" not "I process files")
- [ ] Templates for strict output structures (when applicable)
- [ ] References 1 level deep maximum

### Step 6: Sign-off

**For claude-code-skill**:

- Basic validation complete (Steps 1-5 passing)
- Skill meets minimum quality standards
- **Result**: Skill ready for use

**For claude-code-skill**:

- Full validation + optimization metrics
- Activation rate measured and acceptable (>70%)
- Token efficiency optimized (40-50% reduction vs baseline)
- Production readiness confirmed
- **Result**: Skill production-ready

## Validation Levels

### Level 1: Basic (claude-code-skill)

- Technical validation ✅
- Security check ✅
- Testing check ✅
- **Output**: Functional skill

### Level 2: Production (claude-code-skill)

- All Level 1 checks ✅
- Activation optimization ✅
- Performance tuning ✅
- Deployment checklist ✅
- **Output**: Production-ready skill

## Common Failure Modes

### YAML Syntax Errors

**Symptom**: Skill won't load
**Fix**: Check for tabs, missing quotes, invalid characters
**Reference**: troubleshooting.md

### Low Activation Rate

**Symptom**: Skill rarely triggers when it should
**Fix**: Optimize description with more verb variations
**Reference**: activation-examples.md

### Token Bloat

**Symptom**: Slow response times, high token usage
**Fix**: Apply progressive disclosure, move content to references
**Reference**: best-practices-comprehensive.md

### Security Vulnerabilities

**Symptom**: Failed security audit
**Fix**: Restrict allowed-tools, add input validation
**Reference**: security-checklist.md

## Notes

- **Validation is iterative**: Fix issues and re-validate until passing
- **Both skills use this protocol**: Ensures consistency across creation and optimization
- **Scripts automate checks**: Manual review required for subjective criteria (activation quality, best practices)
- **References provide depth**: Load only when specific issue identified
