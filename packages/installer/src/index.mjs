import os from "node:os";
import path from "node:path";
import { cp, mkdir, rename, rm, stat } from "node:fs/promises";
import { exists } from "../../shared/src/index.mjs";

export const INSTALL_TARGETS = Object.freeze(["codex", "claude", "cursor"]);

export function resolveInstallTargets(target = "all", home = os.homedir()) {
  const normalized = String(target).toLowerCase();
  const names = normalized === "all" ? INSTALL_TARGETS : [normalized];
  if (names.some((name) => !INSTALL_TARGETS.includes(name))) {
    throw new Error("--target must be codex, claude, cursor, or all");
  }
  return names.map((name) => ({
    name,
    directory: path.join(home, `.${name}`, "skills", "design-lagann")
  }));
}

function backupName(destination, now = new Date()) {
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  return `${destination}.backup-${stamp}`;
}

export async function installDesignLagann(options = {}) {
  const packageRoot = path.resolve(options.packageRoot || process.cwd());
  const source = path.join(packageRoot, "skills", "design-lagann");
  if (!await exists(path.join(source, "SKILL.md"))) {
    throw new Error(`Design Lagann skill payload is missing: ${source}`);
  }
  const targets = resolveInstallTargets(options.target || "all", options.home);
  const operations = [];

  for (const target of targets) {
    const alreadyExists = await exists(target.directory);
    if (alreadyExists && !options.force) {
      operations.push({ ...target, status: "skipped", reason: "already-exists", hint: "Run again with --force to update safely." });
      continue;
    }
    const backup = alreadyExists ? backupName(target.directory, options.now) : null;
    operations.push({ ...target, status: options.dryRun ? "planned" : "installed", backup });
    if (options.dryRun) continue;
    await mkdir(path.dirname(target.directory), { recursive: true });
    if (backup) await rename(target.directory, backup);
    try {
      await cp(source, target.directory, { recursive: true, force: false, errorOnExist: true });
      const installed = await stat(path.join(target.directory, "SKILL.md"));
      if (!installed.isFile()) throw new Error("installed SKILL.md is not a file");
    } catch (error) {
      await rm(target.directory, { recursive: true, force: true });
      if (backup) await rename(backup, target.directory);
      throw error;
    }
  }

  return {
    kind: "design-lagann-install-result",
    target: options.target || "all",
    dryRun: Boolean(options.dryRun),
    operations,
    next: "Start a new agent session so the host refreshes its available skills."
  };
}
