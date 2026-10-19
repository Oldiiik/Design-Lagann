<p align="center"><img src="assets/brand/design-lagann-github-banner.png" alt="Design Lagann" width="100%"></p>

# Design Lagann

**A design director for coding agents.** Lagann is an Agent Skill
that gives Claude Code (and other hosts that read `SKILL.md` skills) design *judgment* rather than a house
style: what kind of task this is, what is already true about the product, which expertise applies right
now, and when the work is actually done.

It orchestrates the design skills you already have (impeccable, taste-skill, frontend-design,
ui-ux-pro-max, emil-design-eng, animate, apple-design and others), loads only the part each moment needs,
resolves their contradictions, hunts generic "AI-made" design without replacing it with the next cliché,
and verifies the rendered result in a real browser.

> Version **0.1.0**. A clean rewrite as a pure skill. The 1.x plugin (CLI, MCP server, packages) is retired;
> see [CHANGELOG.md](CHANGELOG.md).

## What it does

- **Reads before it designs.** Each project keeps a short `.design-lagann/context.md` (tokens, type,
  motion language, intentional exceptions, decisions, rejections, how to run and check it), derived from
  the real code with a bundled scanner. Code beats memory; newer user words beat both.
- **Picks the smallest mode that fits.** Create runs four stages; Modify loads one checklist; Redesign
  audits and preserves identity first; Audit only reads; Continuous QA checks the parts you changed.
- **Four stages for new work.** Discover (product and UX), Imagine (creative direction from the subject,
  with real alternatives), Construct (design engineering, states, motion with a purpose), Verify
  (render → inspect → diagnose → correct → verify, bounded).
- **One precedence model.** User requirements > accessibility, correctness, security > the product's
  established identity > the task's direction > specialist advice > general taste. A specialist's style
  ban is a *signal to question*, never an automatic edit.
- **First-class anti-slop.** Three orders of slop (generator defaults, the cream-and-serif overcorrection,
  originality theatre), five questions before changing anything, evidence tests (category guess,
  competitor swap, effects off, decision trace), and a rule to protect what is already distinctive.
- **Honest verification.** A wrapper around taste-skill's browser inspector sorts findings into defects,
  quality issues and style signals; a browser sweep checks overflow, names, labels, contrast, targets, LCP,
  CLS and metadata. Nothing is reported as checked unless it ran.

It is not a style preset. A finance dashboard, an artist's portfolio and a children's app should never
come out as variations of one template.

## Install

Claude Code:

```bash
git clone https://github.com/Oldiiik/Design-Lagann.git ~/design-lagann
ln -s ~/design-lagann/skills/lagann ~/.claude/skills/lagann
```

Copying works too (`cp -R skills/lagann ~/.claude/skills/`); the symlink lets `git pull` update it.
Other hosts: link `skills/lagann` into that host's skills folder (for example `~/.codex/skills/` or
`~/.cursor/skills/`). Start a new session afterwards. Lagann triggers on design requests by itself.

**Upgrading from the 1.x plugin:** remove `~/.claude/skills/design-lagann` (and the Codex/Cursor copies),
`~/.design-lagann/runtime` and the plugin entry, so only one orchestrator is active. Note that
`npx design-lagann` on npm still installs 1.0.1.

### Requirements

- Nothing, to work: Lagann is Markdown plus three small, dependency-free scripts.
- Node 22+ and a local Chrome/Edge/Chromium for the inspector scripts.
- Specialist skills are optional. Lagann carries its own craft core and direction method, so it works
  with none installed; each specialist adds depth. What each contributes, and what replaces it when
  missing: [`modules/specialists.md`](skills/lagann/modules/specialists.md).

## Layout

```
skills/lagann/
  SKILL.md                    always loaded: context first, mode router, surface, precedence, stages, truth rules
  stages/                     1-discover · 2-imagine · 3-construct · 4-verify
  modules/
    modes.md                  modes, other names for the same work, effort levels, escalation
    anti-slop.md              the anti-generic-design module
    specialists.md            registry of design skills: best at, what to read, where Lagann overrules
    conflicts.md              hard vs soft rules and standing rulings between specialists
    project-context.md        the .design-lagann/context.md mechanism and template
  references/
    craft.md                  mechanics defaults with reasons: type, space, colour, depth, components,
                              Operate / Read / Persuade specifics, motion tokens, copy
    examples.md               worked outputs: direction record, audits, dashboard hierarchy, Modify report
  standards/professional.md   accessibility, responsive, performance, production, SEO, security, i18n
  checklists/                 change-check (small edits), report formats
  scripts/
    context-scan.mjs          derives tokens, fonts, radii and motion facts from a project
    inspect.mjs               real-browser measurement, findings sorted into defect / quality / signal
    browser-checks.js         objective sweep to paste into a browser devtools / agent browser
```

Progressive disclosure keeps context small: a small edit loads `SKILL.md` and one checklist (about 3k
tokens); full creation loads the stage files and the specialist excerpts they name, never whole skills.

## Personal rules stay personal

Cross-project taste and rules for named projects (a motion language, a pinned palette, a local server)
belong in `~/.design-lagann/profile.md`, outside every repository. Lagann reads it at the start of each
task. Project-specific identity lives in each project's `.design-lagann/context.md`.

## Develop

```bash
node scripts/validate.mjs                 # frontmatter, links, script syntax, size budget, no personal paths
node scripts/validate.mjs --specialists   # also checks specialist file references against ~/.claude/skills
```

Evals live in `evals/` (skill-creator's schema): nine behaviour evals with checkable expectations,
twenty trigger queries, and fixture pages. How Lagann compares with the skills it orchestrates:
[docs/comparison.md](docs/comparison.md). What was tested and how: [docs/validation.md](docs/validation.md).
Contributions: [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0. Lagann references other skills by name and path; it does not bundle their content.
