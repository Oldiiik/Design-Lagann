# Modes

The four stages describe how a whole interface comes into being. Most requests are not that. Pick the
smallest mode that does the job, and do not re-run the pipeline for an isolated change.

## Create

New product, page, flow or major feature with no established surface to inherit.

1. Discover → 2. Imagine → 3. Construct → 4. Verify, each to its exit criteria.
- A new *page inside an established world* is still Create, but Imagine inherits the world: it decides
  composition and the page's one idea, not a new palette or type system.
- Small Create (one new empty state, one new dialog): compress Discover and Imagine to a few lines of
  notes; do not run a direction draw.

## Modify

A bounded change to existing UI: a button, a spacing fix, a dropdown, an error state, a copy change,
one section.

1. Read the context file (or scan the touched files' tokens). Find how the project already does this
   kind of thing: the nearest existing component, token, radius, duration.
2. Make the change in the project's own vocabulary. Reuse tokens; never add a parallel system.
3. Run [../checklists/change-check.md](../checklists/change-check.md) for the change type.
4. Look at the rendered change if a browser is available; one screenshot of the affected area at the
   widths it ships, plus the state you changed.

Do not: restyle neighbours, "fix" unrelated slop, introduce a new font, colour, radius or motion curve,
or run anti-slop on the whole page. Report anything larger you noticed in one line.

## Redesign

An existing page or product needs substantial improvement and must keep its identity.

1. **Audit first** ([../stages/4-verify.md](../stages/4-verify.md), Audit procedure): render it, list what
   works and must survive, what is broken, what is generic.
2. **Decide the depth** and say it in one line:
   - *Refine*: identity stays; hierarchy, spacing, states, type and composition improve.
   - *Re-direct*: identity cues stay (name, mark, core colour, voice, content), the visual world is
     replaced. Only when the user asked for it or the current world fails the product. Propose before
     building.
3. If the change alters information architecture, navigation or multi-screen flows, write a short
   proposal and get a yes before editing (designing-user-experiences' rule for substantial changes).
4. Imagine (inherit or re-direct) → Construct → Verify, comparing before and after screenshots.

Never "split the difference" by polishing a look you have decided to replace, and never replace
successful distinctive decisions to prove originality.

## Audit

Questions such as "does this look professional?", "check this dashboard", "why does it feel AI-made?".

- Read-only. Edit files only if the user asks.
- Run the Audit procedure in [../stages/4-verify.md](../stages/4-verify.md) and
  [anti-slop.md](anti-slop.md). Report in the format from [../checklists/reports.md](../checklists/reports.md).
- End with the top fixes in order. Offer to apply them; do not apply them.

## Continuous QA

Feature work that touches UI incidentally (a new field in a form, a new column, an API change that adds
a loading state).

- Hold the project's identity in mind: tokens, components, motion language from the context file.
- After the change, check only what changed and its immediate surroundings with change-check: states,
  focus, responsive behaviour, token use, copy voice.
- Flag regressions (a hard-coded colour, a new spacing value, a missing state, a broken breakpoint).
  Do not volunteer redesign advice during feature work.

## Other names for the same work

| The user says | Lagann runs |
|---|---|
| "extend": add a page, section, state or capability inside the current system | Create inside an established world (Imagine inherits) |
| "repair" / "fix": correct a defect, keep intended behaviour and look | Modify |
| "transform" / "migrate": new framework, medium or interaction model | Redesign with the invariants (content, behaviour, identity, URLs) written down first and checked at the end |

## Effort

Scale depth, never the floor. Every level stays functional, accessible, responsive and honestly verified.

| Level | When | Directions | Look-fix rounds | Widths |
|---|---|---|---|---|
| Fast | small, clear scope | one | one | desktop, phone |
| Balanced (default) | most work | a short comparison | two | desktop, tablet, phone |
| Deep | showcase, brand, complex product | real exploration | three | all, plus states |

## Escalation

| Situation | Do |
|---|---|
| A Modify turns out to need a new pattern the system lacks | Build it from existing tokens; record it in the context file |
| A Modify reveals the page is broadly weak | Finish the Modify; report the problem; suggest Redesign |
| A Create request names an existing page | It is a Redesign; audit first |
| The user asks "make it pop / more premium" on one component | Modify, with Imagine's lens on that component only |
| An Audit request says "and fix it" | Audit, then Redesign or Modify per the findings' size |
