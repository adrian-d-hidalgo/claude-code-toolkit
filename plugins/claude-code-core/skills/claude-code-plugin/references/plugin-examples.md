# Plugin Examples

Real-world plugin examples demonstrating different patterns and use cases.

---

## Part 1: Individual Plugin Examples

Individual plugins have capabilities (commands, agents, servers) directly in the root directory.

### Example 1: Simple Tool Plugin

Bundles a single MCP server providing development tools.

**Type**: Individual Plugin
**Pattern**: Single MCP server

**Structure**:

```
dev-tools-plugin/
├── .claude-plugin/
│   └── plugin.json
├── servers/
│   └── dev-tools/
│       ├── server.py
│       └── requirements.txt
└── README.md
```

**plugin.json**:

```json
{
  "name": "dev-tools",
  "description": "Development utilities for code formatting and linting",
  "version": "1.0.0",
  "author": {
    "name": "Developer"
  },
  "mcpServers": {
    "dev-tools": {
      "command": "python",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/dev-tools/server.py"],
      "env": {}
    }
  }
}
```

---

### Example 2: Multi-Component Plugin

Bundles commands, agents, and MCP servers together.

**Type**: Individual Plugin
**Pattern**: Multiple capabilities in root

**Structure**:

```
project-assistant/
├── .claude-plugin/
│   └── plugin.json
├── commands/              ← Commands in root
│   ├── scaffold-project.md
│   └── run-tests.md
├── agents/                ← Agents in root
│   └── project-analyzer.md
├── servers/               ← Servers in root
│   └── project-tools/
│       └── server.py
└── README.md
```

**plugin.json**:

```json
{
  "name": "project-assistant",
  "description": "Complete project management assistant",
  "version": "2.0.0",
  "author": {
    "name": "Developer"
  },
  "commands": ["./commands/scaffold-project.md", "./commands/run-tests.md"],
  "agents": ["./agents/project-analyzer.md"],
  "mcpServers": {
    "project-tools": {
      "command": "python",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/project-tools/server.py"]
    }
  }
}
```

---

### Example 3: External Server Plugin

Wraps existing MCP server with custom configuration.

**Type**: Individual Plugin
**Pattern**: External server wrapper

**plugin.json**:

```json
{
  "name": "brave-search-wrapper",
  "description": "Brave Search with custom configuration",
  "version": "1.0.0",
  "author": {
    "name": "Developer"
  },
  "mcpServers": {
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "${BRAVE_API_KEY}"
      }
    }
  }
}
```

---

### Example 4: Database Plugin

Multiple database servers with shared configuration.

**Type**: Individual Plugin
**Pattern**: Multiple MCP servers

**plugin.json**:

```json
{
  "name": "database-suite",
  "description": "PostgreSQL and MySQL database tools",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  },
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "${POSTGRES_URL}"
      }
    },
    "mysql": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-mysql"],
      "env": {
        "MYSQL_HOST": "${MYSQL_HOST}",
        "MYSQL_USER": "${MYSQL_USER}",
        "MYSQL_PASSWORD": "${MYSQL_PASSWORD}",
        "MYSQL_DATABASE": "${MYSQL_DATABASE}"
      }
    }
  }
}
```

---

### Example 5: TypeScript Server Plugin

Custom TypeScript MCP server with build process.

**Type**: Individual Plugin
**Pattern**: Compiled TypeScript server

**Structure**:

```
typescript-server-plugin/
├── .claude-plugin/
│   └── plugin.json
├── servers/
│   └── my-server/
│       ├── src/
│       │   └── index.ts
│       ├── dist/
│       │   └── index.js
│       ├── package.json
│       └── tsconfig.json
└── README.md
```

**plugin.json**:

```json
{
  "name": "typescript-server",
  "description": "Custom TypeScript MCP server",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  },
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/my-server/dist/index.js"],
      "env": {
        "API_KEY": "${MY_SERVER_API_KEY}"
      }
    }
  }
}
```

---

### Example 6: Plugin with Hooks

Combines MCP server with workflow automation hooks.

**Type**: Individual Plugin
**Pattern**: Hooks + MCP server

**Structure**:

```
git-assistant/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   └── hooks.json
├── servers/
│   └── git-tools/
│       └── server.py
└── README.md
```

**plugin.json**:

```json
{
  "name": "git-assistant",
  "description": "Git workflow automation",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  },
  "hooks": ["./hooks/hooks.json"],
  "mcpServers": {
    "git-tools": {
      "command": "python",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/git-tools/server.py"]
    }
  }
}
```

**hooks/hooks.json**:

```json
{
  "pre-commit": "python ${CLAUDE_PLUGIN_ROOT}/hooks/pre-commit.py",
  "post-commit": "python ${CLAUDE_PLUGIN_ROOT}/hooks/post-commit.py"
}
```

---

### Example 7: Environment-Specific Plugin

Different configurations for dev/staging/production.

**Type**: Individual Plugin
**Pattern**: Environment-based configuration

**plugin.json**:

```json
{
  "name": "api-client",
  "description": "API client with environment switching",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  },
  "mcpServers": {
    "api-client": {
      "command": "python",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/api-client/server.py"],
      "env": {
        "API_URL": "${API_URL:-https://api.production.com}",
        "API_KEY": "${API_KEY}",
        "ENVIRONMENT": "${ENVIRONMENT:-production}",
        "DEBUG": "${DEBUG:-false}"
      }
    }
  }
}
```

**.env.development**:

```bash
API_URL=https://api.dev.com
API_KEY=dev_key_123
ENVIRONMENT=development
DEBUG=true
```

**.env.production**:

```bash
API_URL=https://api.production.com
API_KEY=prod_key_456
ENVIRONMENT=production
DEBUG=false
```

---

## Part 2: Marketplace Examples

Marketplaces bundle multiple independent plugins. Each plugin follows Individual Plugin structure.

### Example 8: Simple Marketplace

Collection of development tools organized as marketplace.

**Type**: Marketplace
**Pattern**: Multiple related plugins

**Directory structure**:

```
dev-tools-marketplace/
├── .claude-plugin/
│   └── marketplace.json         ← Marketplace config
├── linter-plugin/                ← Plugin 1 (Individual Plugin)
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── commands/
│   │   └── lint.md
│   ├── servers/
│   │   └── linter/
│   │       └── server.py
│   └── README.md
├── formatter-plugin/             ← Plugin 2 (Individual Plugin)
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── commands/
│   │   └── format.md
│   ├── servers/
│   │   └── formatter/
│   │       └── server.py
│   └── README.md
├── tester-plugin/                ← Plugin 3 (Individual Plugin)
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── agents/
│   │   └── test-runner.md
│   └── README.md
└── README.md                     ← Marketplace README
```

**marketplace.json**:

```json
{
  "name": "dev-tools-suite",
  "owner": {
    "name": "DevTools Team"
  },
  "plugins": [
    {
      "name": "linter",
      "source": "./linter-plugin",
      "description": "Code linting tools with ESLint, Pylint, and more"
    },
    {
      "name": "formatter",
      "source": "./formatter-plugin",
      "description": "Code formatting with Prettier, Black, and gofmt"
    },
    {
      "name": "tester",
      "source": "./tester-plugin",
      "description": "Test runner agent for pytest, jest, and go test"
    }
  ]
}
```

**linter-plugin/.claude-plugin/plugin.json** (example):

```json
{
  "name": "linter",
  "description": "Code linting tools with ESLint, Pylint, and more",
  "version": "1.0.0",
  "author": {
    "name": "DevTools Team"
  },
  "commands": ["./commands/lint.md"],
  "mcpServers": {
    "linter": {
      "command": "python",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/linter/server.py"]
    }
  }
}
```

**Installation**:

```bash
# Install entire marketplace (all 3 plugins)
/plugin install /path/to/dev-tools-marketplace

# Install individual plugin from marketplace
/plugin install /path/to/dev-tools-marketplace/linter-plugin
```

---

### Example 9: Database Marketplace

Multiple database tools organized by database type.

**Type**: Marketplace
**Pattern**: Service-specific plugins

**Directory structure**:

```
database-marketplace/
├── .claude-plugin/
│   └── marketplace.json
├── postgres-plugin/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   └── servers/
│       └── postgres/
│           └── server.py
├── mysql-plugin/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   └── servers/
│       └── mysql/
│           └── server.py
├── mongodb-plugin/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   └── servers/
│       └── mongodb/
│           └── server.py
└── README.md
```

**marketplace.json**:

```json
{
  "name": "database-tools",
  "owner": {
    "name": "Database Team"
  },
  "plugins": [
    {
      "name": "postgres",
      "source": "./postgres-plugin",
      "description": "PostgreSQL database tools and queries"
    },
    {
      "name": "mysql",
      "source": "./mysql-plugin",
      "description": "MySQL database management"
    },
    {
      "name": "mongodb",
      "source": "./mongodb-plugin",
      "description": "MongoDB document database tools"
    }
  ]
}
```

---

### Example 10: Fullstack Development Marketplace

Complete development workflow with multiple specialized plugins.

**Type**: Marketplace
**Pattern**: Workflow-based plugins

**Directory structure**:

```
fullstack-marketplace/
├── .claude-plugin/
│   └── marketplace.json
├── frontend-plugin/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── commands/
│   │   └── scaffold-component.md
│   └── agents/
│       └── react-helper.md
├── backend-plugin/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── commands/
│   │   └── create-api.md
│   └── servers/
│       └── api-tools/
│           └── server.py
├── database-plugin/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   └── servers/
│       └── db-tools/
│           └── server.py
└── README.md
```

**marketplace.json**:

```json
{
  "name": "fullstack-dev-suite",
  "owner": {
    "name": "Fullstack Team"
  },
  "plugins": [
    {
      "name": "frontend",
      "source": "./frontend-plugin",
      "description": "React/Vue/Angular development tools"
    },
    {
      "name": "backend",
      "source": "./backend-plugin",
      "description": "Node.js/Python API development"
    },
    {
      "name": "database",
      "source": "./database-plugin",
      "description": "Database design and management"
    }
  ]
}
```

---

## Key Differences: Individual Plugin vs Marketplace

### Individual Plugin

- **Structure**: Capabilities in root (commands/, agents/, servers/)
- **Configuration**: `.claude-plugin/plugin.json`
- **Use case**: Single focused purpose
- **Installation**: `/plugin install /path/to/plugin`

### Marketplace

- **Structure**: Folder per plugin, each with own structure
- **Configuration**: `.claude-plugin/marketplace.json` at root
- **Use case**: Multiple related plugins bundled
- **Installation**:
  - All: `/plugin install /path/to/marketplace`
  - Individual: `/plugin install /path/to/marketplace/plugin-name`

### When to Use Which?

**Use Individual Plugin when**:

- Single focused purpose
- Standalone distribution
- Simple scope

**Use Marketplace when**:

- Multiple related plugins
- Suite/collection of tools
- Users may want to install selectively
- Thematic organization (by language, framework, workflow, etc.)

---

## Template Initialization

### Initialize Individual Plugin:

```bash
bash scripts/init_plugin.sh my-plugin [path]
```

### Initialize Marketplace:

```bash
bash scripts/init_marketplace.sh my-marketplace [path]
cd my-marketplace
bash scripts/add_plugin.sh . plugin-name
```
