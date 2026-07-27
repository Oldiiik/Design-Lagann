import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "../packages/shared/src/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const outFlag = process.argv.indexOf("--out");
const outDir = path.resolve(outFlag >= 0 ? process.argv[outFlag + 1] : path.join(root, "dist"));
const archiveName = `design-lagann-plugin-${packageJson.version}-final-clean.zip`;
const archivePath = path.join(outDir, archiveName);
const tempRoot = await mkdtemp(path.join(os.tmpdir(), "design-lagann-release-"));
const stageRoot = path.join(tempRoot, "design-lagann");

const excludedSegments = new Set([
  ".git",
  ".github",
  ".design-lagann",
  ".playwright-cli",
  "node_modules",
  "assets",
  "benchmarks",
  "examples",
  "test",
  "third_party",
  "output",
  "dist",
  "coverage",
  "docs"
]);

function included(relative) {
  const segments = relative.split(path.sep);
  if (segments.some((segment) => excludedSegments.has(segment))) return false;
  if (relative.endsWith(".log") || relative.endsWith(".zip")) return false;
  if (relative === "SPONSORS.md") return false;
  return true;
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", windowsHide: true });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

try {
  await mkdir(stageRoot, { recursive: true });
  for (const absolute of await walk(root)) {
    const relative = path.relative(root, absolute);
    if (!included(relative)) continue;
    await mkdir(path.dirname(path.join(stageRoot, relative)), { recursive: true });
    await cp(absolute, path.join(stageRoot, relative));
  }

  const stagedFiles = (await walk(stageRoot)).map((file) => path.relative(stageRoot, file));
  if (stagedFiles.some((file) => path.extname(file).toLowerCase() === ".svg")) {
    throw new Error("Release staging contains SVG");
  }

  await mkdir(outDir, { recursive: true });
  await rm(archivePath, { force: true });
  if (process.platform === "win32") {
    await run("tar", ["-a", "-c", "-f", archivePath, "design-lagann"], tempRoot);
  } else {
    await run("zip", ["-q", "-r", archivePath, "design-lagann"], tempRoot);
  }

  const bytes = await readFile(archivePath);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const manifest = {
    name: archiveName,
    version: packageJson.version,
    files: stagedFiles.length,
    bytes: (await stat(archivePath)).size,
    sha256: digest
  };
  await writeFile(`${archivePath}.json`, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}
