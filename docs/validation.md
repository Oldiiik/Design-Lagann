# Validation (0.1.0, 2026-10-19)

Run on the author's own projects: Aster (a static-HTML study app) and Prepify (React + Tailwind v4).

Two kinds of evidence. **Executed**: the tool or check really ran, results below. **Walkthrough**: the
request was routed through the skill files by hand to confirm the right mode, files, specialists and
rulings come out, and that nothing forces a visual direction. Walkthroughs are not proof of output
quality; that only comes from using Lagann on real tasks.

## Mechanical checks (executed)

| Check | Result |
|---|---|
| Skill discovered by Claude Code | `lagann` appeared in the live skills list as soon as SKILL.md was written, and again when installed as a symlink to this repository |
| Every file and section Lagann points to exists | 99 references checked across all modules (skill files, reference files, section names in impeccable `critique.md`, taste `copy.md`/`critique.md`, emil Review Checklist). 0 missing |
| `scripts/context-scan.mjs` on Astar | Correct tokens (58 colour, 5 radii, 10 motion), Google Sans, 25 reduced-motion rules, blur-in-motion and stagger detected, 15 hard-coded hex values |
| `scripts/context-scan.mjs` on Prepify (React + Tailwind v4) | Correct stack (Tailwind 4.1.12, motion 12, sonner, lucide + phosphor), shadcn + theme token files, Poppins family stack, existing `.design-lagann/*.json` found |
| `scripts/inspect.mjs` on Astar landing | Ran headless Chrome at 1440/768/390. Found 1 real defect class a plain lint would have buried (helper text at 4.0:1 contrast, plus an unloaded math font in static mode), and sorted 11 taste house-style FAILs into signals |
| `scripts/inspect.mjs` on a deliberately generic page | 15 signals (violet gradient, gradient text, glow button, pill nav, emoji pill eyebrow, icon cards...), 1 defect (contrast), 4 quality |
| `scripts/browser-checks.js` in the built-in browser pane | Ran on Astar via a local static copy: lang, landmarks, 1 h1, 0 overflow, 0 unnamed controls, 10 contrast failures listed with selectors, fonts loaded, CLS 0, meta (found duplicated "with Aster" in the meta description, no og:image, no canonical) |
| Bug found and fixed during testing | taste-skill's inspector truncates `--json` output at 64 KB when piped; the wrapper now reads its `report.json` file instead |

## Scenarios

### 1. New landing page from scratch (walkthrough)
"Build a landing page for a small ceramics studio in Almaty."
- Mode **Create**, surface **Persuade**. Loads SKILL.md, then each stage as entered.
- Discover: brief + taste-skill inventory (8–12 things only this studio has). No questionnaire; asks only if the studio name is missing.
- Imagine: idea sentence + competitor test; `draw.mjs --options 3` deals directions; impeccable's seven-cultural-candidates method as a second source. Anti-slop direction check flags the obvious rut for ceramics (cream + serif + terracotta) as second-order slop *unless* it comes from the studio's actual clay and glaze colours; the rule is "derive from the subject", not "ban cream".
- Construct: tokens → structure → hero at both widths → states → motion gated by purpose.
- Verify: inspector at three widths; taste house-style findings appear as signals, not failures; imagery must be honest (studio's own photos or credited open-collection pictures, no picsum).
- Result: no default style is imposed. The taste lane is optional, not the default.

### 2. Application dashboard (walkthrough)
"Build the analytics dashboard for Prepify's progress page."
- Mode **Create** inside an established world → Imagine *inherits* Prepify's world (Poppins, orb/clay motifs, PK palette from `.design-lagann/project-context.json`). Surface **Operate**.
- Discover pulls `impeccable/reference/operate.md`, ui-ux-pro-max UX priorities, the `dataviz` skill for charts.
- taste-skill is excluded (its own rule: not for app screens). Anti-slop's Operate table questions the template "sidebar + KPI row + line chart" and meaningless KPI arrows, but keeps consistency between panels as a virtue.
- Prepify's "honesty rule" (no fake stats) is tier 1–2 and matches Lagann's truth rules.

### 3. Redesign without losing identity (walkthrough, partly executed)
"The Aster landing page feels weak, improve it."
- Mode **Redesign**. Audit first: the inspector run above is that first step (executed).
- Preserve list (from the render and the context file): the periwinkle field with the live practice question, the "master" highlight, charcoal + periwinkle tokens, 12px buttons, Google Sans, real app screenshots.
- Depth: *Refine* (identity stays). Specific findings: helper-text contrast, three headlines wrapping to three lines at all widths, 14 font sizes, `.rise` blur + stagger contradicting the stated motion preference, hero invisible without JS.
- Conflicts applied: taste's "no shadows" loses to Aster's floating UI fragments (tier 3); "no numbering" loses because 01/02/03 is a real three-step sequence; "few pictures" loses to the user's real-screenshot decision.

### 4. Small component fix (walkthrough)
"Make the FAQ toggle on Aster feel nicer."
- Mode **Modify**. Loads SKILL.md + `checklists/change-check.md` (~2.9k tokens total) and reads Aster's context file.
- Uses existing tokens (`--t`, `--ease-out`), animate's frequency gate (FAQ = occasional → standard motion), Aster's motion language (calm fade, no blur). Keyboard, `aria-expanded`, reduced motion checked. No restyling of neighbours, no page-wide anti-slop.

### 5. Auditing a generic AI-generated interface (executed)
The deliberately generic "FlowAI" page:
- Inspector signals + `taste-skill/scripts/lint.mjs` (13 FAIL / 10 WARN: stock phrases "Supercharge / Unlock / Seamless / Lightning fast", generic "Get started", 100vh, backdrop-filter).
- What the tools missed and Lagann's modules cover: the invented "trusted by 10,000+ teams" (truth rule, anti-slop copy table), dead `href="#"` nav links (browser-checks' `deadLinks`; it reported Astar's "Back to top" this way, but was not run on this page), and the decision trace (no element traces to anything about the product; it fails the competitor swap completely).
- Verdicts are "change" with subject-derived replacements, and the five-question check stops the obvious replacement (flip to cream + serif) from becoming the fix.
- Contrast: on Astar the same signals (eyebrow, numbering, shadow, gradient) were judged *keep* with reasons. Same tools, opposite verdicts, because the module asks whether a pattern was chosen.

### 6. Expressive experimental design (walkthrough)
"Make an experimental portfolio for a sound artist, push it."
- Mode **Create**, surface **Experience**. Imagine allows `impeccable/reference/overdrive.md` and full colour strategies (Drenched/Committed); WebGL/canvas when the direction names it.
- Anti-slop's third-order check keeps legibility of the essentials (name, contact, work list) and keyboard access even when navigation is unconventional; nothing bans scroll-driven or generative motion, but reduced motion and performance stay hard requirements.

### 7. Verifying a responsive interface in the browser (executed)
- Inspector screenshots at 1440 / 768 / 390 (viewed: desktop and mobile folds of Astar).
- Built-in pane: emulated 375×812, measured 0px horizontal overflow, h1 at 43.2px. The pane screenshot taken right after load showed the hero still hidden mid-reveal, which is exactly the failure Verify §1 guards against ("settle or disable entrance motion before capturing"), and it exposed the real issue that Aster's `.rise` content is invisible until JS runs.
- Port 4400 was down at test time, so per the rule the server was not assumed; a static copy was served locally instead.

## Follow-up on Aster

The three Aster defects were then fixed in Modify mode: the reveal became a single calm opacity fade with
no blur or stagger (and content stays visible without script), helper text moved to a grey that passes
4.5:1 on every ground (lowest 4.61:1), and the meta description typo was corrected. A re-run of the
inspector showed no contrast defect; the only remaining "defect", a `math` font fallback, turned out to
be the browser's generic family for KaTeX's hidden MathML, so `inspect.mjs` now treats it as a signal.

## Known limits

- Walkthroughs show routing, not taste. The real test is Lagann's first few real tasks; record misses in `modules/conflicts.md` or the specialist registry.
- impeccable's binary-dependent steps (concept-seed, detector, live mode) were not run (approval rule). Lagann works without them.
- The inspector and pane are Chromium only; Safari issues are reported as code-read.
- `web-design-guidelines` needs network access to fetch Vercel's rules; not exercised here.
