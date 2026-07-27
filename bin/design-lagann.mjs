#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "../packages/shared/src/index.mjs";
import { installDesignLagann } from "../packages/installer/src/index.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INSTALL_HELP = `Design Lagann installer

Usage:
  npx design-lagann install --target codex
  npx design-lagann install --target claude
  npx design-lagann install --target cursor
  npx design-lagann install --target all

Options:
  --force      Back up an existing installation, then replace it
  --dry-run    Show exact destinations without writing
  --home PATH  Override the personal home directory
  --json       Emit machine-readable output
`;

export async function run(argv = process.argv.slice(2)) {
  if (argv[0] !== "install") {
    const { main } = await import("../apps/cli/src/cli.mjs");
    await main(argv);
    return;
  }
  const { options } = parseArgs(argv);
  if (options.help) {
    process.stdout.write(INSTALL_HELP);
    return;
  }
  const result = await installDesignLagann({
    packageRoot,
    target: options.target || "all",
    home: options.home,
    force: options.force === true || options.force === "true",
    dryRun: options["dry-run"] === true || options["dry-run"] === "true"
  });
  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  const runtimeSuffix = result.runtime.backup ? ` (backup: ${result.runtime.backup})` : result.runtime.reason ? ` (${result.runtime.reason})` : "";
  process.stdout.write(`runtime: ${result.runtime.status} -> ${result.runtime.directory}${runtimeSuffix}\n`);
  for (const operation of result.operations) {
    const suffix = operation.backup ? ` (backup: ${operation.backup})` : operation.reason ? ` (${operation.reason})` : "";
    process.stdout.write(`${operation.name}: ${operation.status} -> ${operation.directory}${suffix}\n`);
  }
  process.stdout.write(`${result.next}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    process.stderr.write(`design-lagann: ${error.message}\n`);
    process.exitCode = 1;
  });
}
