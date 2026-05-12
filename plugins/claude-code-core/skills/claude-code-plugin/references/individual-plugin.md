# Workflow A1: Create Individual Plugin

## Overview

Create standalone plugin with capabilities in root directory.

## Decision Points

1. **Plugin purpose?** → Define specific functionality
2. **Components needed?** → Commands/agents/skills/MCP servers/hooks
3. **MCP capabilities?** → Tools/resources/prompts (if applicable)

## Execution Steps

### 1. Gather Requirements

Ask user (max 2 questions):
- What specific functionality should this plugin provide?
- Which components needed? (commands/agents/skills/servers/hooks)

### 2. Initialize with Script

```bash
bash scripts/init_plugin.sh plugin-name [path]
```

This creates:
```
plugin-name/
├── .claude-plugin/plugin.json
├── commands/
├── agents/
├── skills/
├── servers/
├── hooks/
├── .gitignore
├── .env.example
└── README.md
```

Load `assets/templates/plugin-structure-individual.md` for complete structure reference.

### 3. Configure plugin.json

Edit `.claude-plugin/plugin.json`:
```json
{
  "name": "plugin-name",
  "description": "Clear description",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

### 4. Add Components

For each component type:
- **Commands** → Create `.md` in `commands/`, add path to `plugin.json`
- **Agents** → Create `.md` in `agents/`, add path to `plugin.json`
- **Skills** → Create directory in `skills/` with `SKILL.md`, add path to `plugin.json`
- **Hooks** → Create `hooks.json` in `hooks/`, add path to `plugin.json`
- **MCP Servers** → Follow Workflow B, add config to `plugin.json`

Load `references/plugin-examples.md` for examples.

### 5. Configure Environment

- Edit `.env.example` with required variables
- Document variables in README.md
- Use `${VARIABLE}` syntax in plugin.json for MCP servers

### 6. Generate Documentation

Update README.md with:
- Features list
- Installation instructions
- Configuration details
- Usage examples

Load `assets/templates/plugin-readme-template.md` for complete template.

### 7. Validate

```bash
python -m json.tool .claude-plugin/plugin.json
```

Load `references/plugin-schema.md` for validation rules.

### 8. Test Locally

```bash
/plugin install /absolute/path/to/plugin-name
/plugin list
/mcp status  # If plugin has MCP servers
```

Load `references/troubleshooting-guide.md` if issues occur.
