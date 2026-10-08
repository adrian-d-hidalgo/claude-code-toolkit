# Command vs Skill — decision guide

In Claude Code 2.x, `.claude/commands/<name>.md` and `.claude/skills/<name>/SKILL.md` share frontmatter and both produce a `/<name>` slash command. Decide on intent, not file location.

## Quick decision

| If the work is…                                                                   | Write a…                        |
| --------------------------------------------------------------------------------- | ------------------------------- |
| A one-shot deterministic task with explicit arguments, no supporting files needed | **Command** (single `.md` file) |
| Something Claude should auto-activate based on user intent                        | **Skill**                       |
| Likely to need `references/`, `assets/templates/`, or `scripts/`                  | **Skill**                       |
| A workflow you only ever invoke manually with no supporting material              | **Command**                     |
| Anything that will grow over time                                                 | **Skill**                       |

If you can answer "yes" to any of the **Skill** rows, write a skill. The skill automatically exposes `/<name>` as a slash command, so you get both invocation styles for free.

## Why the asymmetry

A command is a single `.md` file. A skill is a directory:

```
my-skill/
├── SKILL.md           # the equivalent of the command file
├── references/        # extra docs Claude can load
├── assets/templates/  # reusable artifacts
├── scripts/           # executable helpers
└── tests/             # activation evaluations
```

A skill is strictly more capable. The only reason to prefer a command is **simplicity**: when the artifact is genuinely one file, a directory feels like overkill.

## Examples

| Intent                                          | Choice  | Why                                              |
| ----------------------------------------------- | ------- | ------------------------------------------------ |
| "Generate a commit message from staged changes" | Skill   | Likely to evolve, may need templates + tests.    |
| "Send a Slack reminder"                         | Command | Single task, single shell invocation, no growth. |
| "Audit security of changed files"               | Skill   | Has procedures, references, validation scripts.  |
| "Open a numbered GitHub issue in browser"       | Command | Trivial.                                         |
| "Scaffold a new microservice"                   | Skill   | Lots of templates, multi-step workflow, evolves. |

## Migration path

If you wrote a command and it has grown beyond one file:

1. Create `~/.claude/skills/<name>/`.
2. Move the command body to `SKILL.md`, keep the same frontmatter.
3. Move supporting files into `references/`, `assets/templates/`, or `scripts/`.
4. Delete the original `<name>.md` command.
5. Verify `/<name>` still works (the skill exposes it automatically).

Keep the `name:` identical so the slash invocation stays stable.

## What about plugins?

Same rule applies inside plugins. A plugin can ship both `commands/` and `skills/` directories. For new plugin work, default to skills; reach for commands only when the artifact is a single file and unlikely to grow.
