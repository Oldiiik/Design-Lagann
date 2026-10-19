# Craft core

Defaults for the mechanics every interface needs: type, space, colour, depth, components, states, motion,
copy. They decide nothing about the look. A direction, the project's own system, or a specialist's deeper
file overrides any number here; when you deviate, say why in one line. When no specialist is installed,
these defaults are the floor that keeps the work professional.

Each default carries its reason, because the reason is what tells you when to break it.

## Contents
1. Typography
2. Space and layout
3. Colour
4. Shape, surface, depth
5. Components
6. Operate surfaces (apps, dashboards, tools)
7. Read surfaces
8. Persuade and Experience surfaces
9. Motion tokens
10. Copy mechanics

## 1. Typography

**Body size.** Web body 16–18px; reading-heavy pages 18–20px; dense Operate UIs 14–16px with nothing that
must be read below 12px (13px preferred). Smaller type does not create elegance, it creates squinting.

**Scale by mode.** Fewer, farther-apart sizes make hierarchy obvious at a glance.

| Mode | Ratio | Sizes on a page | Why |
|---|---|---|---|
| Operate | 1.125–1.2 | 5–7 tokens | many levels, small jumps, nothing shouts over the data |
| Read | 1.2–1.25 | 4–6 | headings must be findable without breaking the reading flow |
| Persuade / Experience | 1.333–1.618, or a two-size system (display 4–8× body) | 3–5 | one thing leads; contrast is the drama |

Fluid sizes: `font-size: clamp(MIN, calc(A + B * 1vw), MAX)` where `B = (MAX - MIN) / (1440 - 360) * 100`
(px) and `A = MIN - B * 3.6`. Cap display type so a headline never exceeds the viewport's comfortable width.

**Leading.** Body 1.45–1.65 (longer lines need more); headings 1.05–1.25; display 0.88–1.05. Tight display
leading keeps a big headline reading as one shape; loose body leading keeps the eye on the right line.

**Measure.** Body 45–75 characters (`max-width: 60–68ch`); large lede 30–45ch; UI helper text ≤ 60ch.
Beyond 80ch the eye loses the start of the next line.

**Tracking.** Display −0.01 to −0.04em (bigger means tighter, never below −0.05em); body 0; small caps or
uppercase labels +0.04 to +0.08em. Large type looks loose at default spacing; small caps look cramped.

**Weights.** Two or three per family. Persuade builds hierarchy with size first; Operate with weight and
colour, because size changes break alignment in dense layouts.

**Numerals.** `font-variant-numeric: tabular-nums` wherever numbers compare or change (tables, prices,
timers, KPIs); right-align numeric columns. Proportional digits make columns wobble and values jump.

**Wrapping.** `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs. Check real copy at
every width; headlines that wrap to three or four lines at 390px usually need fewer words, not smaller type.

**Families and loading.** One family is normal; two need a clear contrast on one axis (structure or era)
and similar x-heights. Self-host or use a reliable CDN, WOFF2, at most 4 files, preload the face used
above the fold, `font-display: swap`, subset to the scripts the audience reads (Cyrillic, Kazakh, CJK).
Match fallback metrics (`size-adjust`, `ascent-override`) to avoid layout shift when the font arrives.

## 2. Space and layout

**Scale.** Base 4px: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160. Few values, far apart, make rhythm visible;
a page with 23 different margins has no rhythm.

**Proximity.** Space inside a group is at most half the space between groups. Space above a heading is
at least twice the space below it, so the heading belongs to what follows.

**Section rhythm.**

| Mode | Between sections (desktop / phone) | Inside a section |
|---|---|---|
| Persuade / Experience | 96–200px / 64–96px | 24–48px |
| Read | 48–80px / 40–56px | 16–24px |
| Operate | 16–32px between panels | 8–16px |

**Containers.** Text column 60–75ch; content 1100–1280px; media may run full-bleed. Gutter
`clamp(16px, 4vw, 40px)`. A centred 1200px box with everything inside it is a default, not a composition.

**Grid.** 12 columns desktop, 8 tablet, 4 phone; or content-driven `repeat(auto-fit, minmax(16rem, 1fr))`.
Two or three shared left edges per page; more reads as misalignment.

**Breakpoints.** Design and check at 390, 768, 1024 and 1280–1440. Use container queries for components
that live at several widths (cards in a sidebar and in a main column).

**Optical alignment.** Icons beside text, play triangles in circles and text in pill buttons often need
1–2px of nudging. Trust the screenshot over the box model.

## 3. Colour

**Roles before values.** Ground; surfaces 1–3 (each a 2–4% lightness step from the last); ink, ink-2,
ink-3; accent; accent-ink (accent dark enough for text); on-accent; success, warning, danger, info, each as
a wash + ink pair; focus ring; selection. Components reference roles, never raw hex.

**Ramps in OKLCH.** 10–12 steps per hue (50…950), evenly spaced in lightness, chroma reduced near the
extremes so light tints do not glow and dark shades do not muddy. Tint neutrals slightly toward the brand
hue (chroma 0.005–0.02); pure greys next to a coloured accent look dead.

**Contrast, measured on every surface.** Every ink must pass on every surface it sits on: body 4.5:1 (aim
7:1 for long reading), large text and UI parts 3:1. A grey that passes on white often fails on the panel
one step darker. Compute it; do not eyeball it.

**Dark themes** are designed, not inverted. Ground at OKLCH L 0.14–0.22 rather than pure black; elevation
shown by lighter surfaces, not shadows; accents a little less saturated; long-read text near L 0.9 rather
than pure white. Recheck every contrast pair.

**Meaning.** Colour is never the only signal: pair it with an icon, a word or a position.

**Charts.** Categorical palettes of 6–8 distinguishable hues at similar lightness; sequential in one hue;
diverging around a meaningful midpoint; test for colour-vision deficiency. The `dataviz` skill goes deeper.

## 4. Shape, surface, depth

**Radius.** Decide a language once: none, small (2–6px), medium (8–12px), large (16–28px), or full.
Vary by size (larger objects, larger radius) and keep nested corners concentric: inner = outer − padding.
One identical radius on everything ignores hierarchy.

**Lines.** 1px at 8–15% of the ink is structure (tables, form fields, panels in dense tools). On expressive
pages prefer tone steps and space unless the world is built on lines.

**Elevation.** Two to four levels, mapped to stacking (sticky bar < popover < menu < dialog). A good shadow
pairs a small sharp layer with a large soft one, offset downward, tinted by the ground's hue. If many
things at rest are raised, nothing is.

**Overlays.** Dialog scrims 40–70% ink. Blur only on fixed layers over moving content.

## 5. Components

**Buttons.** Heights 32 / 40 / 48px (44px minimum hit area on touch). One primary action per region.
Label = verb + object ("Save changes", "Book a table"). Loading keeps the width and shows progress;
prefer explaining a disabled action (or not disabling it and validating on press) over a dead grey button.

**Inputs.** Visible label above (placeholders vanish when typing); 40–48px tall; helper text below; on
error: danger ink + icon + words that say how to fix, keep the user's value, move focus or announce it.
Validate on blur, re-validate as the user types after an error. Correct `type`, `inputmode`,
`autocomplete`.

**Links.** Underlined in running text (offset 0.15–0.25em, 1–2px). Colour alone fails for colour-blind readers.

**Navigation.** Up to about seven top-level items; current location marked (`aria-current`); on phones a
menu button with `aria-expanded`, a focus-managed drawer, and the primary action still reachable.

**Dialogs.** Only for interruption or protected focus. Focus the first meaningful control, Escape closes,
focus returns to the trigger, 400–640px wide on desktop, full-height sheet on phones when content is long.

**Toasts.** Confirm async results; 4–6s, pausable on hover/focus, announced politely. Errors that need
action stay inline instead.

**Icons.** 16 / 20 / 24px with stroke matched to text weight (1.5–2px); one family. Icon-only buttons get a label.

**State coverage.** Hover (pointer devices only), focus-visible, active, disabled, loading, empty, error,
success, selected, partial, long and missing content. The default state is the easy 20% of the work.

## 6. Operate surfaces (apps, dashboards, tools)

People come back daily; they want speed, predictability and density, not a show.

- **Hierarchy follows decisions.** Top: what needs attention now (status, alerts, the next task). Middle:
  the work itself. Bottom or elsewhere: reference and history.
- **KPIs.** Three to five, each with unit, comparison period ("vs previous 7 days"), direction shown by
  sign + arrow + colour, and an action it informs. A KPI nobody acts on is decoration. Two or three
  significant figures in summaries.
- **Charts.** One question per chart; the title states the answer ("Signups doubled after launch"). Use a
  table when exact values matter more than shape.
- **Tables.** Rows 36–44px (32px compact); sticky header; text left, numbers right and tabular; dividers
  or zebra stripes, not both; row hover; sortable headers with `aria-sort`; truncation with a way to see
  the full value; empty, loading and error rows; bulk actions appear on selection; paginate or virtualise
  past about 100 rows.
- **Filters.** Current state visible, one-click clear, result count, state in the URL so views can be shared.
- **Speed.** Keyboard shortcuts for frequent actions, shown in tooltips; a command palette past ~20
  actions; none of these animate. Skeletons that match the layout for loads over ~300ms; optimistic
  updates with undo for reversible actions; confirmations that name the object for destructive ones.
- **Density.** Offer compact / comfortable when users vary. Brand lives in precise details (focus ring,
  selection, empty states, numerals), not in decoration around the data.

## 7. Read surfaces

Body 18–20px at 1.6 leading, 60–68ch measure; headings with anchor links; a table of contents for more
than three sections (sticky on desktop); code blocks with copy buttons and real syntax colours; images with
captions; callouts rarely, or they stop meaning anything. Navigation helps people find their place: previous
and next, breadcrumbs for deep hierarchies, search for large sets.

## 8. Persuade and Experience surfaces

- **First viewport** answers what it is, for whom, and what to do, with the primary action visible at
  390px without scrolling.
- **Headlines** hold at two lines or fewer at every width (about 32 characters is safe at a confident size);
  the supporting sentence stays under ~25 words.
- **Claims are followed by proof**, and proof is real or absent.
- **Pacing.** One dominant element per screen; neighbouring sections differ in composition; one deliberate
  rest per page; the action repeats at natural decision points, not after every section.
- **Hero performance.** The LCP element is text or an optimised image (AVIF/WebP, sized, preloaded). Video
  heroes carry a poster and do not block reading.
- **Experience surfaces** may break conventions on purpose, but the name, the work list and a way to make
  contact stay legible and keyboard-reachable.

## 9. Motion tokens

| Use | Duration | Curve |
|---|---|---|
| Press feedback | 100–160ms | ease-out |
| Hover, small state change | 120–200ms | ease-out |
| Menus, popovers, tooltips | 150–250ms | ease-out, origin at the trigger |
| Drawers, sheets, dialogs | 250–400ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Moving on screen | 200–400ms | `cubic-bezier(0.77, 0, 0.175, 1)` |
| One-time reveals (if the project uses them) | 300–800ms | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Gestures | spring, ~0.4–0.6s, bounce 0–0.2 | velocity-aware |

Exits run about 75% of the entrance. Travel 4–8px for small things, 12–24px for large; more reads as
floaty. Reduced motion swaps travel for a ≤150ms opacity change. Frequent and keyboard-driven actions do
not animate. Build steps and reasons: `animate` / `emil-design-eng` when installed, otherwise
[../stages/3-construct.md](../stages/3-construct.md) §Motion.

## 10. Copy mechanics

Sentence case. Buttons are verbs with objects. One action keeps one name through the flow ("Publish" →
"Published"). Errors say what happened and how to fix it, without apology or blame. Empty states say why
it is empty and offer the next step. Numbers, dates and currency use the reader's locale. No filler
("Welcome to your dashboard"), no hype ("Supercharge"), no exclamation marks in errors.
