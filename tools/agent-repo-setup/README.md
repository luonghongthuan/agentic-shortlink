# agent-repo-setup

Make any repo ready for Claude Code and Codex in a few minutes, the way this repo is set up. Part 7 of the series walks through it on a real project.

```bash
git -C <your-repo> fetch
git -C <your-repo> worktree add ../my-repo-agent-setup -b chore/agent-repo-setup origin/main
node tools/agent-repo-setup/scripts/audit.mjs ../my-repo-agent-setup
node tools/agent-repo-setup/scripts/apply.mjs ../my-repo-agent-setup --dry-run
node tools/agent-repo-setup/scripts/apply.mjs ../my-repo-agent-setup [--runs-on <runner label>] [--base main]
# fill the "Project" section of AGENTS.md by hand
node tools/agent-repo-setup/scripts/verify.mjs ../my-repo-agent-setup
```

| Script | Does |
| --- | --- |
| `audit.mjs` | Detects package manager, the full gate (`check`, or `lint && typecheck && test`), the single-test command, formatter, CI runners, production deploy paths (firebase, vercel, fly, terraform, wrangler, deploy jobs, `scripts/deploy/`) and whether a push to main deploys |
| `apply.mjs` | Adds only what is missing: AGENTS.md (or its missing sections), `@AGENTS.md` import in CLAUDE.md, merged `.claude/settings.json` (allow, ask, deny), guard and format hooks, `reviewer`/`refuter` subagents, `new-spec`/`implement-spec` skills, `docs/specs/TEMPLATE.md`, `.codex/config.toml`, AI review workflows (off until `ENABLE_AI_REVIEW=true`), Dependabot for actions, `.gitignore` entries. Never overwrites a file |
| `verify.mjs` | Settings parse, import present, frontmatter on line 1, the guard blocks push / `git add -A` / `rm -rf` / detected deploy commands and allows normal ones, deny rules, SHA-pinned actions, AI review off by default |

After applying: open the repo in Claude Code once and accept the trust dialog (an untrusted workspace ignores `.claude/settings.json`, hooks included), then open a PR. If merging deploys, merge it yourself after review.
