# Anti-patterns — slash command authoring

## Description as a routing trigger

**Pattern**: `description: Use when the user wants to write a commit message.`

**Why wrong**: Slash commands are user-invoked explicitly via `/`. There is no routing decision to make. The description is the UX label shown in the `/` menu.

**Fix**: `description: Generate a Conventional Commits message from staged changes.`

## Description that references other commands or skills

**Pattern**: `description: Run this instead of /commit-message when you want preview-only output.`

**Why wrong**: Marketplace pollution. The user already chose this command; explaining its relationship to siblings belongs in the README.

**Fix**: Describe the action only. `description: Preview a Conventional Commits message without staging or committing.`

## Description as a full sentence

**Pattern**: `description: This is a command that will help you generate a commit message based on the changes you have staged in your working tree.`

**Why wrong**: 30 words for a 20-word slot. The `/` menu truncates it.

**Fix**: `description: Generate a commit message from staged changes.`

## Building a "command" that should be a skill

**Pattern**: 400-line command body with multiple supporting `references/` directories and a Python script.

**Why wrong**: At that size, you've built a skill in the wrong directory. You lose the `references/`/`assets/`/`tests/` directory contract and the auto-activation capability.

**Fix**: Migrate to `.claude/skills/<name>/SKILL.md`. The skill automatically exposes `/<name>`.

## Hardcoded absolute paths

**Pattern**: ``!`python3 /Users/me/.claude/commands/my-command/script.py $ARGUMENTS` ``

**Why wrong**: Breaks for any other user, fails in plugin distribution, breaks under different home dirs.

**Fix**: `` !`python3 ${CLAUDE_SKILL_DIR}/script.py $ARGUMENTS` ``

## Orphan `$N` placeholders

**Pattern**: Body references `$0`, `$1`, `$2` but `argument-hint: [filename]` only shows one slot.

**Why wrong**: User passes one argument; `$1` and `$2` expand to empty strings; command silently misbehaves.

**Fix**: Either expand `argument-hint` to show all slots, or remove the unused `$N` placeholders.

## Over-broad `allowed-tools`

**Pattern**: `allowed-tools: Read, Write, Edit, Bash, WebFetch, WebSearch` for a command that only stages files and creates a commit.

**Why wrong**: Pre-approves tools the command never invokes, broadening attack surface on a slip.

**Fix**: `allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *) Read`

## Untrusted argument in shell injection

**Pattern**: `` !`gh issue view $ARGUMENTS` `` where `$ARGUMENTS` is user-typed and the user could pass `1; rm -rf /`.

**Why wrong**: Shell-injection. Even though Claude Code quotes some forms, defensive authoring matters.

**Fix**: Quote explicitly: `` !`gh issue view "$ARGUMENTS"` ``, or validate the arg shape in a script first.

## Description that explains internal mechanism

**Pattern**: `description: Uses git diff and gh CLI to summarize PRs by piping output to Claude.`

**Why wrong**: Implementation detail; users don't care, and it crowds out the action.

**Fix**: `description: Summarize a pull request.`

## Slash command in plugin without README entry

**Pattern**: Plugin ships a slash command but its README doesn't list it.

**Why wrong**: Discovery problem. Users won't find it; reviewers can't audit it.

**Fix**: List every shipped command in the plugin's README with a one-line description and example invocation.
