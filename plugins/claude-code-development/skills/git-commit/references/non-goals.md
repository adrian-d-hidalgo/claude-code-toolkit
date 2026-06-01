# Non-goals (explicit "we don't do this")

This skill is intentionally narrow. The items below are **deliberate omissions**, not gaps — each has a reason. Future contributors: read this before adding any of them back.

## gitmoji and emoji prefixes

The skill never proposes `:bug:`, `:sparkles:`, `🐛`, `✨`, or any other emoji-prefixed commit format, even when the repo's recent log contains some emojis.

**Why:**

- The Emoji Commit Index research (Allstacks, 2025) showed that emoji-commit adoption appears to have jumped from ~25% to ~75% from 2023 to 2025, but **85% of organizations have zero emoji commits on any given day** and 70% have none in a typical week. The headline growth is driven by AI tools (Copilot, ai-commit CLI, autonomous agents) that were trained on repos with emoji conventions, not by organic developer preference.
- Practical issues: emojis are hard to type on CLI, render inconsistently across terminals and platforms, break grep-based log search, and have accessibility issues for screen readers.
- The skill's anchor (Conventional Commits 1.0.0 with English type vocabulary) is searchable, parseable, and accessible. Emojis add no semantic information the type prefix doesn't already encode.

**What this means in practice:** if a repo's log contains emoji-prefixed commits, the skill notes the inconsistency (some commits with, some without) but always proposes the non-emoji form. The user can paste an emoji manually if they want; the skill won't generate one.

Source: <https://www.allstacks.com/blog/the-emoji-commit-index>.

## AI attribution in commit messages

The skill **never** proposes `Co-authored-by: Claude`, `Co-authored-by: GPT-*`, `🤖 Generated with Claude Code`, `Generated-by:`, or any other trailer that attributes a commit to an AI tool. This is a hard rule, not a default.

**Why:**

1. **License and legal clarity.** Authorship attribution legally lives in `git config user.name` / `user.email` — the commit `author` and `committer` fields. Adding parallel "AI co-author" trailers in the body creates two parallel attribution records that can disagree. Repos with strict contributor agreements (DCO, CLA) treat the author field as authoritative; trailer-based AI attribution muddies that.
2. **Repo author choice.** Disclosure of AI assistance is a personal/organizational policy decision. The skill is opinionated about Conventional Commits formatting, not about AI disclosure. If the user wants to disclose, they do it in their own way (commit body prose, PR description, project changelog) — not via a tool-injected trailer.
3. **Trailer hygiene.** Phoronix reported (2025) that Linus Torvalds rejected `Link:` trailers in kernel commits that added no value — busywork metadata gets rejected. `Co-authored-by: Claude` adds no action the reader can take; it's pure noise in the log.
4. **Industry signal does not equal industry consensus.** The ArXiv 2026 paper "AI Attribution Paradox" (arxiv.org/html/2512.00867v1) found that explicit AI attribution rose from ~0% in 2023 to 40% by Nov 2025, but Claude-attributed commits hit 80.5% while Copilot-attributed sat at 9.0% — meaning the headline number is driven by **one tool's default**, not by developer choice. VS Code's `git.addAICoAuthor` setting (1.110, Feb 2026) is **opt-in**, confirming the platform's view that this is a per-user decision.
5. **User preference.** The user of this skill has explicitly reaffirmed the ban on AI co-author trailers. That preference is authoritative for this skill — it overrides any repo convention or industry trend.

**What this means in practice:** even if a repo's log has 100% AI-attributed commits from prior tooling, the skill's proposals strip the attribution and present clean messages. Human `Co-authored-by:` for pair/mob programming with a named human is fine and encouraged (see `trailers.md`).

Sources: <https://arxiv.org/html/2512.00867v1>, <https://www.phoronix.com/news/Linux-Kernel-Highlights-2025>.

## Auto-execute (`git add`, `git commit`)

The skill produces **text proposals**. It never stages files, never invokes `git commit`, never amends, never pushes. The user is in the driver's seat for execution.

**Why:** commit-message authorship and commit execution are different decisions. The user reads the proposals, picks one (or asks for adjustments), then runs the commit themselves. This separation keeps the skill safe to invoke on any working tree without risk of mutating the repo.

If the user wants automation, they pipe the chosen proposal into their own commit script.

## Staged-content scanning (secrets, debug code, console.log)

The skill does not scan staged file contents for secrets, leftover `console.log`, debugger statements, hardcoded credentials, or `// TODO` markers. That is a pre-commit hook concern (`pre-commit`, `lefthook`, `husky`).

**Why:** this skill's purpose is **commit-message text**. Adding content-quality scanning would conflate two distinct responsibilities and force the skill to grow tools that already exist as well-maintained linters.

## Output-quality evaluation corpus

The skill's `tests/` directory currently exercises only activation (does the right trigger fire the skill?). There is no corpus that validates "given this diff, the proposed subject/scope/footer should be X" — that requires LLM-judge infrastructure (a separate test pipeline that runs the skill against synthetic diffs and grades outputs).

**Why deferred:** output-quality testing for text-generation skills is a non-trivial infrastructure investment. It is the right next step but lives outside the scope of skill content changes. Tracked as a follow-up.

## PR description generation

This skill writes commit messages, not pull-request descriptions. PR descriptions have different requirements: summary, motivation, test plan, screenshots, deployment notes. A separate skill (potentially `git-pr-description` or similar) would own that surface.

**Why:** they overlap but aren't the same. A commit message describes what one commit changes; a PR description describes a body of work spanning multiple commits with reviewer context. Combining them into one skill would dilute both.
