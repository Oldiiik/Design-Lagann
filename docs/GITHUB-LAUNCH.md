# GitHub launch profile

Everything in this file is ready to paste into GitHub when the repository and official social accounts are created.

## Repository About

**Description**

> Design agent for Codex, Claude Code, and Cursor. Plans first, finds references, builds intentional interfaces, choreographs motion, and proves the result.

**Topics**

```text
design-agent
frontend-design
agent-skills
ai-coding
codex
claude-code
cursor
ui-ux
web-design
motion-design
mcp
developer-tools
design-systems
accessibility
open-source
```

Topics use lowercase letters and hyphens and remain below GitHub's 20-topic limit.

## Social preview

Upload [`assets/brand/design-lagann-social-preview.png`](../assets/brand/design-lagann-social-preview.png) under **Settings → General → Social preview**.

- dimensions: 1280×640;
- format: PNG;
- solid dark background for light and dark social surfaces;
- file size: below GitHub's 1 MB limit;
- no embedded copy, so the repository title and description remain platform-native and localizable.

The wider README masthead lives at [`assets/brand/design-lagann-github-banner.png`](../assets/brand/design-lagann-github-banner.png).

## Sponsors activation

1. Create and approve the GitHub Sponsors profile.
2. Open [`.github/FUNDING.yml`](../.github/FUNDING.yml).
3. Uncomment `github: [your-github-sponsors-handle]` and replace the handle.
4. Enable **Settings → General → Features → Sponsorships**.
5. Verify the Sponsor button in a signed-out browser session.

Do not activate a placeholder handle.

## Official links

Add links only after the account is live and controlled by the project.

| Channel | Final URL | Status |
| --- | --- | --- |
| Website | — | waiting for official domain |
| X / Twitter | — | waiting for official account |
| YouTube | — | waiting for official account |
| LinkedIn | — | waiting for official page |
| Discord / community | — | waiting for moderated community |
| GitHub Sponsors | — | waiting for approved profile |

After activation, add the verified links to the centered navigation near the top of [`.github/README.md`](../.github/README.md). Keep the repository as the source of truth.

## Launch copy

**Short**

> Break through generic UI. Design Lagann is a cross-host design agent that plans, art-directs, builds, animates, and verifies distinctive interfaces.

**Release**

> Design Lagann v1.0 is ready for Codex, Claude Code, and Cursor. It acquires its own qualified references, protects approved work, choreographs motion across complete states, and verifies the rendered result across viewports.

## Final launch checklist

- publish the npm package and test all four `npx` target commands from the registry;
- attach the clean ZIP, npm tarball, and checksum manifest to the GitHub release;
- add the About description and topics;
- upload the social preview;
- enable Discussions only when moderation is ready;
- activate Sponsors only with the approved handle;
- add social links only after ownership is verified;
- view the README, Sponsor button, issue forms, and release from a signed-out session.
