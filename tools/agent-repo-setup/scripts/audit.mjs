// Audit a repo for the agent workflow pieces and detect its commands.
//   node "$SK/scripts/audit.mjs" [repo-dir] [--json]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv.slice(2).find((a) => !a.startsWith("--")) ?? ".";
const asJson = process.argv.includes("--json");
const has = (p) => existsSync(join(dir, p));
const read = (p) => (has(p) ? readFileSync(join(dir, p), "utf8") : "");
const json = (p) => {
  try {
    return JSON.parse(read(p));
  } catch {
    return null;
  }
};

const pkg = json("package.json");
const pm = has("pnpm-lock.yaml")
  ? "pnpm"
  : has("yarn.lock")
    ? "yarn"
    : has("bun.lockb") || has("bun.lock")
      ? "bun"
      : pkg
        ? "npm"
        : null;
const run = (s) => (pm === "npm" ? (s === "test" ? "npm test" : `npm run ${s}`) : `${pm} ${s}`);
const scripts = pkg?.scripts ?? {};
const gateParts = [];
if (scripts.check) gateParts.push(run("check"));
else {
  for (const s of ["lint", "typecheck", "test"]) if (scripts[s]) gateParts.push(run(s));
}
const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };
const testRunner = deps.vitest
  ? "vitest"
  : deps.jest
    ? "jest"
    : deps["@playwright/test"] && !deps.vitest
      ? "playwright"
      : null;
const testOne =
  testRunner === "vitest"
    ? "npx vitest run <file>"
    : testRunner === "jest"
      ? "npx jest <file>"
      : (gateParts.at(-1) ?? null);
const formatter = deps["@biomejs/biome"]
  ? {
      cmd: ["npx", "biome", "check", "--write", "--no-errors-on-unmatched"],
      ext: "\\.(ts|tsx|js|jsx|mjs|json)$",
    }
  : deps.prettier
    ? {
        cmd: ["npx", "prettier", "--write", "--ignore-unknown"],
        ext: "\\.(ts|tsx|js|jsx|mjs|json|css|md)$",
      }
    : null;

const wfDir = join(dir, ".github/workflows");
const workflows = existsSync(wfDir) ? readdirSync(wfDir).filter((f) => /\.ya?ml$/.test(f)) : [];
const wfText = workflows.map((f) => readFileSync(join(wfDir, f), "utf8")).join("\n");
const runsOn = [...new Set([...wfText.matchAll(/runs-on:\s*([^\n#]+)/g)].map((m) => m[1].trim()))];
const settings = json(".claude/settings.json");
const claudeMd = read("CLAUDE.md");

const prod = [];
if (has("firebase.json") || deps["firebase-tools"])
  prod.push({ name: "firebase deploy", re: "\\bfirebase\\s+deploy\\b" });
if (has("vercel.json") || deps.vercel)
  prod.push({ name: "vercel --prod", re: "\\bvercel\\b.*--prod\\b" });
if (has("fly.toml")) prod.push({ name: "fly deploy", re: "\\bfly(ctl)?\\s+deploy\\b" });
if (readdirSync(dir).some((f) => f.endsWith(".tf")))
  prod.push({ name: "terraform apply/destroy", re: "\\bterraform\\s+(apply|destroy)\\b" });
if (has("wrangler.toml") || has("wrangler.jsonc"))
  prod.push({ name: "wrangler deploy", re: "\\bwrangler\\s+(deploy|publish)\\b" });
if (/docker-compose\.prod|compose\.prod/.test(readdirSync(dir).join(" ")))
  prod.push({ name: "prod compose", re: "compose\\.prod" });
if (/deploy|release/i.test(workflows.join(" ")))
  prod.push({ name: "gh workflow run (deploy)", re: "\\bgh\\s+workflow\\s+run\\b" });
const deployJob =
  /^\s{2}[\w-]*deploy[\w-]*:\s*$/m.test(wfText) ||
  /environment:\s*['"]?prod/i.test(wfText) ||
  /lxc-prod/.test(wfText);
const deploysOnMain = deployJob && /push:\s*\n\s*branches:\s*\[?\s*['"]?main/.test(wfText);
if (deployJob && existsSync(join(dir, "scripts/deploy")))
  prod.push({ name: "scripts/deploy", re: "scripts[\\\\/]deploy[\\\\/]" });
if (deployJob) prod.push({ name: "ssh to prod hosts", re: "\\bssh\\b.*\\bprod\\b" });

const secretFiles = [".env", ".env.local", ".env.production"].filter(has);
const report = {
  dir,
  packageManager: pm,
  scripts: Object.keys(scripts),
  gate: gateParts.join(" && ") || null,
  install: pm === "npm" ? "npm ci" : pm ? `${pm} install --frozen-lockfile` : null,
  testOne,
  formatter,
  runsOn,
  workflows,
  prodCommands: prod,
  deployJob,
  deploysOnMain,
  secretFilesPresent: secretFiles,
  has: {
    agentsMd: has("AGENTS.md"),
    claudeMd: has("CLAUDE.md"),
    claudeImportsAgents: /^@AGENTS\.md\b/m.test(claudeMd),
    settings: !!settings,
    denyRules: !!settings?.permissions?.deny?.length,
    preToolUseHook: !!settings?.hooks?.PreToolUse,
    subagents: has(".claude/agents")
      ? readdirSync(join(dir, ".claude/agents")).filter((f) => f.endsWith(".md"))
      : [],
    skills: has(".claude/skills")
      ? readdirSync(join(dir, ".claude/skills")).filter((f) =>
          statSync(join(dir, ".claude/skills", f)).isDirectory(),
        )
      : [],
    specs: has("docs/specs"),
    codexConfig: has(".codex/config.toml"),
    aiReviewWorkflow: /claude-code-action|codex-action/.test(wfText),
    dependabotActions: /package-ecosystem:\s*["']?github-actions/.test(
      read(".github/dependabot.yml"),
    ),
    gitattributes: has(".gitattributes"),
  },
};
if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  console.log(
    `repo: ${dir}  pm: ${pm ?? "-"}  gate: ${report.gate ?? "(none found)"}  test one: ${testOne ?? "-"}`,
  );
  console.log(
    `runners: ${runsOn.join(", ") || "-"}  formatter: ${formatter ? formatter.cmd.slice(0, 2).join(" ") : "-"}`,
  );
  console.log(`prod commands to guard: ${prod.map((p) => p.name).join(", ") || "-"}`);
  if (deploysOnMain) console.log("  NOTE a push to main deploys to production (deploy job in CI)");
  for (const [k, v] of Object.entries(report.has))
    console.log(
      `  ${Array.isArray(v) ? (v.length ? "Y" : "-") : v ? "Y" : "-"} ${k}${Array.isArray(v) && v.length ? ` (${v.join(", ")})` : ""}`,
    );
}
