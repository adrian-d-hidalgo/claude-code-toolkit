# Plugin Individual - Estructura Canónica

Esta es la estructura estándar para un **plugin individual**.

## Estructura de Directorios

```
my-plugin/                          ← Raíz del plugin
├── .claude-plugin/
│   └── plugin.json                 ← REQUERIDO: Configuración del plugin
├── commands/                       ← OPCIONAL: Slash commands
│   ├── command-1.md
│   └── command-2.md
├── agents/                         ← OPCIONAL: Agent definitions
│   ├── agent-1.md
│   └── agent-2.md
├── skills/                         ← OPCIONAL: Skills directories
│   ├── skill-1/
│   │   └── SKILL.md
│   └── skill-2/
│       └── SKILL.md
├── hooks/                          ← OPCIONAL: Workflow hooks
│   └── hooks.json
├── servers/                        ← OPCIONAL: MCP servers
│   ├── server-1/
│   │   ├── server.py
│   │   └── requirements.txt
│   └── server-2/
│       ├── index.ts
│       └── package.json
├── .gitignore
├── .env.example
├── README.md
└── LICENSE
```

## Características Clave

### Capabilities en Raíz
- `commands/`, `agents/`, `skills/`, `hooks/`, `servers/` están **directamente en la raíz**
- No hay sub-carpetas de plugins
- Estructura plana y simple

### plugin.json
Usa template de plugin individual (`plugin-json-template.json`):
- `name`: Nombre del plugin
- `description`: Descripción
- `version`: Versión semver
- `author.name`: Tu nombre
- `commands`: Array de paths a `.md`
- `agents`: Array of paths a `.md`
- `skills`: Array of paths a directorios con `SKILL.md`
- `hooks`: Array of paths a `.json`
- `mcpServers`: Objeto con configuraciones de servidores

### Instalación
```bash
/plugin install /path/to/my-plugin
/plugin install https://github.com/user/my-plugin
```

## Ejemplo Mínimo

**Estructura**:
```
simple-plugin/
├── .claude-plugin/
│   └── plugin.json
├── servers/
│   └── my-server/
│       └── server.py
└── README.md
```

**plugin.json**:
```json
{
  "name": "simple-plugin",
  "description": "A simple MCP server plugin",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  },
  "mcpServers": {
    "my-server": {
      "command": "python",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/my-server/server.py"]
    }
  }
}
```

## Ejemplo Completo

**Estructura**:
```
full-plugin/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   ├── analyze.md
│   └── format.md
├── agents/
│   └── code-helper.md
├── skills/
│   └── analyzer/
│       └── SKILL.md
├── servers/
│   ├── formatter/
│   │   └── server.py
│   └── linter/
│       └── server.py
├── .env.example
└── README.md
```

**plugin.json**:
```json
{
  "name": "full-plugin",
  "description": "Complete plugin with all capabilities",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  },
  "commands": [
    "./commands/analyze.md",
    "./commands/format.md"
  ],
  "agents": [
    "./agents/code-helper.md"
  ],
  "skills": [
    "./skills/analyzer"
  ],
  "mcpServers": {
    "formatter": {
      "command": "python",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/formatter/server.py"]
    },
    "linter": {
      "command": "python",
      "args": ["${CLAUDE_PLUGIN_ROOT}/servers/linter/server.py"]
    }
  }
}
```

## Cuando Usar

✅ **Usa Plugin Individual cuando**:
- Creas un solo plugin con un propósito específico
- Quieres distribución simple
- No necesitas agrupar múltiples plugins relacionados

❌ **NO uses Plugin Individual cuando**:
- Tienes múltiples plugins relacionados que quieres distribuir juntos
- Necesitas un catálogo de plugins
- → En ese caso usa Marketplace

## Pasos de Creación

1. **Inicializar estructura**:
   ```bash
   mkdir -p my-plugin/.claude-plugin
   mkdir -p my-plugin/{commands,agents,skills,servers}
   ```

2. **Crear plugin.json** usando `plugin-json-template.json`

3. **Agregar capabilities** según necesidad

4. **Documentar** en README.md

5. **Validar**:
   ```bash
   python -m json.tool .claude-plugin/plugin.json
   ```

6. **Probar localmente**:
   ```bash
   /plugin install /path/to/my-plugin
   ```
