## Workflow C: Plugin Installation

### Execution Steps

**1. Identify Source**

- Plugin name → Registry
- URL → GitHub/remote
- Path → Local directory

**2. Install**

```bash
/plugin install <source>
```

**3. Configure Environment**

Check plugin README for required environment variables. Create `.env` or add to `~/.claude.json`:

```json
{
  "env": {
    "API_KEY": "your_key"
  }
}
```

**4. Verify**

```bash
/plugin list
/mcp status
```

Load `references/troubleshooting-guide.md` if plugin doesn't load.

## Workflow D: Plugin Configuration

### Execution Steps

**1. Locate Plugin**

```bash
/plugin list
```

**2. Edit Configuration**

Read plugin.json:
```bash
Read: ~/.claude/plugins/plugin-name/.claude-plugin/plugin.json
```

**3. Modify**

Common modifications:
- Add component: Update `commands`, `agents`, or `mcpServers` arrays
- Change version: Update `version` field
- Add environment variable: Add to `env` object in MCP server config

Load `references/plugin-schema.md` for complete field reference.

**4. Validate & Apply**

```bash
python -m json.tool plugin.json
```

Restart Claude Code to load changes.

## Workflow E: MCP Server Installation

### Execution Steps

**1. Choose Installation Method**

- **.mcpb file** (easiest) → Drag into Claude Desktop Settings
- **CLI** (flexible) → `claude mcp add`
- **Manual JSON** (advanced) → Edit .mcp.json directly

**2. Install via CLI**

```bash
# Examples
claude mcp add brave-search --scope user --env BRAVE_API_KEY=$KEY -- npx -y @modelcontextprotocol/server-brave-search

claude mcp add filesystem --scope project -- npx -y @modelcontextprotocol/server-filesystem /path

claude mcp add postgres --env DATABASE_URL=$URL -- npx -y @modelcontextprotocol/server-postgres
```

**Scopes**:
- `local` - Current project only (not shared)
- `project` - Shared via .mcp.json
- `user` - All projects for user

**3. Configure Environment**

Set required environment variables. Load `references/official-mcp-servers.md` for server-specific requirements.

**4. Verify**

```bash
claude mcp list
/mcp status
```

## Workflow F: MCP Server Configuration

### Execution Steps

**1. Locate Configuration**

```bash
claude mcp get server-name
```

**2. Edit**

Read current config:
```bash
Read: .mcp.json  # or ~/.claude.json
```

**3. Modify**

Common changes:
- Update arguments
- Add environment variables
- Change command path
- Add default values with `${VAR:-default}` syntax

Load `references/mcp-configuration-schema.md` for complete schema.

**4. Apply**

Restart Claude Code to reload configuration.

## Workflow G: MCP Server Testing

### Execution Steps

**1. Check Connection**

```bash
/mcp status
```

**2. Inspect Capabilities**

```bash
/mcp
```

View available tools, resources, and prompts.

**3. Test Tools**

Request Claude to use a specific tool:
```
Use the [tool-name] tool with [parameters]
```

**4. Test Error Handling**

Try invalid parameters or edge cases.

**5. Debug**

```bash
claude --debug
```

Load `references/mcp-testing-guide.md` for comprehensive testing strategies.

