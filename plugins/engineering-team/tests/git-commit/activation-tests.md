# Activation tests — git-commit (skill)

Canonical corpus: [activation-evals.json](./activation-evals.json).

## Shape

- **Positive**: explicit / elliptical / hypothetical / multilingual requests for commit message text (draft, improve, rewrite, critique). Squash-mode requests.
- **Negative**: execution requests (run `git commit`), staging, rebase, split, merge-conflict resolution, diff display, git config, pure knowledge questions about Conventional Commits.
- **Edge**: combined intents (draft + execute — only the draft is in scope); hypothetical / prospective requests; squash mode.

Target accuracy: ≥0.90.
