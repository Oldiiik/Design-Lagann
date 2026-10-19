#!/usr/bin/env node
// Lagann context-scan: reads a project and prints the design facts that are actually in the code,
// as raw material for .design-lagann/context.md. It reports; it never writes into the project.
//
//   node context-scan.mjs [project-root] [--json]
//
// Zero dependencies. Skips node_modules, build output and dot-folders (except the design-context ones).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative, resolve, basename } from 'node:path';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const root = resolve(args.find((a) => !a.startsWith('--')) || '.');
if (!existsSync(root)) { console.error('No such folder: ' + root); process.exit(2); }

const SKIP = new Set(['node_modules', 'dist', 'build', 'out', 'coverage', 'vendor', 'public', 'graphify-out', 'target', 'Pods', 'DerivedData']);
const STYLE = new Set(['.css', '.scss', '.sass', '.less', '.pcss']);
const MARKUP = new Set(['.html', '.htm', '.jsx', '.tsx', '.vue', '.svelte', '.astro', '.js', '.ts', '.mjs']);
const files = [];
const walk = (dir, depth = 0) => {
  if (depth > 8) return;
  let names; try { names = readdirSync(dir); } catch { return; }
  for (const n of names) {
    if (SKIP.has(n) || n.startsWith('.')) continue;
    const p = join(dir, n); let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, depth + 1);
    else if ((STYLE.has(extname(n)) || MARKUP.has(extname(n))) && st.size < 1_500_000 && !/\.min\.|\.d\.ts$|\.test\.|\.spec\./.test(n)) files.push(p);
  }
};
walk(root);
const rel = (p) => relative(root, p) || '.';
const read = (p) => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
const tally = () => new Map();
const bump = (m, k, by = 1) => m.set(k, (m.get(k) || 0) + by);
const top = (m, n = 10) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);

// package.json and stack
const pkgPath = join(root, 'package.json');
const pkg = existsSync(pkgPath) ? (() => { try { return JSON.parse(read(pkgPath)); } catch { return {}; } })() : null;
const deps = pkg ? { ...pkg.dependencies, ...pkg.devDependencies } : {};
const pick = (names) => names.filter((n) => Object.keys(deps).some((d) => d === n || d.startsWith(n + '/'))).map((n) => `${n}${deps[n] ? ' ' + deps[n] : ''}`);
const stack = {
  framework: pick(['next', 'react', 'vue', 'nuxt', 'svelte', '@sveltejs/kit', 'astro', 'solid-js', '@angular/core', 'react-native', 'expo', '@tauri-apps/api', 'electron']),
  styling: pick(['tailwindcss', 'styled-components', '@emotion/react', 'sass', '@vanilla-extract/css', 'unocss']),
  ui: pick(['@radix-ui', '@base-ui-components/react', '@mui/material', '@chakra-ui/react', '@headlessui/react', 'antd', 'vaul', 'sonner', 'cmdk']),
  motion: pick(['motion', 'framer-motion', 'gsap', '@react-spring/web', 'lenis']),
  icons: pick(['lucide-react', '@phosphor-icons/react', '@phosphor-icons/web', '@heroicons/react', 'react-icons', '@tabler/icons-react', '@radix-ui/react-icons']),
  testing: pick(['playwright', '@playwright/test', 'puppeteer', 'cypress', 'storybook']),
};
if (existsSync(join(root, 'components.json'))) stack.ui.push('shadcn/ui (components.json)');

// design docs that already exist
const docs = [];
for (const f of ['DESIGN.md', 'PRODUCT.md', 'design.md', 'BRAND.md', 'STYLEGUIDE.md', 'CLAUDE.md', 'AGENTS.md', '.claude/launch.json', 'tailwind.config.js', 'tailwind.config.ts', 'components.json']) if (existsSync(join(root, f))) docs.push(f);
for (const d of ['.design-lagann', '.taste-skill', '.impeccable', 'design-system', 'docs/design']) {
  const p = join(root, d);
  if (existsSync(p)) { try { docs.push(...readdirSync(p).filter((n) => !n.startsWith('.')).slice(0, 8).map((n) => `${d}/${n}`)); } catch {} }
}
const designMentions = ['CLAUDE.md', 'AGENTS.md'].filter((f) => existsSync(join(root, f)) && /design|typograph|palette|motion|animation/i.test(read(join(root, f))));

// scan styles and markup
const vars = new Map(); // name -> { value, file, count }
const fontFamilies = tally(), fontFaces = tally(), googleFonts = tally(), radii = tally(), durations = tally(), easings = tally(), keyframes = tally(), shadows = tally();
let reducedMotion = 0, blurMotion = 0, staggerHints = 0, hexInComponents = 0, viewTransitions = 0, scrollListeners = 0;
const reducedFiles = new Set();
for (const p of files) {
  const src = read(p); const ext = extname(p);
  const isStyle = STYLE.has(ext) || /<style[\s>]/.test(src);
  if (isStyle || ext === '.tsx' || ext === '.jsx' || ext === '.vue' || ext === '.svelte' || ext === '.astro') {
    for (const m of src.matchAll(/(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]+?)\s*(?=;|\})/g)) {
      const [, name, value] = m; if (value.length > 140) continue;
      const v = vars.get(name); if (v) v.count++; else vars.set(name, { value: value.trim(), file: rel(p), count: 1 });
    }
    for (const m of src.matchAll(/font-family\s*:\s*([^;{}]+)/g)) bump(fontFamilies, m[1].trim().replace(/\s+/g, ' ').slice(0, 90));
    for (const m of src.matchAll(/@font-face\s*{[^}]*font-family\s*:\s*["']?([^;"'}]+)/g)) bump(fontFaces, m[1].trim());
    for (const m of src.matchAll(/border-radius\s*:\s*([^;{}]+)/g)) bump(radii, m[1].trim().slice(0, 40));
    for (const m of src.matchAll(/box-shadow\s*:\s*([^;{}]+)/g)) bump(shadows, m[1].trim().replace(/\s+/g, ' ').slice(0, 70));
    for (const m of src.matchAll(/@keyframes\s+([\w-]+)/g)) bump(keyframes, m[1]);
    for (const m of src.matchAll(/(?:transition|animation)(?:-duration)?\s*:\s*([^;{}]+)/g)) {
      for (const d of m[1].matchAll(/(?<![\w.-])(\d*\.?\d+)(ms|s)\b/g)) bump(durations, d[2] === 's' ? `${Math.round(parseFloat(d[1]) * 1000)}ms` : `${d[1]}ms`);
      for (const e of m[1].matchAll(/cubic-bezier\([^)]+\)|\b(?:ease-in-out|ease-in|ease-out|ease|linear|steps\([^)]+\))\b|var\(--[\w-]*ease[\w-]*\)/g)) bump(easings, e[0].replace(/\s+/g, ''));
    }
    const rm = (src.match(/prefers-reduced-motion/g) || []).length; reducedMotion += rm; if (rm) reducedFiles.add(rel(p));
    if (/@keyframes[^}]*blur\(|transition[^;]*filter|filter\s*:\s*blur\([^)]*\)[^}]*transition/s.test(src)) blurMotion++;
    staggerHints += (src.match(/(?:transition|animation)-delay\s*:\s*calc\([^)]*var\(--(?:i|index|d|delay)\b|staggerChildren|stagger\s*:/g) || []).length;
    viewTransitions += (src.match(/@view-transition|::view-transition|startViewTransition/g) || []).length;
  }
  for (const m of src.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s)]+)/g)) for (const f of m[1].matchAll(/family=([^&:"']+)/g)) bump(googleFonts, decodeURIComponent(f[1]).replace(/\+/g, ' '));
  if (MARKUP.has(ext)) {
    scrollListeners += (src.match(/addEventListener\(\s*["']scroll["']/g) || []).length;
    if (!/:root|@theme/.test(src)) hexInComponents += (src.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])/g) || []).length;
  }
}

const groupOf = (name, value) => {
  const n = name.toLowerCase();
  if (/ease|dur|^--t(-|$)|motion|transition|reveal|delay/.test(n)) return 'motion';
  if (/font|family|sans|serif|mono|display|weight|leading|tracking|^--fs|text-(xs|sm|base|lg|xl)/.test(n) && !/#|rgb|hsl|oklch/.test(value)) return 'type';
  if (/radius|^--r(-|$)|rounded/.test(n)) return 'radius';
  if (/shadow|elev/.test(n)) return 'elevation';
  if (/^--z|z-index/.test(n)) return 'z-index';
  if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch|oklab|color-mix|^var\(--(p|c|color|gray|grey|red|blue|green)/i.test(value) || /color|bg|ink|text|accent|line|panel|paper|surface|border/.test(n)) return 'colour';
  if (/space|gap|gut|wrap|pad|size|max|container|width|height/.test(n)) return 'space';
  return 'other';
};
const tokens = {};
for (const [name, v] of vars) (tokens[groupOf(name, v.value)] ||= []).push({ name, ...v });

const report = {
  root, scannedFiles: files.length, stack, docs, designMentions,
  tokens: Object.fromEntries(Object.entries(tokens).map(([g, list]) => [g, list.length])),
  fonts: { declared: top(fontFamilies, 8), fontFace: top(fontFaces, 8), googleFonts: top(googleFonts, 8) },
  radii: top(radii, 10), shadows: top(shadows, 6),
  motion: { durations: top(durations, 12), easings: top(easings, 10), keyframes: top(keyframes, 15), reducedMotionRules: reducedMotion, reducedMotionFiles: [...reducedFiles].slice(0, 8), blurInMotion: blurMotion, staggerHints, viewTransitions, scrollListeners },
  hardCodedHexInComponents: hexInComponents,
};
const fileCount = tally(); for (const [, v] of vars) bump(fileCount, v.file);
report.tokenFiles = top(fileCount, 5);

if (asJson) { console.log(JSON.stringify({ ...report, tokenList: tokens }, null, 1)); process.exit(0); }

const out = []; const L = (s = '') => out.push(s);
const fmt = (list) => list.map(([k, c]) => `${k}${c > 1 ? ` ×${c}` : ''}`).join(' · ') || 'none found';
L(`# Design facts: ${basename(root)}`);
L(`Scanned ${files.length} style/markup files under ${root}. Facts only; verify before recording.`);
L();
L('## Stack');
for (const [k, v] of Object.entries(stack)) if (v.length) L(`- ${k}: ${v.join(', ')}`);
if (!pkg) L('- no package.json (plain HTML/CSS/JS or another toolchain)');
L();
L('## Existing design sources');
L(docs.length ? docs.map((d) => `- ${d}`).join('\n') : '- none');
if (designMentions.length) L(`- design notes inside: ${designMentions.join(', ')}`);
L();
L('## Tokens (CSS custom properties)');
L(`Defined mostly in: ${fmt(report.tokenFiles)}`);
for (const g of ['colour', 'type', 'space', 'radius', 'elevation', 'motion', 'z-index', 'other']) {
  const list = tokens[g]; if (!list?.length) continue;
  const shown = list.slice(0, g === 'colour' ? 28 : 14).map((t) => `${t.name}: ${t.value}`).join('; ');
  L(`- **${g}** (${list.length}): ${shown}${list.length > (g === 'colour' ? 28 : 14) ? '; …' : ''}`);
}
L();
L('## Typography');
L(`- font-family in use: ${fmt(report.fonts.declared)}`);
if (report.fonts.fontFace.length) L(`- @font-face: ${fmt(report.fonts.fontFace)}`);
if (report.fonts.googleFonts.length) L(`- Google Fonts: ${fmt(report.fonts.googleFonts)}`);
L();
L('## Shape and elevation');
L(`- border-radius values: ${fmt(report.radii)}`);
L(`- box-shadow values: ${fmt(report.shadows)}`);
L();
L('## Motion');
L(`- durations: ${fmt(report.motion.durations)}`);
L(`- easings: ${fmt(report.motion.easings)}`);
L(`- keyframes: ${fmt(report.motion.keyframes)}`);
L(`- prefers-reduced-motion rules: ${reducedMotion}${reducedFiles.size ? ` (${[...reducedFiles].slice(0, 5).join(', ')})` : ''}`);
L(`- blur used in motion: ${blurMotion ? `yes, in ${blurMotion} file(s)` : 'no'} · stagger patterns: ${staggerHints} · view transitions: ${viewTransitions ? 'yes' : 'no'} · scroll listeners: ${scrollListeners}`);
L();
L('## Token discipline');
L(`- hard-coded hex colours outside token blocks (markup/scripts): ${hexInComponents}`);
console.log(out.join('\n'));
