import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const command = input.tool_input?.command ?? "";

const blocked = [
  [/\bgit\s+push\b/, "git push is done by a human after review"],
  [/\bgit\s+add\s+(-A|--all|\.)(\s|$)/, "stage files explicitly: git add <paths>"],
  [
    /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f|\brm\s+-[a-zA-Z]*f[a-zA-Z]*r/,
    "recursive force delete is not allowed",
  ],
  [/--no-verify\b/, "do not skip git hooks"],
];

for (const [pattern, reason] of blocked) {
  if (pattern.test(command)) {
    console.error(`Blocked by .claude/hooks/guard-bash.mjs: ${reason}`);
    process.exit(2);
  }
}
