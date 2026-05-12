#!/bin/bash
# Initialize Claude Code Plugin (Individual)
# Usage: ./init_plugin.sh <plugin-name> [path]

set -e

PLUGIN_NAME="${1}"
BASE_PATH="${2:-.}"
PLUGIN_PATH="${BASE_PATH}/${PLUGIN_NAME}"

if [ -z "$PLUGIN_NAME" ]; then
  echo "Error: Plugin name required"
  echo "Usage: ./init_plugin.sh <plugin-name> [path]"
  exit 1
fi

echo "Creating plugin: ${PLUGIN_NAME}"
echo "Path: ${PLUGIN_PATH}"

# Create directory structure
mkdir -p "${PLUGIN_PATH}/.claude-plugin"
mkdir -p "${PLUGIN_PATH}/commands"
mkdir -p "${PLUGIN_PATH}/agents"
mkdir -p "${PLUGIN_PATH}/skills"
mkdir -p "${PLUGIN_PATH}/servers"
mkdir -p "${PLUGIN_PATH}/hooks"

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

# Create .gitignore
cat > "${PLUGIN_PATH}/.gitignore" <<EOF
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
EOF

# Create .env.example
cat > "${PLUGIN_PATH}/.env.example" <<EOF
# Required environment variables
# API_KEY=your_api_key_here

# Optional environment variables
# DEBUG=false
EOF

# Create README.md
cat > "${PLUGIN_PATH}/README.md" <<EOF
# ${PLUGIN_NAME}

Description of what this plugin does.

## Installation

\`\`\`bash
/plugin install /path/to/${PLUGIN_NAME}
\`\`\`

## Configuration

### Environment Variables

- \`API_KEY\` - Required. Your API key
- \`DEBUG\` - Optional. Enable debug mode (default: false)

### Setup

1. Copy \`.env.example\` to \`.env\`
2. Fill in required values
3. Restart Claude Code

## Usage

[Add usage examples here]

## License

MIT
EOF

echo "✓ Plugin structure created successfully"
echo ""
echo "Next steps:"
echo "  1. Edit .claude-plugin/plugin.json"
echo "  2. Add commands to commands/"
echo "  3. Add agents to agents/"
echo "  4. Add MCP servers to servers/"
echo "  5. Update README.md"
echo ""
echo "Test installation:"
echo "  /plugin install ${PLUGIN_PATH}"
