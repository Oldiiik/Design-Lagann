#!/usr/bin/env node
// Validates the Lagann skill: frontmatter, internal links, script syntax, size budget, no personal paths.
//
//   node scripts/validate.mjs [--specialists]
//
// --specialists also checks that every referenced specialist file exists in the local skills folder
// (~/.claude/skills or LAGANN_SKILLS_DIR). CI runs without it, since specialists are optional installs.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, resolve, extname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import vm from 'node:vm';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skill = join(root, 'skills', 'lagann');
const checkSpecialists = process.argv.includes('--specialists');
const errors = [], warnings = [];
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(skill);
const rel = (p) => relative(root, p);

// frontmatter
const main = readFileSync(join(skill, 'SKILL.md'), 'utf8');
const fm = main.match(/^---\n([\s\S]*?)\n---\n/);
if (!fm) errors.push('SKILL.md: missing frontmatter');
else {
  const get = (k) => fm[1].match(new RegExp(`^${k}:\\s*(.+)$`, 'm'))?.[1]?.trim();
  const name = get('name'), desc = get('description');
  if (name !== 'lagann') errors.push(`SKILL.md: name must be "lagann" (the folder name), got "${name}"`);
  if (!desc) errors.push('SKILL.md: description missing');
  else if (desc.length > 1024) errors.push(`SKILL.md: description is ${desc.length} chars (max 1024)`);
  else if (desc.length > 600) warnings.push(`SKILL.md: description is ${desc.length} chars; it is loaded in every session, keep it tight`);
  if (!/version:\s*"?\d+\.\d+\.\d+/.test(fm[1])) errors.push('SKILL.md: metadata.version missing');
}
if (Buffer.byteLength(main) > 12000) warnings.push(`SKILL.md is ${Buffer.byteLength(main)} bytes; keep the always-loaded file under 12 KB`);

// internal links and personal paths
let links = 0;
for (const f of files.filter((p) => p.endsWith('.md'))) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)) {
    if (/^https?:/.test(m[1])) continue;
    links++;
    if (!existsSync(resolve(dirname(f), m[1]))) errors.push(`${rel(f)}: broken link ${m[1]}`);
  }
  if (/\/Users\/|\/home\/[a-z]/.test(src)) errors.push(`${rel(f)}: contains an absolute personal path`);
}

// script syntax
for (const f of files.filter((p) => /\.(mjs|js)$/.test(p))) {
  if (f.endsWith('browser-checks.js')) {
    try { new vm.Script(`(async () => {\n${readFileSync(f, 'utf8')}\n})`); } catch (e) { errors.push(`${rel(f)}: ${e.message}`); }
  } else {
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if (r.status) errors.push(`${rel(f)}: ${r.stderr.trim().split('\n')[0]}`);
  }
}

// evals: skill-creator schema, unique ids, fixtures exist; trigger set balanced
try {
  const ev = JSON.parse(readFileSync(join(root, 'evals', 'evals.json'), 'utf8'));
  if (ev.skill_name !== 'lagann') errors.push('evals.json: skill_name must be "lagann"');
  const ids = new Set();
  for (const e of ev.evals) {
    if (ids.has(e.id)) errors.push(`evals.json: duplicate id ${e.id}`); ids.add(e.id);
    if (!e.prompt || !e.expected_output || !e.expectations?.length) errors.push(`evals.json: eval ${e.id} needs prompt, expected_output and expectations`);
    for (const f of e.files || []) if (!existsSync(join(root, f))) errors.push(`evals.json: eval ${e.id} fixture missing: ${f}`);
  }
  const tr = JSON.parse(readFileSync(join(root, 'evals', 'trigger-evals.json'), 'utf8'));
  const pos = tr.filter((q) => q.should_trigger).length;
  if (tr.length < 16 || pos < 6 || tr.length - pos < 6) warnings.push(`trigger-evals.json: ${tr.length} queries (${pos} positive); aim for ~20, balanced`);
  console.log(`evals: ${ev.evals.length} behaviour · ${tr.length} trigger (${pos} should, ${tr.length - pos} should not)`);
} catch (e) { errors.push('evals: ' + e.message); }

// optional: specialist references resolve against the local skills folder
if (checkSpecialists) {
  const base = process.env.LAGANN_SKILLS_DIR || join(homedir(), '.claude', 'skills');
  let n = 0;
  for (const f of files.filter((p) => p.endsWith('.md'))) {
    for (const m of readFileSync(f, 'utf8').matchAll(/`(?:~\/\.claude\/skills\/)?((?:impeccable|taste-skill|ui-ux-pro-max|frontend-design|emil-design-eng|animate|apple-design|designing-user-experiences|web-design-guidelines|redesign-skill|soft-skill|minimalist-skill|review-animations)\/[\w./-]+\.(?:md|mjs|py|json))/g)) {
      n++;
      if (!existsSync(join(base, m[1]))) warnings.push(`${rel(f)}: specialist file not installed locally: ${m[1]}`);
    }
  }
  console.log(`specialist references checked: ${n}`);
}

console.log(`files: ${files.length} · internal links: ${links}`);
for (const w of warnings) console.log('WARN  ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log(errors.length ? `FAILED (${errors.length} error(s))` : 'OK');
process.exit(errors.length ? 1 : 0);
