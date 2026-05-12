## Workflow J: Documentation Generation

### Execution Steps

**1. Gather Information**

For plugin:
- Read plugin.json
- Inventory components
- List capabilities

For MCP server:
- Extract tools/resources/prompts from code
- Identify configuration options

**2. Generate README**

For plugin → Load `assets/templates/plugin-readme-template.md`
For MCP server → Load `assets/templates/mcp-server-readme-template.md`

**3. Generate API Reference**

For MCP server → Load `assets/templates/api-reference-template.md`

**4. Create Configuration Examples**

Generate `.env.example`, sample plugin.json, and sample .mcp.json.

**5. Add Troubleshooting Section**

Include common issues and solutions from `references/troubleshooting-guide.md`.

