import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installDesignLagann, resolveInstallTargets } from "../packages/installer/src/index.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("installer resolves all supported host skill directories", () => {
  const targets = resolveInstallTargets("all", path.join("C:", "portable-home"));
  assert.deepEqual(targets.map(({ name }) => name), ["codex", "claude", "cursor"]);
  assert.ok(targets.every(({ directory }) => directory.endsWith(path.join("skills", "design-lagann"))));
});

test("installer dry-run does not write", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "design-lagann-install-test-"));
  const result = await installDesignLagann({ packageRoot, home, target: "all", dryRun: true });
  assert.equal(result.operations.every(({ status }) => status === "planned"), true);
});

test("installer backs up an existing skill before forced update", async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), "design-lagann-install-test-"));
  const destination = resolveInstallTargets("codex", home)[0].directory;
  await mkdir(destination, { recursive: true });
  await writeFile(path.join(destination, "SKILL.md"), "old-version\n", "utf8");
  const now = new Date("2026-07-27T00:00:00.000Z");
  const result = await installDesignLagann({ packageRoot, home, target: "codex", force: true, now });
  assert.match(await readFile(path.join(destination, "SKILL.md"), "utf8"), /name: design-lagann/);
  assert.equal(await readFile(`${destination}.backup-2026-07-27T00-00-00-000Z/SKILL.md`, "utf8"), "old-version\n");
  assert.equal(result.operations[0].status, "installed");
});
