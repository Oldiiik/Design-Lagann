# Worked examples

Short, complete examples of Lagann's outputs. They show the *shape* of good reasoning; never reuse their
content, colours or layouts on another brief. Each example is built from its own subject.

## Contents
1. Create: from brief to direction record (Persuade)
2. Audit: a generic page (decision trace, cluster, verdicts)
3. Audit: a distinctive page (signals that stay)
4. Create inside a world: dashboard hierarchy (Operate)
5. Modify: the whole report

## 1. Create: from brief to direction record

**Brief:** "Landing page for Gil, a small ceramics studio in Almaty that runs evening wheel classes."

**Read (one line, no questionnaire):** Persuade surface; visitors are adults looking for an evening
activity; the action is booking a class; assets: the studio has phone photos of classes and pieces.

**Inventory (things only Gil has):** the name means "clay" in Kazakh; classes run 19:00–21:30; six wheels,
so six seats; the kiln fires on Sundays and pieces are collected the next week; glazes are mixed from
local Ili river clay, so the palette is rust, ash-grey and celadon; students sign the base of each piece.

**The rut, written first:** warm cream ground, high-contrast serif with one italic word, terracotta
accent, hairline rules ("artisan studio" template). Its predictable opposite: black ground, giant
grotesk, one acid accent. Neither may be among the candidates.

**Three directions that differ on at least three axes:**

| | A. The six wheels | B. The firing calendar | C. The signed base |
|---|---|---|---|
| Composition | one long horizontal row of six seats, each a booking slot | a week laid out as a timetable, Sunday's kiln as the climax | close-up photographs of signed bases as the grid |
| Colour strategy | Committed: ash-grey field, rust for open seats | Full palette from the three glazes | Restrained: photographs carry colour |
| Type voice | sturdy rounded grotesk | condensed timetable sans + numerals | one humanist sans, signatures as the only "script" |
| Imagery | class photos cropped to each wheel | kiln and glaze photos | base photos with real signatures |
| Live thing | pick a seat, see it reserved | choose a week, see when your piece is ready | type your name, see it as a stamped base |

**Choice:** A. It turns the studio's hardest constraint (six seats) into the booking interface itself,
which no competitor shares (competitor swap fails: another studio has a different number of wheels and
no evening limit). B is a strong runner-up; C depends on photographs the studio does not have yet.

**Anti-slop direction check:** rust is close to terracotta, so it is taken from the studio's actual
glaze (the colour sample comes from a photo of a fired piece, not from the category) and set on ash-grey,
not cream. No italic accent word.

**Direction record (goes into notes and `.design-lagann/context.md`):**

- *Thesis:* six wheels, six seats: the page is the evening's seating plan. Refuses the cream-serif artisan template.
- *World:* ash-grey ground (OKLCH 0.86 0.01 80), ink (0.24 0.01 60), rust accent from the glaze (0.55 0.13 45)
  only for open seats and the primary action, celadon wash for confirmations. One rounded grotesk, two
  weights. Radius medium (10px) echoing a wheel head; no shadows except the booking sheet.
- *Composition:* first screen = the row of six seats for tonight with times; below, one section per
  ritual (throwing, Sunday firing, collection) in alternating full-bleed photo / text splits.
- *Signature:* reserving a seat fills it with rust and shows the student's initials on the wheel.
- *Motion character:* calm; the seat fill is the one authored moment (200ms ease-out); no scroll reveals.
- *Risks:* six slots on a 390px phone (solution: two rows of three); real photos needed, recorded as
  needed with crops if missing.

## 2. Audit: a generic page

**Target:** an AI-tool landing page (dark, violet glow, "Supercharge your workflow with next-gen AI").

**Verdict:** works mechanically, says nothing about this product; every major element is the category default.

**Decision trace:**

| Element | Reason it exists | |
|---|---|---|
| Radial violet glow behind hero | none found in the brief or brand | candidate |
| Gradient text on "next-gen AI" | none; emphasis by colour reflex | candidate |
| Pill "✨ New · AI-powered" above the headline | none; no launch to announce | candidate |
| Glowing gradient button "Get started" | none; label names no action | candidate |
| Three cards: icon square + "Lightning fast / Secure / Seamless" | none; claims fit any software | candidate |
| "Trusted by 10,000+ teams" | no source | **truth violation** |

**Cluster (one finding, not five):** effects are standing in for a product story. Effects-off test: remove
the glow, gradient and shadows and nothing specific is left. Root cause: there is no idea from the subject.

**Verdicts:**
- *Change* the hero: show what the tool actually does with a real input and output in the first screen.
  Replacement check: not "make it cream and serif"; the replacement comes from the product's own artefact.
- *Change* the feature cards into one demonstration of the core workflow with real UI.
- *Remove* the 10,000+ claim until there is a real number; this is tier 2, not taste.
- *Keep, execute better:* the dark ground, if the product is used at night by developers; otherwise
  choose light or dark from the use scene.

## 3. Audit: a distinctive page

**Target:** a study app's landing page. The inspector flags `eyebrow`, `numbering`, `shadow`, `gradient`.

**Preserve first:** the live practice question in the hero; the highlight under the word "master"; the
charcoal + periwinkle system; real app screenshots.

**Signals judged:**
- `numbering` (01 / 02 / 03) → *keep*: the section is literally "three steps".
- `shadow` on UI fragments → *keep*: they float over a coloured field; elevation encodes that.
- `eyebrow` → *keep*: the "eyebrows" are labels inside product UI fragments, not kickers above headings.
- `gradient` → *keep*: a flat-colour gradient drives the link underline animation; not decoration.

**Real problems found instead:** helper text at 4.0:1 contrast (defect); headlines wrapping to three
lines at every width (quality); a reveal that blurs and staggers against the project's stated calm
motion, and hides content if the script fails (defect).

## 4. Create inside a world: dashboard hierarchy

**Brief:** "Progress page for exam-prep students" in an app with an established visual system.

**Imagine inherits the world;** only hierarchy and composition are decided.

- *First question the student has:* "Am I on track for my exam date?" → top: readiness for the exam
  date as one sentence plus one number ("On track: 7 of 12 topics mastered, 12 days left").
- *Then:* what to do today (the next two topics, each one click to start).
- *Then:* where they are weak (topics sorted by forgetting risk, as a table with tabular numbers).
- *Reference:* history chart, titled with its answer ("You practised 5 of the last 7 days").
- Rejected: a row of four KPI tiles with arrows; none of them would change what the student does today.

## 5. Modify: the whole report

> Darkened `--text-3` from #7b7d84 to #6b6d74 so helper text passes 4.5:1 on all five grounds (lowest
> 4.61:1). Verified with the inspector at 1440/768/390; no other tokens changed. Noticed: the hero
> headline wraps to three lines at every width; worth a separate pass.
