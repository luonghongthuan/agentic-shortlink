import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const file = input.tool_input?.file_path;
const FORMAT = {{FORMAT_CMD}};
const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

// Windows needs a shell to run npx, so refuse any path a shell could interpret, and anything outside the project.
const safe = (p) => !/[&|<>^"%!()`$;\r\n]/.test(p) && !relative(root, resolve(p)).startsWith("..");
if (FORMAT && file && /{{FORMAT_EXT}}/.test(file) && safe(file)) {
  spawnSync(FORMAT[0], [...FORMAT.slice(1), resolve(file)], { stdio: "ignore", shell: process.platform === "win32" });
}
