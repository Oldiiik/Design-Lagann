import { access, mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const CONFIDENCE = Object.freeze(["exact", "computed", "estimated", "inferred"]);
export const IGNORED_DIRS = new Set([".git", ".design-lagann", "node_modules", "dist", "build", ".next", "coverage"]);

export async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(target) {
  return JSON.parse(await readFile(target, "utf8"));
}

export async function writeJson(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, target);
  return target;
}

export async function writeText(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, value.endsWith("\n") ? value : `${value}\n`, "utf8");
  return target;
}

export async function walk(root, options = {}) {
  const maxFiles = options.maxFiles ?? 4000;
  const files = [];
  async function visit(directory) {
    if (files.length >= maxFiles) return;
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(full);
      else if (entry.isFile()) files.push(full);
      if (files.length >= maxFiles) return;
    }
  }
  if ((await stat(root)).isDirectory()) await visit(root);
  else files.push(root);
  return files;
}

export function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "reference";
}

export function compact(values) {
  return [...new Set(values.filter(Boolean))];
}

export function frequencies(values, limit = 12) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

export function evidence(value, confidence, source) {
  if (!CONFIDENCE.includes(confidence)) throw new Error(`Invalid confidence: ${confidence}`);
  return { value, confidence, ...(source ? { source } : {}) };
}

export function parseArgs(argv) {
  const [command = "help", ...rest] = argv;
  const options = { _: [] };
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith("--")) {
      options._.push(token);
      continue;
    }
    const [key, inline] = token.slice(2).split("=", 2);
    if (inline !== undefined) options[key] = inline;
    else if (rest[index + 1] && !rest[index + 1].startsWith("--")) options[key] = rest[++index];
    else options[key] = true;
  }
  return { command, options };
}

export function priorityFor(category) {
  const order = {
    functionality: 1,
    responsive: 2,
    accessibility: 3,
    thesis: 4,
    composition: 5,
    "object-integration": 6,
    rhythm: 7,
    direction: 8,
    memorability: 9,
    originality: 10,
    architecture: 11,
    material: 12,
    typography: 13,
    assets: 14,
    interaction: 15,
    component: 16,
    decoration: 17
  };
  return order[category] ?? 99;
}
