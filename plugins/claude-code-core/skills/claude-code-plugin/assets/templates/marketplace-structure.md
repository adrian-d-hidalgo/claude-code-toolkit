# Marketplace - Estructura Canónica

Esta es la estructura estándar para un **marketplace de plugins**.

## Estructura de Directorios

```
my-marketplace/                     ← Raíz del marketplace
├── .claude-plugin/
│   └── marketplace.json            ← REQUERIDO: Configuración del marketplace
├── plugin-1/                       ← Cada plugin en su propio directorio
│   ├── .claude-plugin/
│   │   └── plugin.json             ← Cada plugin tiene su plugin.json
│   ├── commands/                   ← Capabilities del plugin
│   │   └── cmd.md
│   ├── agents/
│   │   └── agent.md
│   ├── skills/
│   │   └── skill/
│   │       └── SKILL.md
│   ├── servers/
│   │   └── server/
│   │       └── server.py
│   └── README.md
├── plugin-2/                       ← Segundo plugin independiente
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── commands/
│   │   └── cmd.md
│   └── README.md
├── plugin-3/                       ← Tercer plugin independiente
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── agents/
│   │   └── agent.md
│   └── README.md
├── .gitignore
└── README.md                       ← Documentación del marketplace
```

## Características Clave

### Estructura Jerárquica
- Cada plugin tiene **su propio directorio** en la raíz del marketplace
- Cada plugin es **completamente independiente**
- Cada plugin usa la estructura de **Plugin Individual** internamente

### marketplace.json
Ubicación: `<marketplace-root>/.claude-plugin/marketplace.json`

```json
{
  "name": "marketplace-name",
  "owner": {
    "name": "Owner Name"
  },
  "plugins": [
    {
      "name": "plugin-1",
      "source": "./plugin-1",
      "description": "Plugin 1 description"
    },
    {
      "name": "plugin-2",
      "source": "./plugin-2",
      "description": "Plugin 2 description"
    }
  ]
}
```

### Plugin Interno: plugin.json
Cada plugin usa template de plugin individual:

Ubicación: `<marketplace-root>/plugin-1/.claude-plugin/plugin.json`

```json
{
  "name": "plugin-1",
  "description": "Detailed description",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  },
  "commands": ["./commands/cmd.md"],
  "agents": ["./agents/agent.md"]
}
```

### Instalación
```bash
# Instalar marketplace completo (todos los plugins)
/plugin install /path/to/my-marketplace

# Instalar plugin individual del marketplace
/plugin install /path/to/my-marketplace/plugin-1
```

## Ejemplo Completo

**Estructura**:
```
dev-tools-suite/
├── .claude-plugin/
│   └── marketplace.json
├── linter-plugin/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── commands/
│   │   └── lint.md
│   ├── servers/
│   │   └── linter/
│   │       └── server.py
│   └── README.md
├── formatter-plugin/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── commands/
│   │   └── format.md
│   ├── servers/
│   │   └── formatter/
│   │       └── server.py
│   └── README.md
├── tester-plugin/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── agents/
│   │   └── test-runner.md
│   └── README.md
└── README.md
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

**linter-plugin/.claude-plugin/plugin.json**:
```json
{
  "name": "linter",
  "description": "Code linting tools with ESLint, Pylint, and more",
  "version": "1.0.0",
  "author": {
    "name": "DevTools Team"
  },
  "commands": [
    "./commands/lint.md"
  ],
  "mcpServers": {
    "linter": {
      "command": "python",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/linter/server.py"]
    }
  }
}
```

## Cuando Usar

✅ **Usa Marketplace cuando**:
- Tienes múltiples plugins relacionados
- Quieres distribuirlos juntos como suite
- Los usuarios pueden instalar todo o plugins individuales
- Mantienes catálogo de plugins temáticos

❌ **NO uses Marketplace cuando**:
- Solo tienes un plugin
- → En ese caso usa Plugin Individual

## Ventajas del Marketplace

1. **Organización**: Agrupa plugins relacionados lógicamente
2. **Distribución flexible**: Instala todo o plugins específicos
3. **Mantenimiento**: Cada plugin evoluciona independientemente
4. **Versionado**: Cada plugin tiene su propia versión
5. **Reutilización**: Un plugin puede estar en múltiples marketplaces

## Pasos de Creación

1. **Inicializar marketplace**:
   ```bash
   mkdir -p my-marketplace/.claude-plugin
   ```

2. **Crear marketplace.json** usando `marketplace-json-template.json`

3. **Por cada plugin**:
   ```bash
   mkdir -p my-marketplace/plugin-1/.claude-plugin
   mkdir -p my-marketplace/plugin-1/{commands,agents,servers}
   ```

4. **Crear plugin.json** de cada plugin usando `plugin-json-template.json`

5. **Agregar capabilities** a cada plugin según necesidad

6. **Documentar**:
   - README.md del marketplace (descripción general)
   - README.md de cada plugin (detalles específicos)

7. **Validar**:
   ```bash
   python -m json.tool .claude-plugin/marketplace.json
   python -m json.tool plugin-1/.claude-plugin/plugin.json
   python -m json.tool plugin-2/.claude-plugin/plugin.json
   ```

8. **Probar localmente**:
   ```bash
   /plugin install /path/to/my-marketplace
   ```

## Relación con plugin.json

**Importante**: Cada plugin dentro del marketplace es un **Plugin Individual completo**:
- Tiene su propio `.claude-plugin/plugin.json`
- Usa la estructura de Plugin Individual
- Es independiente de otros plugins
- Puede tener todos los capabilities (commands, agents, skills, servers, hooks)

El `marketplace.json` solo **referencia** los plugins, no define su contenido.

## Patterns Comunes

### 1. Suite Temática
```
database-tools/
├── postgres-plugin/
├── mysql-plugin/
└── mongodb-plugin/
```

### 2. Stack Completo
```
fullstack-dev/
├── frontend-plugin/
├── backend-plugin/
└── devops-plugin/
```

### 3. Framework Específico
```
react-toolkit/
├── components-plugin/
├── hooks-plugin/
└── testing-plugin/
```

## Best Practices

1. **Naming**: Usa nombres descriptivos para plugins internos
2. **Independencia**: Cada plugin debe funcionar standalone
3. **Documentación**: README del marketplace + README por plugin
4. **Versioning**: Marketplace y plugins tienen versiones independientes
5. **Testing**: Prueba cada plugin individualmente antes de integrar
