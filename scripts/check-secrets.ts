import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const ignored = new Set([".git", ".next", ".next.check-bak", "node_modules", "src/generated"]);
const extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".md", ".yml", ".yaml"]);
const sensitiveNames = ["access", "refresh", "app", "client"].map((prefix) => `${prefix}[_-]?(?:token|secret|key)`);
const assignment = new RegExp(`(?:${sensitiveNames.join("|")}|cookie|password)\\s*["']?\\s*[:=]\\s*["']([^"'\\n]{12,})["']`, "gi");
const privateKey = ["BEGIN", "PRIVATE", "KEY"].join(" ");
const tokenSignature = new RegExp(`gh${"[pousr]"}_[A-Za-z0-9]{20,}`, "i");

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    const key = relative(root, path).replaceAll("\\", "/");
    if (entry.isDirectory() && !ignored.has(entry.name) && !ignored.has(key)) {
      files.push(...await sourceFiles(path));
    } else if (entry.isFile() && extensions.has(extname(entry.name)) && key !== "scripts/check-secrets.ts") {
      files.push(path);
    }
  }
  return files;
}

async function main() {
  const findings: string[] = [];
  for (const file of await sourceFiles(root)) {
    const path = relative(root, file).replaceAll("\\", "/");
    const content = await readFile(file, "utf8");
    const assignments = [...content.matchAll(assignment)];
    const hasCredential = assignments.some((match) =>
      match[1] !== "dashboard_dev" && match[1] !== "dashboard_test"
    );
    if (content.includes(privateKey) || tokenSignature.test(content) || hasCredential) findings.push(path);
  }

  if (findings.length) {
    console.error(`Potential committed secret found in: ${findings.join(", ")}`);
    process.exitCode = 1;
  } else {
    console.info("Secret scan passed: no credential-like literals found.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

