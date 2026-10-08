#!/bin/bash
# Initialize Claude Code Marketplace
# Usage: ./init_marketplace.sh <marketplace-name> [path]

set -e

MARKETPLACE_NAME="${1}"
BASE_PATH="${2:-.}"
MARKETPLACE_PATH="${BASE_PATH}/${MARKETPLACE_NAME}"

if [ -z "$MARKETPLACE_NAME" ]; then
  echo "Error: Marketplace name required"
  echo "Usage: ./init_marketplace.sh <marketplace-name> [path]"
  exit 1
fi

echo "Creating marketplace: ${MARKETPLACE_NAME}"
echo "Path: ${MARKETPLACE_PATH}"

# Create directory structure
mkdir -p "${MARKETPLACE_PATH}/.claude-plugin"

# Create marketplace.json
cat > "${MARKETPLACE_PATH}/.claude-plugin/marketplace.json" <<EOF
{
  "name": "${MARKETPLACE_NAME}",
  "owner": {
    "name": "Your Name"
  },
  "plugins": []
}
EOF

# Create .gitignore
cat > "${MARKETPLACE_PATH}/.gitignore" <<EOF
# Environment
.env
.env.local
.env.*.local

# Python (in plugins)
__pycache__/
*.py[cod]
*.so
.venv/
venv/
.pytest_cache/

# Node (in plugins)
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
EOF

# Create README.md
cat > "${MARKETPLACE_PATH}/README.md" <<EOF
# ${MARKETPLACE_NAME}

A collection of Claude Code plugins.

## Plugins

[List plugins here]

## Installation

### Install all plugins:
\`\`\`bash
/plugin install /path/to/${MARKETPLACE_NAME}
\`\`\`

### Install individual plugin:
\`\`\`bash
/plugin install /path/to/${MARKETPLACE_NAME}/plugin-name
\`\`\`

## Adding Plugins

To add a new plugin to this marketplace:

1. Create plugin directory:
   \`\`\`bash
   ./scripts/add_plugin.sh ${MARKETPLACE_NAME} plugin-name
   \`\`\`

2. Edit \`plugin-name/.claude-plugin/plugin.json\`

3. Add plugin components (commands, agents, etc.)

4. Update this README

## License

MIT
EOF

# Create add_plugin helper script
cat > "${MARKETPLACE_PATH}/scripts/add_plugin.sh" <<'SCRIPT'
#!/bin/bash
# Add plugin to marketplace
# Usage: ./add_plugin.sh <marketplace-path> <plugin-name>

set -e

MARKETPLACE_PATH="${1}"
PLUGIN_NAME="${2}"

if [ -z "$MARKETPLACE_PATH" ] || [ -z "$PLUGIN_NAME" ]; then
  echo "Usage: ./add_plugin.sh <marketplace-path> <plugin-name>"
  exit 1
fi

PLUGIN_PATH="${MARKETPLACE_PATH}/${PLUGIN_NAME}"

echo "Adding plugin '${PLUGIN_NAME}' to marketplace"

# Create plugin structure (same as individual plugin)
mkdir -p "${PLUGIN_PATH}/.claude-plugin"
mkdir -p "${PLUGIN_PATH}/commands"
mkdir -p "${PLUGIN_PATH}/agents"
mkdir -p "${PLUGIN_PATH}/skills"
mkdir -p "${PLUGIN_PATH}/servers"

# Create plugin.json
cat > "${PLUGIN_PATH}/.claude-plugin/plugin.json" <<EOF
{
  "name": "${PLUGIN_NAME}",
  "description": "Description of ${PLUGIN_NAME}",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
EOF

# Create plugin README
cat > "${PLUGIN_PATH}/README.md" <<EOF
# ${PLUGIN_NAME}

Description of what this plugin does.

## Installation

\`\`\`bash
/plugin install /path/to/marketplace/${PLUGIN_NAME}
\`\`\`

## Configuration

[Add configuration details]

## Usage

[Add usage examples]
EOF

echo "✓ Plugin '${PLUGIN_NAME}' created"
echo ""
echo "Next steps:"
echo "  1. Edit ${PLUGIN_NAME}/.claude-plugin/plugin.json"
echo "  2. Add components to ${PLUGIN_NAME}/"
echo "  3. Update marketplace.json to reference this plugin"
echo ""
echo "Add to marketplace.json:"
echo "  {"
echo "    \"name\": \"${PLUGIN_NAME}\","
echo "    \"source\": \"./${PLUGIN_NAME}\","
echo "    \"description\": \"Description\""
echo "  }"
SCRIPT

chmod +x "${MARKETPLACE_PATH}/scripts/add_plugin.sh"

echo "✓ Marketplace structure created successfully"
echo ""
echo "Next steps:"
echo "  1. Add plugins: cd ${MARKETPLACE_PATH} && ./scripts/add_plugin.sh . plugin-name"
echo "  2. Update .claude-plugin/marketplace.json"
echo "  3. Update README.md"
echo ""
echo "Test installation:"
echo "  /plugin install ${MARKETPLACE_PATH}"
