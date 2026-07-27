# Soft Crumb implementation contract

## Status and evidence boundary

Direction A is the selected creative reference for this small demonstration because it is the deterministic 8.27/10 recommendation and the user explicitly asked Design Lagann to proceed with a bakery implementation after viewing the visual-orientation review. This does not retroactively rewrite the fixture’s separate `pending` approval artifact.

The generated desktop and mobile images are creative references. They do not establish exact colors, fonts, coordinates, component dimensions, breakpoints, controls, or interaction behavior. The rules below—not the mockup pixels—govern implementation.

## Thesis

Express the slow, layered labor of laminated pastry through a croissant and curling order paper that jointly organize the page, so choosing a pastry feels like opening a weekend ritual.

## Exact product requirements

- Brand truth: small-batch laminated pastries, seasonal fillings, weekend pickup.
- Primary action: reserve pastries for Saturday or Sunday.
- Required content: hero, today’s selection, process, pickup information, shared bag/reservation.
- Required states: empty bag, configured bag, reservation success.
- Operational facts: Sat & Sun, 8am–2pm; order by Friday at 6pm; 123 Mill Street, Portland, Maine.
- The demo does not collect payment or submit data to a server.

## Signature relationship

**Inferred, preserve:** The hero croissant is an anchor and bridge. It crosses the headline axis and appears to press into a curling paper layer. The fold carries the eye into today’s selection and reappears as the physical logic of the closing reservation slip.

The relationship must remain legible when shadows, texture, animation, and color are removed. It cannot become a conventional copy-left/image-right hero.

## Composition grammar

- **Inferred, preserve:** oversized display type creates the first focal field; the pastry interrupts it without covering the essential reading order.
- **Inferred, preserve:** the pickup constraint is a secondary field revealed by the fold, not another card.
- **Inferred, adapt:** today’s products form one editorial lineup with thin rules and changing image scale. Product controls are real HTML and may extend the row height.
- **Inferred, preserve:** one rust process band creates the only dominant material and cadence change.
- **Inferred, adapt:** the closing order slip is a functional preview, not fake receipt decoration.
- **Reference defect, reject:** tiny operational copy, decorative inactive arrows, duplicate unsynchronized reservation controls, and an empty bag shown beside a success-like CTA.

## Object map

| Object | Role | Implementation rule |
| --- | --- | --- |
| Hero croissant WebP | Anchor + bridge | Cross the title/fold axis; crop decisively on narrow screens; never place inside a card. |
| CSS paper fold | Bridge + transition | Connect hero, pickup constraint, and selection; use bounded geometry with a simple color fallback. |
| Pastry trio WebP | Product evidence | Crop its three isolated rasters into the editorial menu; keep adjacent semantic names and prices. |
| Rust process field | Interrupt | Change page density once; remain mostly flat and effect-free. |
| Reservation slip | Utility + closure | Reflect the shared bag and open the real reservation dialog. |

## Responsive transformation

- Desktop: asymmetric title field, central pastry crossing, pickup note at the fold’s right edge, and one horizontal product lineup.
- Tablet: pastry becomes larger relative to the viewport; navigation reduces before the central relationship becomes crowded.
- Mobile: the pastry moves to the upper-right and receives a decisive crop; pickup moves below the promise; products form a two-column editorial flow with the third product spanning the width; process steps become readable stepped rows; a thumb-reachable bag bar reflects the same state as every product control.
- Mobile must not become a generic single-column card feed.

## Typography

- Display: local Instrument Serif 400, structural headlines and wordmark only.
- Body, utility, and data: local Libre Franklin variable 300–800.
- Utility labels use spacing and weight for contrast; no monospace is needed.
- `font-display: swap`; preload the two first-viewport files only; prohibit synthetic faces.

## Palette and material

Exact values are authored implementation tokens, not sampled from the image.

- Cultured-paper cream: page and quiet fields.
- Oxblood: primary action and wordmark emphasis.
- Baked rust: one process field.
- Fennel green: availability and operational accents.
- One upper-left light model.
- Depth is limited to the hero object, paper fold, modal, mobile bag bar, and reservation slip. Product groupings remain flat.
- Radii are limited to two-pixel controls and true circles.

## Interaction contract

- All quantities, header count, mobile count, preview total, dialog total, and reserve total share one state.
- Empty, configured, and success states are mutually exclusive.
- Product controls have explicit accessible names and at least 44px targets.
- Reservation requires a day and time, then produces a local confirmation code.
- Escape and backdrop close the native dialog; visible focus and reduced-motion behavior are required.

## Asset and implementation decisions

- Food and hero imagery: transparent raster WebP generated for the project.
- Paper geometry: CSS, because it is simple code-native structure.
- Wordmark: semantic text because no exact supplied mark exists.
- Icons: typographic symbols and text labels only; no improvised SVG.
- Preserve source PNGs, exact prompts, output hashes, font provenance, and OFL licenses.

## Failure conditions

- The croissant can be removed without changing the composition.
- The fold becomes detached decoration.
- Three or more rounded cards organize the page.
- The bag count and product quantities disagree.
- Success appears before reservation submission.
- Any food is recreated as SVG.
- Mobile overflows, loses the signature relationship, or compresses process copy into unreadable columns.

## Acceptance boundary

The site may be described as implemented and browser-tested only after desktop, tablet, and mobile runtime evidence exists. It is not automatically “10/10,” and a semantic Design Lagann acceptance claim still requires structured before/after vision plus a bound comparison.
