# Deployment Checklist

Comprehensive validation before deploying skills. Use this as final verification before sharing or activating skills.

## Core Quality

Before deployment, verify:

- [ ] **Description is specific** and includes key terms
- [ ] **Description includes both** what the skill does and when to use it
- [ ] **SKILL.md body is under 500 lines** (move extensive content to references/)
- [ ] **Additional details in separate files** (if needed)
- [ ] **No time-sensitive information** (or documented in "old patterns" section)
- [ ] **Consistent terminology throughout** SKILL.md and all references
- [ ] **Examples are concrete, not abstract** (real use cases, not placeholders)
- [ ] **File references are one level deep** (ensure complete file reads)
- [ ] **Progressive disclosure used appropriately** (load references only when needed)
- [ ] **Workflows have clear steps** with defined decision points

## Code and Scripts

If skill includes bundled scripts, verify:

- [ ] **Scripts solve problems** rather than punt to Claude
- [ ] **Error handling is explicit and helpful** (no silent failures)
- [ ] **No "voodoo constants"** (all magic values justified with comments)
- [ ] **Required packages listed** in instructions and verified as available
- [ ] **Scripts have clear documentation** (docstrings, usage examples)
- [ ] **No Windows-style paths** (all forward slashes, cross-platform compatible)
- [ ] **Validation/verification steps** for critical operations
- [ ] **Feedback loops included** for quality-critical tasks

## Testing

Validation requirements:

- [ ] **At least three evaluations created** (positive, negative, edge cases)
- [ ] **Tested with Haiku, Sonnet, and Opus** (verify consistency across models)
- [ ] **Tested with real usage scenarios** (not isolated test cases)
- [ ] **Team feedback incorporated** (if applicable, validate with actual users)

## Security

From security-checklist.md, ensure:

- [ ] **Used minimal allowed-tools** (least privilege access)
- [ ] **No hardcoded credentials** (use environment variables)
- [ ] **Input validation implemented** (file paths, parameters, user inputs)
- [ ] **Output sanitization applied** (no credential leakage in errors)
- [ ] **Operating limits defined** (API calls, file sizes, timeouts)
- [ ] **Scripts have error handling** (prevent shell injection)
- [ ] **Activation description specific** (reduces false positives)
- [ ] **Tested with malicious inputs** (directory traversal, special characters)
- [ ] **Logging doesn't expose sensitive data** (sanitized audit trails)
- [ ] **Team reviewed security considerations** (peer review completed)

## Performance

Token efficiency validation:

- [ ] **Target 40-50% token reduction** vs baseline (measured and documented)
- [ ] **Concise writing applied** (removed 30%+ unnecessary words)
- [ ] **References loaded conditionally** (not all upfront)
- [ ] **Caching utilized where applicable** (WebFetch, repeated operations)

## Documentation

Content quality checks:

- [ ] **Activation description tested** (90%+ positive triggers, <5% false positives)
- [ ] **All workflows documented** with clear entry/exit points
- [ ] **Edge cases identified** and handled gracefully
- [ ] **Resource planning completed** (scripts/references/assets properly organized)
- [ ] **Examples match current patterns** (no outdated syntax or approaches)

## Validation Tools

Execute before deployment:

```bash
# Structure validation
python scripts/validate_skill.py /path/to/skill/

# Activation testing (debug mode)
claude --debug
```

## Quick Reference

**Pass criteria**:

- All checklist items checked
- Validation script passes
- 90%+ activation accuracy
- 85%+ task completion rate
- 40-50% token reduction
- <5% error rate

**If any items fail**:

1. Document specific failure
2. Reference appropriate guide (security-checklist.md, testing-guide.md, optimization-patterns.md)
3. Fix issue
4. Re-validate with checklist
5. Repeat until all items pass

## Related Resources

- `security-checklist.md` - Detailed security validation
- `testing-guide.md` - Comprehensive testing procedures
- `optimization-patterns.md` - Token efficiency techniques
- `troubleshooting.md` - Issue resolution database
