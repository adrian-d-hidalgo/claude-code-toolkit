## Workflow I: Configuration Validation

### Type Detection Protocol

**FIRST, detect which type to validate**:

```bash
Read: path/to/target/.claude-plugin/marketplace.json
Read: path/to/target/.claude-plugin/plugin.json
Read: path/to/target/.mcp.json
```

**Decision Logic**:

- IF `marketplace.json` exists → **Workflow I1: Marketplace Validation**
- IF `plugin.json` exists → **Workflow I2: Plugin Validation**
- IF `.mcp.json` exists → **Workflow I3: MCP Configuration Validation**
- IF multiple exist → Validate all present configurations

---

### Workflow I1: Marketplace Validation

Validate marketplace.json and marketplace structure.

**1. Validate JSON Syntax**

```bash
python -m json.tool .claude-plugin/marketplace.json
```

**2. Validate Marketplace Schema**

Load `references/plugin-schema.md` (marketplace.json section) and check:

**Required fields**:

- `name` (string, kebab-case)
- `owner` (object with `name` field)
- `plugins` (array)

**For each plugin in `plugins[]`**:

- `name` (string, required)
- `source` (string, required, must start with `./`)
- `description` (string, required)

**3. Validate Plugin References**

For each `plugins[].source`:

- Directory exists
- Contains `.claude-plugin/plugin.json`
- Plugin name matches

**4. Cross-Validation**

- No duplicate plugin names
- All `source` paths are relative (start with `./`)
- Plugin descriptions are concise (50-100 chars recommended)

**5. Generate Marketplace Validation Report**

```
marketplace.json Validation Results:

✓ JSON syntax valid
✓ Required fields present (name, owner, plugins)
✓ All plugin sources exist
⚠ Plugin "helper" description is 150 chars (recommend <100)
✗ Duplicate plugin name "database" found at ./plugin-1 and ./plugin-3
✗ Plugin source "./my-plugin" does not start with ./ (should be "./my-plugin")

Recommendations:
- Shorten plugin descriptions to 50-100 characters
- Rename duplicate plugin "database" in one location
```

---

### Workflow I2: Plugin Validation

Validate plugin.json and plugin structure.

**1. Validate JSON Syntax**

```bash
python -m json.tool .claude-plugin/plugin.json
```

**2. Validate Plugin Schema**

Load `references/plugin-schema.md` and check:

**Minimal Required Schema**:

```json
{
  "name": "string (required, kebab-case)",
  "description": "string (required)",
  "version": "string (required, semver: X.Y.Z)",
  "author": {
    "name": "string (required)"
  }
}
```

**Optional arrays** (if present, must reference valid files):

- `commands[]` → Each file exists (relative path)
- `agents[]` → Each file exists (relative path)
- `skills[]` → Each directory exists (relative path)
- `hooks` → Object with valid hook types

**Optional mcpServers** (if present):

- Each server has `command` and `args`
- Commands are valid executables (python, node, dotnet, etc.)
- Args use `${CLAUDE_PLUGIN_ROOT}` for plugin-relative paths

**3. Validate Component References**

For each referenced file/directory:

```bash
Read: path/from/plugin.json
```

Check file exists and is readable.

**4. Validate Environment Variables**

- Identify all `${VARIABLE}` references in mcpServers.args
- Verify documented in README.md or .env.example
- Check for defaults using `${VAR:-default}` syntax

**5. Validate Version Format**

```bash
# Version must match semver: X.Y.Z
# Valid: "1.0.0", "2.1.3", "0.0.1"
# Invalid: "1.0", "v1.0.0", "latest"
```

**6. Generate Plugin Validation Report**

```
plugin.json Validation Results:

✓ JSON syntax valid
✓ All required fields present (name, description, version, author.name)
✓ Version follows semver (1.2.3)
✓ All referenced component files exist
⚠ Environment variable ${API_KEY} not documented in .env.example
✗ Command file "./commands/missing.md" referenced but not found
✗ MCP server command "python3" should use "python" for cross-platform compatibility

Recommendations:
- Add ${API_KEY} to .env.example with description
- Remove "./commands/missing.md" from commands array or create the file
- Use "python" instead of "python3" in mcpServers commands
```

---

### Workflow I3: MCP Configuration Validation

Validate .mcp.json for MCP server configuration.

**1. Validate JSON Syntax**

```bash
python -m json.tool .mcp.json
```

**2. Validate MCP Schema**

Load `references/mcp-configuration-schema.md` and check:

```json
{
  "mcpServers": {
    "server-name": {
      "command": "string (required: python/node/dotnet)",
      "args": ["array of strings"],
      "env": {"optional environment variables"}
    }
  }
}
```

**3. Validate Server Commands**

- Command is valid executable (python, node, dotnet, etc.)
- Server script path exists
- Environment variables defined if referenced

**4. Generate MCP Validation Report**

```
.mcp.json Validation Results:

✓ JSON syntax valid
✓ All server commands are valid
⚠ Server "db-tools" references ${DATABASE_URL} but no default provided
✗ Server script "./server/missing.py" not found

Recommendations:
- Provide default for ${DATABASE_URL} using ${DATABASE_URL:-sqlite:///local.db}
- Create missing server script or remove server configuration
```
