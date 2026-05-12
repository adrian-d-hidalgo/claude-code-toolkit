# Skill Lifecycle Management

Versioning, maintenance, and iteration practices for skills.

## Versioning

### Semantic Versioning

Use MAJOR.MINOR.PATCH format.

**Version format**:
```
1.0.0
│ │ │
│ │ └─ PATCH: Bug fixes, minor changes (backward compatible)
│ └─── MINOR: New features, enhancements (backward compatible)
└───── MAJOR: Breaking changes (not backward compatible)
```

**Examples**:
```
1.0.0 → 1.0.1  (Bug fix: corrected file path handling)
1.0.1 → 1.1.0  (New feature: added merging capability)
1.1.0 → 2.0.0  (Breaking: changed description format, incompatible API)
```

### Version Tracking

Document versions in skill notes or separate file.

**Version tracking file** (optional):
```
skill-name/
├── SKILL.md
├── VERSION.md
└── references/
    └── CHANGELOG.md
```

**VERSION.md**:
```markdown
# Version

Current: 1.2.0
Released: 2025-10-21
```

**CHANGELOG.md**:
```markdown
# Changelog

## [1.2.0] - 2025-10-21
### Added
- Excel spreadsheet processing support
- Batch operation capability

### Changed
- Improved activation description specificity
- Optimized token usage (48% reduction from baseline)

### Fixed
- File path handling on Windows
- Error handling for corrupted files

## [1.1.0] - 2025-09-15
### Added
- PDF merging functionality
- Validation scripts

### Changed
- Updated dependencies (PyPDF2 3.0.0)

## [1.0.0] - 2025-08-01
### Added
- Initial release
- PDF rotation capability
- Basic text extraction
```

## Maintenance Schedule

Regular review and updates.

### Weekly Maintenance

**Monitor**:
- Activation logs for false positives/negatives
- User feedback and requests
- Error reports

**Actions**:
- Document issues for review
- Quick fixes for critical bugs

### Monthly Maintenance

**Review**:
- Activation accuracy metrics
- Performance metrics (tokens, speed)
- User satisfaction feedback

**Actions**:
- Update description if activation issues
- Optimize token usage if exceeding targets
- Address common user requests

### Quarterly Maintenance

**Comprehensive review**:
- Re-run full test suite
- Security audit
- Dependency updates
- Performance benchmarking

**Actions**:
- Major optimizations
- Feature enhancements
- Documentation updates

### Annual Maintenance

**Strategic evaluation**:
- Skill relevance and usage
- Technology stack updates
- Deprecation decisions

**Actions**:
- Major refactors if needed
- Technology upgrades
- Deprecate if no longer used

## Iteration Loop

Continuous improvement based on usage.

### Iteration Process

```
1. Deploy skill
   ↓
2. Monitor real usage
   - Activation patterns
   - Success/failure rates
   - User feedback
   ↓
3. Identify issues
   - Activation problems
   - Performance bottlenecks
   - Missing features
   - Edge cases
   ↓
4. Prioritize changes
   - Critical: Fix immediately
   - High: Next minor version
   - Medium: Backlog
   - Low: Consider for future
   ↓
5. Implement changes
   - Update SKILL.md
   - Modify resources
   - Update tests
   ↓
6. Test changes
   - Run regression tests
   - Validate improvements
   - Get feedback
   ↓
7. Deploy update
   - Increment version
   - Update changelog
   - Notify users
   ↓
8. Repeat from step 2
```

### Feedback Collection

Gather insights from real usage.

**Sources**:
- User reports (direct feedback)
- Activation logs (false positives/negatives)
- Performance metrics (token usage, speed)
- Error logs (failure patterns)
- Team observations (usage patterns)

**Feedback template**:
```markdown
## Feedback Log

Date: 2025-10-21
Version: 1.1.0
Reporter: [User/Team member]

Issue:
- Skill didn't activate for "merge PDF files" request

Expected:
- Should activate for merge operations

Actual:
- Generic Claude response instead

Analysis:
- Description doesn't include "merge" keyword
- Activation too narrow

Action:
- Update description to include "merging"
- Add to test suite
- Target for v1.2.0
```

## Update Deployment

Releasing skill updates.

### Pre-Deployment Checklist

Before deploying updates:

- [ ] Changes tested with validation loop
- [ ] Regression tests passed
- [ ] Metrics meet or exceed previous version
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version incremented

### Deployment Process

**Personal skills**:
```bash
# Update files
cd ~/.claude/skills/category/skill-name/
# Edit SKILL.md, resources as needed

# Restart Claude Code to reload
# No git commit needed (personal use)
```

**Project skills**:
```bash
# Update files
cd .claude/skills/skill-name/
# Edit SKILL.md, resources as needed

# Commit changes
git add .claude/skills/skill-name/
git commit -m "Update skill-name to v1.2.0

- Add merging capability
- Improve activation description
- Optimize token usage"
git push

# Notify team
# Team members restart Claude Code to get update
```

### Post-Deployment

After deploying update:

**Immediate** (day 1):
- Monitor for critical errors
- Verify activation working
- Check user feedback

**Short-term** (week 1):
- Compare metrics to previous version
- Address any regression issues
- Collect user feedback

**Medium-term** (month 1):
- Analyze impact of changes
- Validate improvements achieved
- Plan next iteration

## Deprecation

Retiring outdated or unused skills.

### When to Deprecate

Consider deprecation when:
- Skill no longer used (0 activations in 3+ months)
- Technology stack obsolete
- Better alternative exists
- Maintenance cost exceeds value

### Deprecation Process

**Step 1: Mark as deprecated** (in SKILL.md):
```markdown
---
name: legacy-pdf-processor
description: >
  [DEPRECATED - Use pdf-processor-v2 instead]
  Legacy PDF processing skill. Deprecated as of 2025-10-21.
  Maintained until 2026-01-21 for backward compatibility.
---

# Legacy PDF Processor (DEPRECATED)

**This skill is deprecated. Use `pdf-processor-v2` instead.**

**Deprecation date**: 2025-10-21
**End of support**: 2026-01-21
**Replacement**: pdf-processor-v2

Migration guide: references/MIGRATION.md
```

**Step 2: Provide migration path**:
```markdown
# MIGRATION.md

## Migrating from legacy-pdf-processor to pdf-processor-v2

### What changed
- Improved activation (more reliable)
- Better performance (60% faster)
- Enhanced error handling
- Additional features (merging, splitting)

### Migration steps
1. Update requests to use new activation phrases
2. No code changes required (backward compatible)
3. Test with new skill
4. Remove references to legacy skill

### Timeline
- 2025-10-21: Deprecation announced
- 2026-01-21: Legacy skill removed
```

**Step 3: Notify users**:
- Update documentation
- Announce in team channels
- Provide migration timeline

**Step 4: Monitor migration**:
- Track usage of deprecated skill
- Assist users with migration
- Address migration issues

**Step 5: Remove**:
- After end-of-support date
- Verify 0 usage
- Archive or delete skill

## Metrics Tracking

Monitor skill effectiveness over time.

### Key Metrics

**Activation metrics**:
```markdown
Version 1.0.0:
- Activation accuracy: 85%
- False positive rate: 8%

Version 1.1.0:
- Activation accuracy: 92% (+7%)
- False positive rate: 3% (-5%)

Version 1.2.0:
- Activation accuracy: 94% (+2%)
- False positive rate: 2% (-1%)
```

**Performance metrics**:
```markdown
Version 1.0.0:
- Avg tokens: 2000
- Task completion: 82%

Version 1.1.0:
- Avg tokens: 1500 (25% reduction)
- Task completion: 88% (+6%)

Version 1.2.0:
- Avg tokens: 1200 (40% reduction from v1.0.0)
- Task completion: 91% (+9% from v1.0.0)
```

### Metrics Dashboard

Track trends over versions:

```markdown
# Skill Metrics Dashboard

Skill: pdf-processor
Current Version: 1.2.0

## Activation Metrics
| Version | Accuracy | False Positive | False Negative |
|---------|----------|----------------|----------------|
| 1.0.0   | 85%      | 8%             | 12%            |
| 1.1.0   | 92%      | 3%             | 8%             |
| 1.2.0   | 94%      | 2%             | 6%             |

## Performance Metrics
| Version | Avg Tokens | Completion | Speed   |
|---------|------------|------------|---------|
| 1.0.0   | 2000       | 82%        | 15s     |
| 1.1.0   | 1500       | 88%        | 12s     |
| 1.2.0   | 1200       | 91%        | 10s     |

## Usage Metrics
| Version | Activations | Users | Errors |
|---------|-------------|-------|--------|
| 1.0.0   | 150         | 12    | 18     |
| 1.1.0   | 280         | 18    | 12     |
| 1.2.0   | 420         | 25    | 8      |
```

## Documentation Maintenance

Keep documentation current.

### Update When

- Description changes
- New features added
- Workflow changes
- Dependencies updated
- Best practices evolve

### Documentation Checklist

- [ ] SKILL.md reflects current functionality
- [ ] References/ files up to date
- [ ] Examples work with current version
- [ ] Dependencies documented accurately
- [ ] Changelog updated
- [ ] Migration guides (if breaking changes)

## Team Collaboration

Managing skills in team environments.

### Version Control

```bash
# Branch for skill updates
git checkout -b skill-update/pdf-processor-v1.2.0

# Make changes
# Test thoroughly

# Commit with descriptive message
git commit -m "Update pdf-processor to v1.2.0

Changes:
- Add merging functionality
- Improve activation accuracy
- Optimize token usage 40%

Testing:
- All activation tests passed
- Performance benchmarks met
- Team feedback incorporated"

# Push and create PR
git push origin skill-update/pdf-processor-v1.2.0

# After review and approval, merge
git checkout main
git merge skill-update/pdf-processor-v1.2.0
```

### Review Process

For team skills:

1. **Developer** creates update branch
2. **Peer review** validates changes
3. **Testing** runs automated tests
4. **Approval** from skill maintainer
5. **Merge** to main branch
6. **Deployment** team restarts Claude Code

## Quick Reference

**Versioning**: Use semantic versioning (MAJOR.MINOR.PATCH)

**Maintenance**:
- Weekly: Monitor logs, quick fixes
- Monthly: Review metrics, user feedback
- Quarterly: Full test suite, security audit
- Annual: Strategic evaluation

**Iteration**: Deploy → Monitor → Identify → Prioritize → Implement → Test → Deploy

**Deprecation**: Mark deprecated → Migration path → Notify → Monitor → Remove

**Metrics**: Track activation accuracy, performance, usage trends

**Documentation**: Keep current, update changelog, migration guides
