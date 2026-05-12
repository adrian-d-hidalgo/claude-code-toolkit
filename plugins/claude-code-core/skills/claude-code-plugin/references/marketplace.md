# Workflow A2: Create Marketplace

## Overview

Create marketplace to group multiple related plugins.

## Decision Points

1. **Marketplace theme?** → What connects these plugins?
2. **How many plugins?** → Start with 2-3, can add more later
3. **Plugin purposes?** → What does each plugin do?

## Execution Steps

### 1. Gather Requirements

Ask user (max 3 questions):
- What is the theme/purpose of this marketplace?
- How many plugins initially? (2-5 recommended)
- Brief description of each plugin's purpose

### 2. Initialize with Script

```bash
bash scripts/init_marketplace.sh marketplace-name [path]
```

This creates:
```
marketplace-name/
├── .claude-plugin/marketplace.json
├── scripts/add_plugin.sh
├── .gitignore
└── README.md
```

Load `assets/templates/marketplace-structure.md` for complete structure reference.

### 3. Configure marketplace.json

Edit `.claude-plugin/marketplace.json`:
```json
{
  "name": "marketplace-name",
  "owner": {
    "name": "Your Name"
  },
  "plugins": []
}
```

### 4. Add Plugins

For each plugin in the marketplace:

```bash
cd marketplace-name
bash scripts/add_plugin.sh . plugin-1-name
```

This creates plugin structure using Individual Plugin pattern:
```
marketplace-name/
├── .claude-plugin/marketplace.json
└── plugin-1-name/
    ├── .claude-plugin/plugin.json  ← Individual plugin config
    ├── commands/
    ├── agents/
    └── servers/
```

### 5. Configure Each Plugin

For each plugin, follow **Workflow A1 steps 3-7** (configure plugin.json, add components, etc.)

Each plugin is a **complete Individual Plugin**.

### 6. Update marketplace.json

Add plugin reference:
```json
{
  "name": "marketplace-name",
  "owner": {
    "name": "Your Name"
  },
  "plugins": [
    {
      "name": "plugin-1-name",
      "source": "./plugin-1-name",
      "description": "Brief description"
    },
    {
      "name": "plugin-2-name",
      "source": "./plugin-2-name",
      "description": "Brief description"
    }
  ]
}
```

### 7. Generate Documentation

Update marketplace README.md:
- Overview of marketplace theme
- List of plugins with brief descriptions
- Installation instructions (full marketplace vs individual plugins)
- Links to each plugin's README

Load `references/marketplace-best-practices.md` for patterns.

### 8. Validate

```bash
python -m json.tool .claude-plugin/marketplace.json
python -m json.tool plugin-1-name/.claude-plugin/plugin.json
python -m json.tool plugin-2-name/.claude-plugin/plugin.json
```

### 9. Test Locally

```bash
# Test full marketplace installation
/plugin install /absolute/path/to/marketplace-name

# Test individual plugin installation
/plugin install /absolute/path/to/marketplace-name/plugin-1-name

# Verify
/plugin list
/mcp status
```
