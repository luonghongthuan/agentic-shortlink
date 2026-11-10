@AGENTS.md

## Claude Code

- For any feature, use the `implement-spec` skill. For a new idea without a spec, use `new-spec` first.
- Start non-trivial work in plan mode (Shift+Tab twice) and wait for approval of the task table.
- Before saying done, run the `reviewer` subagent on your diff, then the `refuter` subagent on its findings. Fix what survives.
- Hooks in `.claude/settings.json` format every edited file and block `git push`, `git add -A` and `rm -rf`. If a hook blocks you, do not work around it; tell the human.
- Personal overrides go in `CLAUDE.local.md` (git-ignored).
