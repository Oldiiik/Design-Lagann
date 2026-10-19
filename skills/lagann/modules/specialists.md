# Specialist registry

What each installed design skill is genuinely best at, what to read for which need, and where Lagann
overrules it. Paths are relative to the host's skills folder (`~/.claude/skills/` in Claude Code). Written
against the versions noted below; re-check a skill's files if it has been updated since. A skill that is
not installed is skipped: use the fallback named in its entry.

## Core specialists

### impeccable (v4.6)
- **Best at**: critique and audit method (Nielsen scoring, cognitive load, personas), polish, hardening
  (errors, i18n, edge cases), layout, typesetting, colour strategy, surface modes (Persuade / Operate /
  Read / Experience), native iOS/Android guidance, the build floor.
- **Read**: `reference/craft-floor.md` (before UI edits), `shape.md`, `operate.md`, `mode-*.md`,
  `new-work.md` §1–4, `critique.md` (scoring sections), `audit.md`, `polish.md`, `harden.md`, `layout.md`,
  `typeset.md`, `colorize.md`, `adapt.md`, `clarify.md`, `onboard.md`, `animate.md`, `bolder.md`,
  `quieter.md`, `distill.md`, `delight.md`, `overdrive.md`, `ios.md`, `android.md`.
- **Requires approval**: `scripts/impeccable` downloads a binary engine on first run. Ask first. Its
  `context`, `detect`, `concept-seed`, `build-phase`, `comp-spec`, `live` commands all depend on it.
  Without approval, read the reference files directly; never claim a binary step ran.
- **Overruled**: "eyebrows are banned, no brief earns them back" (Lagann: a signal; identity can earn
  it). The font blacklist (a reason is required, not a ban). The full critique protocol's mandatory
  sub-agents and structured questions (only when the user asks for an impeccable critique). Its
  structured-question round before new work (Lagann asks only what blocks).

### taste-skill (tasteskill v2, "design-taste-frontend")
- **Best at**: art direction for public pages. The subject inventory, the argument (claims and proof),
  the idea sentence and competitor test, "one live thing", a researched direction library, honest
  imagery sourcing with credits, a real-browser inspector, a juror-style critique.
- **Run**: `scripts/draw.mjs` (directions), `scripts/assets.mjs` (open-collection images; network),
  `scripts/lint.mjs`, `scripts/inspect.mjs` (prefer Lagann's wrapper). Node 22+, local Chrome; installs nothing.
- **Read**: `references/copy.md`, `type.md`, `colour.md`, `layout.md`, `imagery.md`, `critique.md`,
  `tells.md`, `research.md` (cite the study's numbers, do not guess).
- **Not for**: dashboards and app screens (its own rule).
- **Overruled**: the house rules (no gradients, shadows, glass, mono, rules, eyebrows, numbering;
  ≥ 4 pictures; ≥ 8 moving elements; staggered entrances per section) are one author's lane. Inside the
  taste lane they apply; elsewhere they are signals. Its inspector FAILs for those ids are reclassified
  by Lagann's wrapper. Project motion language beats its motion floor.

### frontend-design
- **Best at**: a compact creative process. Ground in the subject, write a token plan, review the plan
  against "what would I produce for any similar brief", spend boldness in one place, calibrated list of
  current AI clusters, UX writing.
- **Read**: the whole SKILL.md (short) during Imagine.
- **Overruled**: nothing material; its "avoid all-caps labels" and accent-word advice are signals.

### ui-ux-pro-max
- **Best at**: UX rules by priority (accessibility, touch, performance, navigation, forms), 119
  searchable guidelines, chart selection, stack-specific implementation notes, native pre-delivery checklist.
- **Run**: `python3 ui-ux-pro-max/scripts/search.py "<2–5 terms>" --domain <ux|chart|typography|color|style|landing|icons|gsap|react|web>`
  or `--stack <stack>`; `--design-system` for raw palette/type/pattern options. Local, no network.
- **Read**: `SKILL.md` priority table, `references/quick-reference.md` on demand, `references/pro-rules.md` for native apps.
- **Overruled**: design-system output is a suggestion generator; never adopt it wholesale over the
  subject or the existing identity. Do not `--persist` or `--force` into a project without asking.

### emil-design-eng
- **Best at**: component feel and interaction craft: buttons, popovers, tooltips, `@starting-style`,
  clip-path tricks, drag and momentum, Sonner principles, review table format for motion.
- **Read**: the relevant section (headings are precise). Skip its "Initial Response" canned message.

### animate
- **Best at**: deciding whether something should animate, then building it right: frequency gate,
  purpose, tool choice, properties, curves, durations, interruption, exit, reduced motion. RECIPES.md
  for common components.
- **Overruled**: "everything entering at once → 30–80ms stagger" yields to project motion language.

### apple-design
- **Best at**: direct manipulation, springs, velocity handoff, momentum, rubber-banding, materials and
  depth, optical type sizing, reduced motion, Apple's design foundations.
- **Use when**: gestures, sheets, drag, native-feeling apps. Not a visual style to apply to the web by default.

### designing-user-experiences
- **Best at**: Stage 1. Bounded vs substantial scope, capability classification, proposals before
  substantial IA or flow changes, state coverage, not inventing research or capabilities.
- **Rule kept**: substantial experience changes need an approved proposal before editing.

### web-design-guidelines (Vercel)
- **Best at**: a terse `file:line` compliance pass against Vercel's Web Interface Guidelines.
- **Needs**: WebFetch of `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`.
  Offline: use [../standards/professional.md](../standards/professional.md) and say the guidelines were not fetched.

### redesign-skill ("redesign-existing-projects")
- **Best at**: a broad audit checklist for existing code: states, strategic omissions (404, skip link,
  legal links, validation), code quality, layout alignment details.
- **Read**: the audit lists as a checklist.
- **Overruled**: "font swap first" (identity first; a font change is a direction decision); picsum
  placeholders; "randomize dates to appear real" and invented "organic" numbers (deceptive; rejected);
  blanket grain, noise, glassmorphism and stagger upgrades (lane choices, not fixes); "double the spacing".

### soft-skill ("high-end-visual-design")
- **Lane**: soft, tactile premium agency (double-bezel cards, pill CTAs with nested icons, diffused
  shadows, long fluid reveals). Use only when the direction is that lane.
- **Overruled outside the lane**: font and icon bans, mandatory eyebrow pills, mandatory scroll
  entrances with blur, 700ms+ transitions on user-triggered UI, "Ethereal Glass" purple orbs.
  Its performance guardrails (blur only on fixed elements, transform/opacity, no scroll listeners) are good everywhere.

### minimalist-skill ("minimalist-ui")
- **Lane**: warm monochrome document-style minimalism (Notion-like). Use only when that is the direction.
- **Overruled**: picsum placeholders; faux macOS window chrome around non-screenshots; uppercase pill
  tags by default; treating warm-cream editorial as the safe choice (second-order slop risk).

## Motion review and planning (user-invoked or read-only)

- `review-animations` (user-invoked only): read `review-animations/STANDARDS.md` as the motion bar; suggest `/review-animations` for a strict review.
- `improve-animations` (read-only planner): whole-codebase motion audit and plans.
- `find-animation-opportunities` (read-only): where motion is missing, and where it should not be added.
- `animation-vocabulary`: naming a motion effect the user describes.

## Other useful installed skills

| Need | Skill |
|---|---|
| Charts, KPI tiles, dashboards' data viz | `dataviz` |
| Multiple variants behind a picker (user-invoked) | `prototype` (suggest it) |
| Choosing a component library (user-invoked) | `pick-ui-library` (suggest it) |
| Toasts in React | `ask-sonner` |
| Rendered video (MP4/WebM) the user explicitly asked for | the `remotion-*` skills; ship a static poster and a reduced-motion fallback |
| SVG illustrations and diagrams | `creating-svg-illustrations`, `diagram-design` |
| Stress-testing a plan with the user (user-invoked) | `grilling-designs` |
| Figma files, design-to-code, code-to-Figma | the Figma MCP server and its `figma-*` skills |
| A product's own design-language skill (e.g. a `<product>-design` or `see-<product>` skill) | Tier 3 identity for that product; it outranks every generic specialist there |

## Not installed

- **avoid-ai-design**: not found on this machine. Lagann's own [anti-slop.md](anti-slop.md) replaces it.
  If it is installed later, read its rules as additional signals for that module, not as bans.

## Adding a specialist

1. Read its files. Note: best at, what to read for which need, scripts and dependencies, whether it
   downloads or executes anything external, whether it is a lane, what it gets wrong.
2. Add an entry here in the same shape, and add it to the stage file whose question it answers.
3. If it contradicts an existing ruling, add a row to [conflicts.md](conflicts.md). Do not copy its
   instructions into Lagann; point at its files.
