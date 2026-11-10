#!/usr/bin/env bash
# Run one task headless in its own git worktree, with Claude Code or Codex.
#
#   scripts/agent-task.sh claude 0002-repo "Do T1 and T2 from docs/tasks/0002-daily-click-stats.md"
#   scripts/agent-task.sh codex  0002-docs "Update the README API section for spec 0002"
#
# Result: branch agent/<name>, worktree .worktrees/<name>, log and summary in agent-runs/<name>/.
# Nothing is pushed. Read agent-runs/<name>/summary.md, then review the branch.
set -euo pipefail

tool="${1:?usage: agent-task.sh claude|codex <name> <prompt>}"
name="${2:?missing task name}"
task="${3:?missing prompt}"

root="$(git rev-parse --show-toplevel)"
tree="$root/.worktrees/$name"
runs="$root/agent-runs/$name"
mkdir -p "$runs"

if [ ! -d "$tree" ]; then
  git -C "$root" worktree add -q "$tree" -b "agent/$name" main
fi
cd "$tree"
pnpm install --frozen-lockfile --prefer-offline >/dev/null

prompt="$task

Follow AGENTS.md. Work only inside this worktree. Run the task's check command and then pnpm check.
Commit your work on this branch with a Conventional Commits message, staging files explicitly.
End with a summary in three sections: Done and verified (with commands), Done but not verified, Skipped."

case "$tool" in
  claude)
    claude -p "$prompt" \
      --model sonnet \
      --permission-mode acceptEdits \
      --allowedTools "Read,Edit,Write,Glob,Grep,Bash(pnpm *),Bash(git status),Bash(git diff *),Bash(git add *),Bash(git commit *)" \
      --max-turns 40 \
      --max-budget-usd 3 \
      --output-format json >"$runs/claude.json"
    node -e 'const r=require(process.argv[1]);console.log(r.result);console.error(`cost_usd=${r.total_cost_usd}`)' \
      "$runs/claude.json" >"$runs/summary.md"
    ;;
  codex)
    codex exec "$prompt" \
      --sandbox workspace-write \
      --json \
      -o "$runs/summary.md" >"$runs/codex.jsonl"
    ;;
  *)
    echo "unknown tool: $tool (use claude or codex)" >&2
    exit 1
    ;;
esac

if pnpm check >"$runs/check.log" 2>&1; then
  echo "check: PASS" >>"$runs/summary.md"
else
  echo "check: FAIL (see check.log)" >>"$runs/summary.md"
fi

echo "== agent/$name =="
cat "$runs/summary.md"
