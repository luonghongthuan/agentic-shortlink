import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8"));
const file = input.tool_input?.file_path;
const FORMAT = {"bin":"node_modules/@biomejs/biome/bin/biome","args":["check","--write","--no-errors-on-unmatched"]};
const root = resolve(process.env.CLAUDE_PROJECT_DIR ?? process.cwd());

// Run the formatter's own JS entry with node: no shell, so the file path is always a single argument.
if (FORMAT && file && /.(ts|js|mjs|json)$/.test(file)) {
  const target = resolve(file);
  const bin = join(root, FORMAT.bin);
  if (!relative(root, target).startsWith("..") && existsSync(bin)) {
    spawnSync(process.execPath, [bin, ...FORMAT.args, target], { stdio: "ignore", cwd: root });
  }
}
