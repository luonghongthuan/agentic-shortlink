import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const file = input.tool_input?.file_path;
const FORMAT = {{FORMAT_CMD}};

if (FORMAT && file && /{{FORMAT_EXT}}/.test(file)) {
  spawnSync(FORMAT[0], [...FORMAT.slice(1), file], { stdio: "ignore", shell: process.platform === "win32" });
}
