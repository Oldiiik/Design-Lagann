import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { createStyleLabServer } from "../server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const styles = ["editorial", "industrial", "retro-future", "organic"];
let server;
let baseUrl;

before(async () => {
  server = createStyleLabServer(root);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("gallery and every standalone example are served", async () => {
  for (const route of ["/", ...styles.map((style) => `/${style}/`)]) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(await response.text(), /<main[\s>]/i);
  }
});

test("each example is self-contained, responsive, and motion-safe", async () => {
  for (const style of styles) {
    const directory = path.join(root, style);
    const [html, css, script] = await Promise.all([
      readFile(path.join(directory, "index.html"), "utf8"),
      readFile(path.join(directory, "styles.css"), "utf8"),
      readFile(path.join(directory, "script.js"), "utf8")
    ]);
    assert.match(html, /<html[^>]+lang="en"/i, `${style}: language`);
    assert.match(html, /name="viewport"/i, `${style}: viewport`);
    assert.match(html, /<h1[\s>]/i, `${style}: h1`);
    assert.match(html, /<button[^>]+type="button"/i, `${style}: explicit button type`);
    assert.match(html, /(?:\.\/)?styles\.css/, `${style}: local stylesheet`);
    assert.match(html, /(?:\.\/)?script\.js/, `${style}: local script`);
    assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//i, `${style}: external asset`);
    assert.match(css, /@media\s*\([^)]*max-width/i, `${style}: responsive media`);
    assert.match(css, /prefers-reduced-motion/i, `${style}: reduced motion`);
    assert.match(css, /:focus-visible/i, `${style}: focus visibility`);
    assert.ok(script.length > 250, `${style}: interaction script`);
    assert.doesNotMatch(script, /\beval\s*\(/, `${style}: unsafe eval`);
  }
});

test("the shell exposes four keyboard-operable style tabs", async () => {
  const [html, script] = await Promise.all([
    readFile(path.join(root, "index.html"), "utf8"),
    readFile(path.join(root, "script.js"), "utf8")
  ]);
  assert.equal((html.match(/role="tab"/g) || []).length, 4);
  for (const style of styles) {
    assert.match(html, new RegExp(`data-style="${style}"`));
    assert.match(script, new RegExp(`["']?${style.replace("-", "\\-")}["']?\\s*:`));
  }
  assert.match(script, /ArrowLeft/);
  assert.match(script, /ArrowRight/);
});

test("the four directions use distinct thesis and palette tokens", async () => {
  const script = await readFile(path.join(root, "script.js"), "utf8");
  for (const phrase of [
    "book physically opens the page",
    "radio frequency becomes the page axis",
    "skate route is also the session schedule",
    "time rises through the page like bubbles"
  ]) {
    assert.match(script, new RegExp(phrase, "i"));
  }
  const accentMatches = [...script.matchAll(/accent:\s*"(#[0-9a-f]{6})"/gi)].map((match) => match[1]);
  assert.equal(new Set(accentMatches).size, 4);
});
