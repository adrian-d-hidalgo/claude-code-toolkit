# gitGraph

**Notation anchor**: Git branching visualization convention; mirrors the abstraction of `git log --oneline --graph --all`.
**Best for**: documenting branching strategies, illustrating merge / rebase histories, training docs about Git workflows.
**Mermaid version**: `gitGraph` stable since v8.x; theme options added in v9.x.

## Syntax skeleton

```mermaid
gitGraph
    commit id: "init"
    commit id: "setup"
    branch feature/auth
    checkout feature/auth
    commit id: "login form"
    commit id: "session mgmt"
    checkout main
    merge feature/auth
    commit id: "release v1.0" tag: "v1.0"
```

## Structure

| Statement                       | Purpose                                   |
| ------------------------------- | ----------------------------------------- |
| `commit`                        | New commit on the current branch          |
| `commit id: "<label>"`          | Commit with explicit label                |
| `commit tag: "<tag>"`           | Tagged commit                             |
| `commit type: HIGHLIGHT`        | Highlighted commit (visual emphasis)      |
| `commit type: REVERSE`          | Reverse-revert commit                     |
| `branch <name>`                 | Create a new branch from the current HEAD |
| `checkout <name>`               | Switch HEAD to branch `<name>`            |
| `merge <name>`                  | Merge branch `<name>` into current branch |
| `cherry-pick id: "<commit-id>"` | Cherry-pick a commit by id                |

## Commit `type`

| Value              | Visual                  |
| ------------------ | ----------------------- |
| `NORMAL` (default) | Standard dot            |
| `REVERSE`          | X-marked dot (revert)   |
| `HIGHLIGHT`        | Emphasized (larger) dot |

## Themes and config

```mermaid
---
config:
    theme: base
    themeVariables:
        commitLabelColor: "#ffffff"
        gitInv0: "#1e1e2e"
---
gitGraph
    commit
```

Use `---` frontmatter for per-diagram theme overrides. For wider themes (`forest`, `dark`, `default`, `neutral`), set globally.

## Gotchas

- `checkout` switches HEAD; subsequent `commit` lines apply to that branch.
- `merge` always merges INTO the current branch — you must `checkout main` before `merge feature/x`.
- Cherry-pick requires the `id` of an existing commit. If you have not labelled commits with explicit `id`, you cannot cherry-pick them.
- For very long histories, split into multiple diagrams or use `git log --graph` directly — Mermaid `gitGraph` is for documentation, not for production history rendering.
- Some Git operations (rebase, squash-merge, octopus merge) do not have direct Mermaid equivalents; document them in prose alongside the diagram.

## Worked example — GitFlow

```mermaid
gitGraph
    commit id: "init"
    branch develop
    checkout develop
    commit id: "dev setup"
    branch feature/login
    commit id: "form"
    commit id: "session"
    checkout develop
    merge feature/login
    branch release/1.0
    commit id: "bump 1.0"
    checkout main
    merge release/1.0 tag: "v1.0"
    checkout develop
    merge release/1.0
    branch hotfix/1.0.1
    checkout hotfix/1.0.1
    commit id: "fix CVE"
    checkout main
    merge hotfix/1.0.1 tag: "v1.0.1"
    checkout develop
    merge hotfix/1.0.1
```

## Worked example — trunk-based development with short-lived feature branch

```mermaid
gitGraph
    commit id: "init"
    commit id: "config"
    branch feature/payments
    commit id: "stripe sdk"
    commit id: "webhook"
    checkout main
    commit id: "unrelated fix"
    checkout feature/payments
    commit id: "tests"
    checkout main
    merge feature/payments tag: "v2.3.0"
    commit id: "post-release patch"
```

## Worked example — release with cherry-pick to a maintenance branch

```mermaid
gitGraph
    commit id: "init"
    commit id: "v1 release" tag: "v1.0"
    branch maintenance/1.x
    checkout main
    commit id: "feature work"
    commit id: "another feature"
    commit id: "security fix" type: HIGHLIGHT
    checkout maintenance/1.x
    cherry-pick id: "security fix"
    commit tag: "v1.0.1"
```

## When to use a different diagram

- For **the release timeline itself**, use `gantt` (dates and durations) — not `gitGraph` (commits).
- For **CI/CD pipeline** of how a commit flows through stages, use `flowchart` (decisions) — not `gitGraph`.
- For **state machine of a branch's lifecycle** (created → in review → merged → archived), use `stateDiagram-v2`.

`gitGraph` is specifically for the topology of commits and branches.
