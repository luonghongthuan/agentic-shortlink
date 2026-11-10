// Add the missing agent-workflow pieces to a repo. Never overwrites: creates missing files, appends
// missing AGENTS.md sections, prepends the CLAUDE.md import, merges .claude/settings.json.
//   node "$SK/scripts/apply.mjs" <repo-dir> [--runs-on <label>] [--base main] [--no-ci] [--dry-run]
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SK = join(dirname(fileURLToPath(import.meta.url)), "..");
const T = (p) => readFileSync(join(SK, "templates", p), "utf8");
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const dir = args.find((a, i) => !a.startsWith("--") && !["--runs-on", "--base"].includes(args[i - 1]));
if (!dir) throw new Error("usage: apply.mjs <repo-dir> [--runs-on <label>] [--base main] [--no-ci] [--dry-run]");
const dry = args.includes("--dry-run");
const audit = JSON.parse(execFileSync(process.execPath, [join(SK, "scripts/audit.mjs"), dir, "--json"]).toString());
const base = opt("--base", "main");
const runsOn = opt("--runs-on", audit.runsOn.find((r) => !/prod/.test(r)) ?? "ubuntu-latest");
const gate = audit.gate ?? "<full gate command>";
const testOne = audit.testOne ?? gate;
const vars = {
  GATE: gate,
  TEST_ONE: testOne,
  INSTALL: audit.install ?? "<install command>",
  BASE: base,
  RUNS_ON: runsOn,
  FORMAT_CMD: audit.formatter ? JSON.stringify(audit.formatter.cmd) : "null",
  FORMAT_EXT: audit.formatter?.ext ?? "$^",
  PROD_SAFETY:
    (audit.deploysOnMain ? `\n- A push or merge to \`${base}\` deploys to production through CI. Treat every merge as a release.` : "") +
    (audit.prodCommands.length
      ? `\n- Deploy commands (${audit.prodCommands.map((p) => `\`${p.name}\``).join(", ")}) are run by a human, never by an agent; the guard hook blocks them.`
      : ""),
  PROD_PATTERNS: audit.prodCommands.map((p) => `[/${p.re}/, "${p.name} is run by a human, not an agent"],`).join("\n  "),
};
const fill = (s) => s.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m)).replace("// " + vars.PROD_PATTERNS, vars.PROD_PATTERNS);
const log = [];
const out = (rel, content, note = "created") => {
  log.push(`${note.padEnd(8)} ${rel}`);
  if (dry) return;
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), content);
};
const create = (rel, content) => (existsSync(join(dir, rel)) ? log.push(`kept     ${rel}`) : out(rel, content));
const read = (rel) => readFileSync(join(dir, rel), "utf8");

// AGENTS.md
const sections = fill(T("AGENTS.sections.md"));
if (!existsSync(join(dir, "AGENTS.md"))) {
  out(
    "AGENTS.md",
    `# AGENTS.md\n\nInstructions for every coding agent in this repo (Codex, Claude Code and others). Claude Code reads this file through CLAUDE.md. Keep tool-specific rules out of it.\n\n## Project\n\nTODO(agent-repo-setup): what the product is, the stack, and a short map of the main folders.\n\n${sections}`,
  );
} else {
  let cur = read("AGENTS.md");
  const add = sections.split(/\n(?=## )/).filter((s) => !cur.includes(s.split("\n")[0]));
  if (add.length) out("AGENTS.md", `${cur.trimEnd()}\n\n${add.join("\n").trim()}\n`, "appended");
  else log.push("kept     AGENTS.md");
}
// CLAUDE.md
const claudeTail = `\n## Claude Code\n\n- For a feature, use the \`implement-spec\` skill; for an idea without a spec, \`new-spec\` first.\n- Start non-trivial work in plan mode and wait for approval of the task table.\n- Before saying done, run the \`reviewer\` subagent on your diff, then \`refuter\` on its findings. Fix what survives.\n- Hooks in \`.claude/settings.json\` block push, \`git add -A\`, destructive deletes and deploys. If a hook blocks you, tell the human instead of working around it.\n- Personal overrides go in \`CLAUDE.local.md\` (git-ignored).\n`;
if (!existsSync(join(dir, "CLAUDE.md"))) out("CLAUDE.md", `@AGENTS.md\n${claudeTail}`);
else if (!/^@AGENTS\.md\b/m.test(read("CLAUDE.md"))) out("CLAUDE.md", `@AGENTS.md\n\n${read("CLAUDE.md")}`, "updated");
else log.push("kept     CLAUDE.md");

// .claude/settings.json (merge)
const pmRun = (s) => (audit.packageManager === "npm" ? (s === "test" ? "npm test" : `npm run ${s}`) : `${audit.packageManager} ${s}`);
const allow = [
  ...audit.scripts.filter((s) => /^(lint|typecheck|test|check|format|build)$/.test(s)).map((s) => `Bash(${pmRun(s)})`),
  ...(audit.testOne?.startsWith("npx vitest") ? ["Bash(npx vitest *)"] : audit.testOne?.startsWith("npx jest") ? ["Bash(npx jest *)"] : []),
  "Bash(git status)",
  "Bash(git diff *)",
  "Bash(git log *)",
  "Bash(git add *)",
  "Bash(git commit *)",
];
const ask = ["Bash(git push *)", `Bash(${audit.packageManager ?? "npm"} install *)`, "Edit(.github/**)", "Edit(AGENTS.md)"];
const deny = ["Read(./.env)", "Read(./.env.local)", "Read(./.env.*.local)", "Read(./.env.production)", "Read(./**/*service-account*.json)", "Read(./**/*.pem)"];
const settingsPath = join(dir, ".claude/settings.json");
const s = existsSync(settingsPath) ? JSON.parse(read(".claude/settings.json")) : { $schema: "https://json.schemastore.org/claude-code-settings.json" };
s.permissions ??= {};
const merge = (k, list) => (s.permissions[k] = [...new Set([...(s.permissions[k] ?? []), ...list])]);
merge("allow", allow);
merge("ask", ask);
merge("deny", deny);
s.hooks ??= {};
const hookCmd = (f) => `node "$CLAUDE_PROJECT_DIR/.claude/hooks/${f}"`;
const addHook = (event, matcher, f, extra = {}) => {
  s.hooks[event] ??= [];
  if (!JSON.stringify(s.hooks[event]).includes(f)) s.hooks[event].push({ matcher, hooks: [{ type: "command", command: hookCmd(f), ...extra }] });
};
addHook("PreToolUse", "Bash", "guard-bash.mjs");
if (audit.formatter) addHook("PostToolUse", "Write|Edit", "format-file.mjs", { timeout: 30 });
out(".claude/settings.json", `${JSON.stringify(s, null, 2)}\n`, existsSync(settingsPath) ? "merged" : "created");
create(".claude/hooks/guard-bash.mjs", fill(T("hooks/guard-bash.mjs")).replace("  // " + "\n", "\n"));
if (audit.formatter) create(".claude/hooks/format-file.mjs", fill(T("hooks/format-file.mjs")));
for (const a of ["reviewer", "refuter"]) create(`.claude/agents/${a}.md`, fill(T(`agents/${a}.md`)));
for (const k of ["new-spec", "implement-spec"]) create(`.claude/skills/${k}/SKILL.md`, fill(T(`skills/${k}/SKILL.md`)));
create("docs/specs/TEMPLATE.md", fill(T("docs/SPEC-TEMPLATE.md")).replace(/`pnpm check` passes \(lint, typecheck, tests\)/, `\`${gate}\` passes`));
create(
  ".codex/config.toml",
  `# Project config for Codex CLI (applies only when the project is trusted).\n# Provider settings and profiles are not allowed here; put them in ~/.codex/.\n\nmodel = "gpt-6.1-sol"\nmodel_reasoning_effort = "medium"\napproval_policy = "on-request"\nsandbox_mode = "workspace-write"\n\n[sandbox_workspace_write]\nnetwork_access = false\n`,
);

// CI
if (!args.includes("--no-ci")) {
  if (!audit.has.aiReviewWorkflow) for (const w of ["ai-review-claude.yml", "ai-review-codex.yml", "claude-mention.yml"]) create(`.github/workflows/${w}`, fill(T(`workflows/${w}`)));
  else log.push("kept     AI review workflows (already present)");
  const dpath = ".github/dependabot.yml";
  if (!existsSync(join(dir, dpath))) out(dpath, `version: 2\nupdates:\n  - package-ecosystem: github-actions\n    directory: /\n    schedule:\n      interval: weekly\n`);
  else if (!audit.has.dependabotActions) out(dpath, `${read(dpath).trimEnd()}\n  - package-ecosystem: github-actions\n    directory: /\n    schedule:\n      interval: weekly\n`, "appended");
}
// .gitignore
const gi = existsSync(join(dir, ".gitignore")) ? read(".gitignore") : "";
const ignore = ["CLAUDE.local.md", ".claude/settings.local.json", ".claude/worktrees/", ".worktrees/", "agent-runs/"].filter((l) => !gi.split(/\r?\n/).includes(l));
if (ignore.length) out(".gitignore", `${gi.trimEnd()}\n\n# agent workflow\n${ignore.join("\n")}\n`, "appended");

console.log(`agent-repo-setup ${dry ? "(dry run) " : ""}for ${dir}  [gate: ${gate}] [runner: ${runsOn}]`);
console.log(log.join("\n"));
if (!audit.gate) console.log("WARN no gate command found: fill {{GATE}} placeholders by hand");
console.log("Next: fill the AGENTS.md Project section, run verify.mjs, open the repo in Claude Code once and accept the trust dialog.");
