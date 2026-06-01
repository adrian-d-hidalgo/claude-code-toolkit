# Destructive operations — forbidden across agents without explicit approval

Every agent in this plugin has `Bash` open (we cannot enumerate every project's tooling). To prevent irreversible damage, **no agent may execute any of the destructive operations listed below** without explicit, just-in-time approval from the user. This covers git history/working-tree destruction, filesystem wipes, privilege escalation, database DDL, infrastructure tear-downs, and any other operation whose effect cannot be cheaply undone.

This is an **agent-level hard rule**. Treat each list as exhaustive for the categories named; if a flag/command not listed here has equivalent destructive semantics, refuse on the same principle.

## Forbidden destructive git commands

### History rewriting (irreversible without reflog gymnastics)

- `git push --force` / `git push -f` — overwrites remote history; destroys other people's work silently.
- `git push --force-with-lease` — safer than `--force` but still rewrites remote; require explicit approval on shared branches.
- `git push --delete <branch>` / `git push origin :<branch>` — deletes remote branch.
- `git rebase` on any commit that has been pushed/published — rewrites history that others may have based work on.
- `git rebase -i` — interactive history rewrite; same risk class.
- `git commit --amend` on a commit that has been pushed/published — same risk.
- `git filter-branch` / `git filter-repo` — repository-wide history rewrite; almost never recoverable.
- `git update-ref -d <ref>` — deletes a ref directly.
- `git reflog expire --expire=now --all` — destroys the safety net that would otherwise allow recovery.
- `git gc --aggressive --prune=now` / `git gc --prune=now` — same; removes unreachable objects immediately.

### Working-tree destruction (loses uncommitted work)

- `git reset --hard` (with any argument) — discards all uncommitted and staged changes.
- `git checkout -- .` / `git checkout .` — discards uncommitted changes in tracked files.
- `git restore .` / `git restore --staged .` / `git restore --worktree --staged .` — same.
- `git clean -f` / `git clean -fd` / `git clean -fdx` — deletes untracked files (and directories with `-d`, including ignored with `-x`).
- `git stash drop` — discards a specific stash (not recoverable after `gc`).
- `git stash clear` — discards all stashes.

### Branch / tag destruction

- `git branch -D <name>` — force-deletes a branch even if unmerged.
- `git branch --delete --force <name>` — same.
- `git tag -d <name>` / `git tag --delete <name>` — deletes a tag locally; if pushed, can be re-pushed but the original commit reference is gone if unreferenced.
- `git push origin --delete <tag>` — deletes remote tag.

### Hook / signature bypass

- `--no-verify` flag on any command (`git commit --no-verify`, `git push --no-verify`) — bypasses pre-commit/pre-push hooks.
- `--no-gpg-sign` flag on any command — bypasses signing requirements.
- `-c commit.gpgsign=false` — same effect via config override.
- `-c core.hooksPath=/dev/null` — bypasses hooks via config override.

### Authentication / config tampering

- `git config --global` / `git config --system` — modifies global or system git config; never touch.
- `git config user.email` / `git config user.name` to a value the user did not request — identity tampering.

## Required behaviour when one of these is needed

1. **Stop.** Do not execute the command.
2. **Surface** the intent to the user with the exact command, the reason it is needed, and what the safer alternative would be (if any).
3. **Wait** for explicit, just-in-time approval. The approval is for that specific invocation — do not infer ongoing authorization.
4. **For history rewriting on shared branches** — refuse even with approval unless the user confirms they have coordinated with everyone whose work may be affected. Force-pushing to `main` / `master` is refused except after that explicit confirmation.

## Recommended settings.json deny patterns (defense in depth)

Agent prompt rules are guidance, not enforcement. For hard enforcement at the harness layer, add a `permissions.deny` block to `~/.claude/settings.json` (global) or `.claude/settings.json` (per-project):

```json
{
  "permissions": {
    "deny": [
      "Bash(git push --force*)",
      "Bash(git push -f*)",
      "Bash(*git push --force-with-lease*)",
      "Bash(*git push --delete*)",
      "Bash(*git push origin :*)",
      "Bash(*git reset --hard*)",
      "Bash(*git checkout -- *)",
      "Bash(*git checkout .*)",
      "Bash(*git restore *)",
      "Bash(*git clean -f*)",
      "Bash(*git clean -fd*)",
      "Bash(*git clean -fdx*)",
      "Bash(*git branch -D*)",
      "Bash(*git branch --delete --force*)",
      "Bash(*git tag -d*)",
      "Bash(*git tag --delete*)",
      "Bash(*git filter-branch*)",
      "Bash(*git filter-repo*)",
      "Bash(*git update-ref -d*)",
      "Bash(*git reflog expire*)",
      "Bash(*git gc --aggressive*)",
      "Bash(*git gc --prune=now*)",
      "Bash(*--no-verify*)",
      "Bash(*--no-gpg-sign*)",
      "Bash(*-c commit.gpgsign=false*)",
      "Bash(*-c core.hooksPath=*)",
      "Bash(git config --global*)",
      "Bash(git config --system*)",
      "Bash(*git stash drop*)",
      "Bash(*git stash clear*)"
    ]
  }
}
```

Note: `--force-with-lease` is allowed by some teams under controlled conditions. If your team permits it, remove that pattern from the deny list and rely on the agent-level rule (require explicit approval per invocation).

## Non-git destructive commands (same risk class, refuse without approval)

- `rm -rf` on broad paths (anything outside a clearly contained subdirectory the user named).
- `chmod 777` / world-writable permissions.
- Piping remote content into a shell (`curl … | bash`, `wget … | sh`).
- `sudo` (any agent in this plugin should never run with elevated privileges).
- Database `DROP TABLE` / `DROP DATABASE` / `TRUNCATE` against a non-throwaway database.
- `kubectl delete --all` / `kubectl delete namespace`.
- `terraform destroy` without an explicit, just-in-time plan review.

The same protocol applies: stop, surface, wait for explicit approval.
