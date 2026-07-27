# Contributing to Design Lagann

Thank you for helping improve Design Lagann.

## Before opening a change

1. Open an issue for behavior changes or new public capabilities.
2. Keep the single Design Lagann workflow intact; internal adapters must not become separate user-facing products.
3. Do not add SVG files, inline SVG, SVG data URLs, or dependencies that render SVG.
4. Preserve the plan, direction approval, production asset, responsive proof, and accessibility gates.

## Local verification

Use Node.js 20 or newer and pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm benchmark
```

Changes to user-facing behavior should include tests. Changes to the plugin surface should keep the manifest, package, CLI, MCP server, README, and changelog versions aligned.

## Pull requests

Keep pull requests focused. Explain the user problem, the chosen behavior, the evidence you collected, and any remaining limitation. Screenshots must include desktop, tablet, and mobile when visual output changes.

