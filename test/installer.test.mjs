import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  installDesignLagann,
  resolveInstallTargets,
  resolveRuntimeDirectory
} from "../packages/installer/src/index.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("installer resolves all supported host skill directories", () => {
  const targets = resolveInstallTargets("all", path.join("C:", "portable-home"));
  assert.deepEqual(targets.map(({ name }) => name), ["codex", "claude", "cursor"]);
  assert.ok(targets.every(({ directory }) => directory.endsWith(path.join("skills", "design-lagann"))));
});

test("installer respects supported personal host roots", () => {
  const home = path.join("C:", "portable-home");
  const environment = {
    CODEX_HOME: path.join(home, "codex-profile"),
    CLAUDE_CONFIG_DIR: path.join(home, "claude-profile"),
    CURSOR_HOME: path.join(home, "cursor-profile"),
    DESIGN_LAGANN_HOME: path.join(home, "lagann-profile")
  };
  const targets = resolveInstallTargets("all", home, environment);
  assert.deepEqual(
    targets.map(({ directory }) => directory),
    ["codex-profile", "claude-profile", "cursor-profile"].map((name) => path.resolve(home, name, "skills", "design-lagann"))
  );
  assert.equal(resolveRuntimeDirectory(home, environment), path.resolve(home, "lagann-profile", "runtime"));
});

test("installer dry-run does not write", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "design-lagann-install-test-"));
  const result = await installDesignLagann({ packageRoot, home, target: "all", dryRun: true, environment: {} });
  assert.equal(result.operations.every(({ status }) => status === "planned"), true);
  assert.equal(result.operations.every(({ automaticInvocation }) => automaticInvocation === true), true);
  assert.equal(result.runtime.status, "planned");
  await assert.rejects(access(path.join(home, ".design-lagann")));
});

test("explicit home keeps smoke and portable installs isolated from host environment overrides", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "design-lagann-install-test-"));
  const result = await installDesignLagann({ packageRoot, home, target: "codex", dryRun: true });
  assert.equal(result.operations[0].directory, path.join(home, ".codex", "skills", "design-lagann"));
  assert.equal(result.runtime.directory, path.join(home, ".design-lagann", "runtime"));
});

test("installer persists a clean runtime and auto-discovered personal skill", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "design-lagann-install-test-"));
  const now = new Date("2026-07-27T00:00:00.000Z");
  const result = await installDesignLagann({ packageRoot, home, target: "cursor", now, environment: {} });
  const destination = result.operations[0].directory;
  const installation = JSON.parse(await readFile(path.join(destination, "INSTALLATION.json"), "utf8"));
  assert.equal(installation.host, "cursor");
  assert.equal(installation.scope, "personal");
  assert.equal(installation.automaticInvocation, true);
  assert.equal(installation.runtimeDirectory, result.runtime.directory);
  assert.match(await readFile(path.join(destination, "SKILL.md"), "utf8"), /Use automatically/i);
  await access(path.join(result.runtime.directory, "packages", "mcp-server", "src", "server.mjs"));
  await access(path.join(result.runtime.directory, ".codex-plugin", "plugin.json"));
  await assert.rejects(access(path.join(result.runtime.directory, "examples")));
  await assert.rejects(access(path.join(result.runtime.directory, "assets")));
});

test("installer backs up an existing skill before forced update", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "design-lagann-install-test-"));
  const destination = resolveInstallTargets("codex", home)[0].directory;
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, "SKILL.md"), "old-version\n", "utf8");
  const now = new Date("2026-07-27T00:00:00.000Z");
  const result = await installDesignLagann({ packageRoot, home, target: "codex", force: true, now, environment: {} });
  assert.match(await readFile(path.join(destination, "SKILL.md"), "utf8"), /name: design-lagann/);
  assert.equal(await readFile(`${destination}.backup-2026-07-27T00-00-00-000Z/SKILL.md`, "utf8"), "old-version\n");
  assert.equal(result.operations[0].status, "installed");
});
