import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeBenchmark } from "./lib.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const options = {
    protocol: path.join(root, "protocol.json"),
    briefs: path.join(root, "briefs.json"),
    results: path.join(root, "results.json"),
    report: path.join(root, "report.json"),
    strict: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--strict") {
      options.strict = true;
      continue;
    }
    if (["--protocol", "--briefs", "--results", "--report"].includes(argument)) {
      const value = argv[index + 1];
      if (!value) throw new Error(`${argument} requires a path.`);
      options[argument.slice(2)] = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`Unknown benchmark argument: ${argument}`);
  }
  return options;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT" && fallback !== undefined) return fallback;
    throw new Error(`Could not read ${filePath}: ${error.message}`);
  }
}

export async function runBenchmark(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const [protocol, briefs, results] = await Promise.all([
    readJson(options.protocol),
    readJson(options.briefs),
    readJson(options.results, {
      protocolVersion: null,
      benchmarkId: null,
      blinding: null,
      runs: [],
      pairwiseRatings: []
    })
  ]);
  const report = analyzeBenchmark({ protocol, briefs, results });
  await writeFile(options.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (options.strict && report.status !== "ready-for-analysis") {
    process.exitCode = 2;
  }
  return report;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
  await runBenchmark();
}
