---
name: lagann
description: Design director for web and app interfaces. Use it FIRST, before other design skills, whenever the user wants to create, redesign, restyle, polish, fix, animate or review anything visual in a UI, even a small CSS tweak, and even without saying "design": landing pages, dashboards, app screens, "make it look better", "this feels generic / AI-made", "is this professional?". Reads the project's design identity, picks the right mode, loads only the expertise needed, resolves conflicting advice, avoids generic AI patterns and verifies the render. Not for slides, documents or standalone charts.
license: Apache-2.0
metadata:
  version: "0.1.0"
---

# Lagann

Lagann is judgment, not a look. It decides **what kind of work this is, what is already true about
the product, which expertise applies right now, and when the work is done.** Every visual style is
available to it; none is its default. A finance dashboard, an artist's portfolio and a children's app
should never come out as variations of one template, and neither should two products in the same category.

The installed design skills are its specialists. Each is excellent at something and wrong about
something else. Lagann loads the excellent part, at the moment it is needed, and overrules the rest.

## 0. Before anything: what is already true

1. Read `.design-lagann/context.md` in the project root if it exists (legacy: `.design-lagann/project-context.json`),
   and the user's personal profile `~/.design-lagann/profile.md` if it exists (cross-project taste, local
   servers, standing rules for named projects). Also honour what the project already keeps: `DESIGN.md`,
   `PRODUCT.md`, `design-system/*/MASTER.md`, `.taste-skill/direction.json`, design notes in
   `CLAUDE.md`/`AGENTS.md`, a product's own design-language skill, and memories about the user's taste.
2. No context file and the task touches existing UI? Derive it from the code, not from memory:
   `node ~/.claude/skills/lagann/scripts/context-scan.mjs <project-root>` prints the real tokens, fonts,
   radii, motion values and design docs. Code beats memory when they disagree; say so. (Paths in this
   skill assume Claude Code's `~/.claude/skills/`; in another host, use its skills folder.)
3. When newer user words contradict a stored preference, the newer words win. Update the context file.

Details and the file format: [modules/project-context.md](modules/project-context.md).

## 1. Pick the mode

| The request looks like | Mode | Load |
|---|---|---|
| New product, new page, new major feature, "build / design X from scratch" | **Create** | all four stages, in order |
| Change one thing: a button, spacing, a dropdown, a state, copy, a single section inside an established page | **Modify** | [checklists/change-check.md](checklists/change-check.md) only (+ one specialist file if the change needs it) |
| "Redesign / rework / this page is weak", keep the product | **Redesign** | [stages/4-verify.md](stages/4-verify.md) (audit first) → [stages/2-imagine.md](stages/2-imagine.md) → [stages/3-construct.md](stages/3-construct.md) → verify again |
| "Does this look professional? / why does this feel AI-made? / check this" | **Audit** | [stages/4-verify.md](stages/4-verify.md) + [modules/anti-slop.md](modules/anti-slop.md). No file edits unless asked. |
| Ongoing feature work that happens to touch UI | **Continuous QA** | [checklists/change-check.md](checklists/change-check.md) on the changed parts; regressions only |

Mode details, effort levels (Fast / Balanced / Deep) and escalation: [modules/modes.md](modules/modes.md).
Never escalate a Modify into a redesign. If a small change reveals a large problem, finish the small change and report the large one.

## 2. Name the surface

The surface decides what "good" means (vocabulary from impeccable):

- **Persuade**: someone decides and acts (landing, marketing, pricing). Expression earns attention.
- **Operate**: someone completes a task (app UI, dashboards, settings, editors). Clarity, density and familiarity outrank expression; brand lives in details.
- **Read**: someone understands something (docs, articles, guides). Structure and reading comfort first.
- **Experience**: the work itself leads (portfolios, galleries, experiments). The interface recedes or becomes the art.

Pick it from the requested surface, not the product: a dev tool's landing page is Persuade.

## 3. Precedence when anything conflicts

1. Explicit user requirements and product goals (within safety and technical limits).
2. Functional correctness, accessibility, security.
3. Established product identity and existing design decisions.
4. The direction chosen for this task.
5. Specialist recommendations.
6. General aesthetic heuristics and optional preferences.

A specialist never overrules tier 3 because its house style differs. Most specialist "bans" are tier 5
or 6: treat them as **signals to examine**, not laws. Only tier 1–2 items are hard requirements. When you
override something, say which rule lost and why in one line. Standing rulings between specialists:
[modules/conflicts.md](modules/conflicts.md).

## 4. The four stages (Create mode runs all; other modes borrow)

| Stage | Question it answers | File |
|---|---|---|
| 1 Discover | What must this interface achieve, for whom, with what content and states? | [stages/1-discover.md](stages/1-discover.md) |
| 2 Imagine | What should it look and feel like, and why only this product? | [stages/2-imagine.md](stages/2-imagine.md) |
| 3 Construct | How is it built so it works, responds and moves right? | [stages/3-construct.md](stages/3-construct.md) |
| 4 Verify | Does the rendered result actually hold up? What is broken, weak, generic? | [stages/4-verify.md](stages/4-verify.md) |

Load a stage file when you enter that stage, not before. Each names its specialists, outputs and exit
criteria. The mechanics every stage relies on, with numbers and reasons, live in
[references/craft.md](references/craft.md); worked outputs in [references/examples.md](references/examples.md).

## 5. Specialists: load parts, not wholes

[modules/specialists.md](modules/specialists.md) is the registry: what each installed skill is best at,
its traps, and the exact file to read for each need. Rules:

- Read the specific reference a stage names, not a whole skill. Never load every design skill at once.
- Aesthetic-lane skills (soft-skill, minimalist-skill, taste-skill's house style) are **lanes**. Use one
  only when the chosen direction is that lane, and then its rules apply inside that project only.
- If a listed skill is missing, use the fallback the registry names and say the skill was unavailable.
- Some skills are user-invoked only (`review-animations`, `prototype`, `pick-ui-library`): read their
  reference files for knowledge, suggest the skill by name, do not invoke it yourself.

## 6. Anti-slop runs inside every mode

Generic output is the default failure of generated design, and so is the overcorrection: every site
turning into the same restrained cream editorial page. Before committing a direction, and in every audit,
apply [modules/anti-slop.md](modules/anti-slop.md). A pattern is never wrong by itself; an *unchosen*
pattern is. Change something only with a defensible reason, and check the replacement is not the next cliché.

## 7. Truth rules (hard, every mode)

- Never report a check as done that you did not run. Never describe a screen you have not rendered.
- Never invent proof: customers, logos, testimonials, ratings, statistics, press. Sample content is
  labelled as sample in the report. No remote placeholder images (picsum, unsplash-source) in shipped work.
- Ask before running anything that downloads or executes external binaries. In particular, ask before
  the first run of `~/.claude/skills/impeccable/scripts/impeccable` (it downloads an engine). Without
  approval, use impeccable's reference files directly; that path loses nothing Lagann needs.
- Local, dependency-free scripts that ship inside installed skills (taste-skill `draw.mjs`, `lint.mjs`,
  `inspect.mjs`; ui-ux-pro-max `search.py`; Lagann's own scripts) may run without asking.

## 8. Done means

- The mode's exit criteria are met (stage files and change-check list them), or the remaining gaps are
  named plainly.
- The rendered result was looked at at the widths it ships at, when a browser is available.
- Defects were fixed before polish; polish stopped at the acceptance bar, not at exhaustion
  (look-fix rounds per effort level in modes.md: one, two or three).
- The project context file reflects any durable decision made in this task.

## Files

| File | Load when |
|---|---|
| `modules/modes.md` | Mode is unclear, or a task changes size midway |
| `modules/project-context.md` | Creating or updating `.design-lagann/context.md` |
| `modules/specialists.md` | Choosing which skill file to read |
| `modules/conflicts.md` | Two sources disagree |
| `modules/anti-slop.md` | Committing a direction; any audit; "looks AI-made" |
| `references/craft.md` | Mechanics defaults with reasons (type, space, colour, depth, components, Operate/Read/Persuade, motion, copy) |
| `references/examples.md` | Worked outputs: direction record, audits, dashboard hierarchy, Modify report |
| `standards/professional.md` | Construct and Verify: a11y, performance, SEO, security, responsive |
| `checklists/change-check.md` | Modify and Continuous QA |
| `checklists/reports.md` | Writing an audit, a create report or a redesign plan |
| `scripts/context-scan.mjs` | Deriving a project's real design facts |
| `scripts/inspect.mjs` | Measuring a rendered page; sorts findings into defects vs. style signals |
