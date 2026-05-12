## Workflow H: Plugin Analysis

### Type Detection Protocol

**FIRST, detect which type to analyze**:

```bash
Read: path/to/target/.claude-plugin/marketplace.json
Read: path/to/target/.claude-plugin/plugin.json
```

**Decision Logic**:
- IF `marketplace.json` exists → **Workflow H1: Marketplace Analysis**
- IF only `plugin.json` exists → **Workflow H2: Individual Plugin Analysis**
- IF neither exists → Report error: "Not a valid plugin or marketplace"

---

### Workflow H1: Marketplace Analysis

Analyze marketplace structure + inventory plugins (don't deep-analyze each plugin).

**1. Load Marketplace Structure**

```bash
Read: path/to/marketplace/.claude-plugin/marketplace.json
Glob: path/to/marketplace/*/
```

**2. Validate Marketplace Configuration**

- `marketplace.json` schema compliance (name, owner, plugins array)
- Each `plugins[].source` path exists
- Each plugin has valid `.claude-plugin/plugin.json`
- No duplicate plugin names

Load `references/plugin-schema.md` (marketplace.json section) for validation rules.

**3. Inventory Plugins**

For each plugin in `plugins[]`:
- Read plugin name, description from marketplace.json
- Confirm plugin directory exists
- Read plugin version from its plugin.json
- Count capabilities (commands, agents, skills, servers)

**Do NOT deep-analyze each plugin** (that's a separate task per plugin).

**4. Marketplace-Level Checks**

- README.md exists and describes all plugins
- Consistent naming conventions (kebab-case)
- Proper .gitignore for marketplace
- LICENSE file present

**5. Generate Marketplace Report**

```
Marketplace: <name>
Owner: <owner.name>
Total Plugins: <count>

Plugin Inventory:
- plugin-1 (v1.0.0): <description>
  Capabilities: 2 commands, 1 agent, 1 server
- plugin-2 (v2.1.0): <description>
  Capabilities: 3 commands, 0 agents, 0 servers
...

Validation Results:
✓ All plugin directories exist
⚠ plugin-3 missing README.md
✗ Duplicate plugin name "helper" found
```

---

### Workflow H2: Individual Plugin Analysis

Analyze complete plugin structure in depth.

**1. Load Plugin Structure**

```bash
Read: path/to/plugin/.claude-plugin/plugin.json
Glob: path/to/plugin/**/*
```

**2. Inventory Components**

List all commands, agents, skills, hooks, and MCP servers:
- Count each capability type
- Verify file paths match plugin.json references
- Check for orphaned files (not referenced in plugin.json)

**3. Validate Plugin Configuration**

- Metadata completeness (name, description, version, author.name required)
- Component file existence (all referenced files exist)
- Path references correctness (relative paths start with ./)
- Environment variable usage (documented in README/.env.example)

Load `references/plugin-schema.md` for validation rules.

**4. Security Audit**

Check for:
- Hardcoded secrets (API keys, passwords in code)
- Excessive permissions (file access, network calls)
- Input validation (user input sanitization)
- Error handling (try/catch, graceful failures)

Load `references/security-checklist.md` for complete audit.

**5. Code Quality Check**

- README.md completeness (installation, usage, configuration)
- .env.example for required environment variables
- Proper .gitignore (no secrets, no temp files)
- Testing artifacts (tests/ directory if applicable)

**6. Generate Plugin Report**

```
Plugin: <name> (v<version>)
Author: <author.name>
Description: <description>

Capabilities:
- Commands: <count> (<list names>)
- Agents: <count> (<list names>)
- Skills: <count> (<list names>)
- MCP Servers: <count> (<list names>)
- Hooks: <count> (<list types>)

Validation Results:
✓ All component files exist
✓ No hardcoded secrets found
⚠ Missing .env.example
✗ command "foo.md" referenced but not found

Security Findings:
✓ Input validation present
⚠ Rate limiting not implemented for API calls

Recommendations:
- Add .env.example with required environment variables
- Implement rate limiting in MCP server
- Create tests/ directory with unit tests
```

