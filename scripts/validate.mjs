import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { exists, walk } from "../packages/shared/src/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  ".codex-plugin/plugin.json",
  ".claude-plugin/plugin.json",
  ".mcp.json",
  "skills/design-lagann/SKILL.md",
  "skills/design-lagann/references/claude-host.md",
  "packages/workflow-engine/src/index.mjs",
  "packages/installer/src/index.mjs",
  "install.mjs",
  "assets/brand/design-lagann-logo.png",
  "assets/brand/design-lagann-github-banner.png",
  "assets/brand/design-lagann-social-preview.png",
  "apps/cli/src/cli.mjs",
  "packages/mcp-server/src/server.mjs",
  "scripts/package-release.mjs",
  ".github/workflows/ci.yml",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/README.md",
  ".github/FUNDING.yml",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "NOTICE.md",
  "SPONSORS.md",
  "docs/GITHUB-LAUNCH.md",
  "third_party/impeccable/LICENSE",
  "third_party/design-dna/LICENSE"
];

for (const relative of required) assert.equal(await exists(path.join(root, relative)), true, `Missing ${relative}`);
const manifest = JSON.parse(await readFile(path.join(root, ".codex-plugin", "plugin.json"), "utf8"));
const claudeManifest = JSON.parse(await readFile(path.join(root, ".claude-plugin", "plugin.json"), "utf8"));
const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
assert.equal(manifest.name, packageJson.name);
assert.equal(claudeManifest.name, packageJson.name);
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.version, packageJson.version, "Plugin manifest and root package versions must match");
assert.equal(claudeManifest.version, packageJson.version, "Claude manifest and root package versions must match");
assert.equal(manifest.skills, "./skills/");
assert.equal(manifest.mcpServers, "./.mcp.json");
const mcp = JSON.parse(await readFile(path.join(root, ".mcp.json"), "utf8"));
assert.ok(mcp.mcpServers?.["design-lagann"]);
const skill = await readFile(path.join(root, "skills", "design-lagann", "SKILL.md"), "utf8");
assert.match(skill, /^---\r?\nname: design-lagann\r?\ndescription: .+\r?\n---/);
assert.match(skill, /Use automatically/i);
assert.equal(await exists(path.join(root, "examples")), false, "Personal demo projects must not ship in the repository");
const files = await walk(root);
const canonicalBrandAssets = new Set([
  "design-lagann-logo.png",
  "design-lagann-github-banner.png",
  "design-lagann-social-preview.png"
]);
const brandFiles = files
  .filter((file) => path.dirname(file) === path.join(root, "assets", "brand"))
  .map((file) => path.basename(file));
assert.deepEqual(new Set(brandFiles), canonicalBrandAssets, "Only canonical Design Lagann brand assets may remain");
assert.deepEqual(
  files.filter((file) => path.extname(file).toLowerCase() === ".svg"),
  [],
  "The plugin source must contain zero SVG files"
);
const todoMarker = `[${"TODO"}:`;
for (const file of files.filter((item) => /\.(md|json|ya?ml|mjs)$/.test(item))) {
  const source = await readFile(file, "utf8");
  assert.equal(source.includes(todoMarker), false, `TODO placeholder in ${file}`);
}
process.stdout.write(`Validated ${required.length} required artifacts and ${files.length} files.\n`);
