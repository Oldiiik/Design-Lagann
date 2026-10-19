# Stage 3: Construct (design engineering and interaction)

Turn the direction into a working, responsive, accessible interface that matches it at full fidelity.
A page that needs animation to look finished is not finished: build it still first, then add motion.

## Before the first edit

- Read the project's stack and conventions (framework, styling method, Tailwind version, component
  library, icon set). Work in them; never migrate frameworks or styling systems as a side effect.
- Where the project has no system of its own, take the mechanics (type scale, spacing, colour roles and
  ramps, radius, elevation, component behaviour, Operate/Read/Persuade specifics, motion tokens) from
  [../references/craft.md](../references/craft.md).
- If installed, read `impeccable/reference/craft-floor.md` (the Verify list in it is the build floor). Its
  "Refuse" list is a set of signals: see [../modules/conflicts.md](../modules/conflicts.md) for how Lagann rules them.
- Check every import exists in the project's dependencies before using it. Cheapest tool that works.

## Order of work

1. **Tokens**: colour roles, type scale, spacing scale, radii, elevation, motion durations and curves,
   as CSS custom properties or the project's theme. Extend existing tokens; never fork a parallel set.
   Components reference tokens only.
2. **Structure**: semantic HTML (landmarks, headings in order, real buttons and links, lists, tables
   for tabular data, labelled form controls). This is also the accessibility skeleton.
3. **The first viewport or primary screen**, at desktop and phone width, before anything else. Get the
   big thing big and the small things small.
4. **The rest**, component by component, carrying the direction's idea into every part (footer,
   pricing, empty state and settings included). Neighbouring sections should not all share one layout
   unless sameness is the point (Operate surfaces often want consistency).
5. **States** for every interactive part the product really has: hover, focus-visible, active/pressed,
   disabled, loading, empty, error, success, selected, partial data, long and missing content.
   Detail: `impeccable/reference/harden.md`; `redesign-skill/SKILL.md` "Interactivity and States" and
   "Strategic Omissions" as a checklist (not its upgrade techniques).
6. **Responsive**: the phone layout is its own composition, not a squeezed desktop. Fluid type and
   spacing, `min-height: 100dvh` not `100vh`, touch targets ≥ 44×44px, no horizontal scroll, tested
   at the real copy. Detail: `impeccable/reference/adapt.md`.
7. **Browser surfaces**: selection colour, caret, focus ring, scrollbars, underline offset, tabular
   numerals in data. They ship with the design whether you style them or not.
8. **Motion** (below).
9. **Copy**: controls named for what they do; errors say what happened and how to recover; one
   action keeps one name through the flow. Detail: `impeccable/reference/clarify.md`.

## Motion

Motion must feel physically and emotionally right for this product, and must have a purpose.

1. **Read the project's motion language first** (context file, existing tokens and keyframes).
   It overrides every specialist's defaults, including staggered entrances, reveal durations and
   "minimum moving elements" meters.
2. **Gate each animation** (`animate/SKILL.md` steps 1–2): how often is it seen, and what is its purpose
   (feedback, spatial continuity, state change, preventing a jump, explanation, delight)? Things seen
   100+ times a day and keyboard-triggered actions do not animate. No purpose, no animation.
3. **Ingredients** from `animate/SKILL.md` steps 3–7 and its RECIPES.md (tool, properties, curve,
   duration, interruption, exit, reduced motion, hover gating). Component-level craft (buttons, popovers,
   tooltips, `@starting-style`, clip-path, drawers, toasts): `emil-design-eng/SKILL.md`. Skip that
   skill's "Initial Response" canned message; you are reading it as reference.
4. **Gestures, springs, drag, sheets, momentum, materials**: `apple-design/SKILL.md` §1–14. Use when the
   interaction is direct manipulation or the product follows Apple-platform conventions, not as a look.
5. **Page-level choreography** on Persuade/Experience surfaces: one authored moment usually beats an
   entrance on every section (`frontend-design/SKILL.md`; `impeccable/reference/animate.md`). The
   taste-skill motion layer (per-section staggered entrances, ≥ 8 moving elements) belongs to its lane.
6. **Always**: transform and opacity (plus clip-path, filter when smooth); no `transition: all`; no
   `scale(0)` entrances; user-triggered UI 120–250ms; content visible by default if script fails;
   `prefers-reduced-motion` keeps comprehension, drops travel.

Need a component rather than an animation (toast, drawer, command menu, date picker)? Suggest the
`pick-ui-library` skill or use the project's existing library; do not hand-roll inaccessible widgets.

Project motion languages live in each project's context file and the user's profile. A motion language
belongs to its product: never carry one project's restraint, or exuberance, into another.

## Exit criteria

- The direction is built at full fidelity, not a safer approximation of it.
- Tokens are used consistently; no stray hard-coded colours, sizes or durations.
- Every real state exists and is reachable; keyboard focus is visible everywhere.
- Layout holds at phone, tablet and desktop widths with real content.
- Motion matches the project's language and every animation has a named purpose and a reduced-motion path.
- Then: Stage 4.
