# Marketplace Best Practices

Patrones, recomendaciones y mejores prácticas para crear y mantener marketplaces de plugins de Claude Code.

## Principios Fundamentales

### 1. Cohesión Temática
Los plugins en un marketplace deben estar **relacionados temáticamente**.

✅ **Bueno**:
- `database-tools` → postgres-plugin, mysql-plugin, mongodb-plugin
- `web-dev-suite` → frontend-plugin, backend-plugin, api-plugin
- `code-quality` → linter-plugin, formatter-plugin, tester-plugin

❌ **Malo**:
- `random-tools` → database-plugin, weather-plugin, game-plugin
- No hay relación clara entre plugins

### 2. Independencia de Plugins
Cada plugin debe funcionar **standalone**.

✅ **Bueno**:
```
Each plugin works independently:
- Can be installed separately
- No dependencies on other plugins in marketplace
- Self-contained functionality
```

❌ **Malo**:
```
Plugins depend on each other:
- plugin-1 requires plugin-2 to be installed
- Shared dependencies not properly isolated
```

### 3. Documentación Clara
Marketplace + cada plugin deben estar bien documentados.

## Estructura Recomendada

### Jerarquía de Directorios

```
marketplace-name/
├── .claude-plugin/
│   └── marketplace.json          ← Configuración del marketplace
├── plugin-1/                      ← Plugin independiente #1
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── commands/
│   ├── agents/
│   ├── skills/
│   ├── servers/
│   ├── tests/                     ← Tests del plugin
│   ├── .gitignore
│   ├── .env.example
│   ├── README.md                  ← Docs específicas del plugin
│   └── LICENSE
├── plugin-2/                      ← Plugin independiente #2
│   └── [same structure]
├── plugin-3/                      ← Plugin independiente #3
│   └── [same structure]
├── scripts/
│   └── add_plugin.sh              ← Helper para agregar plugins
├── docs/                          ← Documentación global
│   ├── getting-started.md
│   ├── architecture.md
│   └── contributing.md
├── .gitignore
├── README.md                      ← Overview del marketplace
└── LICENSE
```

### marketplace.json

```json
{
  "name": "descriptive-marketplace-name",
  "owner": {
    "name": "Team or Individual Name"
  },
  "metadata": {
    "description": "Marketplace purpose and overview",
    "version": "1.0.0",
    "pluginRoot": "./"
  },
  "plugins": [
    {
      "name": "plugin-1",
      "source": "./plugin-1",
      "description": "Clear, concise description",
      "version": "1.0.0",
      "author": {
        "name": "Author Name"
      },
      "homepage": "https://...",
      "license": "MIT",
      "keywords": ["keyword1", "keyword2"],
      "category": "development",
      "tags": ["tag1", "tag2"]
    },
    {
      "name": "plugin-2",
      "source": {
        "source": "github",
        "repo": "owner/repo"
      },
      "description": "Plugin from GitHub"
    },
    {
      "name": "plugin-3",
      "source": {
        "source": "url",
        "url": "https://github.com/owner/repo.git"
      },
      "description": "Plugin from Git URL"
    }
  ]
}
```

**Required fields**:
- `name`: Marketplace identifier (kebab-case)
- `owner`: Maintainer information object
- `plugins`: Array of plugin entries

**Optional metadata**:
- `metadata.description`: Purpose of the marketplace
- `metadata.version`: Release version (semver)
- `metadata.pluginRoot`: Base path for relative sources

**Plugin entry fields**:
- `name` (required): Plugin identifier (kebab-case)
- `source` (required): String path (`"./plugin"`) or object with source type
- `description`, `version`, `author`, `homepage`, `license`, `keywords`, `category`, `tags` (optional)

**Supported source types**:
- Relative path: `"./plugins/my-plugin"`
- GitHub: `{"source": "github", "repo": "owner/repo"}`
- Git URL: `{"source": "url", "url": "https://...git"}`

**Best practices**:
- `name`: kebab-case, descriptive
- `owner.name`: Consistent across all plugins
- `plugins[].description`: Brief (marketplace-level), detailed in plugin README
- `plugins[].source`: Use relative paths for local plugins, GitHub for external

## Naming Conventions

### Marketplace Names

✅ **Bueno**:
- `database-tools-suite`
- `web-development-kit`
- `ai-assistants-collection`
- `devops-automation-plugins`

❌ **Malo**:
- `stuff` (too vague)
- `MyAwesomePlugins` (not kebab-case)
- `plugin-collection` (too generic)

### Plugin Names dentro del Marketplace

✅ **Bueno**:
- Específicos: `postgres-client`, `eslint-integration`, `git-workflow-helper`
- Cortos pero descriptivos
- Kebab-case

❌ **Malo**:
- Genéricos: `tool1`, `helper`, `utils`
- Largos: `super-advanced-postgresql-database-management-tool`
- CamelCase o snake_case

## Organización de Plugins

### Por Funcionalidad

```
dev-tools-suite/
├── linter-plugin/          ← Linting
├── formatter-plugin/       ← Formatting
├── tester-plugin/          ← Testing
└── profiler-plugin/        ← Profiling
```

### Por Tecnología/Stack

```
fullstack-javascript/
├── react-plugin/           ← Frontend
├── node-plugin/            ← Backend
├── testing-plugin/         ← Testing
└── deployment-plugin/      ← DevOps
```

### Por Workflow

```
git-workflow-suite/
├── commit-plugin/          ← Commits
├── branch-plugin/          ← Branching
├── review-plugin/          ← Code review
└── release-plugin/         ← Releases
```

## Versionado

### Marketplace Version
Versión del marketplace **independiente** de versiones de plugins.

**Cuándo incrementar**:
- **MAJOR**: Cambios breaking en estructura del marketplace
- **MINOR**: Agregar/remover plugins
- **PATCH**: Actualizar documentación, arreglar metadata

### Plugin Versions
Cada plugin tiene su **propia versión semver**.

```json
{
  "name": "marketplace",
  "version": "2.1.0",        ← Versión del marketplace
  "plugins": [
    {
      "name": "plugin-1",    ← Plugin con su propia versión
      "source": "./plugin-1"
    }
  ]
}
```

`plugin-1/.claude-plugin/plugin.json`:
```json
{
  "name": "plugin-1",
  "version": "1.5.2"         ← Versión independiente
}
```

## Documentación

### README.md del Marketplace

```markdown
# Marketplace Name

Brief description of the marketplace and its purpose.

## Plugins

### Plugin 1
Brief description. [More details](./plugin-1/README.md)

### Plugin 2
Brief description. [More details](./plugin-2/README.md)

## Installation

### All plugins:
\`\`\`bash
/plugin install /path/to/marketplace
\`\`\`

### Individual plugin:
\`\`\`bash
/plugin install /path/to/marketplace/plugin-1
\`\`\`

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

MIT
```

### README.md de cada Plugin

Cada plugin debe tener documentación completa y específica.

**Template**:
```markdown
# Plugin Name

Detailed description of what this specific plugin does.

## Features
- Feature 1
- Feature 2

## Installation
\`\`\`bash
/plugin install /path/to/marketplace/plugin-name
\`\`\`

## Configuration
[Environment variables, setup steps]

## Usage
[Detailed examples]

## Troubleshooting
[Common issues]

## Contributing
[How to contribute to this plugin]

## License
MIT
```

## Testing

### Test Cada Plugin Individualmente

```bash
# Test plugin isolation
/plugin install /path/to/marketplace/plugin-1
# Verify it works standalone

/plugin install /path/to/marketplace/plugin-2
# Verify it doesn't conflict with plugin-1
```

### Test Marketplace Completo

```bash
# Test full installation
/plugin install /path/to/marketplace
# Verify all plugins load correctly
```

### Automated Testing

**Estructura recomendada**:
```
marketplace/
├── plugin-1/
│   └── tests/
│       ├── test_commands.py
│       └── test_mcp_server.py
├── plugin-2/
│   └── tests/
│       └── test_integration.py
└── tests/
    └── test_marketplace.py    ← Tests de integración marketplace
```

## Distribución

### Git Repository Structure (Recommended: GitHub)

GitHub hosting is recommended for marketplaces as it leverages version control and collaboration features.

```
github.com/user/marketplace-name/
├── .github/
│   └── workflows/
│       └── test.yml          ← CI para todos los plugins
├── plugin-1/
├── plugin-2/
├── plugin-3/
└── README.md
```

### Team Configuration

Organizations can configure automatic marketplace installation via `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "team-tools": {
      "source": {
        "source": "github",
        "repo": "org/plugins"
      }
    }
  }
}
```

### Local Testing

Use marketplace add command for local development and testing:
```bash
/plugin marketplace add ./path/to/local/marketplace
```

### Validation

Before sharing, validate JSON syntax:
```bash
claude plugin validate
```

### Releases

**Tag conventions**:
```
marketplace/v2.0.0           ← Marketplace version
plugin-1/v1.5.0              ← Individual plugin version
plugin-2/v2.1.3
```

**Release notes**: Incluir cambios del marketplace + resumen de cambios en plugins.

## Mantenimiento

### Adding a New Plugin

1. Create plugin structure:
   ```bash
   ./scripts/add_plugin.sh . new-plugin
   ```

2. Develop plugin (commands, agents, servers, etc.)

3. Update `marketplace.json`:
   ```json
   {
     "plugins": [
       ...existing,
       {
         "name": "new-plugin",
         "source": "./new-plugin",
         "description": "Description"
       }
     ]
   }
   ```

4. Update marketplace README.md

5. Test new plugin + integration with existing plugins

6. Commit and release

### Removing a Plugin

1. **Deprecation first** (if plugin is used):
   - Mark as deprecated in marketplace README
   - Keep for 1-2 versions
   - Provide migration path

2. Remove from `marketplace.json`

3. Remove plugin directory (or move to `deprecated/`)

4. Update documentation

5. Increment marketplace MAJOR version (breaking change)

### Updating a Plugin

Each plugin updates independently:
```bash
cd plugin-1
# Make changes
# Update version in plugin.json
# Test
# Commit
```

Marketplace version only changes if marketplace-level changes occur.

## Security

### Environment Variables

**Per-Plugin Isolation**:
```
marketplace/
├── plugin-1/
│   └── .env.example         ← Plugin-1 specific vars
├── plugin-2/
│   └── .env.example         ← Plugin-2 specific vars
└── .env.example             ← Shared vars (if any)
```

**Best practice**: Minimize shared environment variables.

### Secrets Management

Never commit:
- `.env` files
- API keys
- Credentials

Each plugin should document required secrets in its `.env.example`.

## Common Patterns

### Pattern 1: Language Ecosystem

```
python-dev-suite/
├── linter-plugin/           → Pylint, flake8
├── formatter-plugin/        → Black, autopep8
├── tester-plugin/           → pytest, unittest
└── profiler-plugin/         → cProfile tools
```

### Pattern 2: Service Integration

```
cloud-services/
├── aws-plugin/              → AWS integration
├── gcp-plugin/              → Google Cloud
├── azure-plugin/            → Azure
└── docker-plugin/           → Docker/K8s
```

### Pattern 3: Development Workflow

```
agile-workflow/
├── planning-plugin/         → Story/task management
├── development-plugin/      → Coding assistants
├── review-plugin/           → Code review tools
└── deployment-plugin/       → CI/CD helpers
```

## Anti-Patterns

### ❌ Monolithic Plugin

**Problema**: Un solo plugin que hace todo.

**Solución**: Dividir en múltiples plugins especializados.

### ❌ Tight Coupling

**Problema**: Plugins que dependen unos de otros.

```json
// BAD: plugin-2 requires plugin-1
{
  "name": "plugin-2",
  "dependencies": ["plugin-1"]  // ← Not supported, don't do this
}
```

**Solución**: Cada plugin debe ser independiente.

### ❌ Duplicate Functionality

**Problema**: Múltiples plugins haciendo lo mismo.

**Solución**: Consolidar en un plugin o diferenciar claramente.

### ❌ Poor Organization

```
// BAD
random-plugins/
├── plugin-abc/
├── thing-123/
└── helper-xyz/
```

**Solución**: Nombres descriptivos, organización lógica.

## Checklist de Calidad

Antes de publicar un marketplace:

- [ ] Nombres descriptivos (marketplace + plugins)
- [ ] Cada plugin funciona standalone
- [ ] Documentación completa (marketplace + cada plugin)
- [ ] Tests para cada plugin
- [ ] `.env.example` en cada plugin si usa secrets
- [ ] `.gitignore` apropiado
- [ ] LICENSE en marketplace y plugins
- [ ] Versiones semver correctas
- [ ] marketplace.json validado
- [ ] Todos los plugin.json validados
- [ ] README con instrucciones de instalación
- [ ] Contributing guidelines
- [ ] Tested instalación completa
- [ ] Tested instalación individual de plugins

## Ejemplos de Marketplaces Exitosos

### Example 1: Web Development Suite

```
webdev-pro/
├── frontend-framework-plugin/    → React/Vue/Angular helpers
├── api-client-plugin/             → REST/GraphQL clients
├── testing-plugin/                → Jest/Cypress integration
└── deployment-plugin/             → Vercel/Netlify/AWS
```

**Por qué funciona**:
- Cohesión temática (web development)
- Cada plugin es útil standalone
- Workflow completo cubierto

### Example 2: Data Engineering Kit

```
data-eng-toolkit/
├── database-plugin/               → SQL clients
├── etl-plugin/                    → Data transformation
├── analytics-plugin/              → Data analysis
└── visualization-plugin/          → Charting/dashboards
```

**Por qué funciona**:
- Cubre pipeline completo de datos
- Plugins interoperables pero independientes
- Especialización clara

## Métricas de Éxito

Un marketplace bien diseñado tiene:
- **Alta cohesión**: Plugins relacionados temáticamente
- **Baja coupling**: Plugins funcionan independientemente
- **Buena documentación**: README claro + docs por plugin
- **Fácil mantenimiento**: Plugins actualizables independientemente
- **Adoption flexible**: Usuarios instalan lo que necesitan
