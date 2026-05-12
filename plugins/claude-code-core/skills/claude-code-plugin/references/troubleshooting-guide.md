# Troubleshooting Guide

Common issues and solutions for Claude Code plugins and MCP servers.

## Quick Diagnostic Commands

```bash
# Debug mode - shows detailed loading and connection info
claude --debug

# List all configured MCP servers
claude mcp list

# Check specific server details
claude mcp get server-name

# Interactive MCP status
/mcp
/mcp status

# List installed plugins
/plugin list
```

## Plugin Issues

### Plugin Not Loading

**Symptoms**:
- Plugin doesn't appear in `/plugin list`
- Commands from plugin not available in `/help`
- Agents from plugin not activated

**Diagnosis**:

1. **Check plugin installation**:
   ```bash
   /plugin list
   # Should show your plugin
   ```

2. **Verify plugin.json exists**:
   ```bash
   ls -la /path/to/plugin/.claude-plugin/plugin.json
   ```

3. **Check JSON syntax**:
   ```bash
   python3 -m json.tool /path/to/plugin/.claude-plugin/plugin.json
   ```

4. **Enable debug mode**:
   ```bash
   claude --debug
   # Look for plugin loading errors
   ```

**Solutions**:

✅ **Invalid plugin.json**:
- Validate JSON syntax (no trailing commas, proper quotes)
- Check all required fields present (name, description, version)
- Verify paths use forward slashes

✅ **Plugin not installed correctly**:
```bash
# Reinstall plugin
/plugin remove plugin-name
/plugin install /path/to/plugin
```

✅ **Restart required**:
```bash
# Exit Claude Code and restart
# Plugins load on startup
```

✅ **Permission issues**:
```bash
# Check plugin directory permissions
ls -la ~/.claude/plugins/plugin-name
chmod -R 755 ~/.claude/plugins/plugin-name
```

### Commands Not Appearing

**Symptoms**:
- Plugin loaded but commands missing from `/help`
- Command files exist but not recognized

**Diagnosis**:

1. **Check plugin.json**:
   ```json
   {
     "commands": [
       "./commands/my-command.md"  // Path correct?
     ]
   }
   ```

2. **Verify command files exist**:
   ```bash
   ls -la /path/to/plugin/commands/
   ```

3. **Check command file format**:
   - Must be `.md` file
   - Should have proper markdown structure

**Solutions**:

✅ **Incorrect path in plugin.json**:
```json
// ❌ Wrong
"commands": [
  "commands/my-command.md"  // Missing ./
]

// ✅ Correct
"commands": [
  "./commands/my-command.md"
]
```

✅ **File doesn't exist**:
```bash
# Create missing command file
mkdir -p /path/to/plugin/commands
touch /path/to/plugin/commands/my-command.md
```

✅ **Restart Claude Code**:
- Commands loaded on startup
- Exit and restart after changes

### Agents Not Activating

**Symptoms**:
- Agent defined but never triggers
- Agent not listed in available agents

**Diagnosis**:

1. **Check agent YAML frontmatter**:
   ```yaml
   ---
   name: my-agent
   description: Agent description with activation triggers
   tools: [Read, Write]
   ---
   ```

2. **Verify agent path in plugin.json**:
   ```json
   {
     "agents": [
       "./agents/my-agent.md"
     ]
   }
   ```

3. **Check activation description**:
   - Too generic? Won't match user intent
   - Too specific? Won't trigger when needed

**Solutions**:

✅ **Invalid YAML frontmatter**:
- Check YAML syntax (proper indentation, no tabs)
- Verify required fields: name, description, tools

✅ **Poor activation triggers**:
```yaml
# ❌ Too generic
description: Helps with files

# ✅ Specific triggers
description: >
  Database specialist for PostgreSQL, MySQL, and MongoDB.
  Use when querying databases, designing schemas, or optimizing queries.
```

✅ **Missing from plugin.json**:
```json
{
  "agents": [
    "./agents/my-agent.md"  // Add if missing
  ]
}
```

## MCP Server Issues

### Server Not Connecting

**Symptoms**:
- Server shows as "Disconnected" in `/mcp status`
- Tools from server not available
- Error messages in debug mode

**Diagnosis**:

1. **Check server configuration**:
   ```bash
   claude mcp get server-name
   ```

2. **Verify command exists**:
   ```bash
   which npx
   which python3
   # Or check absolute path
   ls -la /path/to/server
   ```

3. **Check server logs**:
   ```bash
   claude --debug
   # Look for server startup errors
   ```

4. **Test command manually**:
   ```bash
   # Try running server command directly
   npx -y @modelcontextprotocol/server-filesystem /path
   python3 /path/to/server.py
   ```

**Solutions**:

✅ **Command not found**:
```json
// ❌ Command not in PATH
{
  "command": "myserver"
}

// ✅ Use absolute path or ensure command in PATH
{
  "command": "/usr/local/bin/myserver"
}
// Or
{
  "command": "npx"  // Common command in PATH
}
```

✅ **Incorrect arguments**:
```json
// Check args order and format
{
  "command": "python3",
  "args": [
    "/absolute/path/to/server.py",  // Absolute path
    "--port", "8080"
  ]
}
```

✅ **Permission issues**:
```bash
# Make server executable
chmod +x /path/to/server.py

# Or check Python executable
which python3
```

✅ **Port already in use**:
```json
// Change port in configuration
{
  "env": {
    "PORT": "8081"  // Use different port
  }
}
```

### Tools Not Appearing

**Symptoms**:
- Server connected but no tools visible
- `/mcp` shows server but empty tool list

**Diagnosis**:

1. **Check server code**:
   - Are tools registered correctly?
   - Tool registration syntax correct?

2. **Test with MCP Inspector**:
   ```bash
   npx @modelcontextprotocol/inspector python3 server.py
   ```

3. **Check server output**:
   ```bash
   claude --debug
   # Look for tool registration messages
   ```

**Solutions**:

✅ **Tools not registered**:
```python
# ❌ Tool defined but not registered
def my_tool():
    pass

# ✅ Tool properly registered
@server.tool()
async def my_tool(param: str) -> str:
    """Tool description"""
    return result
```

✅ **Server crashed on startup**:
- Check debug logs for errors
- Verify all dependencies installed
- Test server independently

✅ **Restart Claude Code**:
- Tool list may need refresh
- Exit and restart

### Environment Variables Not Working

**Symptoms**:
- Server fails with missing credentials
- Error: "Environment variable not set"
- API calls fail with auth errors

**Diagnosis**:

1. **Check variable is set**:
   ```bash
   echo $API_KEY
   echo $DATABASE_URL
   ```

2. **Verify configuration syntax**:
   ```json
   {
     "env": {
       "API_KEY": "${API_KEY}"  // Correct syntax?
     }
   }
   ```

3. **Check Claude has access**:
   ```bash
   claude --debug
   # Look for environment variable resolution
   ```

**Solutions**:

✅ **Variable not set in environment**:
```bash
# Set in shell profile
export API_KEY="your-key"
export DATABASE_URL="postgresql://..."

# Or create .env file
echo 'API_KEY=your-key' > .env
echo 'DATABASE_URL=postgresql://...' >> .env

# Source environment
source .env
```

✅ **Incorrect syntax**:
```json
// ❌ Missing ${} syntax
{
  "env": {
    "API_KEY": "API_KEY"  // Wrong!
  }
}

// ✅ Correct variable substitution
{
  "env": {
    "API_KEY": "${API_KEY}"
  }
}
```

✅ **Variable not exported**:
```bash
# ❌ Not exported
API_KEY="value"

# ✅ Exported
export API_KEY="value"
```

✅ **Restart required**:
- Environment changes require restart
- Exit Claude Code and restart

### Server Crashes or Timeouts

**Symptoms**:
- Server starts but crashes quickly
- Tools timeout when executed
- Intermittent connection issues

**Diagnosis**:

1. **Check server logs**:
   - Add logging to server code
   - Use `console.error()` or `logging.error()`

2. **Test server independently**:
   ```bash
   # Run server directly to see errors
   python3 server.py
   node dist/index.js
   ```

3. **Check resource usage**:
   ```bash
   # Monitor while server runs
   top
   ps aux | grep server
   ```

**Solutions**:

✅ **Missing dependencies**:
```bash
# Python
pip install -r requirements.txt

# Node.js
npm install

# .NET
dotnet restore
```

✅ **Uncaught exceptions**:
```python
# Add error handling
@server.tool()
async def my_tool(param: str) -> str:
    try:
        result = process(param)
        return result
    except Exception as e:
        logging.error(f"Tool error: {e}")
        return f"Error: {e}"
```

✅ **Increase timeout**:
```json
// For long-running operations
{
  "env": {
    "TIMEOUT": "60000"  // 60 seconds
  }
}
```

✅ **Memory issues**:
- Check server memory usage
- Optimize data processing
- Add connection pooling
- Implement caching

## Configuration Issues

### Invalid JSON Syntax

**Symptoms**:
- Parse error when loading config
- "Unexpected token" errors
- Config file not recognized

**Diagnosis**:

```bash
# Validate JSON syntax
python3 -m json.tool plugin.json
python3 -m json.tool .mcp.json

# Or use jq
jq . plugin.json
```

**Solutions**:

✅ **Trailing comma**:
```json
// ❌ Trailing comma
{
  "name": "plugin",
  "version": "1.0.0",  // <-- Remove this comma
}

// ✅ No trailing comma
{
  "name": "plugin",
  "version": "1.0.0"
}
```

✅ **Single quotes**:
```json
// ❌ Single quotes
{
  'name': 'plugin'
}

// ✅ Double quotes
{
  "name": "plugin"
}
```

✅ **Unquoted keys**:
```json
// ❌ Unquoted keys
{
  name: "plugin"
}

// ✅ Quoted keys
{
  "name": "plugin"
}
```

✅ **Invalid escape sequences**:
```json
// ❌ Invalid backslash
{
  "path": "C:\Users\name"
}

// ✅ Escaped backslashes
{
  "path": "C:\\Users\\name"
}

// ✅ Or use forward slashes
{
  "path": "C:/Users/name"
}
```

### Path Issues

**Symptoms**:
- Files not found
- "No such file or directory" errors
- Components not loading

**Diagnosis**:

1. **Check path format**:
   - Relative vs absolute
   - Forward slashes vs backslashes
   - Correct from plugin/project root

2. **Verify files exist**:
   ```bash
   ls -la /path/to/file
   ```

**Solutions**:

✅ **Absolute paths in plugin.json**:
```json
// ❌ Absolute path (not portable)
{
  "commands": [
    "/Users/me/plugin/commands/cmd.md"
  ]
}

// ✅ Relative path
{
  "commands": [
    "./commands/cmd.md"
  ]
}
```

✅ **Backslashes**:
```json
// ❌ Backslashes
{
  "commands": [
    ".\\commands\\cmd.md"
  ]
}

// ✅ Forward slashes
{
  "commands": [
    "./commands/cmd.md"
  ]
}
```

✅ **Wrong working directory**:
```json
// Use ${PWD} for project-relative paths
{
  "args": [
    "${PWD}/scripts/tool.py"
  ]
}

// Or absolute paths
{
  "args": [
    "/absolute/path/to/tool.py"
  ]
}
```

### Version Conflicts

**Symptoms**:
- Dependency version mismatches
- "Incompatible version" errors
- Features not working as expected

**Diagnosis**:

1. **Check versions**:
   ```bash
   # Node packages
   npm list @modelcontextprotocol/sdk

   # Python packages
   pip show mcp

   # Claude Code version
   claude --version
   ```

2. **Check compatibility**:
   - Plugin specifies minimum versions?
   - MCP SDK version compatible?

**Solutions**:

✅ **Update dependencies**:
```bash
# Node.js
npm update
npm install @modelcontextprotocol/sdk@latest

# Python
pip install --upgrade mcp
```

✅ **Specify versions in plugin**:
```json
{
  "engines": {
    "claude": ">=1.0.0",
    "node": ">=18.0.0"
  }
}
```

✅ **Lock dependency versions**:
```bash
# Node.js
npm install @modelcontextprotocol/sdk@1.2.3

# Python
echo "mcp==1.2.3" > requirements.txt
pip install -r requirements.txt
```

## Performance Issues

### Slow Server Response

**Symptoms**:
- Tools take long time to execute
- Timeouts on operations
- UI feels sluggish

**Diagnosis**:

1. **Profile server performance**:
   - Add timing logs
   - Monitor resource usage
   - Check database query performance

2. **Test with simple operations**:
   - Are simple tools fast?
   - Is it specific to certain tools?

**Solutions**:

✅ **Add caching**:
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def expensive_operation(param):
    # Cached result
    return result
```

✅ **Optimize database queries**:
```python
# Add indexes
# Use connection pooling
# Batch operations
```

✅ **Async operations**:
```python
# Use async for I/O operations
async def fetch_data():
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()
```

✅ **Increase timeout**:
```json
{
  "env": {
    "TIMEOUT": "30000"  // 30 seconds
  }
}
```

### High Memory Usage

**Symptoms**:
- System slows down
- Out of memory errors
- Server crashes

**Diagnosis**:

1. **Monitor memory**:
   ```bash
   # Check server memory usage
   ps aux | grep server
   top -p <server-pid>
   ```

2. **Profile memory usage**:
   - Add memory logging
   - Check for memory leaks

**Solutions**:

✅ **Stream large data**:
```python
# Don't load entire file into memory
def read_large_file(file_path):
    with open(file_path, 'r') as f:
        for line in f:
            yield line
```

✅ **Implement pagination**:
```python
# Return data in chunks
def get_records(page=1, per_page=100):
    offset = (page - 1) * per_page
    return db.query().limit(per_page).offset(offset)
```

✅ **Clear caches periodically**:
```python
import gc

# Trigger garbage collection
gc.collect()
```

## Security Issues

### Exposed Secrets

**Symptoms**:
- Hardcoded credentials in config
- API keys in version control
- Sensitive data in logs

**Solutions**:

✅ **Use environment variables**:
```json
// ❌ Hardcoded
{
  "env": {
    "API_KEY": "sk-abc123"
  }
}

// ✅ Variable substitution
{
  "env": {
    "API_KEY": "${API_KEY}"
  }
}
```

✅ **Add to .gitignore**:
```
.env
.env.local
**/secrets.json
**/*.key
```

✅ **Remove from git history**:
```bash
# If accidentally committed
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all
```

### Permission Issues

**Symptoms**:
- "Permission denied" errors
- Can't read/write files
- Server won't start

**Solutions**:

✅ **Fix file permissions**:
```bash
# Make script executable
chmod +x server.py

# Fix directory permissions
chmod 755 directory/

# Fix file permissions
chmod 644 file.txt
```

✅ **Check user permissions**:
```bash
# Check file owner
ls -la file.txt

# Change owner if needed
chown user:group file.txt
```

## Debug Checklist

When encountering issues, work through this checklist:

- [ ] Run `claude --debug` and review output
- [ ] Check JSON syntax with `python3 -m json.tool`
- [ ] Verify all files exist at specified paths
- [ ] Confirm environment variables are set
- [ ] Test server command independently
- [ ] Check for port conflicts
- [ ] Review server logs for errors
- [ ] Verify dependencies are installed
- [ ] Restart Claude Code
- [ ] Try minimal configuration first
- [ ] Check file and directory permissions
- [ ] Review recent changes to configuration
- [ ] Test with official reference servers
- [ ] Check Claude Code version compatibility

## Getting Help

If issues persist:

1. **Enable debug mode**: `claude --debug`
2. **Collect logs**: Save debug output
3. **Minimal reproduction**: Create minimal config that shows issue
4. **Check documentation**: Review official Claude Code docs
5. **Search issues**: Check GitHub issues for similar problems
6. **Report bug**: File issue with reproduction steps
