# Changelog

All notable changes to Design Lagann are documented here. This project follows Semantic Versioning.

## 1.0.1 - 2026-07-27

### Changed

- Removed all personal demo sites, generated showcase imagery, and obsolete brand iterations from the repository.
- Personal installation now persists a clean runtime at `~/.design-lagann/runtime` instead of leaving the engine in a temporary npm or download directory.
- Codex, Claude Code, and Cursor installs now write verified automatic-invocation metadata beside their user-level skill.
- Added `node install.mjs --target codex|claude|cursor|all` for downloaded release archives.

### Fixed

- Preserved the CLI and MCP engine after an `npx` installation finishes.
- Made the skill trigger explicitly on natural frontend design requests without requiring the user to name Design Lagann.

## 1.0.0 - 2026-07-27

The first public, release-ready version of Design Lagann.

### Added

- Cross-host support for Codex, Claude Code, and Cursor.
- Plan-first creation with persistent content, responsive, reference, asset, and output contracts.
- Create, redesign, edit, extend, repair, and transform request classification.
- Autonomous, rights-aware reference search with generated-direction and host fallbacks.
- Watermelon UI, Variant, and GrayBlocks reference sources.
- Complete state coverage, preservation boundaries, responsive verification, and bounded stop control.
- Motion choreography generation with calibrated interaction, editorial, stagger, and reduced-motion rules.
- An optional Remotion stage for rendered video animation requests.
- A Claude Code workflow that never requires image generation and records missing raster assets explicitly.
- `npx design-lagann install --target codex|claude|cursor|all` with dry-run and backup-first updates.
- Clean npm and GitHub release payloads without personal demo imagery or development-only material.
- Twenty focused workflow and regression scenarios.

### Changed

- Reframed user-facing language around outcomes and next actions instead of internal pipeline terminology.
- Renamed the product to Design Lagann and introduced the final raster brand system.

### Security

- Added global source and runtime protection against SVG.
