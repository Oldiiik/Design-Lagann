import os from "node:os";
import path from "node:path";
import { cp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { exists } from "../../shared/src/index.mjs";

export const INSTALL_TARGETS = Object.freeze(["codex", "claude", "cursor"]);
export const PERSONAL_RUNTIME_ENTRIES = Object.freeze([
  ".claude-plugin",
  ".codex-plugin",
  ".mcp.json",
  "apps",
  "bin",
  "packages",
  "rubrics",
  "skills",
  "templates",
  "LICENSE",
  "NOTICE.md",
  "PRODUCT.md",
  "README.md",
  "SECURITY.md",
  "package.json"
]);

export function resolveInstallTargets(target = "all", home = os.homedir(), environment = {}) {
  const normalized = String(target).toLowerCase();
  const names = normalized === "all" ? INSTALL_TARGETS : [normalized];
  if (names.some((name) => !INSTALL_TARGETS.includes(name))) {
    throw new Error("--target must be codex, claude, cursor, or all");
  }
  const roots = {
    codex: environment.CODEX_HOME || path.join(home, ".codex"),
    claude: environment.CLAUDE_CONFIG_DIR || path.join(home, ".claude"),
    cursor: environment.CURSOR_HOME || path.join(home, ".cursor")
  };
  return names.map((name) => ({
    name,
    directory: path.join(path.resolve(roots[name]), "skills", "design-lagann")
  }));
}

export function resolveRuntimeDirectory(home = os.homedir(), environment = {}) {
  return path.resolve(environment.DESIGN_LAGANN_HOME || path.join(home, ".design-lagann"), "runtime");
}

function backupName(destination, now = new Date()) {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `${destination}.backup-${stamp}`;
}

async function validateSkill(source) {
  const text = await readFile(path.join(source, "SKILL.md"), "utf8");
  if (!/^---\r?\nname: design-lagann\r?\ndescription: .+\r?\n---/.test(text)) {
    throw new Error("Design Lagann SKILL.md has invalid activation metadata");
  }
  if (!/Use automatically/i.test(text)) {
    throw new Error("Design Lagann SKILL.md must explicitly allow automatic invocation");
  }
  if (/disable-model-invocation:\s*true/i.test(text)) {
    throw new Error("Design Lagann SKILL.md disables automatic invocation");
  }
  return text;
}

async function copyRuntime(packageRoot, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of PERSONAL_RUNTIME_ENTRIES) {
    const source = path.join(packageRoot, entry);
    if (!await exists(source)) throw new Error(`Runtime payload is missing: ${source}`);
    await cp(source, path.join(destination, entry), {
      recursive: true,
      force: false,
      errorOnExist: true
    });
  }
}

async function installDirectory({ destination, force, dryRun, now, copy }) {
  const alreadyExists = await exists(destination);
  if (alreadyExists && !force) {
    return {
      status: "skipped",
      reason: "already-exists",
      hint: "Run again with --force to update safely.",
      backup: null
    };
  }
  const backup = alreadyExists ? backupName(destination, now) : null;
  if (dryRun) return { status: "planned", backup };
  const staging = `${destination}.installing-${process.pid}-${Date.now()}`;
  await mkdir(path.dirname(destination), { recursive: true });
  await rm(staging, { recursive: true, force: true });
  try {
    await copy(staging);
    if (backup) await rename(destination, backup);
    try {
      await rename(staging, destination);
    } catch (error) {
      if (!["EPERM", "EXDEV"].includes(error.code) || await exists(destination)) throw error;
      await cp(staging, destination, { recursive: true, force: false, errorOnExist: true });
      await rm(staging, { recursive: true, force: true });
    }
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    if (backup && !await exists(destination) && await exists(backup)) {
      await rename(backup, destination);
    }
    throw error;
  }
  return { status: "installed", backup };
}

export async function installDesignLagann(options = {}) {
  const packageRoot = path.resolve(options.packageRoot || process.cwd());
  const source = path.join(packageRoot, "skills", "design-lagann");
  if (!await exists(path.join(source, "SKILL.md"))) {
    throw new Error(`Design Lagann skill payload is missing: ${source}`);
  }
  await validateSkill(source);
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  const home = path.resolve(options.home || os.homedir());
  const environment = options.environment ?? (options.home ? {} : process.env);
  const targets = resolveInstallTargets(options.target || "all", home, environment);
  const runtimeDirectory = resolveRuntimeDirectory(home, environment);
  const runtimeOperation = await installDirectory({
    destination: runtimeDirectory,
    force: Boolean(options.force),
    dryRun: Boolean(options.dryRun),
    now: options.now,
    copy: (staging) => copyRuntime(packageRoot, staging)
  });
  const operations = [];

  for (const target of targets) {
    const operation = await installDirectory({
      destination: target.directory,
      force: Boolean(options.force),
      dryRun: Boolean(options.dryRun),
      now: options.now,
      copy: async (staging) => {
        await cp(source, staging, { recursive: true, force: false, errorOnExist: true });
        await writeFile(path.join(staging, "INSTALLATION.json"), `${JSON.stringify({
          name: "design-lagann",
          version: packageJson.version,
          host: target.name,
          scope: "personal",
          automaticInvocation: true,
          runtimeDirectory,
          installedAt: (options.now || new Date()).toISOString()
        }, null, 2)}\n`, "utf8");
      }
    });
    operations.push({ ...target, ...operation, automaticInvocation: true });
    if (operation.status === "installed") {
      const installed = await stat(path.join(target.directory, "SKILL.md"));
      if (!installed.isFile()) throw new Error("installed SKILL.md is not a file");
    }
  }

  return {
    kind: "design-lagann-install-result",
    version: packageJson.version,
    scope: "personal",
    target: options.target || "all",
    dryRun: Boolean(options.dryRun),
    runtime: { directory: runtimeDirectory, ...runtimeOperation },
    operations,
    next: "Start a new agent session. Matching frontend design requests will invoke Design Lagann automatically."
  };
}
