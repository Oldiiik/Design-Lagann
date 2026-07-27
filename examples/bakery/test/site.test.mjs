import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("site contains required landmarks and interactions", async () => {
  const html = await readFile(path.join(root, "index.html"), "utf8");
  assert.match(html, /<header/);
  assert.match(html, /<main id="main">/);
  assert.match(html, /<dialog/);
  assert.match(html, /data-add-item/);
});

test("styles avoid banned generic patterns", async () => {
  const css = await readFile(path.join(root, "styles.css"), "utf8");
  assert.doesNotMatch(css, /background-clip\s*:\s*text/);
  assert.doesNotMatch(css, /repeating-linear-gradient/);
  assert.doesNotMatch(css, /z-index\s*:\s*(999|9999)/);
  assert.match(css, /prefers-reduced-motion/);
});
