import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const file = input.tool_input?.file_path;
const FORMAT = {{FORMAT_CMD}};
const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

// Run the formatter's own JS entry with node: no shell, so the file path is always a single argument.
if (FORMAT && file && /{{FORMAT_EXT}}/.test(file)) {
  const target = resolve(file);
  const bin = join(root, FORMAT.bin);
  if (!relative(root, target).startsWith("..") && existsSync(bin)) {
    spawnSync(process.execPath, [bin, ...FORMAT.args, target], { stdio: "ignore", cwd: root });
  }
}
