# Plugin Best Practices

Design patterns and recommendations for building high-quality Claude Code plugins.

## Plugin Design Principles

### Single Responsibility
Each plugin should have one clear purpose.

**Good**:
- `git-assistant` - Git workflow automation
- `database-tools` - Database query and management
- `api-client` - Specific API integration

**Bad**:
- `everything-plugin` - Git + database + API + testing
- `utils` - Vague, unclear purpose

### Minimal Dependencies
Only bundle what's necessary.

**Good**:
```json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["server.py"]
    }
  }
}
```

**Questionable**:
```json
{
  "commands": ["cmd1.md", "cmd2.md", ...20 more],
  "agents": ["agent1.md", ...15 more],
  "mcpServers": {...10 servers}
}
```

### Clear Naming
Names should be descriptive and follow conventions.

**Plugin names**: kebab-case
- `brave-search-wrapper` ✓
- `BraveSearchWrapper` ✗
- `bsw` ✗

**Server names**: kebab-case or snake_case
- `git-tools` ✓
- `file_system` ✓
- `GitTools` ✗

## File Organization

### Recommended Structure

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # Plugin metadata
├── commands/                # Slash commands (if needed)
│   └── my-command.md
├── agents/                  # Agent definitions (if needed)
│   └── my-agent.md
├── servers/                 # MCP servers (if custom)
│   └── my-server/
│       ├── server.py
│       ├── requirements.txt
│       └── README.md
├── hooks/                   # Workflow hooks (if needed)
│   └── hooks.json
├── .gitignore
├── .env.example
├── LICENSE
└── README.md
```

### .gitignore Template

```gitignore
# Environment
.env
.env.local
.env.*.local

# Python
__pycache__/
*.py[cod]
*.so
.venv/
venv/
.pytest_cache/

# Node
node_modules/
npm-debug.log
yarn-error.log
dist/
build/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Secrets
*.key
*.pem
secrets/
credentials.json
```

## Configuration Best Practices

### Environment Variables

**Always use environment variables for**:
- API keys and tokens
- Database URLs
- Service endpoints (that change between environments)
- Feature flags

**Example plugin.json**:
```json
{
  "mcpServers": {
    "api-client": {
      "env": {
        "API_KEY": "${API_KEY}",
        "API_URL": "${API_URL:-https://api.production.com}",
        "TIMEOUT": "${TIMEOUT:-30}",
        "DEBUG": "${DEBUG:-false}"
      }
    }
  }
}
```

**Provide .env.example**:
```bash
# Required
API_KEY=your_api_key_here

# Optional (has defaults)
API_URL=https://api.staging.com
TIMEOUT=60
DEBUG=true
```

### Path References

**Use ${CLAUDE_PLUGIN_ROOT} for plugin-relative paths**:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/my-server/server.py"]
    }
  }
}
```

**Not hardcoded paths**:
```json
{
  "command": "/Users/me/.claude/plugins/my-plugin/server.py"  // ✗ BAD
}
```

## Documentation Standards

### README.md Structure

```markdown
# Plugin Name

Brief description of what the plugin does.

## Features

- Feature 1
- Feature 2
- Feature 3

## Installation

\`\`\`bash
/plugin install plugin-name
\`\`\`

## Configuration

### Required Environment Variables

- `API_KEY` - Your API key from [service](https://example.com)
- `DATABASE_URL` - Database connection string

### Optional Environment Variables

- `PORT` - Server port (default: 8080)
- `DEBUG` - Enable debug mode (default: false)

### Setup

1. Copy .env.example to .env
2. Fill in required values
3. Restart Claude Code

## Usage

### Commands

\`\`\`bash
/my-command <args>
\`\`\`

### Tools

Available MCP tools:
- `tool_name` - Description of what it does

### Example

\`\`\`
Use the tool_name tool to search for "example"
\`\`\`

## Troubleshooting

### Plugin not loading
- Check plugin.json syntax with `python -m json.tool .claude-plugin/plugin.json`
- Verify all environment variables are set

### Server not connecting
- Check logs with `claude --debug`
- Verify command path is correct

## Development

### Setup Dev Environment

\`\`\`bash
cd servers/my-server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
\`\`\`

### Run Tests

\`\`\`bash
pytest tests/
\`\`\`

## License

MIT License - see LICENSE file
```

## Versioning

### Semantic Versioning

Follow [semver](https://semver.org/):

- **MAJOR** (1.0.0 → 2.0.0): Breaking changes
- **MINOR** (1.0.0 → 1.1.0): New features, backward compatible
- **PATCH** (1.0.0 → 1.0.1): Bug fixes, backward compatible

**Examples**:
- Add new tool → MINOR bump
- Fix tool bug → PATCH bump
- Change tool parameter (breaking) → MAJOR bump
- Remove tool → MAJOR bump

### Changelog

Keep CHANGELOG.md updated:

```markdown
# Changelog

## [2.0.0] - 2024-01-15

### Changed
- BREAKING: `search` tool now requires `limit` parameter

### Added
- New `batch_search` tool for multiple queries

### Fixed
- Fixed timeout issue in `api_call` tool

## [1.1.0] - 2024-01-01

### Added
- New `analyze` tool

### Fixed
- Improved error messages
```

## MCP Server Best Practices

### Tool Design

**Good tool design**:
```python
Tool(
    name="search_documents",  # Clear, action-oriented name
    description="Search documents by query with optional filters",  # Detailed
    inputSchema={
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query string (min 3 chars)",
                "minLength": 3
            },
            "limit": {
                "type": "number",
                "description": "Max results (default: 10)",
                "default": 10,
                "minimum": 1,
                "maximum": 100
            }
        },
        "required": ["query"]
    }
)
```

### Error Messages

**Good error messages are**:
- **Actionable**: Tell user what to do
- **Specific**: Explain exactly what went wrong
- **Safe**: Don't expose secrets or internal details

**Examples**:

```python
# ✓ GOOD
raise McpError(
    ErrorCode.InvalidParams,
    "Missing required parameter 'query'. Please provide a search query."
)

# ✓ GOOD
raise McpError(
    ErrorCode.InternalError,
    "External API unavailable. Please try again in a few minutes."
)

# ✗ BAD - Not actionable
raise McpError(ErrorCode.InternalError, "Error")

# ✗ BAD - Exposes internals
raise McpError(
    ErrorCode.InternalError,
    f"Database connection failed: host=db.internal port=5432 user=admin"
)
```

### Logging

**Log appropriately**:

```python
import logging

logger = logging.getLogger(__name__)

# ✓ GOOD: Informative logging
logger.info("Processing search query")
logger.debug(f"Search parameters: query='{query}', limit={limit}")
logger.error("External API timeout", exc_info=True)

# ✗ BAD: Logging secrets
logger.info(f"API key: {API_KEY}")

# ✗ BAD: Too verbose in production
logger.info(f"Processing byte {i} of {total}")  # in loop
```

## Testing Best Practices

### Test Coverage

Aim for:
- **90%+** for tools
- **85%+** for resources
- **80%+** for prompts
- **95%+** for error handling

### Test Organization

```
tests/
├── unit/
│   ├── test_tools.py
│   ├── test_resources.py
│   └── test_prompts.py
├── integration/
│   └── test_workflows.py
└── fixtures/
    └── sample_data.json
```

### Example Test

```python
import pytest

@pytest.mark.asyncio
async def test_search_tool_valid_input():
    """Test search tool with valid input."""
    result = await server.call_tool(
        "search_documents",
        {"query": "test", "limit": 5}
    )

    assert len(result) > 0
    assert result[0].type == "text"
    assert "results" in result[0].text.lower()

@pytest.mark.asyncio
async def test_search_tool_missing_required():
    """Test error when required parameter missing."""
    with pytest.raises(McpError) as exc:
        await server.call_tool("search_documents", {})

    assert exc.value.code == ErrorCode.InvalidParams
    assert "query" in str(exc.value.message).lower()
```

## Performance Optimization

### Caching

```python
from functools import lru_cache
import time

@lru_cache(maxsize=100)
def cached_operation(query: str, timestamp: int):
    """Cache results for 5 minutes."""
    return expensive_operation(query)

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    # Timestamp changes every 5 minutes (300 seconds)
    cache_key = int(time.time() / 300)
    result = cached_operation(arguments["query"], cache_key)
    return [TextContent(type="text", text=result)]
```

### Connection Pooling

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

# Connection pool for database
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20
)

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    with engine.connect() as conn:
        result = conn.execute(query)
    return [TextContent(type="text", text=str(result))]
```

### Async Operations

```python
import asyncio

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "batch_process":
        # Process items concurrently
        tasks = [process_item(item) for item in arguments["items"]]
        results = await asyncio.gather(*tasks)

        return [TextContent(type="text", text=json.dumps(results))]
```

## Distribution

### Plugin Registry (if available)

When submitting to official registry:
- Complete plugin.json metadata
- Comprehensive README
- LICENSE file
- Tests included
- Security audit passed

### GitHub Distribution

**Release checklist**:
- [ ] Version bumped in plugin.json
- [ ] CHANGELOG updated
- [ ] Git tag created (`git tag v1.0.0`)
- [ ] GitHub release created with notes
- [ ] Installation tested from GitHub URL

**Installation via GitHub**:
```bash
/plugin install https://github.com/username/plugin-name
```

### Local Distribution

For team/organization:
- Shared network location
- Internal package registry
- Git repository (private)

```bash
/plugin install file:///shared/plugins/my-plugin
```

## Maintenance

### Regular Updates

- **Dependencies**: Update monthly
- **Security patches**: Apply immediately
- **Bug fixes**: Release as needed
- **Features**: Plan in versions

### Deprecation Policy

When removing features:
1. Mark as deprecated in docs (1+ version before removal)
2. Log warning when used
3. Provide migration path
4. Remove in next MAJOR version

**Example**:
```python
@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "old_tool":
        logger.warning(
            "old_tool is deprecated and will be removed in v2.0. "
            "Use new_tool instead."
        )
        # Still execute but warn
```

## Common Pitfalls

### ✗ Don't: Hardcode Secrets

```json
{
  "env": {
    "API_KEY": "sk_live_abc123"  // ✗ BAD
  }
}
```

### ✓ Do: Use Environment Variables

```json
{
  "env": {
    "API_KEY": "${API_KEY}"  // ✓ GOOD
  }
}
```

### ✗ Don't: Use Absolute Paths

```json
{
  "command": "/Users/me/plugin/server.py"  // ✗ BAD
}
```

### ✓ Do: Use Plugin Root

```json
{
  "command": "${CLAUDE_PLUGIN_ROOT}/servers/my-server/server.py"  // ✓ GOOD
}
```

### ✗ Don't: Ignore Errors

```python
try:
    result = api.call()
except:
    pass  // ✗ BAD
```

### ✓ Do: Handle Errors Properly

```python
try:
    result = api.call()
except APIError as e:
    logger.error(f"API call failed: {e}")
    raise McpError(
        ErrorCode.InternalError,
        "External service unavailable"
    )  // ✓ GOOD
```

### ✗ Don't: Create Mega Plugins

One plugin doing everything (✗ BAD)

### ✓ Do: Create Focused Plugins

Multiple focused plugins (✓ GOOD)

## Checklist Before Publishing

- [ ] plugin.json complete with all metadata
- [ ] README comprehensive
- [ ] LICENSE file included
- [ ] .gitignore configured
- [ ] .env.example provided
- [ ] No secrets committed
- [ ] Tests passing
- [ ] Documentation reviewed
- [ ] Version tagged
- [ ] CHANGELOG updated
