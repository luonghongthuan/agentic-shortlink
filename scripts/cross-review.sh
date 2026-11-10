#!/usr/bin/env bash
# Review the current branch with two model families, then keep only findings both can defend.
#
#   scripts/cross-review.sh            # reviews main...HEAD
#   scripts/cross-review.sh origin/main
#
# Output: agent-runs/review-<branch>/{codex.md,claude.md,final.md}
set -euo pipefail

base="${1:-main}"
branch="$(git rev-parse --abbrev-ref HEAD)"
out="agent-runs/review-${branch//\//-}"
mkdir -p "$out"

review_prompt="Review the changes in 'git diff $base...HEAD' in this repo.
Follow the 'Code Review Rules' section of AGENTS.md and the spec the change implements in docs/specs/.
Output one finding per line: [high|medium|low] file:line: problem. Failure scenario: input -> wrong output.
If there are no findings, output exactly: NO FINDINGS. Do not edit any file."

codex exec "$review_prompt" --sandbox read-only -o "$out/codex.md" >/dev/null

claude -p "$review_prompt" \
  --model opus \
  --permission-mode plan \
  --allowedTools "Read,Glob,Grep,Bash(git diff *),Bash(git log *)" \
  --max-turns 20 \
  --output-format text >"$out/claude.md"

claude -p "Two reviewers from different model families reviewed 'git diff $base...HEAD'.

Codex findings:
$(cat "$out/codex.md")

Claude findings:
$(cat "$out/claude.md")

For each finding, read the code and try to refute it. You may run 'pnpm vitest run <file>' to check.
Output only findings you could not refute, merged and de-duplicated, highest severity first,
each with the model(s) that raised it. Then one line per refuted finding with the reason." \
  --model opus \
  --allowedTools "Read,Glob,Grep,Bash(git diff *),Bash(pnpm vitest *)" \
  --max-turns 30 \
  --output-format text >"$out/final.md"

cat "$out/final.md"
