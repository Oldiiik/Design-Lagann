# Release checklist

1. Confirm `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json`, and `package.json` report the same version.
2. Validate the plugin and portable `skills/design-lagann/SKILL.md` payload.
3. Run `pnpm test` and `pnpm validate`.
4. Test the host plans:
   - `design-lagann run --project <fixture> --operation create --host codex`
   - `design-lagann run --project <fixture> --operation redesign --host claude`
   - `design-lagann reference acquire --goal "Create a showcase landing" --host cursor`
5. Confirm Claude falls back to searched references and no required image-generation action.
6. Confirm the staged archive contains neither personal/demo assets, `node_modules`, runtime state, screenshots, logs, nor SVG files.
7. Run `npm pack --dry-run` and confirm no assets, examples, benchmarks, tests, output, or third-party mirrors are included.
8. Smoke-test the tarball with `npm exec --package=<tarball> -- design-lagann install --target all --dry-run`.
9. Run `pnpm release:package` and verify the emitted SHA-256 manifest.
10. Tag `v1.0.0` and attach the zip, `.json` checksum manifest, and npm `.tgz` to the GitHub release.

Recommended release title: `Design Lagann 1.0.0 — Codex, Claude Code, and Cursor`.
