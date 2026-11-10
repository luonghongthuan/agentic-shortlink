// Verify the agent setup of a repo: settings parse, hooks block what they must, files and imports in place.
//   node "$SK/scripts/verify.mjs" <repo-dir>
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? ".";
let fail = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? "ok  " : "FAIL"} ${msg}`);
  if (!cond) fail++;
};
const read = (p) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p), "utf8") : "");
let settings = null;
try {
  settings = JSON.parse(read(".claude/settings.json"));
} catch {}
ok(!!settings, ".claude/settings.json parses");
ok(/^@AGENTS\.md\b/m.test(read("CLAUDE.md")), "CLAUDE.md imports @AGENTS.md");
ok(/## Code Review Rules/.test(read("AGENTS.md")) && /## Review levels/.test(read("AGENTS.md")), "AGENTS.md has Code Review Rules and Review levels");
ok(!/TODO\(agent-repo-setup\)/.test(read("AGENTS.md")), "AGENTS.md Project section filled in");
ok(!/\{\{\w+\}\}/.test(["AGENTS.md", ".claude/agents/reviewer.md", ".claude/agents/refuter.md", ".claude/skills/implement-spec/SKILL.md"].map(read).join("")), "no unfilled {{placeholders}}");
for (const f of [".claude/agents/reviewer.md", ".claude/agents/refuter.md", ".claude/skills/new-spec/SKILL.md", ".claude/skills/implement-spec/SKILL.md"])
  ok(/^---\nname: /.test(read(f).replace(/\r\n/g, "\n")), `${f} frontmatter starts on line 1`);
const hook = join(dir, ".claude/hooks/guard-bash.mjs");
const tryHook = (cmd) => spawnSync(process.execPath, [hook], { input: JSON.stringify({ tool_input: { command: cmd } }) }).status;
if (existsSync(hook)) {
  for (const c of ["git push origin main", "git add -A", "rm -rf node_modules", "git commit --no-verify -m x"]) ok(tryHook(c) === 2, `guard blocks: ${c}`);
  for (const c of ["git add src/a.ts", "git status"]) ok(tryHook(c) === 0, `guard allows: ${c}`);
  for (const m of readFileSync(hook, "utf8").matchAll(/"(\S+ \S+|\S+) is run by a human/g)) {
    const sample = { "firebase deploy": "npx firebase deploy --only hosting", "vercel --prod": "vercel deploy --prod", "fly deploy": "fly deploy", "terraform apply/destroy": "terraform apply", "wrangler deploy": "npx wrangler deploy", "gh workflow run (deploy)": "gh workflow run deploy.yml", "scripts/deploy": "bash scripts/deploy/lxc-deploy.sh", "ssh to prod hosts": "ssh root@prod-web-1" }[m[1]];
    if (sample) ok(tryHook(sample) === 2, `guard blocks: ${sample}`);
  }
} else ok(false, "guard hook exists");
ok(JSON.stringify(settings?.permissions?.deny ?? []).includes("Read(./.env)"), "deny rule for .env");
for (const w of ["ai-review-claude.yml", "ai-review-codex.yml"]) {
  const y = read(`.github/workflows/${w}`);
  if (!y) continue;
  ok(!/uses: [^@\s]+@v\d/.test(y), `${w}: every action pinned to a SHA`);
  ok(/ENABLE_AI_REVIEW/.test(y) && /head\.repo\.full_name == github\.repository/.test(y), `${w}: off by default, same-repo PRs only`);
}
console.log(fail ? `${fail} check(s) failed` : "all checks passed");
process.exit(fail ? 1 : 0);
