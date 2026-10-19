#!/usr/bin/env node
// Lagann inspect: runs taste-skill's real-browser inspector and sorts its findings by what they mean.
//
//   node inspect.mjs <url | path/to/file.html> [--widths 1440,768,390] [--out DIR] [--allow id,id] [--json]
//
//   defect   broken, unreadable or inaccessible. Fix before anything else.
//   quality  usually a real hierarchy / layout / readability problem. Judge it, then fix or defend.
//   signal   a pattern taste-skill's house style bans (gradient, shadow, eyebrow, mono...). Not a
//            defect. Run modules/anti-slop.md's five questions; keep it when it is a decision.
//
// Exit code 1 only when a defect remains. Needs Node 22+ and a local Chrome/Edge/Chromium (taste-skill's
// requirement). Installs and downloads nothing.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve, relative } from 'node:path';

// taste-skill lives in the host's skills folder; LAGANN_SKILLS_DIR overrides the search.
const SKILL_DIRS = [process.env.LAGANN_SKILLS_DIR, '.claude/skills', '.codex/skills', '.cursor/skills', '.agents/skills']
  .filter(Boolean).map((d) => (d.startsWith('/') ? d : join(homedir(), d)));
const TASTE = SKILL_DIRS.map((d) => join(d, 'taste-skill/scripts/inspect.mjs')).find(existsSync) || join(SKILL_DIRS[0], 'taste-skill/scripts/inspect.mjs');

const DEFECT = new Set(['overflow', 'broken-image', 'clipped-text', 'covered-text', 'font-fallback', 'contrast']);
// contrast: taste-skill WARNs below AA and FAILs when unreadable; both are AA failures, so both are defects.
const QUALITY = new Set(['small-text', 'body-size', 'blend-text', 'headline-lines', 'statement-length', 'hero-words', 'measure', 'size-count',
  'font-count', 'focal-point', 'no-hero', 'first-action', 'empty-screens', 'side-scroll', 'all-centred',
  'default-link', 'grey-body', 'long-pin', 'pinned-over-picture']);
// everything else (gradient, shadow, eyebrow, mono, hairline, palette-*, few-pictures, still-page...) is a signal.

const args = process.argv.slice(2);
const take = (name, def) => { const i = args.indexOf('--' + name); if (i === -1) return def; const v = args[i + 1]; args.splice(i, 2); return v; };
const has = (name) => { const i = args.indexOf('--' + name); if (i === -1) return false; args.splice(i, 1); return true; };
const out = resolve(take('out', '.design-lagann/inspect'));
const widths = take('widths', '1440,768,390');
const allow = take('allow', '');
const asJson = has('json');
const target = args[0];
if (!target || target.startsWith('--')) {
  console.error('usage: node inspect.mjs <url | file.html> [--widths 1440,768,390] [--out DIR] [--allow id,id] [--json]');
  process.exit(2);
}
if (!existsSync(TASTE)) {
  console.error(`taste-skill inspector not found at ${TASTE}.\nFallback: render with the browser pane (stages/4-verify.md §1) and run scripts/browser-checks.js there.`);
  process.exit(2);
}
const major = Number(process.versions.node.split('.')[0]);
if (major < 22) console.error(`warning: Node ${process.versions.node}; taste-skill's inspector expects Node 22+.`);

mkdirSync(out, { recursive: true });
const reportFile = join(out, 'report.json');
rmSync(reportFile, { force: true });
// Read the report file the inspector writes, not its stdout: piped stdout is cut off when it exits.
const run = spawnSync(process.execPath, [TASTE, target, '--out', out, '--widths', widths, ...(allow ? ['--allow', allow] : [])],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
let report;
try { report = JSON.parse(readFileSync(reportFile, 'utf8')); } catch {
  console.error('The inspector did not return a report.');
  if (run.stderr) console.error(run.stderr.trim().split('\n').slice(-12).join('\n'));
  console.error('Fallback: render with the browser pane (stages/4-verify.md §1).');
  process.exit(2);
}

// "math" is the browser's generic family for MathML (KaTeX emits hidden MathML); not a missing web font.
const mathOnly = (f) => f.id === 'font-fallback' && /fallback is rendering: math$/.test(f.message);
const tier = (f) => mathOnly(f) ? 'signal' : DEFECT.has(f.id) ? 'defect' : QUALITY.has(f.id) ? 'quality' : 'signal';
const findings = report.findings.map((f) => ({ ...f, tier: tier(f) }));
const consoleErrors = [...new Set(report.viewports.flatMap((v) => v.consoleErrors || []))];
for (const msg of consoleErrors) findings.unshift({ tier: 'defect', level: 'FAIL', id: 'console-error', width: null, message: String(msg).slice(0, 300), fix: 'Fix the error; confirm on a fresh tab (stale dev-server state can fake one).' });

const result = { url: report.url, widths, findings, images: report.images, viewports: report.viewports.map(({ width, height, screens, motion }) => ({ width, height, screens, motion })) };
writeFileSync(join(out, 'lagann-report.json'), JSON.stringify(result, null, 1));
const defects = findings.filter((f) => f.tier === 'defect');
if (asJson) { console.log(JSON.stringify(result, null, 1)); process.exit(defects.length ? 1 : 0); }

const rel = (p) => relative(process.cwd(), p).split('\\').join('/');
const line = (s = '') => console.log(s);
line(`LAGANN · INSPECT   ${report.url}   widths ${widths}`);
const m = report.viewports[0]?.metrics;
if (m) {
  if (m.hero) line(`  hero      "${m.hero.text.slice(0, 70)}"  ${m.hero.lines} line(s) · ${m.hero.size}px · ${m.hero.font}`);
  line(`  type      ${m.type.families.filter((f) => f.share >= 0.02).map((f) => `${f.family} ${Math.round(f.share * 100)}%`).join(', ')} · sizes ${m.type.sizes.join('/')}px`);
  line(`  page      ${m.page.screens} screens · ${m.page.words} words · ${m.page.img} images`);
}
line();
const groups = [
  ['DEFECTS: fix these first', 'defect'],
  ['QUALITY: judge each; fix or defend in one sentence', 'quality'],
  ['SIGNALS: house-style patterns from taste-skill. Not defects. Ask the anti-slop questions; keep what is chosen', 'signal'],
];
for (const [title, t] of groups) {
  const list = findings.filter((f) => f.tier === t);
  if (!list.length) continue;
  line(title);
  for (const f of list) {
    line(`  [${f.id}]${f.width ? ' @' + f.width + 'px' : ''}${f.alsoAt ? ' (+' + f.alsoAt.join(', ') + ')' : ''}  ${f.message}`);
    if (t !== 'signal') line(`      → ${f.fix}`);
  }
  line();
}
if (!findings.length) line('No findings. The meter is clean; now judge the screenshots.\n');
line('SCREENSHOTS (open them before judging anything):');
for (const im of report.images) { line(`  ${(im.viewport + ' ' + im.width + 'px').padEnd(14)} ${rel(im.fold)}`); for (const p of im.pages) line(`  ${''.padEnd(14)} ${rel(p)}`); }
line();
line(`report: ${rel(join(out, 'lagann-report.json'))}`);
line(`RESULT: ${defects.length} defect(s), ${findings.filter((f) => f.tier === 'quality').length} quality, ${findings.filter((f) => f.tier === 'signal').length} signal(s).`);
process.exit(defects.length ? 1 : 0);
