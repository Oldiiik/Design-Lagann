# Stage 4: Verify (visual QA and professional readiness)

Not an opinion stage. Inspect the rendered thing, find what is actually wrong, fix defects before polish,
and report only what was really tested.

**Render → Inspect → Diagnose → Correct → Render again → Verify.** One to three rounds by effort level ([../modules/modes.md](../modules/modes.md)).

## 1. Render

Pick the first that works and say which you used:

1. **Lagann inspector** (headless Chrome, measures and screenshots at 1440 / 768 / 390):
   `node ~/.claude/skills/lagann/scripts/inspect.mjs <url | path/to/index.html> [--widths 1440,768,390]`
   It wraps taste-skill's inspector and sorts its findings into *defects*, *quality issues* and
   *style signals* (see §3). Screenshots land in `.design-lagann/inspect/`. Open them with Read.
2. **Built-in browser pane** (`mcp__Claude_Browser__*`; read the `built-in-browser` skill first):
   `preview_start` (dev server from `.claude/launch.json`, or a URL) or `navigate`; `resize_window`
   presets mobile / tablet / desktop (reset to desktop after); `computer` screenshot; `read_page` /
   `get_page_text` for structure; `read_console_messages`; `javascript_tool` for computed styles,
   contrast, overflow and focus order. Use it to drive interactions (open menus, submit forms, tab
   through) that a static capture cannot.
3. **Claude in Chrome** only when the user asks for their own browser.
4. **Playwright / Chrome DevTools** only if the project already has them installed. Do not install
   browsers or packages without asking.
5. No browser at all: say "not rendered" and limit claims to what the code shows.

Before capturing: wait for fonts, settle or disable entrance motion (a half-faded element reads as a
missing one), capture from the top of the document, and confirm each image shows what its name claims.

**Running app check.** Never assume a dev server is up. `curl -s -o /dev/null -w "%{http_code}" <url>`
first. If it is down, start it through the project's launch config or start script, or tell the user.

**Known servers and screenshot workflows** are recorded in the project's context file (Verification) or
the user's profile. Use them, but still check the server responds. Product screenshots used as imagery
are refreshed by capturing the real pages, never replaced with div mockups; say before overwriting one.

**Before/after.** In Redesign and Modify, capture the affected area before editing
(`.design-lagann/shots/before-*.png`) and after, at the same widths, and compare them side by side.

## 2. Inspect

Check the categories that apply to this surface. Full criteria and thresholds:
[../standards/professional.md](../standards/professional.md).

- **Visual**: alignment and spacing errors; type inconsistencies; weak hierarchy; unintended imbalance;
  overflow, clipping, overlap; inconsistent colours or component styling; density wrong for the mode;
  unpolished states; repetitive or generic patterns (→ anti-slop).
- **UX**: navigation clarity; can the primary task be completed; readability; information priority;
  discoverability; feedback after actions; forms and validation; mobile usability; error recovery.
- **Professional**: keyboard path and focus visibility; contrast; reduced motion; breakpoints;
  semantic structure; loading behaviour and layout shift; console errors; metadata/SEO for public
  pages; frontend security basics; cross-browser where testable.

Drive the interactions that matter: open every menu and dialog, tab through, trigger an error, empty
the data, paste long content, switch theme if there is one.

Specialist references for deeper passes (read the section, not the whole file):

| Pass | Read |
|---|---|
| Heuristic scoring, cognitive load, persona walk-throughs | `impeccable/reference/critique.md` sections "Heuristics Scoring Guide", "Cognitive Load Assessment", "Persona-Based Design Testing" |
| Technical audit scoring (a11y, perf, theming, responsive) | `impeccable/reference/audit.md` |
| Final polish pass | `impeccable/reference/polish.md` |
| Persuade page scoring against gallery-level work | `taste-skill/references/critique.md` |
| Web Interface Guidelines (file:line findings) | `web-design-guidelines/SKILL.md` (fetches Vercel's current rules with WebFetch) |
| Native app pre-delivery checklist | `ui-ux-pro-max/references/pro-rules.md` |
| Motion review | `review-animations/STANDARDS.md`; `emil-design-eng/SKILL.md` Review Checklist |
| Generic or AI-made feel | [../modules/anti-slop.md](../modules/anti-slop.md) |

impeccable's full `critique` protocol (two isolated sub-agents plus its downloaded detector) runs only
when the user explicitly asks for an impeccable critique and approves the launcher.

## 3. Diagnose

Sort every finding into one tier. Fix in this order.

1. **Critical defect**: broken, inaccessible or untrustworthy. Overflow, clipped or covered text, broken
   images, console errors, unreachable controls, missing focus, contrast below AA, lost data, a primary
   task that cannot be completed, fabricated proof.
2. **Significant usability problem**: works, but people will struggle. Unclear navigation, weak feedback,
   validation that hides the error, unusable on a phone, wrong density for the mode.
3. **Visual improvement**: hierarchy, spacing rhythm, type scale, colour balance, inconsistent components,
   unchosen generic patterns.
4. **Optional creative suggestion**: ideas that could make it better but are matters of taste.

The inspector's tiers map onto these: `defect` → 1, `quality` → 2 or 3 after you judge it, `signal` →
run the anti-slop questions; a signal is never fixed automatically and is often correct.

Evidence labels in every report: **Verified** (rendered or executed, say how), **Code-read** (inferred
from source only), **Not checked** (and why). Never upgrade a label.

## 4. Correct and re-verify

- Fix tier 1, then tier 2, then tier 3. Tier 4 goes to the user as suggestions unless asked.
- Batch the fixes from one look before looking again; do not screenshot after every tweak.
- Re-render the same widths and states, confirm each fix, and check nothing regressed nearby.
- Confirm each pass changed the render, not just the source. A pass with no visible change ends the loop.

## Acceptance (stop here)

- No tier 1 defects remain, or each remaining one is named with the reason it could not be fixed.
- Tier 2 problems are fixed or explicitly deferred with the user's agreement.
- The surface reads as the chosen direction at every tested width.
- Then stop. Further polish is a new request, not an obligation.

## Audit procedure (Audit and Redesign modes)

1. Resolve the target (file or URL) and render it (§1). For an Audit, no edits.
2. Write down first what works and must be preserved: distinctive decisions, strong components,
   identity cues. Then inspect (§2) and run anti-slop.
3. Report with [../checklists/reports.md](../checklists/reports.md) → Audit report.
