import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { compact, exists, walk } from "../../shared/src/index.mjs";

const frameworkSignals = [
  ["next", "Next.js"],
  ["@remix-run/react", "Remix"],
  ["@sveltejs/kit", "SvelteKit"],
  ["astro", "Astro"],
  ["nuxt", "Nuxt"],
  ["vite", "Vite"],
  ["react", "React"],
  ["vue", "Vue"],
  ["svelte", "Svelte"]
];

export async function inspectRepository(projectRoot) {
  const root = path.resolve(projectRoot);
  const files = await walk(root);
  const relative = files.map((file) => path.relative(root, file).replaceAll("\\", "/"));
  const packagePath = path.join(root, "package.json");
  const packageJson = (await exists(packagePath)) ? JSON.parse(await readFile(packagePath, "utf8")) : null;
  const dependencies = { ...(packageJson?.dependencies ?? {}), ...(packageJson?.devDependencies ?? {}) };
  const framework = frameworkSignals.find(([name]) => name in dependencies)?.[1] ?? (packageJson ? "Node/web (unclassified)" : "Unknown");
  const packageManager =
    (await exists(path.join(root, "pnpm-lock.yaml"))) ? "pnpm" :
    (await exists(path.join(root, "yarn.lock"))) ? "yarn" :
    (await exists(path.join(root, "bun.lockb"))) ? "bun" :
    (await exists(path.join(root, "package-lock.json"))) ? "npm" : null;
  const styling = compact([
    "tailwindcss" in dependencies ? "Tailwind CSS" : null,
    "styled-components" in dependencies ? "styled-components" : null,
    "@emotion/react" in dependencies ? "Emotion" : null,
    relative.some((file) => /\.module\.css$/.test(file)) ? "CSS Modules" : null,
    relative.some((file) => /\.(css|scss|sass|less)$/.test(file)) ? "CSS" : null
  ]);
  const assets = relative.filter((file) => /\.(png|jpe?g|webp|avif|svg|gif|woff2?|ttf|otf)$/i.test(file)).slice(0, 250);
  const routes = relative.filter((file) => /(^|\/)(pages|app|routes)\//.test(file) && /\.(tsx?|jsx?|vue|svelte|astro)$/.test(file)).slice(0, 250);
  const summaryHash = createHash("sha256").update(relative.sort().join("\n")).digest("hex").slice(0, 16);
  return {
    version: "0.4.0",
    root,
    framework,
    packageManager,
    styling,
    scripts: packageJson?.scripts ?? {},
    routes,
    assets,
    fileCount: files.length,
    summaryHash,
    protectedFiles: relative.filter((file) => /(^|\/)(\.env|package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(file))
  };
}
