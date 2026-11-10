import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const file = input.tool_input?.file_path;

if (file && /\.(ts|js|mjs|json|md)$/.test(file)) {
  spawnSync("pnpm", ["exec", "biome", "check", "--write", "--no-errors-on-unmatched", file], {
    stdio: "ignore",
    shell: process.platform === "win32",
  });
}
