import { spawnSync } from "node:child_process";

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const steps = [
  ["db:deploy"],
  ["db:seed"],
  ["mock:sync"],
  ["mock:sync"],
  ["metrics:rebuild"],
  ["test:integration"]
];

for (const [script] of steps) {
  console.info(`\n[ci:database] pnpm ${script}`);
  const result = spawnSync(pnpm, [script], { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

