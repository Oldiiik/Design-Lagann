# Changelog

## 0.1.0 (2026-10-19)

A rewrite. Design Lagann is now a pure Agent Skill (`skills/lagann/`) instead of a plugin. The version
restarts at 0.1 because this is a new design, not an update of 1.x.

### Added
- Mode router: Create, Modify, Redesign, Audit, Continuous QA, with effort levels (Fast, Balanced, Deep).
- Four stage modules: Discover, Imagine, Construct, Verify.
- Anti-slop module: three orders of slop, five questions, evidence tests, symptom catalogue with the
  conditions under which each pattern is legitimate, verdicts, a preserve-first rule.
- Specialist registry and conflict rulings for impeccable, taste-skill, frontend-design, ui-ux-pro-max,
  emil-design-eng, animate, apple-design, designing-user-experiences, web-design-guidelines,
  redesign-skill, soft-skill, minimalist-skill and the motion-review skills.
- Per-project `.design-lagann/context.md` and a personal `~/.design-lagann/profile.md`.
- Scripts: `context-scan.mjs`, `inspect.mjs` (tiered wrapper around taste-skill's inspector),
  `browser-checks.js`.
- `scripts/validate.mjs` and CI.

### Carried over from 1.x
- Operations extend / repair / transform (now mapped onto modes), plan-before-build in proportion to scope,
  autonomous reference acquisition (search, generate, hybrid, browser-compose) with one role per source,
  intentional assets with truthful provenance, complete product states, bounded repair passes that stop
  when nothing changes, not reopening approved decisions, the effects-off and pattern-cluster checks.
- `.design-lagann/project-context.json` from 1.x is still read as legacy context.

### Removed
- The CLI, MCP server, installer, workspace packages, rubrics JSON, templates, benchmarks and plugin
  manifests for Codex and Claude. The npm package `design-lagann@1.0.1` is unchanged and still installs 1.x.

## 1.0.1 and earlier
The plugin releases remain available under the `v1.0.0` and `v1.0.1` tags.
