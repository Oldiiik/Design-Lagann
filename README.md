# Design Lagann

Design Lagann is a clean, cross-host design workflow for Codex, Claude Code, and Cursor. It creates new interfaces and evolves existing ones through explicit scope, autonomous reference acquisition, persistent project memory, intentional assets, coherent motion, complete product states, and rendered proof.

The same repository is installable by all three hosts:

- Codex, Claude Code, and Cursor can load the portable Agent Skill under `skills/design-lagann/`.
- The full GitHub release also includes native Codex and Claude plugin manifests plus the local MCP runtime.

Claude does not need an image-generation engine. When raster generation is unavailable, Design Lagann uses supplied assets and references, browser-composed direction studies, strong type/layout/material systems, and precise `acquisition-needed` records. It never hides a missing image behind a blob, glow, particle field, or fake placeholder.

## Install with npx

```bash
npx design-lagann install --target codex
npx design-lagann install --target claude
npx design-lagann install --target cursor
npx design-lagann install --target all
```

The installer writes only the portable `design-lagann` skill into the selected host's user skill directory. Existing installs are never overwritten silently: run with `--force` to create a timestamped backup and update. Use `--dry-run` to inspect destinations first.

The npm payload excludes demo projects, generated images, personal brand artwork, benchmarks, third-party source mirrors, test output, and development caches.

## What changed in 1.1

- Autonomous reference acquisition that searches the web or generates a raster direction frame according to host capabilities.
- Portable installer targets for Codex, Claude Code, Cursor, or all three.
- A full motion choreography engine with coverage auditing, interaction timing, stagger, fine-pointer gating, and meaningful reduced motion.
- A clean npm/GitHub release payload without personal or demo assets.

## Core workflow

- Six operating modes: create, redesign, edit, extend, repair, and transform.
- Existing-project inspection and minimum-scope preservation contracts.
- Persistent `.design-lagann/project-context.json` for follow-up work.
- Marketing, commerce, application, platform, and content/service structures.
- Complete product states, including loading, empty, error, offline, permission, long-content, and responsive behavior.
- Shared motion tokens with reduced-motion rules and one optional Remotion stage.
- Asset policy limited to content, product, brand, composition, subtle texture, and explicitly requested imagery.
- Fast, Balanced, and Quality profiles with one invariant acceptance bar.
- Deterministic no-change detection and bounded stopping.
- Native Codex and Claude Code manifests in one clean release.

## Install from a release

Download `design-lagann-plugin-1.0.0-final-clean.zip` and extract it without changing the outer `design-lagann` folder.

For Codex, install or load the extracted plugin folder through the Codex plugin workflow.

For Claude Code, test the folder directly:

```bash
claude --plugin-dir /absolute/path/to/design-lagann
```

Claude Code namespaces the skill as `/design-lagann:design-lagann` when installed as a plugin.

## Use

Ask naturally:

```text
Create a focused airline booking landing page in Balanced mode.
Redesign this dashboard but preserve the data model and navigation.
Edit only the pricing card hierarchy.
Extend the current system with an empty and offline state.
Repair the mobile overflow without changing the approved desktop direction.
Transform this static landing into a functional React experience.
```

Optional CLI planning:

```bash
design-lagann run --project . --brief brief.json --operation redesign --profile balanced --host claude
```

The plan and context are written beneath `.design-lagann/` in the target project.

## Development

Requirements: Node.js 20+ and pnpm 11.

```bash
pnpm install
pnpm test
pnpm validate
pnpm release:package
```

Targeted workflow coverage:

```bash
node --test test/design-lagann-workflow.test.mjs
```

## Design constraints

Design Lagann does not automatically add particles, ribbons, belts, blobs, glows, noise, sparkles, floating ornaments, or decorative dividers. Empty space is compositional material, not an asset-generation prompt.

Projects can opt into a zero-SVG delivery contract. In that mode, marks and illustrations must be qualified raster assets, while functional geometry remains semantic HTML/CSS or genuinely procedural Canvas.

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).
