# Issue linkage

When a commit advances or closes tracked work, the message can reference the ticket so the platform (GitHub, GitLab, Jira) auto-links or auto-closes. This skill derives the right reference from two signals: **the branch name** and **the repo's existing convention in `git log`**.

## Step 1 — Extract issue ID from the branch name

Run `git rev-parse --abbrev-ref HEAD` and match the result against common patterns:

| Branch name pattern                        | Extracted ID                | Example match                |
| ------------------------------------------ | --------------------------- | ---------------------------- |
| `<type>/<KEY>-<num>-<slug>`                | Jira key                    | `feat/PAY-1342-add-refunds` → `PAY-1342` |
| `<type>/<num>-<slug>`                      | GitHub issue number         | `fix/456-null-pointer` → `#456` |
| `<num>-<slug>`                             | GitHub issue number         | `123-fix-login` → `#123`     |
| `<KEY>-<num>`                              | Jira key                    | `JIRA-789` → `JIRA-789`      |
| `users/<user>/<type>/<num>-<slug>`         | GitHub issue number         | `users/alice/fix/45-foo` → `#45` |
| `dependabot/<ecosystem>/<package>-<bump>`  | None (deps PR)              | no extraction                |
| `release/<version>` or `hotfix/<version>`  | None (release branch)       | no extraction                |
| `main` / `master` / `develop`              | None (long-lived branch)    | no extraction                |

When the pattern doesn't match anything in the table, the skill asks the user whether the commit should reference an issue (and which).

## Step 2 — Cross-reference with the repo's log convention

Even with an extracted ID, the **format** of the reference depends on what the repo uses. The skill samples `git log -50` and detects which form dominates:

| Convention detected in log               | Form to propose                 |
| ---------------------------------------- | ------------------------------- |
| `Closes #N` / `Fixes #N` (footer)        | `Closes #<num>` in footer       |
| `Refs: <KEY>-<num>` (footer)             | `Refs: <KEY>-<num>` in footer   |
| `[<KEY>-<num>]` in subject               | `[<KEY>-<num>]` in subject (Jira-style smart commit) |
| `(<num>)` or `(#<num>)` in subject       | leave alone — GitHub PR squash adds it automatically |
| No issue references in log               | do not invent one               |

The skill **never invents a reference format** the repo isn't already using. If the log shows the repo doesn't link to issues at all, neither should the proposal.

## Platform reference

### GitHub (auto-close keywords)

The following keywords, when used in a commit message that merges to the default branch, auto-close the referenced issue:

```
close   closes   closed
fix     fixes    fixed
resolve  resolves  resolved
```

Format: `<keyword> #<num>` (same repo) or `<keyword> <org>/<repo>#<num>` (cross-repo).

Source: <https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/using-keywords-in-issues-and-pull-requests>.

### GitLab

GitLab supports identical keyword set to GitHub. Same `<keyword> #<num>` format. Cross-project: `<keyword> <group>/<project>#<num>`.

Source: <https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically>.

### Jira (smart commits)

Jira parses commit messages for **smart commits** that act on issues. The format is stricter than GitHub:

- `<KEY>-<num> #close` — close the issue.
- `<KEY>-<num> #time 1h 30m` — log time.
- `<KEY>-<num> #comment <free text>` — add a comment.

Constraints: single-line commands (no wrapping), only one command per line, the committer's email must match the Jira user's email. Multiple smart-commit actions on one commit are allowed; chain them on separate lines.

Source: <https://support.atlassian.com/jira-software-cloud/docs/process-issues-with-smart-commits/>.

## Decision tree

```
extracted_id = parse_branch_name()
log_convention = sample_log_for_issue_references()

if extracted_id is None and log_convention exists:
    ask_user: "the repo references issues via <convention>; which issue does this commit advance or close?"
    if user gives ID → use it in <convention> form
    if user says "none" → omit the reference

if extracted_id and log_convention:
    propose <extracted_id> in <convention> form

if extracted_id and not log_convention:
    mention extracted_id in body once (e.g. "Advances PAY-1342") but do not invent a Closes/Refs trailer

if neither:
    no reference
```

## When to propose which keyword

If the convention is GitHub `close/fix/resolve`, pick the verb that matches the commit's nature:

- The change **fully solves** the bug or implements the feature → `Closes #N` or `Fixes #N`.
- The change **partially advances** the work but doesn't fully resolve it → `Refs: #N` (NOT a GitHub auto-close keyword — issue stays open).

The skill's type already encodes part of this (a `fix:` that closes a known bug → `Fixes #N`; a `feat:` that completes a story → `Closes #N`). When uncertain, ask the user before adding the keyword.
