# Plugin Schema Reference

Complete schema specification for `plugin.json` configuration files.

## File Location

`<plugin-root>/.claude-plugin/plugin.json`

## Minimal Required Schema

```json
{
  "name": "plugin-name",
  "version": "1.0.0"
}
```

**Required fields**:

- `name`: Plugin identifier (kebab-case)
- `version`: Semantic versioning

## Complete Schema (all fields)

```json
{
  "name": "plugin-name",
  "version": "1.0.0",
  "description": "Plugin description",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://example.com"
  },
  "homepage": "https://plugin-homepage.com",
  "repository": "https://github.com/owner/repo",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  "commands": "./custom-commands",
  "agents": ["./custom-agents", "./more-agents"],
  "hooks": "./custom-hooks/hooks.json",
  "mcpServers": "./.mcp.json"
}
```

**Metadata fields** (optional):

- `description`: Plugin description
- `author`: Object with `name`, `email`, `url`
- `homepage`: Plugin homepage URL
- `repository`: Repository URL
- `license`: License identifier
- `keywords`: Array of keywords

**Component paths** (optional, supplement defaults):

- `commands`: String or array of paths to command directories
- `agents`: String or array of paths to agent directories
- `hooks`: Path to hooks.json file
- `mcpServers`: Path to .mcp.json file

**IMPORTANT**:

- Custom paths **supplement** default directories (don't replace them)
- All paths must be relative and start with `./`
- Use `${CLAUDE_PLUGIN_ROOT}` in hooks and MCP configs for portable paths

## Marketplace Configuration (marketplace.json)

**Different from plugin.json!** Used for plugin catalogs/marketplaces.

**File Location**: `<marketplace-root>/.claude-plugin/marketplace.json`

```json
{
  "name": "marketplace-name",
  "owner": {
    "name": "Owner Name"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "source": "./relative/path/to/plugin",
      "description": "Plugin description"
    }
  ]
}
```

**When to use**:

- Creating a catalog of multiple plugins
- Publishing plugins to a marketplace
- Local development with multiple plugins

**NOT for individual plugins** - individual plugins use plugin.json structure above.

## Field Specifications

### Required Fields

#### name

- **Type**: string
- **Format**: kebab-case recommended
- **Constraints**:
  - Must be unique in registry
  - No spaces
  - Alphanumeric and hyphens only
- **Example**: `"database-tools"`, `"code-analyzer"`

#### description

- **Type**: string
- **Constraints**:
  - 20-500 characters recommended
  - Clear and concise
  - Describes what plugin does
- **Example**: `"Provides database query tools and schema inspection capabilities"`

#### version

- **Type**: string
- **Format**: Semantic versioning (semver)
- **Pattern**: `MAJOR.MINOR.PATCH`
- **Constraints**:
  - Must follow semver spec
  - Three numeric components separated by dots
- **Examples**: `"1.0.0"`, `"2.3.1"`, `"0.1.0-beta"`

### Optional Fields

#### author

Object with optional fields:

- **name** (string): Author's full name
- **email** (string): Valid email address format

**Example**:

```json
{
  "author": {
    "name": "Jane Developer"
  }
}
```

### Component Arrays

#### commands

- **Type**: array of strings
- **Format**: Relative paths from plugin root
- **Path style**: Forward slashes only
- **Constraints**:
  - Paths must point to existing `.md` files
  - Paths relative to plugin root
- **Example**:

```json
{
  "commands": ["./commands/query.md", "./commands/schema.md"]
}
```

#### agents

- **Type**: array of strings
- **Format**: Relative paths from plugin root
- **Path style**: Forward slashes only
- **Constraints**:
  - Paths must point to existing `.md` files
  - Files must have valid YAML frontmatter
- **Example**:

```json
{
  "agents": ["./agents/database-specialist.md", "./agents/query-optimizer.md"]
}
```

#### hooks

- **Type**: array of strings
- **Format**: Relative paths from plugin root
- **Path style**: Forward slashes only
- **Constraints**:
  - Paths must point to existing `.json` files
  - Files must have valid hook configuration
- **Example**:

```json
{
  "hooks": ["./hooks/hooks.json"]
}
```

### MCP Servers Configuration

#### mcpServers

- **Type**: object (dictionary/map)
- **Keys**: Server names (alphanumeric, hyphens, underscores)
- **Values**: Server configuration objects

**Server configuration object**:

```json
{
  "command": "string (required)",
  "args": ["string (optional)"],
  "env": {
    "VAR_NAME": "string (optional)"
  }
}
```

##### command

- **Type**: string (required)
- **Purpose**: Executable command to start server
- **Formats**:
  - Absolute path: `"/usr/local/bin/myserver"`
  - Command in PATH: `"npx"`, `"python3"`, `"node"`
  - Plugin-relative: `"${CLAUDE_PLUGIN_ROOT}/servers/myserver/index.js"`
- **Variables**:
  - `${CLAUDE_PLUGIN_ROOT}` - Plugin installation directory

##### args

- **Type**: array of strings (optional)
- **Purpose**: Command-line arguments for server
- **Example**:

```json
{
  "args": [
    "-y",
    "@modelcontextprotocol/server-filesystem",
    "/path/to/directory"
  ]
}
```

##### env

- **Type**: object (optional)
- **Purpose**: Environment variables for server
- **Key format**: Variable name (uppercase by convention)
- **Value format**: String with optional variable substitution
- **Variable syntax**:
  - `${VAR}` - Required variable (error if missing)
  - `${VAR:-default}` - Variable with default value
- **Example**:

```json
{
  "env": {
    "API_KEY": "${DATABASE_API_KEY}",
    "PORT": "${PORT:-8080}",
    "DEBUG": "false"
  }
}
```

## Complete Example (plugin.json)

```json
{
  "name": "database-tools",
  "description": "Comprehensive database management tools with PostgreSQL support via MCP servers",
  "version": "1.2.0",
  "author": {
    "name": "Database Team"
  },
  "commands": ["./commands/db-query.md", "./commands/db-schema.md"],
  "agents": ["./agents/database-specialist.md"],
  "skills": ["./skills/database-analyzer"],
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${POSTGRES_URL}"
      }
    },
    "custom-db-server": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/custom-db/server.py",
      "args": ["--port", "8080"],
      "env": {
        "DB_HOST": "${DB_HOST:-localhost}",
        "DB_PORT": "${DB_PORT:-5432}",
        "DB_NAME": "${DB_NAME}",
        "API_KEY": "${DB_API_KEY}"
      }
    }
  }
}
```

## Validation Rules

### Syntax Validation

1. **JSON syntax**: Must be valid JSON
2. **No trailing commas**: JSON standard doesn't allow trailing commas
3. **Proper escaping**: Strings must escape special characters
4. **Consistent quotes**: Use double quotes for keys and string values

### Structural Validation

1. **Required fields present**: name, description, version
2. **Valid semver**: version follows semver pattern
3. **Valid email**: author.email (if present) is valid email format
4. **Valid URLs**: homepage and repository.url (if present) are valid URLs
5. **Arrays are arrays**: commands, agents, hooks, keywords are arrays
6. **Objects are objects**: author, repository, mcpServers are objects

### Path Validation

1. **Relative paths**: All component paths are relative to plugin root
2. **Forward slashes**: Use forward slashes in paths (not backslashes)
3. **Files exist**: All referenced files exist at specified paths
4. **Correct extensions**:
   - Commands: `.md`
   - Agents: `.md`
   - Hooks: `.json`

### MCP Server Validation

1. **Command specified**: Each server has `command` field
2. **Args is array**: If present, `args` is array of strings
3. **Env is object**: If present, `env` is object with string values
4. **Valid variable syntax**: Environment variables use `${VAR}` or `${VAR:-default}` format

## Common Validation Errors

### Syntax Errors

❌ **Trailing comma**:

```json
{
  "name": "my-plugin",
  "version": "1.0.0" // <-- Trailing comma
}
```

✅ **Correct**:

```json
{
  "name": "my-plugin",
  "version": "1.0.0"
}
```

❌ **Single quotes**:

```json
{
  "name": "my-plugin" // <-- Single quotes
}
```

✅ **Correct**:

```json
{
  "name": "my-plugin"
}
```

### Structural Errors

❌ **Missing required field**:

```json
{
  "name": "my-plugin"
  // Missing description and version
}
```

✅ **Correct**:

```json
{
  "name": "my-plugin",
  "description": "My plugin description",
  "version": "1.0.0"
}
```

❌ **Invalid semver**:

```json
{
  "version": "1.0" // <-- Missing patch version
}
```

✅ **Correct**:

```json
{
  "version": "1.0.0"
}
```

### Path Errors

❌ **Absolute path**:

```json
{
  "commands": [
    "/Users/name/plugin/commands/cmd.md" // <-- Absolute path
  ]
}
```

✅ **Correct**:

```json
{
  "commands": [
    "./commands/cmd.md" // <-- Relative path
  ]
}
```

❌ **Backslashes**:

```json
{
  "commands": [
    ".\\commands\\cmd.md" // <-- Backslashes
  ]
}
```

✅ **Correct**:

```json
{
  "commands": [
    "./commands/cmd.md" // <-- Forward slashes
  ]
}
```

### MCP Server Errors

❌ **Missing command**:

```json
{
  "mcpServers": {
    "myserver": {
      "args": ["--port", "8080"]
      // Missing command field
    }
  }
}
```

✅ **Correct**:

```json
{
  "mcpServers": {
    "myserver": {
      "command": "python3",
      "args": ["server.py", "--port", "8080"]
    }
  }
}
```

## Validation Commands

### JSON Syntax Check

```bash
# Using Python
python3 -m json.tool plugin.json

# Using jq
jq . plugin.json

# Using Node.js
node -e "JSON.parse(require('fs').readFileSync('plugin.json', 'utf8'))"
```

### Manual Validation Checklist

- [ ] Valid JSON syntax
- [ ] Required fields: name, description, version
- [ ] Version follows semver (X.Y.Z)
- [ ] Email format valid (if present)
- [ ] URLs valid (if present)
- [ ] All component paths use forward slashes
- [ ] All component paths are relative
- [ ] All referenced files exist
- [ ] Commands point to `.md` files
- [ ] Agents point to `.md` files
- [ ] Hooks point to `.json` files
- [ ] Each MCP server has `command` field
- [ ] MCP server `args` are arrays (if present)
- [ ] MCP server `env` are objects (if present)
- [ ] Environment variables use correct syntax

## Best Practices

1. **Semantic versioning**: Follow semver strictly for version management
2. **Clear descriptions**: Write descriptive, actionable descriptions
3. **Minimal keywords**: 3-7 relevant keywords for searchability
4. **Relative paths**: Always use relative paths for portability
5. **Environment variables**: Use variables for all secrets and configuration
6. **Default values**: Provide defaults where sensible (`${VAR:-default}`)
7. **Documentation**: Keep README.md updated with plugin.json changes
8. **License**: Always specify a license for clarity
9. **Repository**: Include repository URL for open source plugins
10. **Testing**: Validate JSON after every modification
