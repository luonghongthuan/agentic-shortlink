import { readFileSync } from "node:fs";

// A guardrail, not a security boundary: also keep branch protection, no push credentials for agents,
// and deploy approval in CI. Patterns look anywhere in the command, so `git -C x push`,
// `git -c k=v push` and `bash -c "git push"` are caught too.
const input = JSON.parse(readFileSync(0, "utf8"));
const command = String(input.tool_input?.command ?? "").replace(/\s+/g, " ");

const blocked = [
  [/\bgit\b[^;&|]*\spush\b/, "git push is done by a human after review"],
  [/\bgit\b[^;&|]*\sadd\b[^;&|]*\s(-A|--all|\.)(\s|$|;|&|\|)/, "stage files explicitly: git add <paths>"],
  [/\brm\b[^;&|]*\s(-[a-zA-Z]*r[a-zA-Z]*f|-[a-zA-Z]*f[a-zA-Z]*r|-r\b[^;&|]*\s-f\b|-f\b[^;&|]*\s-r\b|--recursive\b[^;&|]*--force\b|--force\b[^;&|]*--recursive\b)/, "recursive force delete is not allowed"],
  [/--no-verify\b/, "do not skip git hooks"],
  [/\bgit\b[^;&|]*\sreset\s+--hard\b|\bgit\b[^;&|]*\sclean\s+-[a-zA-Z]*f/, "destructive git commands need a human"],
  // {{PROD_PATTERNS}}
];

for (const [pattern, reason] of blocked) {
  if (pattern.test(command)) {
    console.error(`Blocked by .claude/hooks/guard-bash.mjs: ${reason}`);
    process.exit(2);
  }
}
